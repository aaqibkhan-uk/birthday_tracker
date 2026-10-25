import {
  buildConfirmationEmail,
  buildOrderInput,
  CARD_PRICE_PENCE,
  formatPrice,
  friendDestination,
  fromIsoDate,
  getCardIncompleteReason,
  selfDestination,
  toIsoDate,
  validateAddressForm,
  validateEmail,
  type AddressFormValues,
  type Destination,
} from './checkout';
import type { Friend } from './friend';
import type { Order, UserProfile } from './models';

const form = (overrides: Partial<AddressFormValues> = {}): AddressFormValues => ({
  name: ' Sam ',
  addressLine1: ' 1 High St ',
  addressLine2: '',
  city: 'Leeds',
  postcode: 'ls11ba',
  ...overrides,
});

const destination: Destination = {
  type: 'friend',
  recipientName: 'Sam',
  addressLine1: '1 High St',
  addressLine2: null,
  city: 'Leeds',
  postcode: 'LS1 1BA',
};

describe('validateAddressForm', () => {
  it('trims, normalises the postcode and turns an empty line 2 into null', () => {
    expect(validateAddressForm(form(), 'friend')).toEqual({ ok: true, value: destination });
  });

  it('requires name, line 1, city and a valid UK postcode', () => {
    const result = validateAddressForm(
      { name: '', addressLine1: ' ', addressLine2: '', city: '', postcode: '12345' },
      'self',
    );
    expect(result).toEqual({
      ok: false,
      errors: {
        name: 'Enter your name.',
        addressLine1: 'Enter the first line of the address.',
        city: 'Enter a town or city.',
        postcode: 'Enter a valid UK postcode.',
      },
    });
  });

  it('rejects over-long fields', () => {
    const result = validateAddressForm(form({ addressLine2: 'x'.repeat(101) }), 'friend');
    expect(result.ok).toBe(false);
  });
});

describe('saved destinations', () => {
  const friend: Friend = {
    id: 1,
    name: 'Sam',
    birthDay: 3,
    birthMonth: 1,
    birthYear: null,
    addressLine1: '1 High St',
    addressLine2: null,
    city: 'Leeds',
    postcode: 'LS1 1BA',
    reminderOffsetDays: 7,
    createdAt: '',
    updatedAt: '',
  };
  const profile: UserProfile = {
    name: 'Alex',
    email: null,
    addressLine1: '2 Low Rd',
    addressLine2: 'Flat 3',
    city: 'York',
    postcode: 'YO1 7HH',
    notificationsPrompted: true,
  };

  it('uses a complete saved address', () => {
    expect(friendDestination(friend)).toEqual(destination);
    expect(selfDestination(profile)).toMatchObject({ type: 'self', recipientName: 'Alex' });
  });

  it('returns null when the address or name is missing', () => {
    expect(friendDestination({ ...friend, addressLine1: null })).toBeNull();
    expect(selfDestination({ ...profile, name: null })).toBeNull();
  });
});

describe('validateEmail', () => {
  it.each(['me@example.com', ' a.b+c@mail.co.uk '])('accepts %j', (email) => {
    expect(validateEmail(email)).toBeNull();
  });
  it.each(['', 'me', 'me@example', 'me @example.com'])('rejects %j', (email) => {
    expect(validateEmail(email)).not.toBeNull();
  });
});

describe('getCardIncompleteReason', () => {
  it('needs a design and an inside message', () => {
    expect(getCardIncompleteReason({ insideMessage: 'Hi' }, false)).toMatch(/design/);
    expect(getCardIncompleteReason({ insideMessage: '  ' }, true)).toMatch(/message/);
    expect(getCardIncompleteReason({ insideMessage: 'Hi' }, true)).toBeNull();
  });
});

describe('ISO dates', () => {
  it('round-trips a local date without a timezone shift', () => {
    expect(toIsoDate(new Date(2026, 10, 2, 23, 30))).toBe('2026-11-02');
    expect(fromIsoDate('2026-11-02')).toEqual(new Date(2026, 10, 2));
  });
});

describe('buildOrderInput', () => {
  it('snapshots the card, destination and price', () => {
    const input = buildOrderInput({
      card: { id: 7, frontText: '  ', insideMessage: ' Have a great day ' },
      destination,
      imagePath: 'orders/card-7.png',
      email: ' me@example.com ',
      estimatedDelivery: new Date(2026, 10, 2),
    });
    expect(input).toEqual({
      cardId: 7,
      destinationType: 'friend',
      recipientName: 'Sam',
      addressLine1: '1 High St',
      addressLine2: null,
      city: 'Leeds',
      postcode: 'LS1 1BA',
      imagePath: 'orders/card-7.png',
      frontText: null,
      insideMessage: 'Have a great day',
      confirmationEmail: 'me@example.com',
      pricePence: CARD_PRICE_PENCE,
      estimatedDeliveryDate: '2026-11-02',
    });
  });
});

describe('buildConfirmationEmail', () => {
  const order: Order = {
    id: 12,
    cardId: 7,
    destinationType: 'friend',
    recipientName: 'Sam',
    addressLine1: '1 High St',
    addressLine2: null,
    city: 'Leeds',
    postcode: 'LS1 1BA',
    imagePath: 'orders/card-7.png',
    frontText: 'Happy birthday!',
    insideMessage: 'Have a great day',
    confirmationEmail: 'me@example.com',
    pricePence: 399,
    estimatedDeliveryDate: '2026-11-02',
    status: 'confirmed',
    createdAt: '2026-10-26T10:00:00.000Z',
  };

  it('says who, where, when, what and how much', () => {
    const email = buildConfirmationEmail(order);
    expect(email.to).toBe('me@example.com');
    expect(email.subject).toBe('Your card for Sam is on its way (order BC-00012)');
    const body = email.paragraphs.join('\n');
    expect(body).toContain('Estimated delivery: Monday 2 November 2026.');
    expect(body).toContain('Delivering to:\nSam\n1 High St\nLeeds\nLS1 1BA');
    expect(body).toContain('Front: "Happy birthday!"');
    expect(body).toContain('Inside: "Have a great day"');
    expect(body).toContain('£3.99 (demo mode, no real payment was taken)');
  });

  it('talks to the sender when the card goes to them', () => {
    const body = buildConfirmationEmail({ ...order, destinationType: 'self' }).paragraphs.join(' ');
    expect(body).toContain('posting it to you.');
  });
});

describe('formatPrice', () => {
  it('formats pence as pounds', () => {
    expect(formatPrice(399)).toBe('£3.99');
    expect(formatPrice(1000)).toBe('£10.00');
  });
});
