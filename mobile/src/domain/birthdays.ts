// Pure birthday and reminder date logic (CLAUDE.md §8). No React or Expo imports.
// All dates are local time; "date only" values are local midnight.
import {
  differenceInCalendarDays,
  getDaysInMonth,
  isLeapYear,
  startOfDay,
  subDays,
} from 'date-fns';

export const REMINDER_HOUR = 9;

/** The birthday's date in the given year. 29 Feb becomes 28 Feb in non-leap years (FR-2.2, FR-3.3.4). */
export function getBirthdayInYear(day: number, month: number, year: number): Date {
  const isLeapDay = day === 29 && month === 2;
  const actualDay = isLeapDay && !isLeapYear(new Date(year, 0, 1)) ? 28 : day;
  return new Date(year, month - 1, actualDay);
}

/** The next birthday on or after today (date only). */
export function getNextBirthday(day: number, month: number, now: Date): Date {
  const today = startOfDay(now);
  const thisYear = getBirthdayInYear(day, month, today.getFullYear());
  return thisYear < today ? getBirthdayInYear(day, month, today.getFullYear() + 1) : thisYear;
}

/** Whole days until the next birthday; 0 means today. */
export function getDaysUntilBirthday(day: number, month: number, now: Date): number {
  return differenceInCalendarDays(getNextBirthday(day, month, now), startOfDay(now));
}

/**
 * The earliest (birthday − offsetDays) at 09:00 local that is strictly after `now` (FR-3.3.3).
 * Advances year by year because the offset can push the reminder into the previous year.
 */
export function getNextReminder(day: number, month: number, offsetDays: number, now: Date): Date {
  // Offsets are at most 14 days, so this ends within three iterations.
  for (let year = now.getFullYear(); ; year++) {
    const reminder = subDays(getBirthdayInYear(day, month, year), offsetDays);
    reminder.setHours(REMINDER_HOUR, 0, 0, 0);
    if (reminder > now) return reminder;
  }
}

/** The age the friend turns on their next birthday (FR-2.3). */
export function getAgeTurning(birthYear: number, day: number, month: number, now: Date): number {
  return getNextBirthday(day, month, now).getFullYear() - birthYear;
}

/**
 * Whether day/month form a real calendar date (FR-1.5). 29 Feb is allowed unless a known
 * birth year is not a leap year.
 */
export function isValidBirthday(day: number, month: number, year: number | null = null): boolean {
  if (!Number.isInteger(day) || !Number.isInteger(month)) return false;
  if (month < 1 || month > 12 || day < 1) return false;
  // Year 2000 is a leap year, so February allows 29 when the birth year is unknown.
  const daysInMonth = getDaysInMonth(new Date(year ?? 2000, month - 1, 1));
  return day <= daysInMonth;
}
