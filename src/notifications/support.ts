/**
 * What this platform can actually do, and the sentence to show when it can't.
 *
 * Kept separate from the scheduler so screens can ask the question without
 * importing anything that touches a native module.
 */

import type { ReminderSupport } from './types';

import { scheduler } from './scheduler';

const WEB_MESSAGE =
  'Reminders need the phone app. A browser tab can’t wake itself up to buzz you before a set — install the app on iPhone or Android and your saved sets will remind you there.';

const UNAVAILABLE_MESSAGE =
  'Reminders aren’t available on this device. Everything else in the app works as normal.';

/**
 * The web answer is `false` and it is not a hedge — see `scheduler.web.ts` for
 * why local scheduling in a browser tab cannot be honoured without the server
 * this app is defined by not having.
 */
export function reminderSupport(): ReminderSupport {
  if (scheduler.supported) {
    return { supported: true, message: '' };
  }
  const web = typeof window !== 'undefined' && typeof document !== 'undefined';
  return web
    ? { supported: false, reason: 'web', message: WEB_MESSAGE }
    : { supported: false, reason: 'unavailable', message: UNAVAILABLE_MESSAGE };
}
