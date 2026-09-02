import { getNowNext, getSets } from '@/data/repository';
import type { FestivalSet } from '@/types/content';

import { festivalHour } from './festivalPhase';

/** How far ahead "Up next" looks before a set stops being useful to show. */
export const UP_NEXT_HORIZON_MINUTES = 240;
/** Club shows surface this far ahead once the evening switch has flipped. */
export const CLUB_HORIZON_MINUTES = 300;
/** Festival-local hour after which the late-night section appears. */
export const CLUBS_FROM_HOUR = 20;

export interface HomeSets {
  /** One set per stage that has something on stage right now, earliest first. */
  live: FestivalSet[];
  /** The following set on each stage, limited to a useful horizon. */
  upNext: FestivalSet[];
  /** The very next set anywhere — the fallback overnight and between days. */
  soonest?: FestivalSet;
  /** Late-night club shows, once it is late enough in Telluride to care. */
  clubs: FestivalSet[];
}

/**
 * What Home shows during the festival, derived entirely from `getNowNext()`
 * and the festival-local clock. Kept out of the component so the live-day
 * behaviour is testable without rendering, and without a device in Denver.
 */
export function selectHomeSets(at: Date): HomeSets {
  const entries = getNowNext(at);
  const byStart = (a: FestivalSet, b: FestivalSet): number =>
    Date.parse(a.start) - Date.parse(b.start);

  const live = entries
    .map((e) => e.now)
    .filter((s): s is FestivalSet => s !== undefined)
    .sort(byStart);

  const next = entries
    .map((e) => e.next)
    .filter((s): s is FestivalSet => s !== undefined)
    .sort(byStart);

  const upNextHorizon = at.getTime() + UP_NEXT_HORIZON_MINUTES * 60_000;
  const clubHorizon = at.getTime() + CLUB_HORIZON_MINUTES * 60_000;

  const clubs =
    festivalHour(at) >= CLUBS_FROM_HOUR
      ? getSets().filter(
          (s) =>
            s.type === 'club' &&
            Date.parse(s.end) > at.getTime() &&
            Date.parse(s.start) <= clubHorizon,
        )
      : [];

  const result: HomeSets = {
    live,
    upNext: next.filter((s) => Date.parse(s.start) <= upNextHorizon),
    clubs,
  };
  const soonest = next[0];
  if (soonest) result.soonest = soonest;
  return result;
}
