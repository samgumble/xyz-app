import {
  findConflicts,
  getActiveAnnouncements,
  getAllAnnouncements,
  getArtist,
  getArtists,
  getBeersForBrewery,
  getFestival,
  getFestivalDays,
  getInfoPage,
  getInfoPages,
  getNowNext,
  getSet,
  getSetsForArtist,
  getSetsForDay,
  getSetsForStage,
  getStages,
  getVendors,
  searchSets,
} from '../repository';
import { bundledSnapshotIssues, getSnapshot, resetSnapshot } from '../snapshot';
import { toFestivalDay } from '../time';

beforeEach(() => {
  resetSnapshot();
});

describe('bundled snapshot', () => {
  it('passes its own validation', () => {
    expect(bundledSnapshotIssues).toEqual([]);
  });

  it('is flagged as placeholder content', () => {
    expect(getFestival()._placeholder).toBe(true);
  });
});

describe('schedule queries', () => {
  it('derives the three festival days from the festival record', () => {
    expect(getFestivalDays()).toEqual(['2026-09-18', '2026-09-19', '2026-09-20']);
  });

  it('buckets every set onto a festival-local day', () => {
    const days = getFestivalDays();
    const counted = days.reduce((sum, day) => sum + getSetsForDay(day).length, 0);
    expect(counted).toBe(getSnapshot().schedule.length);
    for (const day of days) {
      for (const set of getSetsForDay(day)) {
        expect(toFestivalDay(set.start)).toBe(day);
      }
    }
  });

  it('returns sets in start order', () => {
    const starts = getSetsForStage('main').map((s) => Date.parse(s.start));
    expect([...starts].sort((a, b) => a - b)).toEqual(starts);
  });

  it('finds an artist and their sets', () => {
    const artist = getArtist('delta-vaudeville');
    expect(artist?.name).toBe('Delta Vaudeville');
    expect(artist?.headliner).toBe(true);
    expect(artist?.photo).toBeUndefined();
    expect(getSetsForArtist('delta-vaudeville').length).toBeGreaterThan(0);
  });

  it('has no artist photos, because rights are not cleared', () => {
    for (const artist of getArtists()) {
      expect(artist.photo).toBeUndefined();
    }
  });

  it('searches by artist, stage and type', () => {
    expect(searchSets('ruby slate').map((s) => s.artist)).toContain('ruby-slate');
    expect(searchSets('opera house').every((s) => s.stage === 'opera-house')).toBe(true);
    expect(searchSets('')).toEqual([]);
  });
});

describe('getNowNext', () => {
  it('returns exactly one entry per stage, in stage order', () => {
    const at = new Date('2026-09-18T18:45:00-06:00');
    const rows = getNowNext(at);
    expect(rows).toHaveLength(getStages().length);
    expect(rows.map((r) => r.stageId)).toEqual(getStages().map((s) => s.id));
  });

  it('reports what is live and what follows it', () => {
    // 12:40 PM Friday: Main is mid-set, Blues is mid-set on a different band.
    const at = new Date('2026-09-18T12:40:00-06:00');
    const rows = getNowNext(at);
    const main = rows.find((r) => r.stageId === 'main');
    const blues = rows.find((r) => r.stageId === 'blues');
    expect(main?.now?.id).toBe('fri-main-1200');
    expect(main?.next?.id).toBe('fri-main-1320');
    expect(blues?.now?.id).toBe('fri-blues-1230');
  });

  it('leaves both fields empty once a stage is finished for good', () => {
    const at = new Date('2026-09-30T12:00:00-06:00');
    for (const row of getNowNext(at)) {
      expect(row.now).toBeUndefined();
      expect(row.next).toBeUndefined();
    }
  });
});

describe('findConflicts', () => {
  it('finds a seeded cross-stage overlap and measures it', () => {
    // Main 12:00–13:00 against Blues 12:30–13:30 on Friday.
    expect(findConflicts(['fri-main-1200', 'fri-blues-1230'])).toEqual([
      { a: 'fri-main-1200', b: 'fri-blues-1230', overlapMinutes: 30 },
    ]);
  });

  it('reports each pair once, whichever order the ids arrive in', () => {
    const forward = findConflicts(['fri-main-1200', 'fri-blues-1230']);
    const reverse = findConflicts(['fri-blues-1230', 'fri-main-1200']);
    expect(reverse).toEqual(forward);
    expect(forward).toHaveLength(1);
  });

  it('always puts the earlier set first', () => {
    const [conflict] = findConflicts(['fri-blues-1230', 'fri-main-1200']);
    expect(conflict?.a).toBe('fri-main-1200');
  });

  it('finds every seeded overlap in a full Friday afternoon selection', () => {
    const conflicts = findConflicts([
      'fri-main-1200',
      'fri-blues-1230',
      'fri-main-1445',
      'fri-blues-1400',
      'fri-main-1615',
      'fri-blues-1530',
      'fri-main-1750',
      'fri-blues-1710',
    ]);
    // Friday's stages are deliberately staggered, so a fan who saved the whole
    // afternoon on both stages collides six times.
    expect(conflicts).toEqual([
      { a: 'fri-main-1200', b: 'fri-blues-1230', overlapMinutes: 30 },
      { a: 'fri-blues-1400', b: 'fri-main-1445', overlapMinutes: 15 },
      { a: 'fri-main-1445', b: 'fri-blues-1530', overlapMinutes: 20 },
      { a: 'fri-blues-1530', b: 'fri-main-1615', overlapMinutes: 25 },
      { a: 'fri-main-1615', b: 'fri-blues-1710', overlapMinutes: 15 },
      { a: 'fri-blues-1710', b: 'fri-main-1750', overlapMinutes: 30 },
    ]);
  });

  it('does not report two sets on the same stage', () => {
    expect(findConflicts(['fri-main-1200', 'fri-main-1320'])).toEqual([]);
  });

  it('does not report back-to-back sets that merely touch', () => {
    const first = getSet('fri-main-1200');
    const second = getSet('fri-main-1320');
    expect(first && second && Date.parse(second.start) >= Date.parse(first.end)).toBe(true);
    expect(findConflicts(['fri-main-1200', 'fri-blues-1400'])).toEqual([]);
  });

  it('ignores ids that no longer exist', () => {
    expect(findConflicts(['fri-main-1200', 'a-set-that-was-cancelled'])).toEqual([]);
    expect(findConflicts([])).toEqual([]);
  });

  it('finds at least four distinct overlapping pairs across the weekend', () => {
    const all = findConflicts(getSnapshot().schedule.map((s) => s.id));
    expect(all.length).toBeGreaterThanOrEqual(4);
    const keys = new Set(all.map((c) => `${c.a}|${c.b}`));
    expect(keys.size).toBe(all.length);
  });
});

describe('announcements', () => {
  const at = new Date('2026-09-01T12:00:00-06:00');

  it('hides expired announcements', () => {
    const ids = getActiveAnnouncements(at).map((a) => a.id);
    expect(ids).not.toContain('2026-06-10-volunteer-applications');
    expect(getAllAnnouncements().map((a) => a.id)).toContain('2026-06-10-volunteer-applications');
  });

  it('hides announcements that have not been published yet', () => {
    const ids = getActiveAnnouncements(at).map((a) => a.id);
    expect(ids).not.toContain('2026-09-18-gondola-late-service');
  });

  it('returns newest first and includes the urgent one', () => {
    const active = getActiveAnnouncements(at);
    const timestamps = active.map((a) => Date.parse(a.publishedAt));
    expect([...timestamps].sort((x, y) => y - x)).toEqual(timestamps);
    expect(active.some((a) => a.priority === 'urgent')).toBe(true);
  });
});

describe('brews, places and info', () => {
  it('links beers to their brewery', () => {
    const beers = getBeersForBrewery('wildcat-basin');
    expect(beers.length).toBeGreaterThan(0);
    expect(beers.every((b) => b.brewery === 'wildcat-basin')).toBe(true);
  });

  it('points every vendor at a real place', () => {
    const placeIds = new Set(getSnapshot().places.map((p) => p.id));
    expect(getVendors().every((v) => placeIds.has(v.place))).toBe(true);
  });

  it('orders info pages and can look one up by slug', () => {
    const pages = getInfoPages();
    expect(pages.map((p) => p.order)).toEqual([...pages.map((p) => p.order)].sort((a, b) => a - b));
    expect(getInfoPage('altitude-and-hydration')?.body).toContain('8,750');
    expect(getInfoPage('nope')).toBeUndefined();
  });

  it('keeps every map pin inside the 0..1000 SVG box', () => {
    for (const place of getSnapshot().places) {
      expect(place.x).toBeGreaterThanOrEqual(0);
      expect(place.x).toBeLessThanOrEqual(1000);
      expect(place.y).toBeGreaterThanOrEqual(0);
      expect(place.y).toBeLessThanOrEqual(1000);
    }
  });
});
