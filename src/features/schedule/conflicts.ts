import { findConflicts } from '@/data/repository';

import { entryForSet, type ScheduleEntry } from './model';

/**
 * A clash between two things a festivalgoer has saved, expressed in entries
 * rather than raw set ids.
 *
 * `findConflicts()` works on set ids, which is right for the repository and
 * noisy here: a four-hander comedy bill is four ids, so one real clash with a
 * main-stage act comes back four times. Folding to entries first and keeping
 * the worst overlap per pair reports it once, the way a person would say it.
 */
export interface EntryConflict {
  a: ScheduleEntry;
  b: ScheduleEntry;
  overlapMinutes: number;
}

function pairKey(a: string, b: string): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

/** Deduplicated clashes among a set of saved set ids, worst overlap first. */
export function entryConflicts(setIds: string[]): EntryConflict[] {
  const byPair = new Map<string, EntryConflict>();

  for (const raw of findConflicts(setIds)) {
    const a = entryForSet(raw.a);
    const b = entryForSet(raw.b);
    if (!a || !b || a.id === b.id) continue;

    const key = pairKey(a.id, b.id);
    const existing = byPair.get(key);
    if (existing && existing.overlapMinutes >= raw.overlapMinutes) continue;
    byPair.set(key, { a, b, overlapMinutes: raw.overlapMinutes });
  }

  return [...byPair.values()].sort(
    (x, y) => y.overlapMinutes - x.overlapMinutes || x.a.startMs - y.a.startMs,
  );
}

/**
 * What one entry clashes with, given everything already saved. The entry itself
 * is folded in first so the answer is the same whether or not it is saved yet.
 */
export function conflictsForEntry(
  entry: ScheduleEntry,
  savedSetIds: string[],
): { other: ScheduleEntry; overlapMinutes: number }[] {
  const candidates = new Set([...savedSetIds, ...entry.setIds]);
  return entryConflicts([...candidates])
    .filter((conflict) => conflict.a.id === entry.id || conflict.b.id === entry.id)
    .map((conflict) => ({
      other: conflict.a.id === entry.id ? conflict.b : conflict.a,
      overlapMinutes: conflict.overlapMinutes,
    }));
}
