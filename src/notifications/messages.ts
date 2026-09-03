/**
 * What to tell the user, given what is actually true.
 *
 * Pure, and separate from the components on purpose. Deciding "permission was
 * denied, so say nothing will arrive" is a *decision*, not styling — it is the
 * part of this feature most likely to drift into a comfortable lie, and it is
 * the part worth testing. The components below it only choose an icon colour.
 *
 * The rule every string here follows: never claim a reminder is set unless one
 * is, and always give the reason when one is not.
 */

import type { ReminderPermission, SkipReason } from './types';

export interface SetReminderMessageInput {
  supported: boolean;
  /** Shown verbatim when unsupported — it already explains the platform. */
  supportMessage: string;
  saved: boolean;
  /** The switch position: wanted by the user. */
  on: boolean;
  /** The OS is genuinely holding a reminder for this slot. */
  scheduled: boolean;
  permission: ReminderPermission;
  leadMinutes: number;
  skipReason: SkipReason | null;
}

/** The sentence under the switch on a set detail screen. Never empty. */
export function explainSetReminder(input: SetReminderMessageInput): string {
  const { supported, supportMessage, saved, on, scheduled, permission, leadMinutes } = input;

  if (!supported) return supportMessage;
  if (!saved) return `Save this set and you’ll get a nudge ${leadMinutes} minutes before it starts.`;
  if (!on) return 'Reminder off for this set. Everything else about it still works.';
  if (permission === 'denied') {
    return 'Notifications are turned off for this app, so no reminder will arrive. You can turn them back on in your device settings.';
  }
  if (permission === 'undetermined') {
    return 'One tap to allow notifications and this reminder will be set.';
  }

  switch (input.skipReason) {
    case 'past':
      return 'This set has already started, so there’s nothing left to remind you about.';
    case 'lead-window-passed':
      return `This set starts in under ${leadMinutes} minutes — too soon for a ${leadMinutes}-minute warning.`;
    case 'beyond-horizon':
      return 'Too far out to schedule yet. It will be set automatically closer to the day.';
    case 'over-cap':
      return 'You have saved more sets than the phone will hold reminders for. This one is queued behind the earlier ones.';
    case 'muted':
    case 'disabled':
      return 'Reminders are switched off in More → Reminders.';
    default:
      return scheduled
        ? `You’ll get a notification ${leadMinutes} minutes before this one starts.`
        : `Setting a reminder for ${leadMinutes} minutes before it starts…`;
  }
}

export type ReminderStatusIcon = 'on' | 'off' | 'warning';

export interface ReminderStatusMessage {
  icon: ReminderStatusIcon;
  headline: string;
  detail: string;
  /** True when the user has asked for reminders and cannot have them. */
  stuck: boolean;
}

export interface ReminderStatusMessageInput {
  enabled: boolean;
  permission: ReminderPermission;
  /** How many the OS is holding — the only number worth printing. */
  scheduledCount: number;
}

/** The status card in the settings section. */
export function describeReminderStatus(
  input: ReminderStatusMessageInput,
): ReminderStatusMessage {
  const { enabled, permission, scheduledCount } = input;

  if (!enabled) {
    return {
      icon: 'off',
      stuck: false,
      headline: 'Reminders are off',
      detail: 'Nothing is scheduled. Your saved sets are untouched — turn this back on any time.',
    };
  }

  // Asked for, and blocked. The one state worth colouring: everything looks
  // switched on and nothing will ever arrive.
  if (permission === 'denied') {
    return {
      icon: 'warning',
      stuck: true,
      headline: 'Notifications are blocked for this app',
      detail:
        'Nothing will arrive until you allow notifications in your device settings. Everything else in the app works normally.',
    };
  }

  if (permission === 'undetermined') {
    return {
      icon: 'off',
      stuck: false,
      headline: 'Waiting on permission',
      detail:
        'We’ll ask the first time you save a set. Nothing is scheduled until you say yes, and you can say no without losing anything.',
    };
  }

  const count = scheduledCount === 1 ? '1 reminder' : `${scheduledCount} reminders`;
  return {
    icon: scheduledCount > 0 ? 'on' : 'off',
    stuck: false,
    headline: `${count} scheduled`,
    detail:
      scheduledCount > 0
        ? 'Save or unsave a set and this updates itself. Sets more than a week out are scheduled closer to the day.'
        : 'Save a set and a reminder appears here. Sets that have already started, or start sooner than your warning time, are skipped.',
  };
}
