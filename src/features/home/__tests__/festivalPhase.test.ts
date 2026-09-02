import { getFestival, getFestivalDays } from '@/data/repository';
import {
  countdownSpeech,
  countdownTo,
  festivalDateRangeLabel,
  festivalHour,
  festivalPhase,
  getDaySummaries,
  getFestivalWindow,
} from '../festivalPhase';

/**
 * The suite runs with the device clock in Sydney (see the `test` script), so
 * anything here that reads as Telluride time is proving the point.
 */
describe('festivalPhase', () => {
  const festivalWindow = getFestivalWindow();

  it('derives its window from the snapshot, not from a literal', () => {
    expect(festivalWindow.days).toEqual(getFestivalDays());
    expect(festivalWindow.officialDays.length).toBeGreaterThan(0);
    expect(festivalWindow.days.length).toBeGreaterThanOrEqual(festivalWindow.officialDays.length);
    expect(festivalWindow.opensISO).toBeDefined();
    expect(festivalWindow.closesISO).toBeDefined();
    expect(Date.parse(festivalWindow.opensISO ?? '')).toBeLessThan(Date.parse(festivalWindow.closesISO ?? ''));
  });

  it('reports "before" well ahead of the first set — the state this build opens in', () => {
    const at = new Date(Date.parse(festivalWindow.opensISO ?? '') - 30 * 86_400_000);
    expect(festivalPhase(at, festivalWindow)).toBe('before');
  });

  it('reports "during" once the first set has started', () => {
    const at = new Date(Date.parse(festivalWindow.opensISO ?? '') + 60_000);
    expect(festivalPhase(at, festivalWindow)).toBe('during');
  });

  it('reports "after" once the last set has ended', () => {
    const at = new Date(Date.parse(festivalWindow.closesISO ?? '') + 60_000);
    expect(festivalPhase(at, festivalWindow)).toBe('after');
  });

  it('treats sets before the first official day as pre-festival', () => {
    const firstDay = festivalWindow.officialDays[0];
    expect(firstDay).toBeDefined();
    for (const set of festivalWindow.preFestival) {
      expect(set.start.slice(0, 10) < (firstDay ?? '')).toBe(true);
    }
    expect(festivalWindow.firstOfficialSet?.start.slice(0, 10)).toBe(firstDay);
  });
});

describe('countdownTo', () => {
  it('breaks a gap into days, hours and minutes', () => {
    const at = new Date('2026-09-01T00:00:00Z');
    const target = new Date('2026-09-04T05:30:00Z').toISOString();
    expect(countdownTo(target, at)).toEqual({ days: 3, hours: 5, minutes: 30, totalMinutes: 4650 });
  });

  it('never goes negative', () => {
    const at = new Date('2026-09-10T00:00:00Z');
    expect(countdownTo('2026-09-01T00:00:00Z', at).totalMinutes).toBe(0);
  });

  it('speaks the largest two units', () => {
    expect(countdownSpeech({ days: 1, hours: 2, minutes: 3, totalMinutes: 1563 })).toBe('1 day, 2 hours');
    expect(countdownSpeech({ days: 0, hours: 2, minutes: 3, totalMinutes: 123 })).toBe('2 hours, 3 minutes');
    expect(countdownSpeech({ days: 0, hours: 0, minutes: 1, totalMinutes: 1 })).toBe('1 minute');
  });
});

describe('getDaySummaries', () => {
  const summaries = getDaySummaries();

  it('covers every day with programming', () => {
    expect(summaries.map((s) => s.day)).toEqual(getFestivalDays());
  });

  it('names a headline act and at least one stage for every advertised day', () => {
    for (const summary of summaries.filter((s) => s.official)) {
      expect(summary.setCount).toBeGreaterThan(0);
      expect(summary.stageNames.length).toBeGreaterThan(0);
      expect(summary.headlineArtist?.name ?? summary.headlineSet?.artist).toBeTruthy();
    }
  });

  it('keeps pre-festival programming visible but flagged', () => {
    const preFestival = summaries.filter((s) => !s.official);
    for (const summary of preFestival) {
      expect(summary.setCount).toBeGreaterThan(0);
      expect(summary.day < (getFestival().dates.start.slice(0, 10) ?? '')).toBe(true);
    }
  });
});

describe('festival time helpers', () => {
  it('reads the festival-local hour, not the device hour', () => {
    // 03:00 UTC on 19 September is 21:00 the previous evening in Telluride,
    // and 13:00 in Sydney, where this suite's device clock is set.
    expect(festivalHour(new Date('2026-09-19T03:00:00Z'))).toBe(21);
  });

  it('labels the date range from festival.dates', () => {
    const label = festivalDateRangeLabel();
    expect(label).toContain('–');
    expect(getFestival().dates.start.slice(0, 4)).toBe('2026');
  });
});
