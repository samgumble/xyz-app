import { TZDate } from '@date-fns/tz';
import { format } from 'date-fns';

import type { FestivalSet } from '@/types/content';

import { getSnapshot } from './snapshot';

/** Anything with a start/end ISO pair — a set, a session, a made-up window. */
export interface TimeRange {
  start: string;
  end: string;
}

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;
const MINUTE_MS = 60_000;

/**
 * The festival's IANA timezone, read from the content snapshot.
 *
 * Never hard-code a zone at a call site — pass this (or let it default) so a
 * future edition in a different place keeps working.
 */
export function festivalTimezone(): string {
  return getSnapshot().festival.timezone;
}

/**
 * Turns an ISO string into a `TZDate` anchored in the festival zone. A
 * date-only string (`2026-09-18`) is read as local midnight *in the festival
 * zone*, which is what a calendar day means here; anything else is a real
 * instant and only its presentation changes.
 */
export function toFestivalDate(iso: string, timezone: string = festivalTimezone()): TZDate {
  const match = DATE_ONLY.exec(iso);
  if (match) {
    const year = Number(iso.slice(0, 4));
    const month = Number(iso.slice(5, 7));
    const day = Number(iso.slice(8, 10));
    return new TZDate(year, month - 1, day, 0, 0, 0, timezone);
  }
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) {
    throw new Error(`Not an ISO timestamp: ${iso}`);
  }
  return new TZDate(ms, timezone);
}

/** "Now", expressed in festival time. Pass `at` to make a caller testable. */
export function festivalNow(at: Date = new Date(), timezone: string = festivalTimezone()): TZDate {
  return new TZDate(at.getTime(), timezone);
}

/** Festival-local calendar day for an instant, as `YYYY-MM-DD`. */
export function toFestivalDay(iso: string | Date, timezone: string = festivalTimezone()): string {
  const d = typeof iso === 'string' ? toFestivalDate(iso, timezone) : festivalNow(iso, timezone);
  return format(d, 'yyyy-MM-dd');
}

/** `6:30 PM` — always festival time, whatever the device zone says. */
export function formatTime(iso: string | Date, timezone: string = festivalTimezone()): string {
  const d = typeof iso === 'string' ? toFestivalDate(iso, timezone) : festivalNow(iso, timezone);
  return format(d, 'h:mm a');
}

/** `6:30 – 7:45 PM` for a range inside one day, otherwise both times in full. */
export function formatTimeRange(range: TimeRange, timezone: string = festivalTimezone()): string {
  return `${formatTime(range.start, timezone)} – ${formatTime(range.end, timezone)}`;
}

/** `Friday, September 18`. */
export function formatDayLabel(iso: string | Date, timezone: string = festivalTimezone()): string {
  const d = typeof iso === 'string' ? toFestivalDate(iso, timezone) : festivalNow(iso, timezone);
  return format(d, 'EEEE, MMMM d');
}

/** `Fri 9/18` — for tab strips and chips where space is tight. */
export function formatShortDayLabel(iso: string | Date, timezone: string = festivalTimezone()): string {
  const d = typeof iso === 'string' ? toFestivalDate(iso, timezone) : festivalNow(iso, timezone);
  return format(d, 'EEE M/d');
}

/** True while `at` is inside the range: start inclusive, end exclusive. */
export function isLive(range: TimeRange | FestivalSet, at: Date = new Date()): boolean {
  const start = Date.parse(range.start);
  const end = Date.parse(range.end);
  const now = at.getTime();
  return now >= start && now < end;
}

/**
 * Whole minutes from `at` until `iso`. Negative once the moment has passed,
 * rounded toward zero so "in 1 minute" never reads as "in 0 minutes".
 */
export function minutesUntil(iso: string, at: Date = new Date()): number {
  const diff = Date.parse(iso) - at.getTime();
  return Math.trunc(diff / MINUTE_MS);
}

/** Whole minutes elapsed since a range began; 0 before it starts. */
export function minutesElapsed(range: TimeRange, at: Date = new Date()): number {
  return Math.max(0, Math.trunc((at.getTime() - Date.parse(range.start)) / MINUTE_MS));
}

/** Length of a range in whole minutes. */
export function durationMinutes(range: TimeRange): number {
  return Math.max(0, Math.round((Date.parse(range.end) - Date.parse(range.start)) / MINUTE_MS));
}

/** 0..1 progress through a range, clamped. */
export function progress(range: TimeRange, at: Date = new Date()): number {
  const start = Date.parse(range.start);
  const end = Date.parse(range.end);
  if (end <= start) return 0;
  return Math.min(1, Math.max(0, (at.getTime() - start) / (end - start)));
}

/**
 * Minutes two ranges overlap. Zero when they merely touch end-to-start, which
 * is what you want for back-to-back sets on neighbouring stages.
 */
export function overlapMinutes(a: TimeRange, b: TimeRange): number {
  const start = Math.max(Date.parse(a.start), Date.parse(b.start));
  const end = Math.min(Date.parse(a.end), Date.parse(b.end));
  if (end <= start) return 0;
  return Math.round((end - start) / MINUTE_MS);
}

/** True when both instants land on the same festival-local calendar day. */
export function isSameFestivalDay(
  a: string,
  b: string,
  timezone: string = festivalTimezone(),
): boolean {
  return toFestivalDay(a, timezone) === toFestivalDay(b, timezone);
}

/** `in 25 min` / `in 2h 10m` / `started 12 min ago`. */
export function formatCountdown(iso: string, at: Date = new Date()): string {
  const mins = minutesUntil(iso, at);
  if (mins < 0) {
    const ago = Math.abs(mins);
    return ago < 60 ? `started ${ago} min ago` : `started ${Math.floor(ago / 60)}h ${ago % 60}m ago`;
  }
  if (mins < 60) return `in ${mins} min`;
  return `in ${Math.floor(mins / 60)}h ${mins % 60}m`;
}
