// Friend types, list sorting and form validation (FR-1.1, FR-1.3, FR-1.5). No React or Expo imports.
import { getDaysUntilBirthday, isValidBirthday } from './birthdays';
import { isValidUkPostcode, normalisePostcode } from './address';

export const REMINDER_OFFSETS = [0, 1, 7, 14] as const;
export type ReminderOffset = (typeof REMINDER_OFFSETS)[number];
export const DEFAULT_REMINDER_OFFSET: ReminderOffset = 7;

export const NAME_MAX_LENGTH = 60;
export const ADDRESS_FIELD_MAX_LENGTH = 100;
export const MIN_BIRTH_YEAR = 1900;

export interface Friend {
  id: number;
  name: string;
  birthDay: number;
  birthMonth: number;
  birthYear: number | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  postcode: string | null;
  reminderOffsetDays: ReminderOffset;
  createdAt: string;
  updatedAt: string;
}

export type FriendInput = Omit<Friend, 'id' | 'createdAt' | 'updatedAt'>;

export function isReminderOffset(value: number): value is ReminderOffset {
  return (REMINDER_OFFSETS as readonly number[]).includes(value);
}

export function hasAddress(friend: FriendInput): boolean {
  return friend.addressLine1 !== null && friend.city !== null && friend.postcode !== null;
}

export type FriendSort = 'name' | 'upcoming';

/** Returns a new array; ties are broken by name so the order is stable. */
export function sortFriends<T extends Pick<Friend, 'name' | 'birthDay' | 'birthMonth'>>(
  friends: readonly T[],
  sort: FriendSort,
  now: Date,
): T[] {
  const byName = (a: T, b: T) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
  if (sort === 'name') return [...friends].sort(byName);
  const days = new Map(
    friends.map((f) => [f, getDaysUntilBirthday(f.birthDay, f.birthMonth, now)]),
  );
  return [...friends].sort((a, b) => days.get(a)! - days.get(b)! || byName(a, b));
}

/** Raw text values from the add/edit form. */
export interface FriendFormValues {
  name: string;
  birthDay: string;
  birthMonth: number | null;
  birthYear: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  postcode: string;
  reminderOffsetDays: ReminderOffset;
}

export type FriendFormErrors = Partial<Record<keyof FriendFormValues, string>>;

export type FriendValidationResult =
  { ok: true; value: FriendInput } | { ok: false; errors: FriendFormErrors };

export function emptyFriendForm(): FriendFormValues {
  return {
    name: '',
    birthDay: '',
    birthMonth: null,
    birthYear: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    postcode: '',
    reminderOffsetDays: DEFAULT_REMINDER_OFFSET,
  };
}

export function friendToForm(friend: FriendInput): FriendFormValues {
  return {
    name: friend.name,
    birthDay: String(friend.birthDay),
    birthMonth: friend.birthMonth,
    birthYear: friend.birthYear === null ? '' : String(friend.birthYear),
    addressLine1: friend.addressLine1 ?? '',
    addressLine2: friend.addressLine2 ?? '',
    city: friend.city ?? '',
    postcode: friend.postcode ?? '',
    reminderOffsetDays: friend.reminderOffsetDays,
  };
}

function parseWholeNumber(text: string): number | null {
  return /^\d+$/.test(text.trim()) ? Number(text.trim()) : null;
}

const orNull = (text: string): string | null => (text.trim() === '' ? null : text.trim());

/**
 * Validates the form and converts it to a FriendInput. The address is optional, but if any
 * field is filled in, line 1, city and a valid UK postcode are all required (so it can be used
 * at checkout).
 */
export function validateFriendForm(form: FriendFormValues, now: Date): FriendValidationResult {
  const errors: FriendFormErrors = {};

  const name = form.name.trim();
  if (name === '') errors.name = 'Enter a name.';
  else if (name.length > NAME_MAX_LENGTH)
    errors.name = `Keep the name under ${NAME_MAX_LENGTH} characters.`;

  const day = parseWholeNumber(form.birthDay);
  const month = form.birthMonth;
  const yearText = form.birthYear.trim();
  const year = yearText === '' ? null : parseWholeNumber(yearText);

  if (month === null) errors.birthMonth = 'Choose a month.';
  if (day === null) errors.birthDay = 'Enter a day.';

  const currentYear = now.getFullYear();
  if (yearText !== '' && (year === null || year < MIN_BIRTH_YEAR || year > currentYear)) {
    errors.birthYear = `Enter a year between ${MIN_BIRTH_YEAR} and ${currentYear}, or leave it blank.`;
  }

  if (day !== null && month !== null && !errors.birthYear) {
    if (!isValidBirthday(day, month)) errors.birthDay = 'That date does not exist.';
    else if (!isValidBirthday(day, month, year))
      errors.birthDay = `${year} was not a leap year, so it had no 29 February.`;
    else if (year !== null && new Date(year, month - 1, day) > now)
      errors.birthDay = 'That birthday is in the future.';
  }

  const address = {
    addressLine1: orNull(form.addressLine1),
    addressLine2: orNull(form.addressLine2),
    city: orNull(form.city),
    postcode: orNull(form.postcode),
  };
  const anyAddress = Object.values(address).some((value) => value !== null);
  if (anyAddress) {
    if (address.addressLine1 === null) errors.addressLine1 = 'Enter the first line of the address.';
    if (address.city === null) errors.city = 'Enter a town or city.';
    if (address.postcode === null) errors.postcode = 'Enter a postcode.';
    else if (!isValidUkPostcode(address.postcode)) errors.postcode = 'Enter a valid UK postcode.';
  }
  for (const key of ['addressLine1', 'addressLine2', 'city'] as const) {
    const value = address[key];
    if (value !== null && value.length > ADDRESS_FIELD_MAX_LENGTH)
      errors[key] = `Keep this under ${ADDRESS_FIELD_MAX_LENGTH} characters.`;
  }

  if (Object.keys(errors).length > 0 || day === null || month === null) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    value: {
      name,
      birthDay: day,
      birthMonth: month,
      birthYear: year,
      ...address,
      postcode: address.postcode === null ? null : normalisePostcode(address.postcode),
      reminderOffsetDays: form.reminderOffsetDays,
    },
  };
}
