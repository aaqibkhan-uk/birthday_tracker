// IMAGE_PROVIDERS=mock: instant placeholder images for UI development at zero cost.
import { encodeRowPng, type Rgb } from '../png.js';
import { CARD_IMAGE_HEIGHT, CARD_IMAGE_WIDTH } from './image.js';
import type { GeneratedImage, ImageProvider } from './types.js';

export const MOCK_WIDTH = CARD_IMAGE_WIDTH;
export const MOCK_HEIGHT = CARD_IMAGE_HEIGHT;

// One soft vertical gradient per option so the three designs are easy to tell apart.
const GRADIENTS: readonly (readonly [Rgb, Rgb])[] = [
  [
    [255, 214, 165],
    [255, 140, 148],
  ],
  [
    [178, 226, 255],
    [120, 144, 230],
  ],
  [
    [200, 240, 196],
    [92, 170, 140],
  ],
];

function lerp(a: number, b: number, t: number): number {
  return Math.round(a + (b - a) * t);
}

function gradientPng([top, bottom]: readonly [Rgb, Rgb]): string {
  const png = encodeRowPng(MOCK_WIDTH, MOCK_HEIGHT, (y) => {
    const t = y / (MOCK_HEIGHT - 1);
    return [lerp(top[0], bottom[0], t), lerp(top[1], bottom[1], t), lerp(top[2], bottom[2], t)];
  });
  return png.toString('base64');
}

let cache: string[] | undefined;

function placeholders(): string[] {
  cache ??= GRADIENTS.map(gradientPng);
  return cache;
}

export const mockProvider: ImageProvider = {
  name: 'mock',
  async generate(request, { signal }): Promise<GeneratedImage[]> {
    signal.throwIfAborted();
    const images = placeholders();
    return Array.from({ length: request.count }, (_, i) => ({
      base64: images[i % images.length] as string,
      mimeType: 'image/png',
    }));
  },
};
