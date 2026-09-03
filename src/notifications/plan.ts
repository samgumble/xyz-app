/**
 * The decision half of local reminders: given what is saved, how much warning
 * the user asked for, and what time it is, what *should* be scheduled — and
 * what has to change to get from what the OS is holding to that.
 *
 * Deliberately pure. No `expo-notifications`, no React, no snapshot, no
 * `new Date()`: every input arrives as an argument, so the reconciliation
 * rules that are easy to get quietly wrong are the part that is easy to test.
 */

import type {
  PlannedReminder,
  ReminderDiff,
  ReminderPlan,
  ReminderSubject,
  ScheduledRecord,
  SkippedReminder,
} from './types';

const MINUTE_MS = 60_000;
const DAY_MS = 24 * 60 * MINUTE_MS;

/**
 * Plan 06 §5: only schedule inside the next week. Past that, a reminder is a
 * promise the OS may not keep, and it burns one of a strictly limited number
 * of pending slots.
 */
export const DEFAULT_HORIZON_DAYS = 7;

/**
 * iOS silently drops pending local notifications past 64 per app, keeping the
 * *earliest* 64 and discarding the rest. Staying under it with headroom means
 * the cap is ours to enforce visibly rather than the platform's to enforce
 * invisibly.
 */
export const DEFAULT_MAX_PENDING = 60;

export interface ReminderPlanInput {
  /** One per saved schedule entry. Duplicate keys are folded, first wins. */
  subjects: ReminderSubject[];
  leadMinutes: number;
  nowMs: number;
  /** Master switch AND permission, resolved by the caller into one boolean. */
  enabled: boolean;
  /** Entry keys the user turned off individually. */
  mutedKeys?: readonly string[];
  horizonDays?: number;
  maxPending?: number;
}

/**
 * Everything that would make an already-scheduled reminder wrong.
 *
 * Start time is in it, so a set that moves reschedules. Lead time is in it, so
 * changing the lead reschedules everything. Title, stage and time label are in
 * it, so a set that gets renamed or moved to another stage reschedules with
 * correct text instead of quietly announcing the old one. Set ids are in it,
 * so a comedian joining a combined bill refreshes the slot.
 */
export function reminderSignature(subject: ReminderSubject, leadMinutes: number): string {
  return [
    subject.startMs,
    leadMinutes,
    [...subject.setIds].sort().join(','),
    subject.title,
    subject.stageName,
    subject.timeLabel,
  ].join('|');
}

function buildReminder(subject: ReminderSubject, leadMinutes: number): PlannedReminder {
  return {
    key: subject.key,
    setIds: [...subject.setIds],
    fireAtMs: subject.startMs - leadMinutes * MINUTE_MS,
    startMs: subject.startMs,
    leadMinutes,
    title: subject.title,
    body: `Starts in ${leadMinutes} min · ${subject.stageName} at ${subject.timeLabel}`,
    signature: reminderSignature(subject, leadMinutes),
  };
}

/**
 * What should be scheduled right now.
 *
 * The rules, in order, and each one exists because of a real failure:
 *
 * 1. Master off (or permission not granted) → nothing. Not "leave what's
 *    there"; nothing. Turning reminders off has to actually silence the phone.
 * 2. Duplicate subject keys collapse to one. A combined bill must not produce
 *    one reminder per performer.
 * 3. A set that has already started never schedules. Saving last night's
 *    headliner to remember you saw them must not buzz.
 * 4. A set whose lead window has already passed never schedules either — the
 *    OS would either fire it instantly or reject it, and both are worse than
 *    saying "too soon" in the UI.
 * 5. Beyond the horizon → skipped, to be picked up by a later reconcile.
 * 6. Earliest first, then the cap. If someone saves a hundred sets, they get
 *    the next sixty, not an arbitrary sixty.
 */
export function planReminders(input: ReminderPlanInput): ReminderPlan {
  const {
    subjects,
    leadMinutes,
    nowMs,
    enabled,
    mutedKeys = [],
    horizonDays = DEFAULT_HORIZON_DAYS,
    maxPending = DEFAULT_MAX_PENDING,
  } = input;

  const skipped: SkippedReminder[] = [];

  // Rule 2 — fold duplicate keys before anything else, so a repeated subject
  // cannot be counted twice against the cap either.
  const unique = new Map<string, ReminderSubject>();
  for (const subject of subjects) {
    if (!unique.has(subject.key)) unique.set(subject.key, subject);
  }

  if (!enabled) {
    return {
      scheduled: [],
      skipped: [...unique.keys()].map((key) => ({ key, reason: 'disabled' as const })),
    };
  }

  const muted = new Set(mutedKeys);
  const horizonMs = nowMs + horizonDays * DAY_MS;
  const candidates: PlannedReminder[] = [];

  for (const subject of unique.values()) {
    if (muted.has(subject.key)) {
      skipped.push({ key: subject.key, reason: 'muted' });
      continue;
    }
    if (subject.startMs <= nowMs) {
      skipped.push({ key: subject.key, reason: 'past' });
      continue;
    }
    const reminder = buildReminder(subject, leadMinutes);
    if (reminder.fireAtMs <= nowMs) {
      skipped.push({ key: subject.key, reason: 'lead-window-passed' });
      continue;
    }
    if (reminder.fireAtMs > horizonMs) {
      skipped.push({ key: subject.key, reason: 'beyond-horizon' });
      continue;
    }
    candidates.push(reminder);
  }

  candidates.sort((a, b) => a.fireAtMs - b.fireAtMs || a.key.localeCompare(b.key));

  const scheduled = candidates.slice(0, Math.max(0, maxPending));
  for (const over of candidates.slice(Math.max(0, maxPending))) {
    skipped.push({ key: over.key, reason: 'over-cap' });
  }

  return { scheduled, skipped };
}

/**
 * The move from "what the OS is holding" to "what the plan says", expressed as
 * the smallest set of cancels and schedules that gets there.
 *
 * Idempotence lives here: a record whose key *and* signature already match the
 * plan is kept untouched, so running this twice in a row does nothing the
 * second time. Anything the plan does not mention is cancelled — that single
 * rule covers unsaving, a cancelled set vanishing from the content update, a
 * set sliding into the past, and the master switch going off, without any of
 * them needing their own code path.
 *
 * Duplicate records for one key can exist if a previous run was interrupted
 * between scheduling and persisting, or if two reconciles raced. Exactly one
 * survives and the rest are cancelled, so a duplicate can never compound.
 */
export function diffReminders(
  existing: readonly ScheduledRecord[],
  planned: readonly PlannedReminder[],
): ReminderDiff {
  const wanted = new Map(planned.map((reminder) => [reminder.key, reminder]));

  const keep: ScheduledRecord[] = [];
  const cancel: ScheduledRecord[] = [];
  const satisfied = new Set<string>();

  for (const record of existing) {
    const target = wanted.get(record.key);
    if (!target || target.signature !== record.signature || satisfied.has(record.key)) {
      cancel.push(record);
      continue;
    }
    satisfied.add(record.key);
    keep.push(record);
  }

  const schedule = planned.filter((reminder) => !satisfied.has(reminder.key));

  return { schedule, cancel, keep };
}
