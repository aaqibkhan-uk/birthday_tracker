import type { Env, ProviderName } from './types.js';

/** Misconfiguration (unknown provider, missing key). Surfaces as 500 internal_error. */
export class ProviderConfigError extends Error {}

/**
 * The provider's safety filter refused the prompt. Stops the fallback chain and surfaces as
 * 422 prompt_rejected, which does not count toward the card's generation cap (FR-4.7).
 */
export class PromptRejectedError extends Error {}

/** Reads required env vars for a provider, or throws one error naming every missing one. */
export function requireEnv<K extends string>(
  env: Env,
  provider: ProviderName,
  names: readonly K[],
): Record<K, string> {
  const missing = names.filter((name) => !env[name]?.trim());
  if (missing.length > 0) {
    throw new ProviderConfigError(`Provider "${provider}" needs: ${missing.join(', ')}.`);
  }
  return Object.fromEntries(names.map((name) => [name, (env[name] as string).trim()])) as Record<
    K,
    string
  >;
}
