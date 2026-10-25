// Shared by every provider: the card image size and turning raw bytes into a GeneratedImage.
import type { GeneratedImage } from './types.js';

// Portrait, approx. 5:7 (CLAUDE.md §10). Multiples of 16, which image models prefer.
export const CARD_IMAGE_WIDTH = 768;
export const CARD_IMAGE_HEIGHT = 1072;

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47];
const JPEG_SIGNATURE = [0xff, 0xd8, 0xff];

function startsWith(bytes: Uint8Array, signature: readonly number[]): boolean {
  return signature.every((byte, i) => bytes[i] === byte);
}

/** Detects PNG or JPEG from the file signature; anything else (WebP, an error page) throws. */
export function imageFromBytes(bytes: Uint8Array): GeneratedImage {
  const mimeType = startsWith(bytes, PNG_SIGNATURE)
    ? 'image/png'
    : startsWith(bytes, JPEG_SIGNATURE)
      ? 'image/jpeg'
      : undefined;
  if (!mimeType) throw new Error('provider returned something that is not a PNG or JPEG');
  return { base64: Buffer.from(bytes).toString('base64'), mimeType };
}
