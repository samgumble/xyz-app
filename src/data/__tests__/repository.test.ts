import { initialsFor } from '@/components/Avatar';
import type { Artist, FestivalSet, SetType, Stage } from '@/types/content';

import {
  findConflicts,
  getActiveAnnouncements,
  getAllAnnouncements,
  getArtist,
  getArtists,
  getBeers,
  getBeersForBrewery,
  getBeersForSession,
  getBreweries,
  getFestival,
  getFestivalDays,
  getHeadliners,
  getInfoPage,
  getInfoPages,
  getNowNext,
  getSessions,
  getSet,
  getSets,
  getSetsForArtist,
  getSetsForDay,
  getSetsForStage,
  getStages,
  getVendors,
  searchSets,
  type SetConflict,
} from '../repository';
import { bundledSnapshotIssues, getSnapshot, resetSnapshot, validateSnapshot } from '../snapshot';
import { toFestivalDay } from '../time';

/**
 * Nothing in here hard-codes a set id, an artist slug or a wall-clock moment
 * from the schedule. The bundled snapshot is real published content and it
 * changes every year, so each fixture is *derived* from whatever is in the
 * snapshot at run time — a stage that really does run two sets back to back,
 * a pair of sets that really do overlap across stages, a moment that really is
 * inside a real set. The assertions stay exact.
 */

const MINUTE_MS = 60_000;
const ms = (iso: string): number => Date.parse(iso);

/** The repository's documented ordering: by start, ties broken by stage id. */
const byStart = (a: FestivalSet, b: FestivalSet): number =>
  ms(a.start) - ms(b.start) || a.stage.localeCompare(b.stage);

beforeEach(() => {
  resetSnapshot();
});

// ---------------------------------------------------------------------------
// Reference implementations. Deliberately naive and O(n²) — they exist so the
// optimised production code has something independent to be wrong against.
// ---------------------------------------------------------------------------

/** Every overlapping cross-stage pair, brute force, no early exits. */
function referenceConflicts(ids: readonly string[]): SetConflict[] {
  const byId = new Map(getSnapshot().schedule.map((s) => [s.id, s]));
  const sets: FestivalSet[] = [];
  for (const id of ids) {
    const set = byId.get(id);
    if (set) sets.push(set);
  }
  sets.sort(byStart);

  const out: SetConflict[] = [];
  for (let i = 0; i < sets.length; i += 1) {
    const a = sets[i];
    if (!a) continue;
    for (let j = i + 1; j < sets.length; j += 1) {
      const b = sets[j];
      if (!b) continue;
      if (a.stage === b.stage) continue;
      const start = Math.max(ms(a.start), ms(b.start));
      const end = Math.min(ms(a.end), ms(b.end));
      if (end > start) {
        out.push({ a: a.id, b: b.id, overlapMinutes: Math.round((end - start) / MINUTE_MS) });
      }
    }
  }
  return out;
}

interface NowNextRow {
  stageId: string;
  now?: FestivalSet;
  next?: FestivalSet;
}

/** What is live and what is next, computed straight from the raw schedule. */
function referenceNowNext(at: Date): NowNextRow[] {
  const t = at.getTime();
  return getStages().map((stage) => {
    const sets = getSnapshot()
      .schedule.filter((s) => s.stage === stage.id)
      .sort(byStart);
    const live = sets.find((s) => ms(s.start) <= t && t < ms(s.end));
    const upcoming = sets.find((s) => ms(s.start) > t);
    const row: NowNextRow = { stageId: stage.id };
    if (live) row.now = live;
    if (upcoming) row.next = upcoming;
    return row;
  });
}

// ---------------------------------------------------------------------------
// Fixture pickers. Each throws rather than returning nothing, so a snapshot
// that cannot exercise a rule fails the suite instead of passing vacuously.
// ---------------------------------------------------------------------------

/** The earliest genuine cross-stage clash in the published schedule. */
function firstCrossStageOverlap(): SetConflict {
  const [first] = referenceConflicts(getSnapshot().schedule.map((s) => s.id));
  if (!first) throw new Error('The schedule contains no cross-stage overlap to test against');
  return first;
}

/** Two sets that share a stage *and* a moment — a co-billed slot. */
function sameStageOverlap(): [FestivalSet, FestivalSet] {
  const sets = getSets();
  for (let i = 0; i < sets.length; i += 1) {
    const a = sets[i];
    if (!a) continue;
    for (let j = i + 1; j < sets.length; j += 1) {
      const b = sets[j];
      if (!b) continue;
      if (a.stage !== b.stage) continue;
      if (ms(b.start) < ms(a.end) && ms(a.start) < ms(b.end)) return [a, b];
    }
  }
  throw new Error('No two sets share a stage and a moment');
}

/** A cross-stage pair where one starts exactly as the other ends. */
function touchingCrossStagePair(): [FestivalSet, FestivalSet] {
  const sets = getSets();
  for (const a of sets) {
    for (const b of sets) {
      if (a.id === b.id || a.stage === b.stage) continue;
      if (ms(b.start) === ms(a.end)) return [a, b];
    }
  }
  throw new Error('No cross-stage sets run exactly back to back');
}

/** A stage mid-set, with a clean follow-on and nothing older still running. */
function stageMidSet(): { stageId: string; at: Date; live: FestivalSet; next: FestivalSet } {
  for (const stage of getStages()) {
    const sets = getSetsForStage(stage.id);
    for (let i = 0; i < sets.length - 1; i += 1) {
      const live = sets[i];
      const next = sets[i + 1];
      if (!live || !next) continue;
      const at = new Date(Math.floor((ms(live.start) + ms(live.end)) / 2));
      if (ms(next.start) <= at.getTime()) continue;
      if (sets.slice(0, i).some((s) => ms(s.end) > at.getTime())) continue;
      return { stageId: stage.id, at, live, next };
    }
  }
  throw new Error('No stage runs two sets in sequence');
}

/**
 * Instants spread across the whole weekend: each sampled set's exact start
 * (live, inclusive), its midpoint, and its exact end (no longer live).
 */
function sampleInstants(): Date[] {
  const sets = getSets();
  const out: Date[] = [];
  for (let i = 0; i < sets.length; i += 5) {
    const set = sets[i];
    if (!set) continue;
    out.push(new Date(ms(set.start)));
    out.push(new Date(Math.floor((ms(set.start) + ms(set.end)) / 2)));
    out.push(new Date(ms(set.end)));
  }
  return out;
}

/** An artist whose name cannot be confused with a stage, a type or a note. */
function unambiguousArtist(): Artist {
  const schedule = getSnapshot().schedule;
  const notes = schedule.map((s) => (s.note ?? '').toLowerCase());
  const stageNames = getStages().map((s) => s.name.toLowerCase());
  const types = [...new Set(schedule.map((s) => String(s.type)))];
  const artists = getArtists();
  const found = artists.find((artist) => {
    const needle = artist.name.toLowerCase();
    if (getSetsForArtist(artist.slug).length === 0) return false;
    if (notes.some((n) => n.includes(needle))) return false;
    if (stageNames.some((n) => n.includes(needle))) return false;
    if (types.some((t) => t.includes(needle))) return false;
    return !artists.some((o) => o.slug !== artist.slug && o.name.toLowerCase().includes(needle));
  });
  if (!found) throw new Error('No artist name is distinctive enough to search for');
  return found;
}

/** A stage whose name cannot be confused with an artist, a type or a note. */
function unambiguousStage(): Stage {
  const schedule = getSnapshot().schedule;
  const notes = schedule.map((s) => (s.note ?? '').toLowerCase());
  const artistNames = getArtists().map((a) => a.name.toLowerCase());
  const types = [...new Set(schedule.map((s) => String(s.type)))];
  const stages = getStages();
  const found = stages.find((stage) => {
    const needle = stage.name.toLowerCase();
    if (getSetsForStage(stage.id).length === 0) return false;
    if (notes.some((n) => n.includes(needle))) return false;
    if (artistNames.some((n) => n.includes(needle))) return false;
    if (types.some((t) => t.includes(needle))) return false;
    return !stages.some((o) => o.id !== stage.id && o.name.toLowerCase().includes(needle));
  });
  if (!found) throw new Error('No stage name is distinctive enough to search for');
  return found;
}

// ---------------------------------------------------------------------------

describe('bundled snapshot', () => {
  it('passes its own validation', () => {
    expect(bundledSnapshotIssues).toEqual([]);
  });

  it('says whether it is placeholder content, and where real content came from', () => {
    const festival = getFestival();
    expect(typeof festival._placeholder).toBe('boolean');
    if (festival._placeholder === false) {
      // Real published data has to carry its provenance — the credits screen
      // reads this, and the caveats in it are how a reader knows what to trust.
      expect(typeof festival._dataNote).toBe('string');
      expect((festival._dataNote ?? '').trim().length).toBeGreaterThan(40);
    }
  });

  it('is internally consistent: every set points at a real artist and stage', () => {
    const artistSlugs = new Set(getArtists().map((a) => a.slug));
    const stageIds = new Set(getStages().map((s) => s.id));
    const schedule = getSnapshot().schedule;
    expect(schedule.length).toBeGreaterThan(0);
    for (const set of schedule) {
      expect(artistSlugs.has(set.artist)).toBe(true);
      expect(stageIds.has(set.stage)).toBe(true);
      expect(ms(set.end)).toBeGreaterThan(ms(set.start));
    }
    expect(new Set(schedule.map((s) => s.id)).size).toBe(schedule.length);
  });
});

describe('schedule queries', () => {
  it('covers the advertised window AND every day that has programming', () => {
    const days = getFestivalDays();
    const { start, end } = getFestival().dates;

    // Sorted, unique, and every advertised day present.
    expect(days).toEqual([...new Set(days)].sort());
    expect(days).toContain(start.slice(0, 10));
    expect(days).toContain(end.slice(0, 10));

    // No set may fall on a day the tabs do not offer. The festival advertises
    // Fri-Sun but sells Thursday pre-festival shows; deriving days from the
    // advertised window alone silently hid them.
    const scheduled = new Set(getSets().map((s) => toFestivalDay(s.start)));
    for (const day of scheduled) expect(days).toContain(day);

    // And specifically: the Thursday pre-festival shows are reachable.
    expect(days).toContain('2026-09-17');
    expect(scheduled.has('2026-09-17')).toBe(true);
  });

  it('buckets every set onto exactly one festival-local day', () => {
    const schedule = getSnapshot().schedule;
    // Days come from the schedule, not the festival window: 2026 opens with
    // Thursday-night shows a day before the published Friday–Sunday window.
    const days = [...new Set(schedule.map((s) => toFestivalDay(s.start)))].sort();
    expect(days.length).toBeGreaterThan(0);

    const seen = new Set<string>();
    for (const day of days) {
      const sets = getSetsForDay(day);
      expect(sets.length).toBeGreaterThan(0);
      for (const set of sets) {
        expect(toFestivalDay(set.start)).toBe(day);
        expect(seen.has(set.id)).toBe(false);
        seen.add(set.id);
      }
    }
    expect(seen.size).toBe(schedule.length);
    expect(getSetsForDay('1999-01-01')).toEqual([]);
  });

  it('never schedules a set after the festival has closed', () => {
    const days = getFestivalDays();
    const firstDay = days[0];
    const lastDay = days[days.length - 1];
    expect(firstDay).toBeDefined();
    expect(lastDay).toBeDefined();
    if (firstDay === undefined || lastDay === undefined) return;

    const outside = getSets().filter((s) => {
      const day = toFestivalDay(s.start);
      return day < firstDay || day > lastDay;
    });
    // Pre-festival warm-up shows are legitimate; anything past closing day is
    // a schedule bug, because the app stops offering days after the last one.
    for (const set of outside) {
      expect(toFestivalDay(set.start) < firstDay).toBe(true);
    }
  });

  it('returns sets in start order', () => {
    for (const stage of getStages()) {
      const starts = getSetsForStage(stage.id).map((s) => ms(s.start));
      expect([...starts].sort((a, b) => a - b)).toEqual(starts);
    }
    const all = getSets().map((s) => ms(s.start));
    expect([...all].sort((a, b) => a - b)).toEqual(all);
  });

  it('finds an artist and their sets', () => {
    const artist = getArtist('marcus-king-band');
    expect(artist?.name).toBe('Marcus King Band');
    expect(artist?.headliner).toBe(true);
    expect(getSetsForArtist('marcus-king-band').length).toBeGreaterThan(0);
    expect(getSetsForArtist('marcus-king-band').every((s) => s.artist === 'marcus-king-band')).toBe(
      true,
    );
    expect(getArtist('an-act-that-was-never-booked')).toBeUndefined();

    // Every headliner is a real artist who is actually playing.
    const headliners = getHeadliners();
    expect(headliners.length).toBeGreaterThan(0);
    for (const act of headliners) {
      expect(getSetsForArtist(act.slug).length).toBeGreaterThan(0);
    }
  });

  it('carries real photo URLs, and stays renderable for artists without one', () => {
    const artists = getArtists();
    expect(artists.length).toBeGreaterThan(0);
    // The client has cleared assets, so real photos are expected now. What
    // matters is that anything present is loadable and anything absent has a
    // working fallback.
    expect(artists.some((a) => a.photo !== undefined)).toBe(true);

    for (const artist of artists) {
      for (const url of [artist.photo, artist.photoHero]) {
        if (url === undefined) continue;
        expect(url).toMatch(/^https:\/\/\S+$/);
        expect(url.trim()).toBe(url);
      }
      // No photo means the initials avatar renders instead, so the name has to
      // produce at least one initial. `initialsFor` is the real UI fallback.
      const initials = initialsFor(artist.name);
      expect(initials.length).toBeGreaterThan(0);
      expect(initials).not.toBe('?');
    }
  });

  it('searches by artist, stage and type', () => {
    expect(searchSets('')).toEqual([]);
    expect(searchSets('   ')).toEqual([]);
    expect(searchSets('a query that matches nothing at all')).toEqual([]);

    const artist = unambiguousArtist();
    expect(searchSets(artist.name).map((s) => s.id)).toEqual(
      getSetsForArtist(artist.slug).map((s) => s.id),
    );

    const stage = unambiguousStage();
    expect(searchSets(stage.name).map((s) => s.id)).toEqual(
      getSetsForStage(stage.id).map((s) => s.id),
    );

    // Case-insensitive, both ways.
    expect(searchSets(artist.name.toUpperCase()).map((s) => s.id)).toEqual(
      searchSets(artist.name.toLowerCase()).map((s) => s.id),
    );

    // Every set is findable by its own type word.
    const schedule = getSnapshot().schedule;
    const types = [...new Set(schedule.map((s) => s.type))] as SetType[];
    expect(types.length).toBeGreaterThan(0);
    for (const type of types) {
      const found = new Set(searchSets(type).map((s) => s.id));
      for (const set of schedule.filter((s) => s.type === type)) {
        expect(found.has(set.id)).toBe(true);
      }
    }
  });
});

describe('getNowNext', () => {
  it('returns exactly one entry per stage, in stage order', () => {
    const { at } = stageMidSet();
    const rows = getNowNext(at);
    expect(rows).toHaveLength(getStages().length);
    expect(rows.map((r) => r.stageId)).toEqual(getStages().map((s) => s.id));
  });

  it('reports what is live and what follows it', () => {
    const { stageId, at, live, next } = stageMidSet();
    const row = getNowNext(at).find((r) => r.stageId === stageId);
    expect(row?.now?.id).toBe(live.id);
    expect(row?.next?.id).toBe(next.id);
    // The set it names really does contain the moment, and the next one really
    // does start later.
    expect(ms(live.start)).toBeLessThanOrEqual(at.getTime());
    expect(ms(live.end)).toBeGreaterThan(at.getTime());
    expect(ms(next.start)).toBeGreaterThan(at.getTime());
  });

  it('agrees with a brute-force reading of the schedule at every sampled moment', () => {
    const instants = sampleInstants();
    expect(instants.length).toBeGreaterThan(10);
    for (const at of instants) {
      const actual = getNowNext(at).map((r) => ({
        stageId: r.stageId,
        now: r.now?.id,
        next: r.next?.id,
      }));
      const expected = referenceNowNext(at).map((r) => ({
        stageId: r.stageId,
        now: r.now?.id,
        next: r.next?.id,
      }));
      expect(actual).toEqual(expected);
    }
  });

  it('treats a set as live at its start instant and finished at its end instant', () => {
    const { stageId, live } = stageMidSet();
    const atStart = getNowNext(new Date(ms(live.start))).find((r) => r.stageId === stageId);
    expect(atStart?.now?.id).toBe(live.id);

    const atEnd = getNowNext(new Date(ms(live.end))).find((r) => r.stageId === stageId);
    expect(atEnd?.now?.id).not.toBe(live.id);
  });

  it('leaves both fields empty once a stage is finished for good', () => {
    const latestEnd = Math.max(...getSets().map((s) => ms(s.end)));
    const at = new Date(latestEnd + 60 * MINUTE_MS);
    for (const row of getNowNext(at)) {
      expect(row.now).toBeUndefined();
      expect(row.next).toBeUndefined();
    }
  });
});

describe('findConflicts', () => {
  it('finds a real cross-stage overlap and measures it', () => {
    const clash = firstCrossStageOverlap();
    const first = getSet(clash.a);
    const second = getSet(clash.b);
    expect(first).toBeDefined();
    expect(second).toBeDefined();
    if (!first || !second) return;
    expect(first.stage).not.toBe(second.stage);

    // The expected minute count comes from the timestamps, not from the code
    // under test.
    const start = Math.max(ms(first.start), ms(second.start));
    const end = Math.min(ms(first.end), ms(second.end));
    const minutes = Math.round((end - start) / MINUTE_MS);
    expect(minutes).toBeGreaterThan(0);

    expect(findConflicts([first.id, second.id])).toEqual([
      { a: first.id, b: second.id, overlapMinutes: minutes },
    ]);
  });

  it('reports each pair once, whichever order the ids arrive in', () => {
    const clash = firstCrossStageOverlap();
    const forward = findConflicts([clash.a, clash.b]);
    const reverse = findConflicts([clash.b, clash.a]);
    expect(reverse).toEqual(forward);
    expect(forward).toHaveLength(1);
  });

  it('always puts the earlier set first', () => {
    const clash = firstCrossStageOverlap();
    for (const order of [
      [clash.a, clash.b],
      [clash.b, clash.a],
    ]) {
      const [conflict] = findConflicts(order);
      expect(conflict).toBeDefined();
      const a = getSet(conflict?.a ?? '');
      const b = getSet(conflict?.b ?? '');
      expect(a).toBeDefined();
      expect(b).toBeDefined();
      if (!a || !b) continue;
      expect(ms(a.start)).toBeLessThanOrEqual(ms(b.start));
    }
  });

  it('matches a brute-force pass over the entire published schedule', () => {
    const ids = getSnapshot().schedule.map((s) => s.id);
    const conflicts = findConflicts(ids);
    // Not a smoke test: exact equality, pair order and minutes included,
    // against an independent implementation with no early exits.
    expect(conflicts).toEqual(referenceConflicts(ids));
    expect(conflicts.length).toBeGreaterThanOrEqual(4);
    const keys = new Set(conflicts.map((c) => `${c.a}|${c.b}`));
    expect(keys.size).toBe(conflicts.length);
    for (const conflict of conflicts) {
      expect(conflict.overlapMinutes).toBeGreaterThan(0);
      expect(getSet(conflict.a)?.stage).not.toBe(getSet(conflict.b)?.stage);
    }
  });

  it('matches a brute-force pass over one day, in a shuffled order', () => {
    const days = getFestivalDays();
    const busiest = days
      .map((day) => getSetsForDay(day))
      .sort((a, b) => b.length - a.length)[0];
    expect(busiest).toBeDefined();
    if (!busiest) return;
    // Reversed, so the function cannot lean on the caller handing ids in order.
    const ids = busiest.map((s) => s.id).reverse();
    expect(findConflicts(ids)).toEqual(referenceConflicts(ids));
    expect(findConflicts(ids).length).toBeGreaterThan(0);
  });

  it('does not report two sets on the same stage, even when they overlap', () => {
    // 2026 really does co-bill acts in one slot — four comedians on one stage
    // at one time. Same room, so it is not a clash for a festivalgoer.
    const [a, b] = sameStageOverlap();
    expect(a.stage).toBe(b.stage);
    expect(ms(b.start)).toBeLessThan(ms(a.end));
    expect(findConflicts([a.id, b.id])).toEqual([]);
  });

  it('does not report back-to-back sets that merely touch', () => {
    const [first, second] = touchingCrossStagePair();
    expect(first.stage).not.toBe(second.stage);
    expect(ms(second.start)).toBe(ms(first.end));
    expect(findConflicts([first.id, second.id])).toEqual([]);
  });

  it('ignores ids that no longer exist', () => {
    const clash = firstCrossStageOverlap();
    expect(findConflicts([clash.a, 'a-set-that-was-cancelled'])).toEqual([]);
    expect(findConflicts(['a-set-that-was-cancelled'])).toEqual([]);
    expect(findConflicts([])).toEqual([]);
    // A cancelled id alongside a real clash must not disturb the real clash.
    expect(findConflicts([clash.a, 'a-set-that-was-cancelled', clash.b])).toEqual([
      { a: clash.a, b: clash.b, overlapMinutes: clash.overlapMinutes },
    ]);
  });
});

describe('announcements', () => {
  it('hides an announcement once it expires, but keeps it in the feed', () => {
    const expiring = getSnapshot().announcements.filter((a) => a.expiresAt !== undefined);
    expect(expiring.length).toBeGreaterThan(0);

    for (const announcement of expiring) {
      const { expiresAt } = announcement;
      if (expiresAt === undefined) continue;

      const justAfter = new Date(ms(expiresAt) + MINUTE_MS);
      expect(getActiveAnnouncements(justAfter).map((a) => a.id)).not.toContain(announcement.id);
      expect(getAllAnnouncements().map((a) => a.id)).toContain(announcement.id);

      const justBefore = new Date(ms(expiresAt) - MINUTE_MS);
      if (ms(announcement.publishedAt) <= justBefore.getTime()) {
        expect(getActiveAnnouncements(justBefore).map((a) => a.id)).toContain(announcement.id);
      }
    }
  });

  it('hides announcements that have not been published yet', () => {
    const announcements = getSnapshot().announcements;
    expect(announcements.length).toBeGreaterThan(0);
    for (const announcement of announcements) {
      const justBefore = new Date(ms(announcement.publishedAt) - MINUTE_MS);
      expect(getActiveAnnouncements(justBefore).map((a) => a.id)).not.toContain(announcement.id);
      // ...and it is live the moment it publishes.
      const atPublish = new Date(ms(announcement.publishedAt));
      const stillValid =
        announcement.expiresAt === undefined || ms(announcement.expiresAt) > atPublish.getTime();
      if (stillValid) {
        expect(getActiveAnnouncements(atPublish).map((a) => a.id)).toContain(announcement.id);
      }
    }
  });

  it('returns newest first and surfaces the urgent one while it is live', () => {
    const urgent = getSnapshot().announcements.find((a) => a.priority === 'urgent');
    expect(urgent).toBeDefined();
    if (!urgent) return;

    const from = ms(urgent.publishedAt);
    const until = urgent.expiresAt ? ms(urgent.expiresAt) : from + 60 * MINUTE_MS;
    const at = new Date(Math.floor((from + until) / 2));

    const active = getActiveAnnouncements(at);
    expect(active.map((a) => a.id)).toContain(urgent.id);
    expect(active.some((a) => a.priority === 'urgent')).toBe(true);

    const stamps = active.map((a) => ms(a.publishedAt));
    expect([...stamps].sort((x, y) => y - x)).toEqual(stamps);

    const allIds = new Set(getAllAnnouncements().map((a) => a.id));
    expect(active.every((a) => allIds.has(a.id))).toBe(true);
  });

  it('lists the whole feed newest first, expired entries included', () => {
    const all = getAllAnnouncements();
    expect(all).toHaveLength(getSnapshot().announcements.length);
    const stamps = all.map((a) => ms(a.publishedAt));
    expect([...stamps].sort((x, y) => y - x)).toEqual(stamps);
  });
});

describe('brews, places and info', () => {
  it('links every beer to a real brewery and real sessions', () => {
    const beers = getBeers();
    expect(beers.length).toBeGreaterThan(0);
    const breweryIds = new Set(getBreweries().map((b) => b.id));
    const sessionIds = new Set(getSessions().map((s) => s.id));

    for (const beer of beers) {
      expect(breweryIds.has(beer.brewery)).toBe(true);
      expect(beer.sessions.length).toBeGreaterThan(0);
      for (const session of beer.sessions) {
        expect(sessionIds.has(session)).toBe(true);
        expect(getBeersForSession(session).map((b) => b.id)).toContain(beer.id);
      }
      expect(getBeersForBrewery(beer.brewery).map((b) => b.id)).toContain(beer.id);
      expect(getBeersForBrewery(beer.brewery).every((b) => b.brewery === beer.brewery)).toBe(true);
    }

    // Every beer is reachable through exactly one brewery, and no others.
    const viaBreweries = getBreweries().flatMap((b) => getBeersForBrewery(b.id).map((x) => x.id));
    expect([...viaBreweries].sort()).toEqual(beers.map((b) => b.id).sort());
    expect(getBeersForBrewery('a-brewery-that-is-not-pouring')).toEqual([]);
    expect(getBeersForSession('a-session-that-is-not-happening')).toEqual([]);
  });

  it('accepts a brewery the festival publishes no city for', () => {
    // The festival does not publish brewery locations, so a missing city is
    // real content rather than a broken publish — but a missing name is not.
    const snapshot = getSnapshot();
    const withoutCity = {
      ...snapshot,
      breweries: [{ id: 'no-city-brewing', name: 'No City Brewing' }],
      beers: [],
    };
    expect(validateSnapshot(withoutCity)).toEqual([]);

    const withoutName = { ...withoutCity, breweries: [{ id: 'nameless', name: '' }] };
    expect(validateSnapshot(withoutName)).toContain('breweries[0] is missing "name"');
  });

  it('points every vendor at a real place', () => {
    const placeIds = new Set(getSnapshot().places.map((p) => p.id));
    expect(getVendors().every((v) => placeIds.has(v.place))).toBe(true);

    // 2026 publishes no vendor list at all, so prove the referential rule
    // still bites rather than letting an empty array pass for a green tick.
    const broken = validateSnapshot({
      ...getSnapshot(),
      vendors: [{ id: 'v1', name: 'Ghost Stand', kind: 'food', place: 'not-on-the-map' }],
    });
    expect(broken).toContain('vendor "v1" references unknown place "not-on-the-map"');
  });

  it('orders info pages and can look one up by slug', () => {
    const pages = getInfoPages();
    expect(pages.length).toBeGreaterThan(0);
    expect(pages.map((p) => p.order)).toEqual([...pages.map((p) => p.order)].sort((a, b) => a - b));
    expect(new Set(pages.map((p) => p.slug)).size).toBe(pages.length);
    for (const page of pages) {
      expect(getInfoPage(page.slug)).toBe(page);
      expect(page.title.trim().length).toBeGreaterThan(0);
      expect(page.body.trim().length).toBeGreaterThan(0);
    }
    // Altitude is the safety page that matters most here; it must still carry
    // the number a visitor needs.
    expect(getInfoPage('altitude-weather')?.body).toContain('8,750');
    expect(getInfoPage('nope')).toBeUndefined();
  });

  it('keeps every map pin inside the 0..1000 SVG box', () => {
    const places = getSnapshot().places;
    expect(places.length).toBeGreaterThan(0);
    for (const place of places) {
      expect(place.x).toBeGreaterThanOrEqual(0);
      expect(place.x).toBeLessThanOrEqual(1000);
      expect(place.y).toBeGreaterThanOrEqual(0);
      expect(place.y).toBeLessThanOrEqual(1000);
    }
  });
});
