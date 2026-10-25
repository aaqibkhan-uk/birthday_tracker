// Pure checkout rules (FR-6.1–6.6). No React or Expo imports.
import { format } from 'date-fns';
import { isValidUkPostcode, normalisePostcode } from './address';
import type { Friend } from './friend';
import { ADDRESS_FIELD_MAX_LENGTH, NAME_MAX_LENGTH } from './friend';
import type { Card, DestinationType, Order, OrderInput, UserProfile } from './models';

/** FR-6.3: one fixed price in v0. */
export const CARD_PRICE_PENCE = 399;

export function formatPrice(pence: number): string {
  return `£${(pence / 100).toFixed(2)}`;
}

/** Where the card goes, as snapshotted into the order. */
export interface Destination {
  type: DestinationType;
  recipientName: string;
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  postcode: string;
}

export interface AddressFormValues {
  name: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  postcode: string;
}

export type AddressFormErrors = Partial<Record<keyof AddressFormValues, string>>;

export type AddressValidationResult =
  { ok: true; value: Destination } | { ok: false; errors: AddressFormErrors };

const orNull = (text: string): string | null => (text.trim() === '' ? null : text.trim());

export function addressFormFrom(
  source: Pick<Friend, 'addressLine1' | 'addressLine2' | 'city' | 'postcode'> & {
    name: string | null;
  },
): AddressFormValues {
  return {
    name: source.name ?? '',
    addressLine1: source.addressLine1 ?? '',
    addressLine2: source.addressLine2 ?? '',
    city: source.city ?? '',
    postcode: source.postcode ?? '',
  };
}

/** FR-6.1: name, line 1, city and a valid UK postcode are required; line 2 is optional. */
export function validateAddressForm(
  form: AddressFormValues,
  type: DestinationType,
): AddressValidationResult {
  const errors: AddressFormErrors = {};
  const name = form.name.trim();
  if (name === '') errors.name = type === 'self' ? 'Enter your name.' : 'Enter a name.';
  else if (name.length > NAME_MAX_LENGTH)
    errors.name = `Keep the name under ${NAME_MAX_LENGTH} characters.`;

  const addressLine1 = form.addressLine1.trim();
  const city = form.city.trim();
  const postcode = form.postcode.trim();
  if (addressLine1 === '') errors.addressLine1 = 'Enter the first line of the address.';
  if (city === '') errors.city = 'Enter a town or city.';
  if (postcode === '') errors.postcode = 'Enter a postcode.';
  else if (!isValidUkPostcode(postcode)) errors.postcode = 'Enter a valid UK postcode.';
  for (const key of ['addressLine1', 'addressLine2', 'city'] as const) {
    if (form[key].trim().length > ADDRESS_FIELD_MAX_LENGTH)
      errors[key] = `Keep this under ${ADDRESS_FIELD_MAX_LENGTH} characters.`;
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return {
    ok: true,
    value: {
      type,
      recipientName: name,
      addressLine1,
      addressLine2: orNull(form.addressLine2),
      city,
      postcode: normalisePostcode(postcode),
    },
  };
}

/** The friend's saved address as a destination, or null if they have none. */
export function friendDestination(friend: Friend): Destination | null {
  const result = validateAddressForm(addressFormFrom(friend), 'friend');
  return result.ok ? result.value : null;
}

/** The user's saved name and address as a destination, or null if incomplete. */
export function selfDestination(profile: UserProfile): Destination | null {
  const result = validateAddressForm(addressFormFrom(profile), 'self');
  return result.ok ? result.value : null;
}

// Deliberately loose: something@something.something, no spaces.
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Null if valid, otherwise a message for the user. */
export function validateEmail(email: string): string | null {
  const trimmed = email.trim();
  if (trimmed === '') return 'Enter your email address.';
  if (!EMAIL.test(trimmed)) return 'Enter a valid email address, e.g. name@example.com.';
  return null;
}

/** Null if the card can be approved (FR-5.3), otherwise what is missing. */
export function getCardIncompleteReason(
  card: Pick<Card, 'insideMessage'>,
  hasSelectedDesign: boolean,
): string | null {
  if (!hasSelectedDesign) return 'Choose a design for the front first.';
  if ((card.insideMessage ?? '').trim() === '') return 'Write a message for the inside first.';
  return null;
}

/** Local calendar date as stored in orders.estimated_delivery_date, e.g. "2026-11-02". */
export function toIsoDate(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

/** Parses an ISO date as a local date (new Date("2026-11-02") would be UTC midnight). */
export function fromIsoDate(iso: string): Date {
  const [year, month, day] = iso.split('-').map(Number);
  return new Date(year ?? 1970, (month ?? 1) - 1, day ?? 1);
}

/** FR-6.6: the order snapshots everything it needs, so later edits or deletions can't change it. */
export function buildOrderInput(args: {
  card: Pick<Card, 'id' | 'frontText' | 'insideMessage'>;
  destination: Destination;
  imagePath: string;
  email: string;
  estimatedDelivery: Date;
}): OrderInput {
  const { card, destination, imagePath, email, estimatedDelivery } = args;
  const frontText = (card.frontText ?? '').trim();
  return {
    cardId: card.id,
    destinationType: destination.type,
    recipientName: destination.recipientName,
    addressLine1: destination.addressLine1,
    addressLine2: destination.addressLine2,
    city: destination.city,
    postcode: destination.postcode,
    imagePath,
    frontText: frontText === '' ? null : frontText,
    insideMessage: (card.insideMessage ?? '').trim(),
    confirmationEmail: email.trim(),
    pricePence: CARD_PRICE_PENCE,
    estimatedDeliveryDate: toIsoDate(estimatedDelivery),
  };
}

export function formatAddressLines(
  address: Pick<Destination, 'addressLine1' | 'addressLine2' | 'city' | 'postcode'>,
): string[] {
  return [address.addressLine1, address.addressLine2, address.city, address.postcode].filter(
    (line): line is string => line !== null && line !== '',
  );
}

export function formatOrderNumber(orderId: number): string {
  return `BC-${String(orderId).padStart(5, '0')}`;
}

export interface ConfirmationEmail {
  to: string;
  subject: string;
  paragraphs: string[];
}

/** FR-6.5: exactly what the confirmation email would say (simulated, never sent). */
export function buildConfirmationEmail(order: Order): ConfirmationEmail {
  const delivery = format(fromIsoDate(order.estimatedDeliveryDate), 'EEEE d MMMM yyyy');
  const recipient = order.destinationType === 'self' ? 'you' : order.recipientName;
  return {
    to: order.confirmationEmail,
    subject: `Your card for ${order.recipientName} is on its way (order ${formatOrderNumber(order.id)})`,
    paragraphs: [
      'Hello,',
      `Thanks for your order. We're printing your card and posting it to ${recipient}.`,
      `Estimated delivery: ${delivery}.`,
      ['Delivering to:', order.recipientName, ...formatAddressLines(order)].join('\n'),
      order.frontText ? `Front: "${order.frontText}"` : 'Front: picture only, no text',
      `Inside: "${order.insideMessage}"`,
      `Total paid: ${formatPrice(order.pricePence)} (demo mode, no real payment was taken).`,
      'Thank you for using Birthday Cards.',
    ],
  };
}
