import type {
  Announcement,
  Artist,
  ArtistSlug,
  Beer,
  Brewery,
  Festival,
  FestivalSet,
  InfoPage,
  Place,
  ShowcaseSession,
  Stage,
  StageId,
  Vendor,
} from '@/types/content';

import { getSnapshot } from './snapshot';
import { isLive, overlapMinutes, toFestivalDay } from './time';

/**
 * Every content query in the app lives here. Pure, synchronous, no React, no
 * network — routes and features call these and nothing else. Results are
 * sorted deterministically so screens never have to re-sort.
 */

const byStart = (a: FestivalSet, b: FestivalSet): number =>
  Date.parse(a.start) - Date.parse(b.start) || a.stage.localeCompare(b.stage);

export function getFestival(): Festival {
  return getSnapshot().festival;
}

export function getStages(): Stage[] {
  return getSnapshot().stages;
}

export function getStage(id: StageId): Stage | undefined {
  return getSnapshot().stages.find((s) => s.id === id);
}

export function getArtists(): Artist[] {
  return [...getSnapshot().artists].sort((a, b) => a.name.localeCompare(b.name));
}

export function getArtist(slug: ArtistSlug): Artist | undefined {
  return getSnapshot().artists.find((a) => a.slug === slug);
}

export function getHeadliners(): Artist[] {
  return getArtists().filter((a) => a.headliner === true);
}

export function getSets(): FestivalSet[] {
  return [...getSnapshot().schedule].sort(byStart);
}

export function getSet(id: string): FestivalSet | undefined {
  return getSnapshot().schedule.find((s) => s.id === id);
}

/** Every set whose *start* falls on the given festival-local calendar day. */
export function getSetsForDay(dayISO: string): FestivalSet[] {
  return getSets().filter((s) => toFestivalDay(s.start) === dayISO);
}

export function getSetsForArtist(slug: ArtistSlug): FestivalSet[] {
  return getSets().filter((s) => s.artist === slug);
}

export function getSetsForStage(id: StageId): FestivalSet[] {
  return getSets().filter((s) => s.stage === id);
}

/** `['2026-09-18', '2026-09-19', '2026-09-20']`, from `festival.dates`. */
export function getFestivalDays(): string[] {
  const { start, end } = getFestival().dates;
  const first = Date.parse(`${start.slice(0, 10)}T00:00:00Z`);
  const last = Date.parse(`${end.slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(first) || Number.isNaN(last) || last < first) return [];
  const days: string[] = [];
  const DAY_MS = 86_400_000;
  for (let t = first; t <= last; t += DAY_MS) {
    days.push(new Date(t).toISOString().slice(0, 10));
  }
  return days;
}

/**
 * One entry per stage: what is playing right now, and what is up next after it.
 * Stages with nothing live and nothing left still appear, with both fields
 * undefined, so the Home screen can render a stable list.
 */
export function getNowNext(at: Date): { stageId: StageId; now?: FestivalSet; next?: FestivalSet }[] {
  const now = at.getTime();
  return getStages().map((stage) => {
    const sets = getSetsForStage(stage.id);
    const live = sets.find((s) => isLive(s, at));
    const upcoming = sets.find((s) => Date.parse(s.start) > now);
    const entry: { stageId: StageId; now?: FestivalSet; next?: FestivalSet } = { stageId: stage.id };
    if (live) entry.now = live;
    if (upcoming) entry.next = upcoming;
    return entry;
  });
}

/** Matches artist name, stage name, set note, and set type. Empty query → []. */
export function searchSets(q: string): FestivalSet[] {
  const needle = q.trim().toLowerCase();
  if (needle.length === 0) return [];
  const artistNames = new Map(getSnapshot().artists.map((a) => [a.slug, a.name.toLowerCase()]));
  const stageNames = new Map(getSnapshot().stages.map((s) => [s.id, s.name.toLowerCase()]));
  return getSets().filter((set) => {
    const haystack = [
      artistNames.get(set.artist) ?? set.artist,
      stageNames.get(set.stage) ?? set.stage,
      set.type,
      set.note?.toLowerCase() ?? '',
    ].join(' ');
    return haystack.includes(needle);
  });
}

export function searchArtists(q: string): Artist[] {
  const needle = q.trim().toLowerCase();
  if (needle.length === 0) return getArtists();
  return getArtists().filter(
    (a) =>
      a.name.toLowerCase().includes(needle) ||
      a.tags.some((t) => t.toLowerCase().includes(needle)),
  );
}

export function getBreweries(): Brewery[] {
  return [...getSnapshot().breweries].sort((a, b) => a.name.localeCompare(b.name));
}

export function getBrewery(id: string): Brewery | undefined {
  return getSnapshot().breweries.find((b) => b.id === id);
}

export function getBeers(): Beer[] {
  return [...getSnapshot().beers].sort((a, b) => a.name.localeCompare(b.name));
}

export function getBeer(id: string): Beer | undefined {
  return getSnapshot().beers.find((b) => b.id === id);
}

export function getBeersForBrewery(id: string): Beer[] {
  return getBeers().filter((b) => b.brewery === id);
}

export function getBeersForSession(sessionId: string): Beer[] {
  return getBeers().filter((b) => b.sessions.includes(sessionId));
}

export function getSessions(): ShowcaseSession[] {
  return [...getSnapshot().sessions].sort((a, b) => Date.parse(a.start) - Date.parse(b.start));
}

export function getSession(id: string): ShowcaseSession | undefined {
  return getSnapshot().sessions.find((s) => s.id === id);
}

export function getPlaces(): Place[] {
  return getSnapshot().places;
}

export function getPlace(id: string): Place | undefined {
  return getSnapshot().places.find((p) => p.id === id);
}

export function getVendors(): Vendor[] {
  return [...getSnapshot().vendors].sort((a, b) => a.name.localeCompare(b.name));
}

export function getVendorsForPlace(placeId: string): Vendor[] {
  return getVendors().filter((v) => v.place === placeId);
}

/**
 * Published, not yet expired, newest first. An announcement scheduled for the
 * future stays hidden until its moment arrives.
 */
export function getActiveAnnouncements(at: Date): Announcement[] {
  const now = at.getTime();
  return getSnapshot()
    .announcements.filter((a) => {
      const published = Date.parse(a.publishedAt);
      if (Number.isNaN(published) || published > now) return false;
      if (!a.expiresAt) return true;
      const expires = Date.parse(a.expiresAt);
      return Number.isNaN(expires) ? true : expires > now;
    })
    .sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt));
}

/** Everything ever published, newest first — the Announcements feed. */
export function getAllAnnouncements(): Announcement[] {
  return [...getSnapshot().announcements].sort(
    (a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt),
  );
}

export function getAnnouncement(id: string): Announcement | undefined {
  return getSnapshot().announcements.find((a) => a.id === id);
}

export function getInfoPages(): InfoPage[] {
  return [...getSnapshot().info].sort((a, b) => a.order - b.order || a.title.localeCompare(b.title));
}

export function getInfoPage(slug: string): InfoPage | undefined {
  return getSnapshot().info.find((p) => p.slug === slug);
}

export interface SetConflict {
  a: string;
  b: string;
  overlapMinutes: number;
}

/**
 * Overlapping pairs among the given set ids. Each pair is reported once, with
 * `a` the earlier set. Sets on the same stage cannot conflict — they are the
 * same room, so you were never going to be in two places. Unknown ids are
 * ignored rather than throwing: a favourite can outlive a schedule change.
 */
export function findConflicts(setIds: string[]): SetConflict[] {
  const sets = setIds
    .map((id) => getSet(id))
    .filter((s): s is FestivalSet => s !== undefined)
    .sort(byStart);

  const conflicts: SetConflict[] = [];
  for (let i = 0; i < sets.length; i += 1) {
    const first = sets[i];
    if (!first) continue;
    for (let j = i + 1; j < sets.length; j += 1) {
      const second = sets[j];
      if (!second) continue;
      if (first.stage === second.stage) continue;
      // Sorted by start, so once one set starts after `first` ends, so do the rest.
      if (Date.parse(second.start) >= Date.parse(first.end)) break;
      const minutes = overlapMinutes(first, second);
      if (minutes > 0) {
        conflicts.push({ a: first.id, b: second.id, overlapMinutes: minutes });
      }
    }
  }
  return conflicts;
}
