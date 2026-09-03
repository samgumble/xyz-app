/**
 * The React surface of local reminders.
 *
 * Screens never touch the scheduler or the planner directly — they read one of
 * these hooks, which resolve "supported?", "permitted?", "on?" and "actually
 * scheduled?" into something a component can render without reasoning about
 * any of it. In particular, nothing here requests permission on mount; the
 * only prompt is inside a callback a person has to tap.
 */

import { useCallback, useEffect, useMemo } from 'react';

import { useAppStore, type ReminderLeadMinutes } from '@/store/useAppStore';

import {
  acquireReminderSync,
  requestReminderPermission,
  useReminderStatus,
} from './controller';
import { explainSetReminder } from './messages';
import { useReminderPrefs } from './prefs';
import type { ReminderPermission, SkipReason } from './types';

/**
 * Keeps reminders converged for as long as a reminder-aware screen is mounted:
 * one reconcile now, then one after every change to saved sets, lead time, the
 * master switch, or a per-set opt-out. Ref-counted, so mounting three of these
 * at once still means one subscription and one pass.
 */
export function useReminderSync(): void {
  useEffect(() => acquireReminderSync(), []);
}

export interface ReminderSettings {
  supported: boolean;
  supportMessage: string;
  permission: ReminderPermission;
  /** The master switch as the user set it, before permission is considered. */
  enabled: boolean;
  /** True only when a reminder would genuinely fire. */
  active: boolean;
  /** How many reminders the OS is holding right now. */
  scheduledCount: number;
  leadMinutes: ReminderLeadMinutes;
  busy: boolean;
  setEnabled(value: boolean): void;
  setLeadMinutes(value: ReminderLeadMinutes): void;
}

/** Everything the settings section needs, including the honest bad news. */
export function useReminderSettings(): ReminderSettings {
  useReminderSync();

  const supported = useReminderStatus((s) => s.supported);
  const supportMessage = useReminderStatus((s) => s.supportMessage);
  const permission = useReminderStatus((s) => s.permission);
  const scheduledKeys = useReminderStatus((s) => s.scheduledKeys);
  const busy = useReminderStatus((s) => s.busy);

  const enabled = useReminderPrefs((s) => s.enabled);
  const setPrefEnabled = useReminderPrefs((s) => s.setEnabled);

  const leadMinutes = useAppStore((s) => s.settings.reminderLeadMinutes);
  const updateSettings = useAppStore((s) => s.updateSettings);

  const setEnabled = useCallback(
    (value: boolean) => {
      setPrefEnabled(value);
      // Turning the switch on is the in-context moment to ask. Turning it off
      // never asks, and the reconcile that follows cancels everything.
      if (value && permission === 'undetermined') void requestReminderPermission();
    },
    [permission, setPrefEnabled],
  );

  const setLeadMinutes = useCallback(
    (value: ReminderLeadMinutes) => {
      // The reconcile that follows this write reschedules every pending
      // reminder, because the lead time is part of each one's signature.
      updateSettings({ reminderLeadMinutes: value });
    },
    [updateSettings],
  );

  return {
    supported,
    supportMessage,
    permission,
    enabled,
    active: supported && enabled && permission === 'granted',
    scheduledCount: scheduledKeys.length,
    leadMinutes,
    busy,
    setEnabled,
    setLeadMinutes,
  };
}

export interface SetReminderControl {
  supported: boolean;
  supportMessage: string;
  /** Toggle position — the user's intent, not the OS's current state. */
  on: boolean;
  /** True when the OS is actually holding a reminder for this slot. */
  scheduled: boolean;
  disabled: boolean;
  leadMinutes: ReminderLeadMinutes;
  permission: ReminderPermission;
  /** Set when the slot is saved and wanted but will not fire, and why. */
  skipReason: SkipReason | null;
  /** One sentence of plain truth about the current state. */
  explanation: string;
  toggle(value: boolean): void;
}

/**
 * The reminder control for one schedule entry.
 *
 * `key` is the entry id, not a set id, so a combined bill is one reminder and
 * one switch. `setIds` lets the toggle save the slot if it is not saved yet —
 * turning a reminder on for something you have not saved should just work.
 */
export function useSetReminder(key: string, setIds: readonly string[]): SetReminderControl {
  useReminderSync();

  const supported = useReminderStatus((s) => s.supported);
  const supportMessage = useReminderStatus((s) => s.supportMessage);
  const permission = useReminderStatus((s) => s.permission);
  const scheduledKeys = useReminderStatus((s) => s.scheduledKeys);
  const skipped = useReminderStatus((s) => s.skipped);

  const enabled = useReminderPrefs((s) => s.enabled);
  const muted = useReminderPrefs((s) => s.muted);
  const setPrefEnabled = useReminderPrefs((s) => s.setEnabled);
  const setMuted = useReminderPrefs((s) => s.setMuted);

  const favorites = useAppStore((s) => s.favorites);
  const toggleFavorite = useAppStore((s) => s.toggleFavorite);
  const leadMinutes = useAppStore((s) => s.settings.reminderLeadMinutes);

  const saved = useMemo(() => setIds.some((id) => favorites.includes(id)), [favorites, setIds]);
  const isMuted = muted.includes(key);
  const on = saved && enabled && !isMuted;
  const scheduled = scheduledKeys.includes(key);
  const skipReason = useMemo(
    () => skipped.find((entry) => entry.key === key)?.reason ?? null,
    [key, skipped],
  );

  const toggle = useCallback(
    (value: boolean) => {
      if (!supported) return;
      if (value) {
        // Saving it is part of turning the reminder on: a reminder for a set
        // you have not saved would vanish the moment reconciliation ran.
        for (const id of setIds) {
          if (!favorites.includes(id)) toggleFavorite(id);
        }
        setMuted(key, false);
        if (!enabled) setPrefEnabled(true);
        if (permission === 'undetermined') void requestReminderPermission();
      } else {
        setMuted(key, true);
      }
    },
    [
      enabled,
      favorites,
      key,
      permission,
      setIds,
      setMuted,
      setPrefEnabled,
      supported,
      toggleFavorite,
    ],
  );

  return {
    supported,
    supportMessage,
    on,
    scheduled,
    // On web there is nothing to switch. Elsewhere the switch always works —
    // a denied permission still lets you express the intent, and the sentence
    // underneath explains why nothing will arrive until it is granted.
    disabled: !supported,
    leadMinutes,
    permission,
    skipReason: on ? skipReason : null,
    explanation: explainSetReminder({
      supported,
      supportMessage,
      saved,
      on,
      scheduled,
      permission,
      leadMinutes,
      skipReason: on ? skipReason : null,
    }),
    toggle,
  };
}

/**
 * Called when a set is saved from the set detail screen.
 *
 * This is the moment plan 06 §4 and CLAUDE.md both name: the first save is
 * when a person has demonstrated they want to be told about a set, so it is
 * the honest place to ask. It asks once — `undetermined` is only true before
 * the first prompt — and it asks *after* the save, so the app is already doing
 * the thing they tapped for whether or not they say yes.
 */
export function useRequestPermissionOnSave(): (nowSaved: boolean) => void {
  const permission = useReminderStatus((s) => s.permission);
  const supported = useReminderStatus((s) => s.supported);
  const enabled = useReminderPrefs((s) => s.enabled);

  return useCallback(
    (nowSaved: boolean) => {
      if (!nowSaved || !supported || !enabled) return;
      if (permission !== 'undetermined') return;
      void requestReminderPermission();
    },
    [enabled, permission, supported],
  );
}
