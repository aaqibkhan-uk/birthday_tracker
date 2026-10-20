// Provider selection. Real providers (Pollinations primary, Cloudflare fallback) arrive in Milestone 4.
import { mockProvider } from './mock.js';
import type { ImageProvider } from './types.js';

export type { GeneratedImage, ImageProvider, ProviderName } from './types.js';

export class ProviderConfigError extends Error {}

/** Providers to try, in order (primary first). Defaults to mock when IMAGE_PROVIDER is unset. */
export function getProviderChain(env: NodeJS.ProcessEnv = process.env): ImageProvider[] {
  const name = env.IMAGE_PROVIDER?.trim() || 'mock';
  switch (name) {
    case 'mock':
      return [mockProvider];
    case 'pollinations':
    case 'cloudflare':
      throw new ProviderConfigError(`IMAGE_PROVIDER "${name}" is not implemented yet.`);
    default:
      throw new ProviderConfigError(`Unknown IMAGE_PROVIDER "${name}".`);
  }
}
