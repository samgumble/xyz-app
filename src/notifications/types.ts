/**
 * Shared vocabulary for local set reminders.
 *
 * Nothing here imports `expo-notifications`, React, or the content snapshot —
 * it is the contract the pure planner (`plan.ts`), the platform adapter
 * (`scheduler.ts` / `scheduler.web.ts`) and the reconciler (`controller.ts`)
 * all agree on, which is what lets the interesting half be unit tested with no
 * native module in the room.
 */

/** OS-level permission for showing a notification. */
export type ReminderPermission = 'granted' | 'denied' | 'undetermined';

/** Why local scheduling is unavailable on this platform. */
export type UnsupportedReason = 'web' | 'unavailable';

export interface ReminderSupport {
  supported: boolean;
  reason?: UnsupportedReason;
  /** Plain-language sentence the UI shows instead of a toggle that would lie. */
  message: string;
}

/**
 * One thing a reminder could be about: a saved schedule entry.
 *
 * It is an *entry*, not a `FestivalSet` — a combined comedy bill is four set
 * ids behind one slot, and four notifications for one slot is a bug. Built by
 * `subjects.ts`; every field is already formatted in festival time so the
 * planner never has to touch a clock or a timezone.
 */
export interface ReminderSubject {
  /** Stable across launches: the schedule entry id. */
  key: string;
  /** Every set id folded into this entry. */
  setIds: string[];
  /** `Samantha Fish` — the notification title. */
  title: string;
  stageName: string;
  /** `6:30 PM`, already in festival time. */
  timeLabel: string;
  /** ISO with offset, kept for debugging and deep links. */
  start: string;
  startMs: number;
}

/** A reminder the planner says should exist right now. */
export interface PlannedReminder {
  key: string;
  setIds: string[];
  /** Epoch ms the notification should fire at. */
  fireAtMs: number;
  startMs: number;
  leadMinutes: number;
  title: string;
  body: string;
  /**
   * Everything that would make an already-scheduled reminder wrong, folded
   * into one comparable string. Two reminders with the same key and the same
   * signature are the same reminder — that equality is what makes
   * reconciliation idempotent.
   */
  signature: string;
}

/**
 * Why a saved set got no reminder. Surfaced in the UI rather than swallowed:
 * a user who saved something 3 minutes before doors deserves to be told the
 * lead time has already gone by, not left waiting for a buzz.
 */
export type SkipReason =
  | 'disabled'
  | 'muted'
  | 'past'
  | 'lead-window-passed'
  | 'beyond-horizon'
  | 'over-cap';

export interface SkippedReminder {
  key: string;
  reason: SkipReason;
}

export interface ReminderPlan {
  /** Sorted by fire time, earliest first. */
  scheduled: PlannedReminder[];
  skipped: SkippedReminder[];
}

/** A reminder the OS is actually holding, read back from the scheduler. */
export interface ScheduledRecord {
  /** The OS notification identifier, needed to cancel it. */
  identifier: string;
  key: string;
  signature: string;
}

export interface ReminderDiff {
  /** Not scheduled yet, or scheduled with a stale signature. */
  schedule: PlannedReminder[];
  /** Stale, orphaned, or a duplicate of one we are keeping. */
  cancel: ScheduledRecord[];
  /** Already correct — left alone, which is the whole point. */
  keep: ScheduledRecord[];
}

/**
 * The side-effecting half, behind an interface so tests can substitute a fake
 * and the web build can substitute an honest no-op.
 */
export interface ReminderScheduler {
  /** False on web, where `expo-notifications` cannot schedule locally. */
  readonly supported: boolean;
  getPermission(): Promise<ReminderPermission>;
  /** Only ever called from an explicit user action. Never on launch. */
  requestPermission(): Promise<ReminderPermission>;
  /** Pending reminders *this feature* scheduled, ignoring anything else. */
  list(): Promise<ScheduledRecord[]>;
  /** Resolves to the OS identifier, or null when scheduling is unavailable. */
  schedule(reminder: PlannedReminder): Promise<string | null>;
  cancel(identifier: string): Promise<void>;
}
