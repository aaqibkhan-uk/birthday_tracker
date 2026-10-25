// Pure delivery estimate logic (CLAUDE.md §8, FR-6.2). No React or Expo imports.
import { addDays, isAfter, isWeekend, startOfDay } from 'date-fns';

/** Production (2) + postage (3), in working days (Mon–Fri, bank holidays ignored in v0). */
export const DELIVERY_WORKING_DAYS = 5;

/** The order day is not counted; counting starts at the next working day. */
export function getEstimatedDelivery(orderDate: Date): Date {
  let date = startOfDay(orderDate);
  let counted = 0;
  while (counted < DELIVERY_WORKING_DAYS) {
    date = addDays(date, 1);
    if (!isWeekend(date)) counted++;
  }
  return date;
}

/** True if the estimated delivery date is on or before the birthday (date only). */
export function canArriveByBirthday(orderDate: Date, birthday: Date): boolean {
  return !isAfter(getEstimatedDelivery(orderDate), startOfDay(birthday));
}
