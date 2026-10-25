import type { ReminderOffset } from './friend';
import {
  buildSchedule,
  getCardPrompt,
  MAX_SCHEDULED_REMINDERS,
  reminderTitle,
  type ReminderFriend,
} from './schedule';

// Tests run in Europe/London (jest.globalSetup.js). Months are 1-based. 24 Oct 2026 is a Saturday.
const at = (y: number, m: number, d: number, h = 0, min = 0) => new Date(y, m - 1, d, h, min);

let nextId = 1;
const friend = (
  birthDay: number,
  birthMonth: number,
  reminderOffsetDays: ReminderOffset = 7,
  name = `Friend ${nextId}`,
): ReminderFriend => ({ id: nextId++, name, birthDay, birthMonth, reminderOffsetDays });

describe('buildSchedule', () => {
  const now = at(2026, 10, 24, 12);

  it('returns an empty list for no friends', () => {
    expect(buildSchedule([], now)).toEqual([]);
  });

  it('schedules each friend’s next reminder at 09:00, soonest first', () => {
    const later = friend(15, 12, 7, 'Later');
    const sooner = friend(10, 11, 1, 'Sooner');
    const schedule = buildSchedule([later, sooner], now);
    expect(schedule).toEqual([
      {
        friendId: sooner.id,
        fireAt: at(2026, 11, 9, 9),
        title: "Sooner's birthday is tomorrow",
        body: 'Tap to make them a card.',
      },
      {
        friendId: later.id,
        fireAt: at(2026, 12, 8, 9),
        title: "Later's birthday is in 1 week",
        body: 'Tap to make them a card.',
      },
    ]);
  });

  it('skips this year when the reminder has passed (FR-3.5) and uses next year', () => {
    // Birthday in 3 days, 1-week reminder already passed.
    const late = friend(27, 10, 7);
    expect(buildSchedule([late], now)[0].fireAt).toEqual(at(2027, 10, 20, 9));
  });

  it('handles a birthday today with offset 0, before and after 09:00', () => {
    const today = friend(24, 10, 0);
    expect(buildSchedule([today], at(2026, 10, 24, 8))[0].fireAt).toEqual(at(2026, 10, 24, 9));
    expect(buildSchedule([today], at(2026, 10, 24, 10))[0].fireAt).toEqual(at(2027, 10, 24, 9));
  });

  it('handles an offset crossing a year boundary', () => {
    const jan = friend(3, 1, 14);
    expect(buildSchedule([jan], at(2026, 12, 25))[0].fireAt).toEqual(at(2027, 12, 20, 9));
  });

  it('treats 29 Feb as 28 Feb in non-leap years', () => {
    const leap = friend(29, 2, 1);
    expect(buildSchedule([leap], now)[0].fireAt).toEqual(at(2027, 2, 27, 9));
    expect(buildSchedule([leap], at(2027, 3, 1))[0].fireAt).toEqual(at(2028, 2, 28, 9));
  });

  it('schedules at most one reminder per friend', () => {
    const friends = [friend(1, 1), friend(1, 6), friend(1, 12)];
    const ids = buildSchedule(friends, now).map((r) => r.friendId);
    expect(ids).toHaveLength(3);
    expect(new Set(ids).size).toBe(3);
  });

  it('keeps only the 64 soonest when there are more than 64 friends', () => {
    // 100 friends with birthdays on consecutive days from 1 Jan; reminders on the day.
    const friends = Array.from({ length: 100 }, (_, i) => {
      const date = new Date(2027, 0, 1 + i);
      return friend(date.getDate(), date.getMonth() + 1, 0);
    });
    const shuffled = [...friends].reverse();
    const schedule = buildSchedule(shuffled, now);

    expect(schedule).toHaveLength(MAX_SCHEDULED_REMINDERS);
    expect(schedule.map((r) => r.friendId)).toEqual(friends.slice(0, 64).map((f) => f.id));
    expect(schedule[63].fireAt).toEqual(at(2027, 3, 5, 9));
  });

  it('breaks ties by friend id', () => {
    const a = friend(1, 12);
    const b = friend(1, 12);
    expect(buildSchedule([b, a], now).map((r) => r.friendId)).toEqual([a.id, b.id]);
  });
});

describe('reminderTitle', () => {
  it.each([
    [0, "It's Sam's birthday today"],
    [1, "Sam's birthday is tomorrow"],
    [7, "Sam's birthday is in 1 week"],
    [14, "Sam's birthday is in 2 weeks"],
  ] as const)('offset %i', (offset, title) => {
    expect(reminderTitle('Sam', offset)).toBe(title);
  });
});

describe('getCardPrompt', () => {
  it('is null before the reminder', () => {
    expect(getCardPrompt(friend(10, 11, 7), at(2026, 10, 24, 12))).toBeNull();
  });

  it('is null just before 09:00 on the reminder day', () => {
    expect(getCardPrompt(friend(31, 10, 7), at(2026, 10, 24, 8, 59))).toBeNull();
  });

  it('appears from 09:00 on the reminder day', () => {
    expect(getCardPrompt(friend(31, 10, 7), at(2026, 10, 24, 9))).toEqual({
      daysUntil: 7,
      birthday: at(2026, 10, 31),
      canArriveInTime: true, // Sat order → delivery Fri 30 Oct
    });
  });

  it('appears for a friend added after their reminder date, with a delivery warning', () => {
    expect(getCardPrompt(friend(27, 10, 14), at(2026, 10, 24, 12))).toEqual({
      daysUntil: 3,
      birthday: at(2026, 10, 27),
      canArriveInTime: false,
    });
  });

  it('appears on the birthday itself, even before an on-the-day reminder fires', () => {
    expect(getCardPrompt(friend(24, 10, 0), at(2026, 10, 24, 7))).toMatchObject({
      daysUntil: 0,
      canArriveInTime: false,
    });
  });

  it('is gone the day after the birthday', () => {
    expect(getCardPrompt(friend(23, 10, 7), at(2026, 10, 24, 12))).toBeNull();
  });

  it('counts a 29 Feb offset from 28 Feb in a non-leap year', () => {
    expect(getCardPrompt(friend(29, 2, 7), at(2027, 2, 21, 9))?.birthday).toEqual(at(2027, 2, 28));
    expect(getCardPrompt(friend(29, 2, 7), at(2027, 2, 21, 8))).toBeNull();
  });
});
