import announcementsJson from '@/assets/snapshot/announcements.json';
import artistsJson from '@/assets/snapshot/artists.json';
import beersJson from '@/assets/snapshot/beers.json';
import breweriesJson from '@/assets/snapshot/breweries.json';
import festivalJson from '@/assets/snapshot/festival.json';
import infoJson from '@/assets/snapshot/info.json';
import placesJson from '@/assets/snapshot/places.json';
import scheduleJson from '@/assets/snapshot/schedule.json';
import sessionsJson from '@/assets/snapshot/sessions.json';
import stagesJson from '@/assets/snapshot/stages.json';
import vendorsJson from '@/assets/snapshot/vendors.json';
import type {
  Announcement,
  Artist,
  Beer,
  Brewery,
  ContentSnapshot,
  Festival,
  FestivalSet,
  InfoPage,
  Place,
  ShowcaseSession,
  Stage,
  Vendor,
} from '@/types/content';

/**
 * The snapshot bundled with the binary. It is the offline floor: the app must
 * be fully usable from this alone, forever, with no network. `sync.ts` may
 * replace it at runtime with fresher published content, but never removes it.
 */
export const bundledSnapshot: ContentSnapshot = {
  festival: festivalJson as unknown as Festival,
  stages: stagesJson as unknown as Stage[],
  artists: artistsJson as unknown as Artist[],
  schedule: scheduleJson as unknown as FestivalSet[],
  breweries: breweriesJson as unknown as Brewery[],
  beers: beersJson as unknown as Beer[],
  sessions: sessionsJson as unknown as ShowcaseSession[],
  places: placesJson as unknown as Place[],
  vendors: vendorsJson as unknown as Vendor[],
  announcements: announcementsJson as unknown as Announcement[],
  info: infoJson as unknown as InfoPage[],
};

let active: ContentSnapshot = bundledSnapshot;

/** The snapshot every query reads from. Cheap; call it freely. */
export function getSnapshot(): ContentSnapshot {
  return active;
}

/**
 * Swaps in freshly synced content. Rejects a snapshot that fails validation so
 * a bad publish can never take the app down — the previous one stays live.
 * Returns the problems found, empty when the swap succeeded.
 */
export function setSnapshot(next: ContentSnapshot): string[] {
  const issues = validateSnapshot(next);
  if (issues.length === 0) {
    active = next;
  }
  return issues;
}

/** Drops back to the bundled content. Used by tests and by "reset data". */
export function resetSnapshot(): void {
  active = bundledSnapshot;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function requireFields(
  issues: string[],
  where: string,
  row: unknown,
  index: number,
  fields: readonly string[],
): void {
  if (!isRecord(row)) {
    issues.push(`${where}[${index}] is not an object`);
    return;
  }
  for (const field of fields) {
    if (row[field] === undefined || row[field] === null || row[field] === '') {
      issues.push(`${where}[${index}] is missing "${field}"`);
    }
  }
}

function checkArray(
  issues: string[],
  where: string,
  rows: unknown,
  fields: readonly string[],
): unknown[] {
  if (!Array.isArray(rows)) {
    issues.push(`${where} is not an array`);
    return [];
  }
  rows.forEach((row, i) => requireFields(issues, where, row, i, fields));
  return rows;
}

/**
 * Structural and referential validation, in the same spirit as `validate.ts`
 * in `tbb-content` — every set points at a real artist and a real stage, every
 * beer at a real brewery and real sessions, every vendor at a real place.
 * Returns human-readable problems rather than throwing, so a caller can decide
 * whether to reject an update or merely complain.
 */
export function validateSnapshot(candidate: ContentSnapshot): string[] {
  const issues: string[] = [];

  if (!isRecord(candidate.festival)) {
    issues.push('festival is not an object');
  } else {
    for (const field of ['id', 'name', 'timezone'] as const) {
      if (!candidate.festival[field]) issues.push(`festival is missing "${field}"`);
    }
    if (!candidate.festival.dates?.start || !candidate.festival.dates?.end) {
      issues.push('festival.dates must have start and end');
    }
  }

  checkArray(issues, 'stages', candidate.stages, ['id', 'name', 'shortName', 'kind']);
  checkArray(issues, 'artists', candidate.artists, ['slug', 'name', 'bio']);
  checkArray(issues, 'schedule', candidate.schedule, ['id', 'artist', 'stage', 'start', 'end', 'type']);
  checkArray(issues, 'breweries', candidate.breweries, ['id', 'name', 'city']);
  checkArray(issues, 'beers', candidate.beers, ['id', 'brewery', 'name', 'style']);
  checkArray(issues, 'sessions', candidate.sessions, ['id', 'name', 'day', 'start', 'end']);
  checkArray(issues, 'places', candidate.places, ['id', 'name', 'kind']);
  checkArray(issues, 'vendors', candidate.vendors, ['id', 'name', 'kind', 'place']);
  checkArray(issues, 'announcements', candidate.announcements, ['id', 'publishedAt', 'title', 'priority']);
  checkArray(issues, 'info', candidate.info, ['slug', 'title', 'body']);

  if (issues.length > 0) return issues;

  const stageIds = new Set(candidate.stages.map((s) => s.id));
  const artistSlugs = new Set(candidate.artists.map((a) => a.slug));
  const breweryIds = new Set(candidate.breweries.map((b) => b.id));
  const sessionIds = new Set(candidate.sessions.map((s) => s.id));
  const placeIds = new Set(candidate.places.map((p) => p.id));

  for (const set of candidate.schedule) {
    if (!artistSlugs.has(set.artist)) issues.push(`schedule "${set.id}" references unknown artist "${set.artist}"`);
    if (!stageIds.has(set.stage)) issues.push(`schedule "${set.id}" references unknown stage "${set.stage}"`);
    if (Number.isNaN(Date.parse(set.start))) issues.push(`schedule "${set.id}" has an unparseable start`);
    if (Number.isNaN(Date.parse(set.end))) issues.push(`schedule "${set.id}" has an unparseable end`);
    if (Date.parse(set.end) <= Date.parse(set.start)) issues.push(`schedule "${set.id}" ends before it starts`);
  }

  for (const beer of candidate.beers) {
    if (!breweryIds.has(beer.brewery)) issues.push(`beer "${beer.id}" references unknown brewery "${beer.brewery}"`);
    for (const session of beer.sessions) {
      if (!sessionIds.has(session)) issues.push(`beer "${beer.id}" references unknown session "${session}"`);
    }
  }

  for (const vendor of candidate.vendors) {
    if (!placeIds.has(vendor.place)) issues.push(`vendor "${vendor.id}" references unknown place "${vendor.place}"`);
  }

  const setIds = new Set<string>();
  for (const set of candidate.schedule) {
    if (setIds.has(set.id)) issues.push(`duplicate set id "${set.id}"`);
    setIds.add(set.id);
  }

  return issues;
}

/** Problems found in the bundled snapshot at import time. Should stay empty. */
export const bundledSnapshotIssues: string[] = validateSnapshot(bundledSnapshot);

if (__DEV__ && bundledSnapshotIssues.length > 0) {
  // A bad bundle is a build-time mistake; surface it loudly in development but
  // never crash a festivalgoer's phone over it.
  console.warn(`Bundled snapshot has ${bundledSnapshotIssues.length} problem(s):`, bundledSnapshotIssues);
}
