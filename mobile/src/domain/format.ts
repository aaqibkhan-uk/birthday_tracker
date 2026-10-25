// Pure display formatting for dates and reminders. No React or Expo imports.
import { format } from 'date-fns';
import type { ReminderOffset } from './friend';

export const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const;

/** "3 January". The year is not shown, so 29 Feb displays as entered. */
export function formatBirthday(day: number, month: number): string {
  return `${day} ${MONTH_NAMES[month - 1]}`;
}

/** "Saturday 3 January". */
export function formatLongDate(date: Date): string {
  return format(date, 'EEEE d MMMM');
}

export function formatDaysUntil(days: number): string {
  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  return `In ${days} days`;
}

export function formatReminderOffset(offset: ReminderOffset): string {
  switch (offset) {
    case 0:
      return 'On the day';
    case 1:
      return '1 day before';
    case 7:
      return '1 week before';
    case 14:
      return '2 weeks before';
  }
}
