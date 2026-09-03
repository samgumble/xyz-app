/**
 * The pure planner. Every rule that decides whether a reminder should exist,
 * driven with a fixed clock so nothing here depends on when it runs — or, with
 * `TZ=Australia/Sydney` in the test script, on where.
 */

import {
  DEFAULT_MAX_PENDING,
  diffReminders,
  planReminders,
  reminderSignature,
  type ReminderPlanInput,
} from '../plan';
import type { PlannedReminder, ReminderSubject, ScheduledRecord } from '../types';

const NOW = Date.parse('2026-09-18T18:00:00-06:00');
const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

function subject(overrides: Partial<ReminderSubject> & { key: string }): ReminderSubject {
  const startMs = overrides.startMs ?? NOW + 2 * HOUR;
  return {
    setIds: [overrides.key],
    title: 'Samantha Fish',
    stageName: 'Main Stage',
    timeLabel: '8:00 PM',
    start: new Date(startMs).toISOString(),
    startMs,
    ...overrides,
  };
}

function plan(overrides: Partial<ReminderPlanInput> = {}) {
  return planReminders({
    subjects: [],
    leadMinutes: 15,
    nowMs: NOW,
    enabled: true,
    ...overrides,
  });
}

function reasonFor(result: ReturnType<typeof plan>, key: string): string | undefined {
  return result.skipped.find((s) => s.key === key)?.reason;
}

describe('planReminders', () => {
  it('schedules a saved future set at start minus the lead time', () => {
    const start = NOW + 2 * HOUR;
    const result = plan({ subjects: [subject({ key: 'a', startMs: start })], leadMinutes: 30 });

    expect(result.scheduled).toHaveLength(1);
    expect(result.scheduled[0]?.fireAtMs).toBe(start - 30 * MINUTE);
    expect(result.scheduled[0]?.leadMinutes).toBe(30);
  });

  it('names the artist in the title and the stage and time in the body', () => {
    const result = plan({
      subjects: [subject({ key: 'a', title: 'Robert Randolph', stageName: 'Blues Stage' })],
      leadMinutes: 10,
    });

    expect(result.scheduled[0]?.title).toBe('Robert Randolph');
    expect(result.scheduled[0]?.body).toBe('Starts in 10 min · Blues Stage at 8:00 PM');
  });

  it('schedules nothing at all when reminders are disabled', () => {
    const result = plan({ subjects: [subject({ key: 'a' }), subject({ key: 'b' })], enabled: false });

    expect(result.scheduled).toEqual([]);
    expect(result.skipped.map((s) => s.reason)).toEqual(['disabled', 'disabled']);
  });

  it('skips a set the user muted individually', () => {
    const result = plan({ subjects: [subject({ key: 'a' })], mutedKeys: ['a'] });

    expect(result.scheduled).toEqual([]);
    expect(reasonFor(result, 'a')).toBe('muted');
  });

  it('never schedules a set that has already started', () => {
    const result = plan({ subjects: [subject({ key: 'a', startMs: NOW - MINUTE })] });

    expect(result.scheduled).toEqual([]);
    expect(reasonFor(result, 'a')).toBe('past');
  });

  it('treats a set starting exactly now as past', () => {
    const result = plan({ subjects: [subject({ key: 'a', startMs: NOW })] });

    expect(reasonFor(result, 'a')).toBe('past');
  });

  it('skips a future set whose lead window has already gone by', () => {
    // Starts in 8 minutes, but the user asked for 15 minutes of warning.
    const result = plan({
      subjects: [subject({ key: 'a', startMs: NOW + 8 * MINUTE })],
      leadMinutes: 15,
    });

    expect(result.scheduled).toEqual([]);
    expect(reasonFor(result, 'a')).toBe('lead-window-passed');
  });

  it('schedules that same set once the lead time is short enough', () => {
    const result = plan({
      subjects: [subject({ key: 'a', startMs: NOW + 8 * MINUTE })],
      leadMinutes: 5,
    });

    expect(result.scheduled).toHaveLength(1);
  });

  it('defers a set beyond the seven-day horizon', () => {
    const result = plan({ subjects: [subject({ key: 'a', startMs: NOW + 8 * DAY })] });

    expect(result.scheduled).toEqual([]);
    expect(reasonFor(result, 'a')).toBe('beyond-horizon');
  });

  it('honours a custom horizon', () => {
    const result = plan({
      subjects: [subject({ key: 'a', startMs: NOW + 3 * DAY })],
      horizonDays: 2,
    });

    expect(reasonFor(result, 'a')).toBe('beyond-horizon');
  });

  it('folds duplicate keys so a combined bill gets one reminder', () => {
    const result = plan({
      subjects: [
        subject({ key: 'bill', setIds: ['a', 'b', 'c', 'd'] }),
        subject({ key: 'bill', setIds: ['a', 'b', 'c', 'd'] }),
      ],
    });

    expect(result.scheduled).toHaveLength(1);
  });

  it('keeps the earliest reminders when more are saved than the phone will hold', () => {
    const subjects = Array.from({ length: DEFAULT_MAX_PENDING + 5 }, (_, i) =>
      subject({ key: `s${i}`, startMs: NOW + HOUR + i * MINUTE }),
    );

    const result = plan({ subjects });

    expect(result.scheduled).toHaveLength(DEFAULT_MAX_PENDING);
    expect(result.scheduled[0]?.key).toBe('s0');
    expect(result.skipped.filter((s) => s.reason === 'over-cap')).toHaveLength(5);
    // The ones dropped are the last five, not an arbitrary five.
    expect(result.skipped.filter((s) => s.reason === 'over-cap').map((s) => s.key)).toEqual([
      's60',
      's61',
      's62',
      's63',
      's64',
    ]);
  });

  it('returns reminders sorted earliest first', () => {
    const result = plan({
      subjects: [
        subject({ key: 'late', startMs: NOW + 5 * HOUR }),
        subject({ key: 'early', startMs: NOW + 2 * HOUR }),
        subject({ key: 'middle', startMs: NOW + 3 * HOUR }),
      ],
    });

    expect(result.scheduled.map((r) => r.key)).toEqual(['early', 'middle', 'late']);
  });

  it('is a pure function of its arguments — same input, same output', () => {
    const subjects = [subject({ key: 'a' }), subject({ key: 'b', startMs: NOW + 3 * HOUR })];

    expect(plan({ subjects })).toEqual(plan({ subjects }));
  });
});

describe('reminderSignature', () => {
  const base = subject({ key: 'a' });

  it('changes when the set moves', () => {
    const moved = subject({ key: 'a', startMs: base.startMs + 45 * MINUTE });
    expect(reminderSignature(moved, 15)).not.toBe(reminderSignature(base, 15));
  });

  it('changes when the lead time changes', () => {
    expect(reminderSignature(base, 30)).not.toBe(reminderSignature(base, 15));
  });

  it('changes when the set moves to another stage', () => {
    const moved = subject({ key: 'a', stageName: 'Campground Stage' });
    expect(reminderSignature(moved, 15)).not.toBe(reminderSignature(base, 15));
  });

  it('changes when a performer joins a combined bill', () => {
    const grown = subject({ key: 'a', setIds: ['a', 'b'] });
    expect(reminderSignature(grown, 15)).not.toBe(reminderSignature(base, 15));
  });

  it('does not change when the set ids are merely reordered', () => {
    const one = subject({ key: 'a', setIds: ['a', 'b', 'c'] });
    const other = subject({ key: 'a', setIds: ['c', 'a', 'b'] });
    expect(reminderSignature(other, 15)).toBe(reminderSignature(one, 15));
  });
});

describe('diffReminders', () => {
  const planned = (key: string, signature: string): PlannedReminder => ({
    key,
    setIds: [key],
    fireAtMs: NOW + HOUR,
    startMs: NOW + 2 * HOUR,
    leadMinutes: 15,
    title: key,
    body: 'body',
    signature,
  });

  const record = (identifier: string, key: string, signature: string): ScheduledRecord => ({
    identifier,
    key,
    signature,
  });

  it('schedules what is missing', () => {
    const diff = diffReminders([], [planned('a', 'sig-a')]);

    expect(diff.schedule.map((r) => r.key)).toEqual(['a']);
    expect(diff.cancel).toEqual([]);
  });

  it('keeps an identical reminder untouched — running twice does nothing', () => {
    const diff = diffReminders([record('n1', 'a', 'sig-a')], [planned('a', 'sig-a')]);

    expect(diff.schedule).toEqual([]);
    expect(diff.cancel).toEqual([]);
    expect(diff.keep.map((r) => r.identifier)).toEqual(['n1']);
  });

  it('cancels a reminder the plan no longer wants', () => {
    const diff = diffReminders([record('n1', 'a', 'sig-a')], []);

    expect(diff.cancel.map((r) => r.identifier)).toEqual(['n1']);
    expect(diff.schedule).toEqual([]);
  });

  it('replaces a reminder whose signature changed', () => {
    const diff = diffReminders([record('n1', 'a', 'old')], [planned('a', 'new')]);

    expect(diff.cancel.map((r) => r.identifier)).toEqual(['n1']);
    expect(diff.schedule.map((r) => r.signature)).toEqual(['new']);
  });

  it('collapses duplicate records for one key down to a single survivor', () => {
    const diff = diffReminders(
      [record('n1', 'a', 'sig-a'), record('n2', 'a', 'sig-a'), record('n3', 'a', 'sig-a')],
      [planned('a', 'sig-a')],
    );

    expect(diff.keep).toHaveLength(1);
    expect(diff.cancel.map((r) => r.identifier)).toEqual(['n2', 'n3']);
    expect(diff.schedule).toEqual([]);
  });

  it('does not leave a key unscheduled when every existing record for it is stale', () => {
    const diff = diffReminders(
      [record('n1', 'a', 'old'), record('n2', 'a', 'older')],
      [planned('a', 'new')],
    );

    expect(diff.cancel.map((r) => r.identifier)).toEqual(['n1', 'n2']);
    expect(diff.schedule.map((r) => r.key)).toEqual(['a']);
  });
});
