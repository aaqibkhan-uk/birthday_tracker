import {
  getAgeTurning,
  getBirthdayInYear,
  getDaysUntilBirthday,
  getNextBirthday,
  getNextReminder,
  isValidBirthday,
} from './birthdays';

// Tests run in Europe/London (jest.globalSetup.js). Months below are 1-based, as in the app.
const at = (y: number, m: number, d: number, h = 0, min = 0) => new Date(y, m - 1, d, h, min);

describe('getBirthdayInYear', () => {
  it('keeps 29 Feb in leap years', () => {
    expect(getBirthdayInYear(29, 2, 2028)).toEqual(at(2028, 2, 29));
  });

  it('moves 29 Feb to 28 Feb in non-leap years', () => {
    expect(getBirthdayInYear(29, 2, 2027)).toEqual(at(2027, 2, 28));
  });
});

describe('getNextBirthday', () => {
  it('returns this year when the birthday is still ahead', () => {
    expect(getNextBirthday(1, 11, at(2026, 10, 24, 15))).toEqual(at(2026, 11, 1));
  });

  it('returns today (date only) when the birthday is today', () => {
    expect(getNextBirthday(24, 10, at(2026, 10, 24, 23, 59))).toEqual(at(2026, 10, 24));
  });

  it('returns next year when the birthday has passed', () => {
    expect(getNextBirthday(23, 10, at(2026, 10, 24))).toEqual(at(2027, 10, 23));
  });

  it('uses 28 Feb for a 29 Feb birthday in a non-leap year', () => {
    expect(getNextBirthday(29, 2, at(2026, 10, 24))).toEqual(at(2027, 2, 28));
  });

  it('uses 29 Feb in a leap year', () => {
    expect(getNextBirthday(29, 2, at(2027, 3, 1))).toEqual(at(2028, 2, 29));
  });
});

describe('getDaysUntilBirthday', () => {
  it('is 0 on the day', () => {
    expect(getDaysUntilBirthday(24, 10, at(2026, 10, 24, 23, 30))).toBe(0);
  });

  it('counts calendar days, not 24-hour periods', () => {
    expect(getDaysUntilBirthday(25, 10, at(2026, 10, 24, 23, 30))).toBe(1);
  });

  it('wraps to next year once passed', () => {
    expect(getDaysUntilBirthday(23, 10, at(2026, 10, 24))).toBe(364);
  });

  it('is 0 on 28 Feb for a 29 Feb birthday in a non-leap year', () => {
    expect(getDaysUntilBirthday(29, 2, at(2027, 2, 28, 12))).toBe(0);
  });

  it('is not thrown off by the clocks going back', () => {
    // UK clocks go back on 25 Oct 2026.
    expect(getDaysUntilBirthday(1, 11, at(2026, 10, 20))).toBe(12);
  });
});

describe('getNextReminder', () => {
  it('schedules a normal reminder later this year at 09:00', () => {
    expect(getNextReminder(15, 6, 7, at(2026, 3, 1, 10))).toEqual(at(2026, 6, 8, 9));
  });

  it('moves to next year when this year’s reminder has passed', () => {
    expect(getNextReminder(1, 2, 7, at(2026, 10, 24))).toEqual(at(2027, 1, 25, 9));
  });

  it('moves to next year when the birthday is still ahead but the reminder has passed', () => {
    expect(getNextReminder(28, 10, 7, at(2026, 10, 24))).toEqual(at(2027, 10, 21, 9));
  });

  describe('birthday today with offset 0', () => {
    it('fires today if before 09:00', () => {
      expect(getNextReminder(24, 10, 0, at(2026, 10, 24, 8, 59))).toEqual(at(2026, 10, 24, 9));
    });

    it('moves to next year at exactly 09:00', () => {
      expect(getNextReminder(24, 10, 0, at(2026, 10, 24, 9))).toEqual(at(2027, 10, 24, 9));
    });

    it('moves to next year after 09:00', () => {
      expect(getNextReminder(24, 10, 0, at(2026, 10, 24, 14))).toEqual(at(2027, 10, 24, 9));
    });
  });

  describe('offset crossing a year boundary', () => {
    it('lands in December of the previous year', () => {
      expect(getNextReminder(3, 1, 14, at(2026, 12, 1))).toEqual(at(2026, 12, 20, 9));
    });

    it('advances two years when needed (CLAUDE.md §8 example)', () => {
      // 20 Dec 2025 (past) → 20 Dec 2026 (past) → 20 Dec 2027.
      expect(getNextReminder(3, 1, 14, at(2026, 12, 25))).toEqual(at(2027, 12, 20, 9));
    });
  });

  describe('29 Feb birthdays', () => {
    it('counts the offset from 28 Feb in a non-leap year', () => {
      expect(getNextReminder(29, 2, 7, at(2026, 10, 24))).toEqual(at(2027, 2, 21, 9));
    });

    it('counts the offset from 29 Feb in a leap year', () => {
      expect(getNextReminder(29, 2, 7, at(2027, 3, 1))).toEqual(at(2028, 2, 22, 9));
    });

    it('fires on 28 Feb in a non-leap year with offset 0', () => {
      expect(getNextReminder(29, 2, 0, at(2027, 1, 1))).toEqual(at(2027, 2, 28, 9));
    });
  });

  it('stays at 09:00 local across a clocks-forward change', () => {
    // UK clocks go forward at 01:00 on 29 Mar 2026.
    const reminder = getNextReminder(5, 4, 7, at(2026, 3, 1));
    expect(reminder).toEqual(at(2026, 3, 29, 9));
    expect(reminder.getHours()).toBe(9);
  });
});

describe('getAgeTurning', () => {
  it('uses this year when the birthday is still ahead', () => {
    expect(getAgeTurning(1990, 1, 11, at(2026, 10, 24))).toBe(36);
  });

  it('uses next year when the birthday has passed', () => {
    expect(getAgeTurning(1990, 1, 1, at(2026, 10, 24))).toBe(37);
  });
});

describe('isValidBirthday', () => {
  it.each([
    [31, 1],
    [30, 4],
    [29, 2],
    [31, 12],
    [1, 1],
  ])('accepts %i/%i', (day, month) => {
    expect(isValidBirthday(day, month)).toBe(true);
  });

  it.each([
    [31, 2],
    [30, 2],
    [31, 4],
    [31, 6],
    [31, 9],
    [31, 11],
    [0, 1],
    [32, 1],
    [1, 0],
    [1, 13],
    [1.5, 1],
  ])('rejects %d/%d', (day, month) => {
    expect(isValidBirthday(day, month)).toBe(false);
  });

  it('accepts 29 Feb with a leap birth year', () => {
    expect(isValidBirthday(29, 2, 2000)).toBe(true);
  });

  it('rejects 29 Feb with a non-leap birth year', () => {
    expect(isValidBirthday(29, 2, 1900)).toBe(false);
    expect(isValidBirthday(29, 2, 2023)).toBe(false);
  });
});
