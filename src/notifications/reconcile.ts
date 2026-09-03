/**
 * One full reconciliation pass, against any scheduler.
 *
 * Split out from `controller.ts` so it imports nothing platform-specific —
 * no `expo-notifications`, no React, no store. That is what lets the tests
 * drive the real convergence path with a fake OS and a fixed clock.
 *
 * There is no incremental bookkeeping on purpose. Every trigger runs this same
 * pass: read what the OS is holding, compute what should be held, apply the
 * difference. "Unsaved", "lead time changed", "set moved", "set cancelled" and
 * "relaunched after a reboot" are therefore not five code paths that can each
 * be subtly wrong — they are five inputs to one.
 */

import { diffReminders, planReminders, type ReminderPlanInput } from './plan';
import type { ReminderPlan, ReminderScheduler } from './types';

export interface ReconcileOutcome {
  plan: ReminderPlan;
  /** Newly scheduled this pass. Zero on a repeat run — that is the point. */
  created: number;
  cancelled: number;
  /** Already correct and left alone. */
  kept: number;
  /** The OS refused one. Counted, not thrown: one bad slot is not an outage. */
  failed: number;
  /** Reminder keys the OS is holding once the pass finishes. */
  scheduledKeys: string[];
}

/**
 * Cancels run before schedules so a moved set releases its slot before its
 * replacement claims one — which matters when sitting against the platform's
 * pending-notification cap.
 */
export async function applyReminderPlan(
  scheduler: ReminderScheduler,
  input: ReminderPlanInput,
): Promise<ReconcileOutcome> {
  const plan = planReminders(input);
  const existing = await scheduler.list();
  const diff = diffReminders(existing, plan.scheduled);

  let cancelled = 0;
  for (const record of diff.cancel) {
    try {
      await scheduler.cancel(record.identifier);
      cancelled += 1;
    } catch {
      // A notification the OS already delivered, or forgot, cannot be
      // cancelled. Nothing to repair: the next pass reads the queue fresh.
    }
  }

  let created = 0;
  let failed = 0;
  const scheduledKeys = diff.keep.map((record) => record.key);
  for (const reminder of diff.schedule) {
    try {
      const identifier = await scheduler.schedule(reminder);
      if (identifier === null) {
        failed += 1;
        continue;
      }
      created += 1;
      scheduledKeys.push(reminder.key);
    } catch {
      failed += 1;
    }
  }

  return { plan, created, cancelled, kept: diff.keep.length, failed, scheduledKeys };
}
