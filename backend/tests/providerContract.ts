// Shared behaviour every ImageProvider must satisfy. Call from a provider's test file with a
// factory that returns the provider (for real providers, stub `fetch` so no network is used).
import { describe, expect, it } from 'vitest';

import type { ImageProvider } from '../lib/providers/index.js';

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const JPEG_SIGNATURE = Buffer.from([0xff, 0xd8, 0xff]);

function context(signal = new AbortController().signal) {
  return { signal };
}

export function describeProviderContract(label: string, makeProvider: () => ImageProvider): void {
  describe(`${label} provider contract`, () => {
    it.each([1, 2, 3])('returns exactly %i decodable image(s)', async (count) => {
      const images = await makeProvider().generate({ prompt: 'a fox', count }, context());
      expect(images).toHaveLength(count);
      for (const image of images) {
        const bytes = Buffer.from(image.base64, 'base64');
        const signature = image.mimeType === 'image/png' ? PNG_SIGNATURE : JPEG_SIGNATURE;
        expect(bytes.subarray(0, signature.length)).toEqual(signature);
      }
    });

    it('rejects when the signal is already aborted', async () => {
      const controller = new AbortController();
      controller.abort(new Error('timed out'));
      await expect(
        makeProvider().generate({ prompt: 'a fox', count: 3 }, context(controller.signal)),
      ).rejects.toThrow();
    });
  });
}
