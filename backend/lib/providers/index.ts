// Builds the ordered provider chain from IMAGE_PROVIDERS (primary first, then fallbacks).
import { ProviderConfigError } from './errors.js';
import { PROVIDER_FACTORIES, PROVIDER_NAMES } from './registry.js';
import type { Env, ImageProvider, ProviderName } from './types.js';

export { PromptRejectedError, ProviderConfigError } from './errors.js';
export type { Env, GeneratedImage, ImageProvider, ProviderName } from './types.js';

function isProviderName(value: string): value is ProviderName {
  return (PROVIDER_NAMES as readonly string[]).includes(value);
}

/** Parses e.g. "cloudflare, pollinations" into unique names. Empty or unset means mock. */
export function parseProviderList(raw: string | undefined): ProviderName[] {
  const names = [
    ...new Set(
      (raw ?? '')
        .split(',')
        .map((name) => name.trim().toLowerCase())
        .filter(Boolean),
    ),
  ];
  if (names.length === 0) return ['mock'];

  const unknown = names.filter((name) => !isProviderName(name));
  if (unknown.length > 0) {
    throw new ProviderConfigError(
      `Unknown provider(s) in IMAGE_PROVIDERS: ${unknown.join(', ')}. ` +
        `Known: ${PROVIDER_NAMES.join(', ')}.`,
    );
  }
  return names as ProviderName[];
}

/** Providers to try, in order. Throws ProviderConfigError on any misconfiguration (fail fast). */
export function getProviderChain(env: Env = process.env): ImageProvider[] {
  return parseProviderList(env.IMAGE_PROVIDERS).map((name) => {
    const factory = PROVIDER_FACTORIES[name];
    if (!factory) {
      throw new ProviderConfigError(`Provider "${name}" is not implemented yet.`);
    }
    return factory(env);
  });
}
