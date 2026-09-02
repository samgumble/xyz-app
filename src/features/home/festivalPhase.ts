import {
  getArtist,
  getFestival,
  getFestivalDays,
  getSets,
  getSetsForDay,
  getStage,
} from '@/data/repository';
import {
  festivalNow,
  formatDayLabel,
  formatShortDayLabel,
  toFestivalDay,
} from '@/data/time';
import type { Artist, FestivalSet, StageId } from '@/types/content';

/**
 * Everything Home needs to decide which of its three faces to wear. All of it
 * is derived from the snapshot — no date, stage id or artist slug is written
 * down here.
 */

export type FestivalPhase = 'before' | 'during' | 'after';

const DAY_MS = 86_400_000;

/**
 * The advertised festival window, straight from `festival.dates`.
 *
 * `getFestivalDays()` deliberately returns every day that has *programming*,
 * which includes the Thursday pre-festival shows. Both are useful, and Home
 * needs to tell them apart: the countdown runs to the first official day, but
 * the day-by-day preview shows Thursday too.
 */
export function officialFestivalDays(): string[] {
  const { start, end } = getFestival().dates;
  const first = Date.parse(`${start.slice(0, 10)}T00:00:00Z`);
  const last = Date.parse(`${end.slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(first) || Number.isNaN(last) || last < first) return [];
  const days: string[] = [];
  for (let t = first; t <= last; t += DAY_MS) {
    days.push(new Date(t).toISOString().slice(0, 10));
  }
  return days;
}

export interface FestivalWindow {
  /** Start of the earliest scheduled set anywhere, including pre-festival events. */
  opensISO?: string;
  /** End of the last scheduled set anywhere. */
  closesISO?: string;
  /** Every day with programming, from `getFestivalDays()`. */
  days: string[];
  /** The advertised days, from `festival.dates`. */
  officialDays: string[];
  /** Sets that fall before the first official festival day (the Thursday warm-up). */
  preFestival: FestivalSet[];
  /** First set on the first official festival day — the practical "gates" moment. */
  firstOfficialSet?: FestivalSet;
}

export function getFestivalWindow(): FestivalWindow {
  const sets = getSets();
  const days = getFestivalDays();
  const officialDays = officialFestivalDays();
  const firstDay = officialDays[0];

  const result: FestivalWindow = { days, officialDays, preFestival: [] };

  const first = sets[0];
  if (first) result.opensISO = first.start;

  const lastEnd = sets.reduce<number>((max, s) => Math.max(max, Date.parse(s.end)), 0);
  if (lastEnd > 0) result.closesISO = new Date(lastEnd).toISOString();

  if (firstDay) {
    result.preFestival = sets.filter((s) => toFestivalDay(s.start) < firstDay);
    const official = getSetsForDay(firstDay)[0];
    if (official) result.firstOfficialSet = official;
  }

  return result;
}

/** Before the first note, somewhere inside the weekend, or after the last one. */
export function festivalPhase(
  at: Date,
  festivalWindow: FestivalWindow = getFestivalWindow(),
): FestivalPhase {
  const { opensISO, closesISO } = festivalWindow;
  if (!opensISO || !closesISO) return 'before';
  const now = at.getTime();
  if (now < Date.parse(opensISO)) return 'before';
  if (now >= Date.parse(closesISO)) return 'after';
  return 'during';
}

export interface DaySummary {
  day: string;
  /** False for a day with programming that falls outside the advertised dates. */
  official: boolean;
  label: string;
  shortLabel: string;
  setCount: number;
  stageNames: string[];
  firstStart?: string;
  lastEnd?: string;
  /** The day's closing main-programme set — in practice the headline act. */
  headlineSet?: FestivalSet;
  headlineArtist?: Artist;
  clubCount: number;
}

/**
 * A per-day précis of the weekend, used by the off-festival hero. The headline
 * act is derived as the latest-starting set of `type: 'main'` that day, which
 * is how the festival actually programmes it — no slug is assumed.
 */
export function getDaySummaries(): DaySummary[] {
  const official = new Set(officialFestivalDays());
  return getFestivalDays().map((day) => {
    const sets = getSetsForDay(day);
    const mainProgramme = sets.filter((s) => s.type === 'main');
    const headlineSet = mainProgramme[mainProgramme.length - 1];
    const headlineArtist = headlineSet ? getArtist(headlineSet.artist) : undefined;

    const stageNames = [...new Set(sets.map((s) => s.stage))]
      .map((id: StageId) => getStage(id)?.shortName ?? id)
      .sort((a, b) => a.localeCompare(b));

    const lastEndMs = sets.reduce<number>((max, s) => Math.max(max, Date.parse(s.end)), 0);

    const summary: DaySummary = {
      day,
      official: official.has(day),
      label: formatDayLabel(day),
      shortLabel: formatShortDayLabel(day),
      setCount: sets.length,
      stageNames,
      clubCount: sets.filter((s) => s.type === 'club').length,
    };

    const firstSet = sets[0];
    if (firstSet) summary.firstStart = firstSet.start;
    if (lastEndMs > 0) summary.lastEnd = new Date(lastEndMs).toISOString();
    if (headlineSet) summary.headlineSet = headlineSet;
    if (headlineArtist) summary.headlineArtist = headlineArtist;

    return summary;
  });
}

export interface Countdown {
  days: number;
  hours: number;
  minutes: number;
  totalMinutes: number;
}

export function countdownTo(iso: string, at: Date): Countdown {
  const total = Math.max(0, Math.floor((Date.parse(iso) - at.getTime()) / 60_000));
  return {
    days: Math.floor(total / 1440),
    hours: Math.floor((total % 1440) / 60),
    minutes: total % 60,
    totalMinutes: total,
  };
}

/** `3 days, 4 hours` / `4 hours, 12 minutes` / `12 minutes` — for a screen reader. */
export function countdownSpeech(countdown: Countdown): string {
  const plural = (n: number, word: string): string => `${n} ${word}${n === 1 ? '' : 's'}`;
  if (countdown.days > 0) return `${plural(countdown.days, 'day')}, ${plural(countdown.hours, 'hour')}`;
  if (countdown.hours > 0)
    return `${plural(countdown.hours, 'hour')}, ${plural(countdown.minutes, 'minute')}`;
  return plural(countdown.minutes, 'minute');
}

/** `Friday 18 – Sunday 20 September 2026`, built from `festival.dates`. */
export function festivalDateRangeLabel(): string {
  const days = officialFestivalDays();
  const first = days[0];
  const last = days[days.length - 1];
  if (!first) return '';
  if (!last || last === first) return formatDayLabel(first);
  return `${formatDayLabel(first)} – ${formatDayLabel(last)}`;
}

/** True when the device is not sitting in the festival's own timezone. */
export function deviceIsAwayFromFestival(at: Date = new Date()): boolean {
  return festivalNow(at).getTimezoneOffset() !== at.getTimezoneOffset();
}

/** The festival-local hour (0–23) right now. Used for the after-dark switch. */
export function festivalHour(at: Date): number {
  return festivalNow(at).getHours();
}

export function festivalVenueName(): string {
  return getFestival().venue.name;
}
