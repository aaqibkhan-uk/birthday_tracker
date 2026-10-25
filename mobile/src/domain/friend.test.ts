import { isValidUkPostcode, normalisePostcode } from './address';
import { formatDaysUntil, formatReminderOffset } from './format';
import {
  emptyFriendForm,
  friendToForm,
  sortFriends,
  validateFriendForm,
  type FriendFormValues,
} from './friend';

const now = new Date(2026, 9, 24, 12); // 24 Oct 2026

const form = (overrides: Partial<FriendFormValues>): FriendFormValues => ({
  ...emptyFriendForm(),
  name: 'Sam',
  birthDay: '3',
  birthMonth: 1,
  ...overrides,
});

describe('validateFriendForm', () => {
  it('accepts a minimal friend and defaults the reminder to 1 week before', () => {
    const result = validateFriendForm(form({}), now);
    expect(result).toEqual({
      ok: true,
      value: {
        name: 'Sam',
        birthDay: 3,
        birthMonth: 1,
        birthYear: null,
        addressLine1: null,
        addressLine2: null,
        city: null,
        postcode: null,
        reminderOffsetDays: 7,
      },
    });
  });

  it('trims text and normalises the postcode', () => {
    const result = validateFriendForm(
      form({ name: '  Sam  ', addressLine1: ' 1 High St ', city: 'Leeds', postcode: 'ls11ba' }),
      now,
    );
    expect(result.ok && result.value).toMatchObject({
      name: 'Sam',
      addressLine1: '1 High St',
      postcode: 'LS1 1BA',
    });
  });

  it('requires a name, day and month', () => {
    const result = validateFriendForm(form({ name: ' ', birthDay: '', birthMonth: null }), now);
    expect(result.ok).toBe(false);
    expect(!result.ok && Object.keys(result.errors).sort()).toEqual([
      'birthDay',
      'birthMonth',
      'name',
    ]);
  });

  it.each([
    ['31', 2],
    ['30', 2],
    ['31', 4],
    ['0', 5],
    ['abc', 5],
  ])('rejects the impossible date %s/%i', (birthDay, birthMonth) => {
    const result = validateFriendForm(form({ birthDay, birthMonth }), now);
    expect(!result.ok && result.errors.birthDay).toBeTruthy();
  });

  it('allows 29 Feb with no year or a leap year', () => {
    expect(validateFriendForm(form({ birthDay: '29', birthMonth: 2 }), now).ok).toBe(true);
    expect(
      validateFriendForm(form({ birthDay: '29', birthMonth: 2, birthYear: '2000' }), now).ok,
    ).toBe(true);
  });

  it('rejects 29 Feb in a non-leap year', () => {
    const result = validateFriendForm(
      form({ birthDay: '29', birthMonth: 2, birthYear: '2023' }),
      now,
    );
    expect(!result.ok && result.errors.birthDay).toMatch(/leap/);
  });

  it.each(['1899', '2027', '20x0'])('rejects the birth year %s', (birthYear) => {
    const result = validateFriendForm(form({ birthYear }), now);
    expect(!result.ok && result.errors.birthYear).toBeTruthy();
  });

  it('rejects a birthday later this year with this year as the birth year', () => {
    const result = validateFriendForm(
      form({ birthDay: '1', birthMonth: 12, birthYear: '2026' }),
      now,
    );
    expect(!result.ok && result.errors.birthDay).toMatch(/future/);
  });

  it('requires line 1, city and postcode once any address field is filled', () => {
    const result = validateFriendForm(form({ addressLine2: 'Flat 2' }), now);
    expect(!result.ok && Object.keys(result.errors).sort()).toEqual([
      'addressLine1',
      'city',
      'postcode',
    ]);
  });

  it('rejects a malformed postcode', () => {
    const result = validateFriendForm(
      form({ addressLine1: '1 High St', city: 'Leeds', postcode: '12345' }),
      now,
    );
    expect(!result.ok && result.errors.postcode).toBeTruthy();
  });

  it('round-trips through friendToForm', () => {
    const result = validateFriendForm(form({ birthYear: '1990', reminderOffsetDays: 14 }), now);
    if (!result.ok) throw new Error('expected valid');
    expect(validateFriendForm(friendToForm(result.value), now)).toEqual(result);
  });
});

describe('sortFriends', () => {
  const friends = [
    { name: 'charlie', birthDay: 1, birthMonth: 1 },
    { name: 'Alex', birthDay: 25, birthMonth: 10 },
    { name: 'Bea', birthDay: 24, birthMonth: 10 },
    { name: 'Dev', birthDay: 23, birthMonth: 10 },
  ];

  it('sorts by name, ignoring case', () => {
    expect(sortFriends(friends, 'name', now).map((f) => f.name)).toEqual([
      'Alex',
      'Bea',
      'charlie',
      'Dev',
    ]);
  });

  it('sorts by next birthday, today first', () => {
    expect(sortFriends(friends, 'upcoming', now).map((f) => f.name)).toEqual([
      'Bea',
      'Alex',
      'charlie',
      'Dev',
    ]);
  });
});

describe('UK postcodes', () => {
  it.each(['SW1A 1AA', 'M1 1AE', 'B33 8TH', 'cr26xh', 'DN55 1PT', 'EC1A1BB'])(
    'accepts %s',
    (pc) => {
      expect(isValidUkPostcode(pc)).toBe(true);
    },
  );

  it.each(['', '12345', 'SW1A', 'SW1A 1A', 'ABC 123'])('rejects %s', (pc) => {
    expect(isValidUkPostcode(pc)).toBe(false);
  });

  it('normalises spacing and case', () => {
    expect(normalisePostcode(' sw1a  1aa ')).toBe('SW1A 1AA');
  });
});

describe('format', () => {
  it('describes days remaining', () => {
    expect([0, 1, 5].map(formatDaysUntil)).toEqual(['Today', 'Tomorrow', 'In 5 days']);
  });

  it('describes reminder offsets', () => {
    expect(formatReminderOffset(14)).toBe('2 weeks before');
  });
});
