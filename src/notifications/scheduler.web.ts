/**
 * The web build's scheduler: an honest no-op.
 *
 * Metro picks this file over `scheduler.ts` for `platform=web`, so the web
 * bundle never imports `expo-notifications` at all — nothing to tree-shake,
 * nothing to throw at module load, nothing to break the static export.
 *
 * Why not try anyway? `expo-notifications` has no web implementation of the
 * scheduler module: `scheduleNotificationAsync` has no `.web` build and would
 * throw on the native-module proxy. The browser's own `Notification` API can
 * only show a notification *now*; delivering one at a future time needs a
 * service worker with a persisted timer or a push subscription, i.e. exactly
 * the server this feature is defined by not having. A `setTimeout` in the tab
 * would die the moment the tab is closed or backgrounded, which is precisely
 * when a reminder matters.
 *
 * So the web build reports `supported: false` and the UI says so in words. A
 * toggle that flips on and never fires is worse than no toggle.
 */

import type { ReminderScheduler } from './types';

export const scheduler: ReminderScheduler = {
  supported: false,
  async getPermission() {
    return 'undetermined';
  },
  async requestPermission() {
    return 'undetermined';
  },
  async list() {
    return [];
  },
  async schedule() {
    return null;
  },
  async cancel() {
    // Nothing was ever scheduled.
  },
};
