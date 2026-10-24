import type { GenerateRequest } from '../validation.js';

export type ProviderName = 'mock' | 'cloudflare' | 'pollinations';

export interface GeneratedImage {
  base64: string;
  mimeType: 'image/jpeg' | 'image/png';
}

export interface GenerateContext {
  /** Aborted when the per-provider timeout expires. Pass it to `fetch`. */
  signal: AbortSignal;
}

export interface ImageProvider {
  readonly name: ProviderName;
  /**
   * Returns exactly `request.count` images, or throws.
   * Throw `PromptRejectedError` when the provider's own safety filter refuses the prompt.
   */
  generate(request: GenerateRequest, context: GenerateContext): Promise<GeneratedImage[]>;
}

/** Environment variables as seen by providers (process.env in production, plain objects in tests). */
export type Env = Readonly<Record<string, string | undefined>>;

/** Builds a provider from env, throwing `ProviderConfigError` if its settings are missing. */
export type ProviderFactory = (env: Env) => ImageProvider;
