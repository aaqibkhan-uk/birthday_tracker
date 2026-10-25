// Card images on the device (FR-4.11). The only module that touches expo-file-system.
//
// Paths are stored relative to the app's document directory (e.g. "designs/card-3/r1-0-….png"),
// because iOS can move the app container between installs and updates, which breaks absolute
// file:// URIs saved in the database.
import { File, Paths } from 'expo-file-system';
import type { GeneratedImage } from './imageApi';

const DESIGNS_DIR = 'designs';
const ORDERS_DIR = 'orders';

/** A URI an <Image> can display, for a path stored in the database. */
export function resolveImageUri(path: string): string {
  return path.startsWith('file://') ? path : new File(Paths.document, path).uri;
}

/** Writes one generated image and returns its relative path. */
export async function saveDesignImage(
  cardId: number,
  round: number,
  index: number,
  image: GeneratedImage,
): Promise<string> {
  const extension = image.mimeType === 'image/png' ? 'png' : 'jpg';
  // The timestamp keeps names unique if a round number is ever reused after a failed save.
  const path = `${DESIGNS_DIR}/card-${cardId}/r${round}-${index}-${Date.now()}.${extension}`;
  const file = new File(Paths.document, path);
  file.create({ intermediates: true, overwrite: true });
  // SDK 58: write() is asynchronous; await it so the file is complete before it is used.
  await file.write(image.base64, { encoding: 'base64' });
  return path;
}

/**
 * Copies a design to a stable path for an order snapshot (CLAUDE.md §9), so later clean-up of
 * the card's designs can never break the order. Returns the new relative path.
 */
export async function copyImageForOrder(cardId: number, designPath: string): Promise<string> {
  const extension = designPath.split('.').pop() ?? 'jpg';
  const path = `${ORDERS_DIR}/card-${cardId}-${Date.now()}.${extension}`;
  const destination = new File(Paths.document, path);
  destination.parentDirectory.create({ intermediates: true, idempotent: true });
  // SDK 58: copy() is asynchronous, like write().
  await new File(resolveImageUri(designPath)).copy(destination);
  return path;
}

/** Best-effort delete; a missing file is not an error. */
export function deleteImages(paths: readonly string[]): void {
  for (const path of paths) {
    try {
      const file = new File(resolveImageUri(path));
      if (file.exists) file.delete();
    } catch (error) {
      console.warn('Could not delete image', error);
    }
  }
}
