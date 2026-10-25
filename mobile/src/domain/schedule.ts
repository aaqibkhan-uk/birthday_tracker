// Pure reminder scheduling logic (CLAUDE.md §8, FR-3.2, FR-3.3, FR-3.5). No React or Expo imports.
import { subDays } from 'date-fns';
import { getDaysUntilBirthday, getNextBirthday, getNextReminder, REMINDER_HOUR } from './birthdays';
import { canArriveByBirthday } from './delivery';
import type { Friend, ReminderOffset } from './friend';

/** iOS allows 64 pending local notifications per app (FR-3.3.6). */
export const MAX_SCHEDULED_REMINDERS = 64;

export type ReminderFriend = Pick<
  Friend,
  'id' | 'name' | 'birthDay' | 'birthMonth' | 'reminderOffsetDays'
>;

export interface ScheduledReminder {
  friendId: number;
  fireAt: Date;
  title: string;
  body: string;
}

export function reminderTitle(name: string, offset: ReminderOffset): string {
  switch (offset) {
    case 0:
      return `It's ${name}'s birthday today`;
    case 1:
      return `${name}'s birthday is tomorrow`;
    case 7:
      return `${name}'s birthday is in 1 week`;
    case 14:
      return `${name}'s birthday is in 2 weeks`;
  }
}

/**
 * One reminder per friend (their next one), soonest first, capped at 64. Ties are broken by
 * friend id so the result is deterministic.
 */
export function buildSchedule(friends: readonly ReminderFriend[], now: Date): ScheduledReminder[] {
  return friends
    .map((friend) => ({
      friendId: friend.id,
      fireAt: getNextReminder(friend.birthDay, friend.birthMonth, friend.reminderOffsetDays, now),
      title: reminderTitle(friend.name, friend.reminderOffsetDays),
      body: 'Tap to make them a card.',
    }))
    .sort((a, b) => a.fireAt.getTime() - b.fireAt.getTime() || a.friendId - b.friendId)
    .slice(0, MAX_SCHEDULED_REMINDERS);
}

export interface CardPrompt {
  daysUntil: number;
  birthday: Date;
  /** False when a card ordered now is estimated to arrive after the birthday (FR-6.2). */
  canArriveInTime: boolean;
}

/**
 * The "Create card" prompt is due once the reminder for the upcoming birthday has passed, or on
 * the birthday itself (FR-3.4, FR-3.5). This covers both a tapped notification and a friend added
 * after their reminder date, for whom no notification is scheduled this year.
 */
export function getCardPrompt(friend: ReminderFriend, now: Date): CardPrompt | null {
  const birthday = getNextBirthday(friend.birthDay, friend.birthMonth, now);
  const daysUntil = getDaysUntilBirthday(friend.birthDay, friend.birthMonth, now);
  const reminder = subDays(birthday, friend.reminderOffsetDays);
  reminder.setHours(REMINDER_HOUR, 0, 0, 0);
  if (daysUntil !== 0 && reminder > now) return null;
  return { daysUntil, birthday, canArriveInTime: canArriveByBirthday(now, birthday) };
}
