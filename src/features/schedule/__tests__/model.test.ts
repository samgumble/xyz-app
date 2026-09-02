import { getFestivalDays, getSets, getSetsForDay } from '@/data/repository';
import { toFestivalDay } from '@/data/time';

import {
  buildEntries,
  entriesForDay,
  entryForSet,
  getScheduleDays,
  scheduleSetTypes,
  stagesForEntries,
} from '../model';

/**
 * These run against the real bundled 2026 snapshot, with the device clock in
 * Sydney (see the `test` script), so a festival-time regression shows up here
 * as well as in the time-module suite.
 */

describe('buildEntries', () => {
  it('folds comedy rows that share a stage and start into one entry', () => {
    const comedy = getSets().filter((s) => s.type === 'comedy');
    expect(comedy.length).toBeGreaterThan(0);

    const entries = buildEntries(comedy);
    expect(entries.length).toBeLessThan(comedy.length);

    for (const entry of entries) {
      const starts = new Set(entry.setIds.map((id) => getSets().find((s) => s.id === id)?.start));
      expect(starts.size).toBe(1);
    }
    // Every original row is still reachable through exactly one entry.
    const covered = entries.flatMap((e) => e.setIds).sort();
    expect(covered).toEqual(comedy.map((s) => s.id).sort());
  });

  it('names every performer on a combined bill', () => {
    const combined = buildEntries(getSets()).filter((e) => e.combined);
    expect(combined.length).toBeGreaterThan(0);
    for (const entry of combined) {
      expect(entry.title).toContain(' & ');
      expect(entry.artistSlugs.length).toBe(entry.setIds.length);
    }
  });

  it('leaves non-comedy sets alone, including same-stage double bills', () => {
    const entries = buildEntries(getSets().filter((s) => s.type !== 'comedy'));
    for (const entry of entries) {
      expect(entry.setIds).toHaveLength(1);
      expect(entry.combined).toBe(false);
    }
  });

  it('deduplicates the caveat a combined bill repeats on every row', () => {
    const combined = buildEntries(getSets()).find((e) => e.combined && e.notes.length > 0);
    expect(combined).toBeDefined();
    expect(new Set(combined?.notes).size).toBe(combined?.notes.length);
  });
});

describe('entryForSet', () => {
  it('returns the whole bill for one comedian on it', () => {
    const one = getSets().find((s) => s.type === 'comedy');
    expect(one).toBeDefined();
    const entry = entryForSet(one?.id ?? '');
    expect(entry?.setIds).toContain(one?.id);
    expect((entry?.setIds.length ?? 0) > 1).toBe(true);
  });

  it('is undefined for an id that is no longer published', () => {
    expect(entryForSet('a-set-that-was-cancelled')).toBeUndefined();
  });
});

describe('getScheduleDays', () => {
  it('covers the published run and any day that carries sets', () => {
    const days = getScheduleDays();
    for (const day of getFestivalDays()) expect(days).toContain(day);
    for (const set of getSets()) expect(days).toContain(toFestivalDay(set.start));
    expect([...days]).toEqual([...days].sort());
  });

  it('reaches every set through some day tab', () => {
    const reachable = getScheduleDays().flatMap((day) => entriesForDay(day).flatMap((e) => e.setIds));
    expect(new Set(reachable).size).toBe(getSets().length);
  });
});

describe('stagesForEntries', () => {
  it('lists only stages that have something on them, in published order', () => {
    const day = getScheduleDays().find((d) => getSetsForDay(d).length > 0) ?? '';
    const entries = entriesForDay(day);
    const stages = stagesForEntries(entries);
    expect(stages.length).toBeGreaterThan(0);
    for (const stage of stages) {
      expect(entries.some((e) => e.stage.id === stage.id)).toBe(true);
    }
  });
});

describe('scheduleSetTypes', () => {
  it('offers exactly the types present in the schedule', () => {
    expect(new Set(scheduleSetTypes())).toEqual(new Set(getSets().map((s) => s.type)));
  });
});
