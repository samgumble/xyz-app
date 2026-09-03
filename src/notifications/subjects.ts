/**
 * The bridge from saved set ids to the planner's input.
 *
 * This is where content is read and where the festival clock is consulted, so
 * that `plan.ts` can stay pure. Both imports go to the modules rather than the
 * feature barrel: the barrel also exports screens, which would drag
 * `expo-router` into anything that only wants reminder arithmetic.
 */

import { formatTime } from '@/data/time';
import { entryForSet } from '@/features/schedule/model';

import type { ReminderSubject } from './types';

/**
 * One subject per saved *slot*.
 *
 * Three things happen here, all of them load-bearing:
 *
 * - A saved id that no longer resolves is dropped. That is how a cancelled set
 *   loses its reminder: it stops producing a subject, so the reconciler finds
 *   an orphaned pending notification and cancels it. No special case needed.
 * - Ids are folded through `entryForSet`, so the four set ids of a combined
 *   comedy bill collapse into the single slot they actually are.
 * - Times are formatted in the festival timezone here, once, so no downstream
 *   code does wall-clock arithmetic on an ISO string.
 */
export function buildReminderSubjects(favoriteIds: readonly string[]): ReminderSubject[] {
  const byKey = new Map<string, ReminderSubject>();

  for (const setId of favoriteIds) {
    const entry = entryForSet(setId);
    if (!entry) continue;
    if (byKey.has(entry.id)) continue;

    const startMs = Date.parse(entry.start);
    if (Number.isNaN(startMs)) continue;

    byKey.set(entry.id, {
      key: entry.id,
      setIds: entry.setIds,
      title: entry.title,
      stageName: entry.stage.name,
      timeLabel: formatTime(entry.start),
      start: entry.start,
      startMs,
    });
  }

  return [...byKey.values()];
}

/** The reminder key a given set id belongs to, or null if it no longer exists. */
export function reminderKeyForSet(setId: string): string | null {
  return entryForSet(setId)?.id ?? null;
}
