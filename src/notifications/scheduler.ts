/**
 * The `expo-notifications` side of local reminders — the *native* build.
 *
 * Metro resolves `./scheduler` to `scheduler.web.ts` for the web bundle, so
 * `expo-notifications` is never even imported there. Every method still guards
 * on `Platform.OS` anyway: a resolver misconfiguration should degrade to a
 * no-op, not throw inside a screen.
 *
 * State lives in the OS, not in our storage. Each pending notification carries
 * its reminder key and signature in `content.data`, which means the pending
 * queue *is* the record of what is scheduled — it survives app restarts,
 * survives reboot (iOS keeps pending locals; expo-notifications re-registers
 * on Android), and cannot drift out of sync with a mirror we forgot to write.
 */

import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

import type {
  PlannedReminder,
  ReminderPermission,
  ReminderScheduler,
  ScheduledRecord,
} from './types';

/** Marks a pending notification as ours, so we never cancel someone else's. */
export const REMINDER_TAG = 'tbb.set-reminder';

/** Android needs a channel before 8.0+ will show anything with sound. */
const CHANNEL_ID = 'set-reminders';

const supported = Platform.OS !== 'web';

interface ReminderData {
  tag: string;
  key: string;
  signature: string;
  setIds: string[];
}

function readReminderData(data: unknown): ReminderData | null {
  if (typeof data !== 'object' || data === null) return null;
  const record = data as Record<string, unknown>;
  if (record['tag'] !== REMINDER_TAG) return null;
  const key = record['key'];
  const signature = record['signature'];
  if (typeof key !== 'string' || typeof signature !== 'string') return null;
  const setIds = Array.isArray(record['setIds'])
    ? record['setIds'].filter((id): id is string => typeof id === 'string')
    : [];
  return { tag: REMINDER_TAG, key, signature, setIds };
}

function toPermission(status: Notifications.NotificationPermissionsStatus): ReminderPermission {
  if (status.granted) return 'granted';
  // `canAskAgain` separates "not asked yet" from "asked and told no". Only the
  // second one deserves the "turn it on in Settings" copy.
  return status.canAskAgain ? 'undetermined' : 'denied';
}

let handlerInstalled = false;

/**
 * A reminder that fires while the app is open should still be visible — the
 * default is to swallow it, which reads as a bug five minutes before the set
 * you are standing in line for.
 */
function installForegroundHandler(): void {
  if (handlerInstalled || !supported) return;
  handlerInstalled = true;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

let channelReady: Promise<void> | null = null;

function ensureChannel(): Promise<void> {
  if (Platform.OS !== 'android') return Promise.resolve();
  channelReady ??= Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: 'Set reminders',
    importance: Notifications.AndroidImportance.HIGH,
    sound: 'default',
  }).then(() => undefined);
  return channelReady;
}

export const scheduler: ReminderScheduler = {
  supported,

  async getPermission() {
    if (!supported) return 'undetermined';
    installForegroundHandler();
    return toPermission(await Notifications.getPermissionsAsync());
  },

  /**
   * Only called from an explicit user action — the reminder toggle on a set,
   * the master switch, or saving a set from the detail screen. Never on
   * launch, never from reconciliation.
   */
  async requestPermission() {
    if (!supported) return 'undetermined';
    installForegroundHandler();
    await ensureChannel();
    return toPermission(
      await Notifications.requestPermissionsAsync({
        ios: { allowAlert: true, allowSound: true, allowBadge: false },
      }),
    );
  },

  async list() {
    if (!supported) return [];
    const pending = await Notifications.getAllScheduledNotificationsAsync();
    const records: ScheduledRecord[] = [];
    for (const request of pending) {
      const data = readReminderData(request.content.data);
      if (!data) continue;
      records.push({ identifier: request.identifier, key: data.key, signature: data.signature });
    }
    return records;
  },

  async schedule(reminder: PlannedReminder) {
    if (!supported) return null;
    await ensureChannel();
    const data: ReminderData = {
      tag: REMINDER_TAG,
      key: reminder.key,
      signature: reminder.signature,
      setIds: reminder.setIds,
    };
    return Notifications.scheduleNotificationAsync({
      content: {
        title: reminder.title,
        body: reminder.body,
        data: { ...data },
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: reminder.fireAtMs,
        ...(Platform.OS === 'android' ? { channelId: CHANNEL_ID } : {}),
      },
    });
  },

  async cancel(identifier: string) {
    if (!supported) return;
    await Notifications.cancelScheduledNotificationAsync(identifier);
  },
};
