import {
  durationMinutes,
  festivalNow,
  festivalTimezone,
  formatCountdown,
  formatDayLabel,
  formatShortDayLabel,
  formatTime,
  formatTimeRange,
  isLive,
  isSameFestivalDay,
  minutesUntil,
  overlapMinutes,
  progress,
  toFestivalDay,
} from '../time';

/**
 * Every assertion here is about one rule: times render in FESTIVAL time no
 * matter where the phone thinks it is. The suite runs under
 * TZ=Australia/Sydney (UTC+10), which is 16 hours off Denver and on the other
 * side of the international date line for most of the festival — so a naive
 * implementation gets the wrong day, not just the wrong hour.
 */
describe('festival time on a non-Denver device', () => {
  it('is actually running somewhere other than Denver', () => {
    expect(process.env.TZ).toBe('Australia/Sydney');
    expect(Intl.DateTimeFormat().resolvedOptions().timeZone).not.toBe('America/Denver');
  });

  it('reads the timezone from the festival record, not a constant', () => {
    expect(festivalTimezone()).toBe('America/Denver');
  });

  it('formats a set time in Denver time', () => {
    // 18:30 MDT is 10:30 the next morning in Sydney.
    expect(formatTime('2026-09-18T18:30:00-06:00')).toBe('6:30 PM');
    expect(formatTime('2026-09-18T12:00:00-06:00')).toBe('12:00 PM');
    expect(formatTime('2026-09-19T00:30:00-06:00')).toBe('12:30 AM');
  });

  it('keeps a late Friday set on Friday', () => {
    // 21:20 MDT is 2026-09-19T03:20Z, i.e. Saturday afternoon in Sydney.
    expect(toFestivalDay('2026-09-18T21:20:00-06:00')).toBe('2026-09-18');
  });

  it('rolls a past-midnight club set onto the next festival day', () => {
    expect(toFestivalDay('2026-09-18T22:30:00-06:00')).toBe('2026-09-18');
    expect(toFestivalDay('2026-09-19T01:00:00-06:00')).toBe('2026-09-19');
  });

  it('treats a date-only string as festival-local midnight', () => {
    expect(toFestivalDay('2026-09-18')).toBe('2026-09-18');
    expect(formatDayLabel('2026-09-18')).toBe('Friday, September 18');
    expect(formatShortDayLabel('2026-09-20')).toBe('Sun 9/20');
  });

  it('formats a range', () => {
    expect(formatTimeRange({ start: '2026-09-18T18:30:00-06:00', end: '2026-09-18T19:45:00-06:00' })).toBe(
      '6:30 PM – 7:45 PM',
    );
  });

  it('gives the same answer when the device zone changes underneath it', () => {
    const original = process.env.TZ;
    const iso = '2026-09-18T21:20:00-06:00';
    const inSydney = { time: formatTime(iso), day: toFestivalDay(iso), label: formatDayLabel(iso) };
    try {
      process.env.TZ = 'UTC';
      expect(formatTime(iso)).toBe(inSydney.time);
      process.env.TZ = 'America/New_York';
      expect(toFestivalDay(iso)).toBe(inSydney.day);
      process.env.TZ = 'Pacific/Kiritimati';
      expect(formatDayLabel(iso)).toBe(inSydney.label);
    } finally {
      process.env.TZ = original;
    }
  });

  it('expresses "now" in festival time', () => {
    // 2026-09-19T04:20:00Z is 22:20 on the 18th in Denver.
    const at = new Date('2026-09-19T04:20:00Z');
    expect(formatTime(at)).toBe('10:20 PM');
    expect(toFestivalDay(at)).toBe('2026-09-18');
    expect(festivalNow(at).getHours()).toBe(22);
  });

  it('rejects a string that is not a timestamp', () => {
    expect(() => toFestivalDay('not a date')).toThrow(/Not an ISO timestamp/);
  });
});

describe('range helpers', () => {
  const set = { start: '2026-09-18T18:30:00-06:00', end: '2026-09-18T19:45:00-06:00' };

  it('is live between start (inclusive) and end (exclusive)', () => {
    expect(isLive(set, new Date('2026-09-19T00:29:00Z'))).toBe(false);
    expect(isLive(set, new Date('2026-09-19T00:30:00Z'))).toBe(true);
    expect(isLive(set, new Date('2026-09-19T01:00:00Z'))).toBe(true);
    expect(isLive(set, new Date('2026-09-19T01:45:00Z'))).toBe(false);
  });

  it('counts minutes until a start, truncating toward zero', () => {
    expect(minutesUntil(set.start, new Date('2026-09-19T00:00:00Z'))).toBe(30);
    expect(minutesUntil(set.start, new Date('2026-09-19T00:29:30Z'))).toBe(0);
    expect(minutesUntil(set.start, new Date('2026-09-19T01:00:00Z'))).toBe(-30);
  });

  it('measures duration and progress', () => {
    expect(durationMinutes(set)).toBe(75);
    expect(progress(set, new Date('2026-09-19T00:00:00Z'))).toBe(0);
    expect(progress(set, new Date('2026-09-19T01:45:00Z'))).toBe(1);
    expect(progress(set, new Date('2026-09-19T01:07:30Z'))).toBeCloseTo(0.5, 5);
  });

  it('reports overlap in minutes, and zero for back-to-back sets', () => {
    const a = { start: '2026-09-18T12:00:00-06:00', end: '2026-09-18T13:00:00-06:00' };
    const b = { start: '2026-09-18T12:30:00-06:00', end: '2026-09-18T13:30:00-06:00' };
    const backToBack = { start: '2026-09-18T13:00:00-06:00', end: '2026-09-18T14:00:00-06:00' };
    expect(overlapMinutes(a, b)).toBe(30);
    expect(overlapMinutes(b, a)).toBe(30);
    expect(overlapMinutes(a, backToBack)).toBe(0);
    expect(overlapMinutes(a, a)).toBe(60);
  });

  it('knows when two instants share a festival day', () => {
    expect(isSameFestivalDay('2026-09-18T22:30:00-06:00', '2026-09-18T12:00:00-06:00')).toBe(true);
    expect(isSameFestivalDay('2026-09-18T22:30:00-06:00', '2026-09-19T01:00:00-06:00')).toBe(false);
  });

  it('writes a human countdown', () => {
    expect(formatCountdown(set.start, new Date('2026-09-19T00:00:00Z'))).toBe('in 30 min');
    expect(formatCountdown(set.start, new Date('2026-09-18T22:00:00Z'))).toBe('in 2h 30m');
    expect(formatCountdown(set.start, new Date('2026-09-19T00:42:00Z'))).toBe('started 12 min ago');
  });
});
