import { getSets, getStage } from '@/data/repository';
import { isLive } from '@/data/time';
import type { FestivalSet } from '@/types/content';

import { CLUBS_FROM_HOUR, UP_NEXT_HORIZON_MINUTES, selectHomeSets } from '../homeModel';
import { festivalHour } from '../festivalPhase';

/**
 * Every moment used here is found in the data, never written down, and the
 * suite's device clock is in Sydney — so anything that reads as a Telluride
 * hour is proving the timezone handling too.
 */

/** A moment part-way through the busiest set in the schedule. */
function midSet(set: FestivalSet): Date {
  return new Date((Date.parse(set.start) + Date.parse(set.end)) / 2);
}

const firstClubSet = getSets().find((s) => s.type === 'club');
const middayMainSet = getSets().find((s) => s.type === 'main');

describe('selectHomeSets during the festival', () => {
  it('puts every stage with something on stage into "live"', () => {
    expect(middayMainSet).toBeDefined();
    if (!middayMainSet) return;
    const at = midSet(middayMainSet);
    const { live } = selectHomeSets(at);

    expect(live.length).toBeGreaterThan(0);
    expect(live.map((s) => s.id)).toContain(middayMainSet.id);
    for (const set of live) expect(isLive(set, at)).toBe(true);
    // One card per stage, never two.
    expect(new Set(live.map((s) => s.stage)).size).toBe(live.length);
  });

  it('limits "up next" to sets that start within the horizon', () => {
    expect(middayMainSet).toBeDefined();
    if (!middayMainSet) return;
    const at = midSet(middayMainSet);
    const { upNext } = selectHomeSets(at);
    const horizon = at.getTime() + UP_NEXT_HORIZON_MINUTES * 60_000;

    for (const set of upNext) {
      expect(Date.parse(set.start)).toBeGreaterThan(at.getTime());
      expect(Date.parse(set.start)).toBeLessThanOrEqual(horizon);
    }
    expect(upNext.map((s) => Date.parse(s.start))).toEqual(
      [...upNext.map((s) => Date.parse(s.start))].sort((a, b) => a - b),
    );
  });

  it('always offers the next set somewhere, even when nothing is on', () => {
    expect(middayMainSet).toBeDefined();
    if (!middayMainSet) return;
    const at = new Date(Date.parse(middayMainSet.start) - 60 * 60_000);
    const { soonest } = selectHomeSets(at);
    expect(soonest).toBeDefined();
    expect(Date.parse(soonest?.start ?? '')).toBeGreaterThan(at.getTime());
  });
});

describe('tonight at the clubs', () => {
  it('stays hidden during the day', () => {
    expect(middayMainSet).toBeDefined();
    if (!middayMainSet) return;
    const at = midSet(middayMainSet);
    expect(festivalHour(at)).toBeLessThan(CLUBS_FROM_HOUR);
    expect(selectHomeSets(at).clubs).toHaveLength(0);
  });

  it('appears after the evening switch, listing club venues only', () => {
    expect(firstClubSet).toBeDefined();
    if (!firstClubSet) return;
    const at = new Date(Date.parse(firstClubSet.start) - 30 * 60_000);
    expect(festivalHour(at)).toBeGreaterThanOrEqual(CLUBS_FROM_HOUR);

    const { clubs } = selectHomeSets(at);
    expect(clubs.length).toBeGreaterThan(0);
    expect(clubs.map((s) => s.id)).toContain(firstClubSet.id);
    for (const set of clubs) {
      expect(set.type).toBe('club');
      expect(getStage(set.stage)?.kind).toBe('club');
      expect(Date.parse(set.end)).toBeGreaterThan(at.getTime());
    }
  });
});
