import type { GenerateRequest } from '../validation.js';

export type ProviderName = 'mock' | 'pollinations' | 'cloudflare';

export interface GeneratedImage {
  base64: string;
  mimeType: 'image/jpeg' | 'image/png';
}

export interface ImageProvider {
  readonly name: ProviderName;
  /** Returns exactly `request.count` images, or throws. */
  generate(request: GenerateRequest): Promise<GeneratedImage[]>;
}
