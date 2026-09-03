/**
 * What the UI says, given what is true.
 *
 * The one property worth guarding across every branch: the app never tells
 * someone a reminder is set when it is not. These are the strings that would
 * otherwise quietly drift into reassurance.
 */

import {
  describeReminderStatus,
  explainSetReminder,
  type SetReminderMessageInput,
} from '../messages';
import type { SkipReason } from '../types';

function setMessage(overrides: Partial<SetReminderMessageInput> = {}): string {
  return explainSetReminder({
    supported: true,
    supportMessage: 'no support here',
    saved: true,
    on: true,
    scheduled: true,
    permission: 'granted',
    leadMinutes: 15,
    skipReason: null,
    ...overrides,
  });
}

describe('explainSetReminder', () => {
  it('confirms the reminder only when one is genuinely scheduled', () => {
    expect(setMessage()).toBe('You’ll get a notification 15 minutes before this one starts.');
  });

  it('quotes the platform message verbatim when reminders are unsupported', () => {
    expect(setMessage({ supported: false })).toBe('no support here');
  });

  it('invites a save rather than promising anything, when nothing is saved', () => {
    expect(setMessage({ saved: false })).toContain('Save this set');
  });

  it('says nothing will arrive when permission was denied', () => {
    const message = setMessage({ permission: 'denied' });

    expect(message).toContain('no reminder will arrive');
    expect(message).not.toContain('You’ll get a notification');
  });

  it('does not claim a reminder is set while permission is still unasked', () => {
    const message = setMessage({ permission: 'undetermined' });

    expect(message).toContain('allow notifications');
    expect(message).not.toContain('You’ll get a notification');
  });

  it('explains a set that has already started', () => {
    expect(setMessage({ skipReason: 'past' })).toContain('already started');
  });

  it('explains a set that starts sooner than the chosen warning', () => {
    const message = setMessage({ skipReason: 'lead-window-passed', leadMinutes: 30 });

    expect(message).toContain('under 30 minutes');
    expect(message).toContain('30-minute warning');
  });

  it('promises later scheduling for a set beyond the horizon', () => {
    expect(setMessage({ skipReason: 'beyond-horizon' })).toContain('closer to the day');
  });

  it('explains the pending-notification cap rather than failing silently', () => {
    expect(setMessage({ skipReason: 'over-cap' })).toContain('queued behind');
  });

  it('points at the master switch when reminders are off globally', () => {
    expect(setMessage({ on: true, skipReason: 'disabled' })).toContain('More → Reminders');
  });

  it('never promises a notification for any skip reason', () => {
    const reasons: SkipReason[] = [
      'disabled',
      'muted',
      'past',
      'lead-window-passed',
      'beyond-horizon',
      'over-cap',
    ];

    for (const skipReason of reasons) {
      expect(setMessage({ skipReason })).not.toContain('You’ll get a notification');
    }
  });

  it('is never empty, in any combination of states', () => {
    for (const supported of [true, false]) {
      for (const saved of [true, false]) {
        for (const on of [true, false]) {
          for (const permission of ['granted', 'denied', 'undetermined'] as const) {
            expect(setMessage({ supported, saved, on, permission }).length).toBeGreaterThan(0);
          }
        }
      }
    }
  });
});

describe('describeReminderStatus', () => {
  it('reports the count the OS is holding', () => {
    const status = describeReminderStatus({
      enabled: true,
      permission: 'granted',
      scheduledCount: 4,
    });

    expect(status.headline).toBe('4 reminders scheduled');
    expect(status.icon).toBe('on');
    expect(status.stuck).toBe(false);
  });

  it('gets the singular right', () => {
    expect(
      describeReminderStatus({ enabled: true, permission: 'granted', scheduledCount: 1 }).headline,
    ).toBe('1 reminder scheduled');
  });

  it('does not look active when nothing is scheduled', () => {
    const status = describeReminderStatus({
      enabled: true,
      permission: 'granted',
      scheduledCount: 0,
    });

    expect(status.headline).toBe('0 reminders scheduled');
    expect(status.icon).toBe('off');
  });

  it('flags the one genuinely broken state: wanted but blocked', () => {
    const status = describeReminderStatus({
      enabled: true,
      permission: 'denied',
      scheduledCount: 0,
    });

    expect(status.stuck).toBe(true);
    expect(status.icon).toBe('warning');
    expect(status.headline).toContain('blocked');
  });

  it('does not flag a blocked permission when the user turned reminders off anyway', () => {
    const status = describeReminderStatus({
      enabled: false,
      permission: 'denied',
      scheduledCount: 0,
    });

    expect(status.stuck).toBe(false);
    expect(status.headline).toBe('Reminders are off');
  });

  it('says permission has not been asked for yet, and that saying no is fine', () => {
    const status = describeReminderStatus({
      enabled: true,
      permission: 'undetermined',
      scheduledCount: 0,
    });

    expect(status.headline).toBe('Waiting on permission');
    expect(status.detail).toContain('say no without losing anything');
  });

  it('reassures that saved sets survive turning reminders off', () => {
    expect(
      describeReminderStatus({ enabled: false, permission: 'granted', scheduledCount: 0 }).detail,
    ).toContain('saved sets are untouched');
  });
});
