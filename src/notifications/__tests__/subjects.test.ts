/**
 * The bridge from saved ids to planner input, against the real snapshot.
 *
 * The suite runs with the device clock in Sydney (see the `test` script), so
 * the timezone assertions here fail loudly if wall-clock time ever leaks in.
 */

import { formatTime } from '@/data/time';
import { getSet } from '@/data/repository';

import { planReminders } from '../plan';
import { buildReminderSubjects, reminderKeyForSet } from '../subjects';

const MAIN_SET = 'fri-main-1200-myron-elkins';
const COMEDY_BILL = [
  'fri-liz-2200-troy-walker-2026',
  'fri-liz-2200-baron-vaughn',
  'fri-liz-2200-kiran-deol',
  'fri-liz-2200-hannah-jones',
];

describe('buildReminderSubjects', () => {
  it('builds one subject per saved set', () => {
    const subjects = buildReminderSubjects([MAIN_SET]);

    expect(subjects).toHaveLength(1);
    expect(subjects[0]?.key).toBe(MAIN_SET);
    expect(subjects[0]?.title).toBe('Myron Elkins');
    expect(subjects[0]?.stageName).toBeTruthy();
  });

  it('labels the time in festival time, not the device timezone', () => {
    const set = getSet(MAIN_SET);
    const subjects = buildReminderSubjects([MAIN_SET]);

    // Noon in Denver. The device is in Sydney, where this instant is 4 AM the
    // next day — if that ever showed up here, the notification would announce
    // a set four hours after it started.
    expect(subjects[0]?.timeLabel).toBe('12:00 PM');
    expect(subjects[0]?.timeLabel).toBe(formatTime(set?.start ?? ''));
  });

  it('anchors startMs to the real instant, offset and all', () => {
    const subjects = buildReminderSubjects([MAIN_SET]);

    expect(subjects[0]?.startMs).toBe(Date.parse('2026-09-18T12:00:00-06:00'));
  });

  it('folds a combined comedy bill into a single subject', () => {
    const subjects = buildReminderSubjects(COMEDY_BILL);

    expect(subjects).toHaveLength(1);
    expect(subjects[0]?.setIds.sort()).toEqual([...COMEDY_BILL].sort());
    expect(subjects[0]?.title).toContain('&');
  });

  it('produces one reminder for a bill saved four ids at a time', () => {
    const subjects = buildReminderSubjects(COMEDY_BILL);
    const plan = planReminders({
      subjects,
      leadMinutes: 15,
      nowMs: Date.parse('2026-09-18T09:00:00-06:00'),
      enabled: true,
    });

    expect(plan.scheduled).toHaveLength(1);
  });

  it('gives the same subject whichever member of a bill was saved', () => {
    const fromFirst = buildReminderSubjects([COMEDY_BILL[0] ?? '']);
    const fromLast = buildReminderSubjects([COMEDY_BILL[3] ?? '']);

    expect(fromFirst[0]?.key).toBe(fromLast[0]?.key);
    expect(fromFirst[0]?.startMs).toBe(fromLast[0]?.startMs);
  });

  it('drops an id that no longer exists — how a cancelled set loses its reminder', () => {
    const subjects = buildReminderSubjects([MAIN_SET, 'set-that-was-cancelled']);

    expect(subjects.map((s) => s.key)).toEqual([MAIN_SET]);
  });

  it('survives a completely unknown favourites list without throwing', () => {
    expect(buildReminderSubjects(['nope', 'also-nope'])).toEqual([]);
  });

  it('never emits two subjects with the same key', () => {
    const subjects = buildReminderSubjects([...COMEDY_BILL, ...COMEDY_BILL, MAIN_SET]);
    const keys = subjects.map((s) => s.key);

    expect(new Set(keys).size).toBe(keys.length);
  });
});

describe('reminderKeyForSet', () => {
  it('maps every member of a bill to the same reminder key', () => {
    const keys = COMEDY_BILL.map((id) => reminderKeyForSet(id));

    expect(new Set(keys).size).toBe(1);
  });

  it('returns null for a set that is not in the schedule', () => {
    expect(reminderKeyForSet('gone')).toBeNull();
  });
});
