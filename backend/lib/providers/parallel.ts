// Most providers generate one image per HTTP call. This helper turns a single-image function into
// an ImageProvider that runs `count` calls in parallel (CLAUDE.md §10) with distinct random seeds.
// If any call fails, the others are aborted and the whole round fails, so the chain can fall back.
import type { Style } from '../validation.js';
import type { GeneratedImage, ImageProvider, ProviderName } from './types.js';

export interface SingleImageInput {
  prompt: string;
  style?: Style;
  seed: number;
  signal: AbortSignal;
}

export type GenerateOne = (input: SingleImageInput) => Promise<GeneratedImage>;

const MAX_SEED = 2_147_483_647;

export function parallelProvider(name: ProviderName, generateOne: GenerateOne): ImageProvider {
  return {
    name,
    async generate(request, context) {
      const roundController = new AbortController();
      const signal = AbortSignal.any([context.signal, roundController.signal]);
      try {
        return await Promise.all(
          Array.from({ length: request.count }, () =>
            generateOne({
              prompt: request.prompt,
              style: request.style,
              seed: Math.floor(Math.random() * MAX_SEED),
              signal,
            }),
          ),
        );
      } catch (error) {
        roundController.abort();
        throw error;
      }
    },
  };
}
