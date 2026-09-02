import { getSet } from '@/data/repository';
import { toFestivalDay } from '@/data/time';
// Imported from the modules rather than the feature barrel on purpose: the
// barrel also exports screens, which would pull expo-router and the whole
// React Native surface into anything that only wants the plan arithmetic.
import { entryConflicts, type EntryConflict } from '@/features/schedule/conflicts';
import { buildEntries, type ScheduleEntry } from '@/features/schedule/model';
import type { FestivalSet } from '@/types/content';

export interface WeekendDay {
  /** Festival-local `YYYY-MM-DD`. */
  day: string;
  entries: ScheduleEntry[];
}

export interface WeekendPlan {
  days: WeekendDay[];
  entries: ScheduleEntry[];
  conflicts: EntryConflict[];
  /** Total minutes of music saved — the summary line's headline number. */
  totalMinutes: number;
  stageCount: number;
  artistCount: number;
}

/**
 * Turns the store's flat list of saved set ids into the plan the screen shows.
 *
 * Ids that no longer resolve are dropped rather than throwing: a favourite can
 * outlive a schedule change, and the right behaviour is to quietly forget it,
 * not to break the screen.
 */
export function buildWeekendPlan(favoriteIds: string[]): WeekendPlan {
  const sets = favoriteIds
    .map((id) => getSet(id))
    .filter((set): set is FestivalSet => set !== undefined);

  const entries = buildEntries(sets);

  const byDay = new Map<string, ScheduleEntry[]>();
  for (const entry of entries) {
    const day = toFestivalDay(entry.start);
    const bucket = byDay.get(day);
    if (bucket) bucket.push(entry);
    else byDay.set(day, [entry]);
  }

  const days: WeekendDay[] = [...byDay.entries()]
    .map(([day, dayEntries]) => ({
      day,
      entries: [...dayEntries].sort((a, b) => a.startMs - b.startMs || a.stage.id.localeCompare(b.stage.id)),
    }))
    .sort((a, b) => a.day.localeCompare(b.day));

  const stages = new Set(entries.map((e) => e.stage.id));
  const artists = new Set(entries.flatMap((e) => e.artistSlugs));

  return {
    days,
    entries,
    conflicts: entryConflicts(sets.map((s) => s.id)),
    totalMinutes: entries.reduce((total, entry) => total + entry.minutes, 0),
    stageCount: stages.size,
    artistCount: artists.size,
  };
}

/** `4h 30m`, `45m` — for the summary line. */
export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours}h` : `${hours}h ${rest}m`;
}

/** True when this entry is one side of at least one clash. */
export function conflictsFor(plan: WeekendPlan, entryId: string): EntryConflict[] {
  return plan.conflicts.filter((c) => c.a.id === entryId || c.b.id === entryId);
}
