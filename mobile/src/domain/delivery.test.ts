import { canArriveByBirthday, getEstimatedDelivery } from './delivery';

// Months are 1-based. 24 Oct 2026 is a Saturday; 26 Oct 2026 is a Monday.
const at = (y: number, m: number, d: number, h = 0) => new Date(y, m - 1, d, h);

describe('getEstimatedDelivery', () => {
  it('order Monday → following Monday', () => {
    expect(getEstimatedDelivery(at(2026, 10, 26, 10))).toEqual(at(2026, 11, 2));
  });

  it('order Saturday → following Friday', () => {
    expect(getEstimatedDelivery(at(2026, 10, 24, 10))).toEqual(at(2026, 10, 30));
  });

  it('order Sunday → following Friday', () => {
    expect(getEstimatedDelivery(at(2026, 10, 25, 10))).toEqual(at(2026, 10, 30));
  });

  it('order Friday → skips the weekend → following Friday', () => {
    expect(getEstimatedDelivery(at(2026, 10, 30, 10))).toEqual(at(2026, 11, 6));
  });

  it('order Wednesday → crosses a weekend → following Wednesday', () => {
    expect(getEstimatedDelivery(at(2026, 10, 28, 23))).toEqual(at(2026, 11, 4));
  });
});

describe('canArriveByBirthday', () => {
  it('is true when delivery is on the birthday', () => {
    expect(canArriveByBirthday(at(2026, 10, 26, 23), at(2026, 11, 2))).toBe(true);
  });

  it('is true when delivery is before the birthday', () => {
    expect(canArriveByBirthday(at(2026, 10, 26), at(2026, 11, 10))).toBe(true);
  });

  it('is false when delivery is after the birthday', () => {
    expect(canArriveByBirthday(at(2026, 10, 26), at(2026, 11, 1))).toBe(false);
  });

  it('ignores the time of day on the birthday', () => {
    expect(canArriveByBirthday(at(2026, 10, 26), at(2026, 11, 2, 18))).toBe(true);
  });
});
