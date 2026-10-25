// Pure address helpers. No React or Expo imports.

// Standard UK postcode shape (e.g. SW1A 1AA, M1 1AE, B33 8TH); the space is optional.
const UK_POSTCODE = /^[A-Z]{1,2}\d[A-Z\d]? ?\d[A-Z]{2}$/i;

export function isValidUkPostcode(postcode: string): boolean {
  return UK_POSTCODE.test(postcode.trim());
}

/** Upper-cases and puts a single space before the inward code: "sw1a1aa" → "SW1A 1AA". */
export function normalisePostcode(postcode: string): string {
  const compact = postcode.replace(/\s+/g, '').toUpperCase();
  return compact.length > 3 ? `${compact.slice(0, -3)} ${compact.slice(-3)}` : compact;
}
