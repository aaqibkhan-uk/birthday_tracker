// The only module that touches expo-notifications (CLAUDE.md §8). Local notifications only.
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import type { ReminderFriend } from '../domain/schedule';
import { buildSchedule } from '../domain/schedule';

const ANDROID_CHANNEL_ID = 'reminders';
/** Dev test notifications use this identifier prefix so reschedules leave them alone. */
const TEST_ID_PREFIX = 'test-';

// DEV aid: a short in-memory log of scheduling events, shown on the dev reminders screen.
const debugEvents: string[] = [];
export function logDebugEvent(message: string): void {
  if (!__DEV__) return;
  debugEvents.unshift(`${new Date().toLocaleTimeString()} ${message}`);
  debugEvents.length = Math.min(debugEvents.length, 30);
}
export const getDebugEvents = (): readonly string[] => debugEvents;

export type PermissionStatus = 'granted' | 'denied' | 'undetermined';

/** Data attached to every reminder, read back when the user taps it (FR-3.4). */
export interface ReminderData extends Record<string, unknown> {
  friendId: number;
}

/** Call once at startup, before anything is scheduled. */
export function configureNotifications(): void {
  // Without a handler, notifications that arrive while the app is open are not shown.
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
  if (Platform.OS === 'android') {
    // Android 13+ only shows the permission prompt once a channel exists.
    void Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
      name: 'Birthday reminders',
      importance: Notifications.AndroidImportance.HIGH,
    });
  }
}

function toStatus(response: Notifications.NotificationPermissionsStatus): PermissionStatus {
  if (response.granted) return 'granted';
  return response.canAskAgain ? 'undetermined' : 'denied';
}

export async function getPermissionStatus(): Promise<PermissionStatus> {
  return toStatus(await Notifications.getPermissionsAsync());
}

export async function requestPermission(): Promise<PermissionStatus> {
  return toStatus(
    await Notifications.requestPermissionsAsync({
      ios: { allowAlert: true, allowBadge: false, allowSound: true },
    }),
  );
}

async function scheduleAt(
  identifier: string,
  date: Date,
  title: string,
  body: string,
  data: ReminderData,
) {
  await Notifications.scheduleNotificationAsync({
    identifier,
    // fireAt is for reading back only: iOS stores a DATE trigger as a time interval, so the
    // OS cannot tell us the fire date later.
    content: { title, body, data: { ...data, fireAt: date.toISOString() } },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date,
      channelId: ANDROID_CHANNEL_ID,
    },
  });
}

let queue: Promise<unknown> = Promise.resolve();

/**
 * Cancels every scheduled notification and schedules exactly one per friend: their next
 * reminder (FR-3.3.2). Calls are queued so overlapping reschedules (launch + an edit) cannot
 * interleave and leave duplicates. Does nothing without permission.
 */
export function rescheduleAll(friends: readonly ReminderFriend[]): Promise<void> {
  const run = async () => {
    if ((await getPermissionStatus()) !== 'granted') return;
    // Cancel everything this app scheduled except dev test notifications.
    const pending = await Notifications.getAllScheduledNotificationsAsync();
    const toCancel = pending.filter((request) => !request.identifier.startsWith(TEST_ID_PREFIX));
    for (const request of toCancel) {
      await Notifications.cancelScheduledNotificationAsync(request.identifier);
    }
    // `now` is taken inside the queued task so a delayed run never schedules a past moment.
    const schedule = buildSchedule(friends, new Date());
    for (const reminder of schedule) {
      await scheduleAt(
        `reminder-${reminder.friendId}`,
        reminder.fireAt,
        reminder.title,
        reminder.body,
        { friendId: reminder.friendId },
      );
    }
    logDebugEvent(`rescheduled: cancelled ${toCancel.length}, scheduled ${schedule.length}`);
  };
  const next = queue.then(run, run);
  queue = next.catch(() => undefined);
  return next;
}

export interface PendingReminder {
  friendId: number | null;
  title: string;
  fireAt: Date | null;
}

/** Scheduled notifications as the OS reports them, soonest first. Used by the dev screen. */
export async function getPending(): Promise<PendingReminder[]> {
  const requests = await Notifications.getAllScheduledNotificationsAsync();
  return requests
    .map(({ content }) => {
      const friendId = content.data?.friendId;
      const fireAt = content.data?.fireAt;
      return {
        friendId: typeof friendId === 'number' ? friendId : null,
        title: content.title ?? '',
        fireAt: typeof fireAt === 'string' ? new Date(fireAt) : null,
      };
    })
    .sort((a, b) => (a.fireAt?.getTime() ?? 0) - (b.fireAt?.getTime() ?? 0));
}

/** Dev only: a reminder for one friend a few seconds from now, to test tap handling. */
export async function scheduleTestReminder(friend: ReminderFriend, secondsAhead: number) {
  const fireAt = new Date(Date.now() + secondsAhead * 1000);
  logDebugEvent(`test scheduled for ${fireAt.toLocaleTimeString()}`);
  await scheduleAt(
    `${TEST_ID_PREFIX}${fireAt.getTime()}`,
    fireAt,
    `Test: ${friend.name}'s birthday reminder`,
    'Tap to open their screen.',
    { friendId: friend.id },
  );
}

export interface TappedReminder {
  /** Unique per delivered notification, so the same tap is handled once. */
  key: string;
  friendId: number;
}

/** Subscribes to notification taps, including the one that cold-started the app. */
export function useTappedReminder(): TappedReminder | null {
  const response = Notifications.useLastNotificationResponse();
  if (!response || response.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER) {
    return null;
  }
  const { request, date } = response.notification;
  const friendId = request.content.data?.friendId;
  return typeof friendId === 'number' ? { key: `${request.identifier}:${date}`, friendId } : null;
}

export function clearTappedReminder(): void {
  void Notifications.clearLastNotificationResponseAsync();
}
