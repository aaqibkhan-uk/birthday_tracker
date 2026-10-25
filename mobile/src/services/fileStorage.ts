// Card images on the device (FR-4.11). The only module that touches expo-file-system.
//
// Paths are stored relative to the app's document directory (e.g. "designs/card-3/r1-0-….png"),
// because iOS can move the app container between installs and updates, which breaks absolute
// file:// URIs saved in the database.
import { File, Paths } from 'expo-file-system';
import type { GeneratedImage } from './imageApi';

const DESIGNS_DIR = 'designs';

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
