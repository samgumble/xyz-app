import type { SetType, StageId } from '@/types/content';

import { searchHaystack, type ScheduleEntry } from './model';

export interface ScheduleFilters {
  /** Empty means "every stage" — an explicit list is a narrowing. */
  stageIds: StageId[];
  types: SetType[];
  favoritesOnly: boolean;
  query: string;
}

export const EMPTY_FILTERS: ScheduleFilters = {
  stageIds: [],
  types: [],
  favoritesOnly: false,
  query: '',
};

export function isFiltered(filters: ScheduleFilters): boolean {
  return (
    filters.stageIds.length > 0 ||
    filters.types.length > 0 ||
    filters.favoritesOnly ||
    filters.query.trim().length > 0
  );
}

/** How many filters are active — drives the count on the Filters button. */
export function activeFilterCount(filters: ScheduleFilters): number {
  return (
    filters.stageIds.length +
    filters.types.length +
    (filters.favoritesOnly ? 1 : 0) +
    (filters.query.trim().length > 0 ? 1 : 0)
  );
}

export function toggleInList<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

/**
 * Narrows a day's entries. Search matches artist names and stage names only —
 * a festivalgoer types "Samantha" or "campground", not a set type.
 */
export function applyFilters(
  entries: ScheduleEntry[],
  filters: ScheduleFilters,
  favorites: ReadonlySet<string>,
): ScheduleEntry[] {
  const needle = filters.query.trim().toLowerCase();
  return entries.filter((entry) => {
    if (filters.stageIds.length > 0 && !filters.stageIds.includes(entry.stage.id)) return false;
    if (filters.types.length > 0 && !filters.types.includes(entry.type)) return false;
    if (filters.favoritesOnly && !entry.setIds.some((id) => favorites.has(id))) return false;
    if (needle.length > 0 && !searchHaystack(entry).includes(needle)) return false;
    return true;
  });
}
