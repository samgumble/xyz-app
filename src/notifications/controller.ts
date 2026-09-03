/**
 * Reconciliation: the part that has to converge.
 *
 * Saved sets change, the lead time changes, and a content update can move or
 * cancel a set underneath both. There is no incremental bookkeeping here on
 * purpose — every trigger runs the *same* full pass: read what the OS is
 * holding, compute what should be held, apply the difference. One code path,
 * so "unsave", "lead changed", "set moved", "set cancelled" and "app relaunched
 * after a reboot" cannot each have their own subtly different bug.
 *
 * The pass itself is `reconcile.ts` — platform-free and fully injectable, so
 * the tests drive it with a fake scheduler and a fixed clock. This file is the
 * wiring: it reads the two stores, decides when a pass is due, and publishes
 * the result for the UI.
 */

import { create } from 'zustand';

import { useAppStore } from '@/store/useAppStore';

import { type ReminderPlanInput } from './plan';
import { useReminderPrefs } from './prefs';
import { applyReminderPlan } from './reconcile';
import { scheduler as defaultScheduler } from './scheduler';
import { buildReminderSubjects } from './subjects';
import { reminderSupport } from './support';
import type { ReminderPermission, SkippedReminder } from './types';

/* ------------------------------------------------------------------ */
/* Runtime status, for the UI                                          */
/* ------------------------------------------------------------------ */

export interface ReminderStatusState {
  supported: boolean;
  supportMessage: string;
  permission: ReminderPermission;
  /** Reminder keys the OS is currently holding. Drives the per-set toggle. */
  scheduledKeys: string[];
  /** Saved slots that got no reminder, with the reason, so the UI can say why. */
  skipped: SkippedReminder[];
  busy: boolean;
  /** Epoch ms of the last completed pass; null before the first one. */
  lastReconciledAt: number | null;
}

const support = reminderSupport();

export const useReminderStatus = create<ReminderStatusState>(() => ({
  supported: support.supported,
  supportMessage: support.message,
  permission: 'undetermined',
  scheduledKeys: [],
  skipped: [],
  busy: false,
  lastReconciledAt: null,
}));

/* ------------------------------------------------------------------ */
/* The live reconciler                                                 */
/* ------------------------------------------------------------------ */

let inFlight: Promise<void> | null = null;
let rerunRequested = false;

function currentPlanInput(permission: ReminderPermission, nowMs: number): ReminderPlanInput {
  const app = useAppStore.getState();
  const prefs = useReminderPrefs.getState();
  const subjects = buildReminderSubjects(app.favorites);

  // Opt-outs for slots that are no longer saved are dropped here rather than
  // in the planner, so the prune happens exactly once per pass and the planner
  // stays pure.
  prefs.pruneMuted(subjects.map((subject) => subject.key));

  return {
    subjects,
    leadMinutes: app.settings.reminderLeadMinutes,
    nowMs,
    // Two independent gates, resolved into one boolean for the planner: the
    // user's master switch, and the OS actually letting us through. Either one
    // being off means "cancel everything", not "leave it as it was".
    enabled: prefs.enabled && permission === 'granted',
    mutedKeys: useReminderPrefs.getState().muted,
  };
}

async function runOnce(): Promise<void> {
  if (!defaultScheduler.supported) {
    useReminderStatus.setState({
      permission: 'undetermined',
      scheduledKeys: [],
      skipped: [],
      lastReconciledAt: Date.now(),
    });
    return;
  }

  const permission = await defaultScheduler.getPermission();
  const outcome = await applyReminderPlan(
    defaultScheduler,
    currentPlanInput(permission, Date.now()),
  );

  useReminderStatus.setState({
    permission,
    scheduledKeys: outcome.scheduledKeys,
    skipped: outcome.plan.skipped,
    lastReconciledAt: Date.now(),
  });
}

/**
 * Reconcile, safely, from anywhere.
 *
 * Serialised behind a single promise: two rapid saves must not both read the
 * pending queue before either writes to it, or they would each schedule the
 * same slot and the user would be buzzed twice. A call that arrives mid-pass
 * sets a flag instead of starting a second one, so the last state always wins
 * and the pass count stays bounded no matter how fast the taps come.
 *
 * Never requests permission. Reconciliation can run on screen mount; asking
 * for permission may only happen in response to an explicit tap.
 */
export function reconcileReminders(): Promise<void> {
  if (inFlight) {
    rerunRequested = true;
    return inFlight;
  }

  useReminderStatus.setState({ busy: true });

  inFlight = (async () => {
    try {
      do {
        rerunRequested = false;
        await runOnce();
      } while (rerunRequested);
    } catch {
      // A scheduler that throws wholesale leaves the app fully usable; the
      // status simply stops advancing and the next trigger tries again.
    } finally {
      inFlight = null;
      rerunRequested = false;
      useReminderStatus.setState({ busy: false });
    }
  })();

  return inFlight;
}

/**
 * Ask for notification permission, then reconcile.
 *
 * The *only* path to a permission prompt in this feature, and every caller is
 * a direct user action: the reminder switch on a set, the master switch in
 * settings, or saving a set from the detail screen. Never called on launch,
 * never called from `reconcileReminders`.
 */
export async function requestReminderPermission(): Promise<ReminderPermission> {
  if (!defaultScheduler.supported) return 'undetermined';
  const permission = await defaultScheduler.requestPermission();
  useReminderStatus.setState({ permission });
  await reconcileReminders();
  return permission;
}

/* ------------------------------------------------------------------ */
/* Change subscriptions                                                */
/* ------------------------------------------------------------------ */

let stopSync: (() => void) | null = null;
let syncRefCount = 0;

/**
 * Watch the two things that can invalidate the plan from inside the app:
 * the saved set list and the lead time (both in the shared store), and the
 * master switch and opt-outs (ours).
 *
 * Content changes — a set moved or cancelled by a sync — are not watched here
 * because they arrive as a new snapshot rather than a store write; they are
 * picked up by the reconcile that runs whenever a reminder-aware screen mounts.
 */
function startSync(): () => void {
  let lastFavorites = useAppStore.getState().favorites;
  let lastLead = useAppStore.getState().settings.reminderLeadMinutes;
  let lastEnabled = useReminderPrefs.getState().enabled;
  let lastMuted = useReminderPrefs.getState().muted;

  const unsubscribeApp = useAppStore.subscribe((state) => {
    const lead = state.settings.reminderLeadMinutes;
    if (state.favorites === lastFavorites && lead === lastLead) return;
    lastFavorites = state.favorites;
    lastLead = lead;
    void reconcileReminders();
  });

  const unsubscribePrefs = useReminderPrefs.subscribe((state) => {
    if (state.enabled === lastEnabled && state.muted === lastMuted) return;
    lastEnabled = state.enabled;
    lastMuted = state.muted;
    void reconcileReminders();
  });

  return () => {
    unsubscribeApp();
    unsubscribePrefs();
  };
}

/**
 * Ref-counted so several reminder-aware screens can be mounted at once without
 * stacking duplicate subscriptions or tearing the shared one down early.
 */
export function acquireReminderSync(): () => void {
  syncRefCount += 1;
  stopSync ??= startSync();
  void reconcileReminders();

  let released = false;
  return () => {
    if (released) return;
    released = true;
    syncRefCount -= 1;
    if (syncRefCount <= 0) {
      syncRefCount = 0;
      stopSync?.();
      stopSync = null;
    }
  };
}

/** The reminder keys currently held by the OS, read without subscribing. */
export function scheduledReminderKeys(): string[] {
  return useReminderStatus.getState().scheduledKeys;
}
