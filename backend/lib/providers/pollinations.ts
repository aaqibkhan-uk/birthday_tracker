// Pollinations (fallback). Needs an sk_ key; billed in Pollen, whose free grant is one-off.
// API notes: docs/image-providers.md. Returns raw image bytes, one image per call.
import { PromptRejectedError, requireEnv } from './errors.js';
import { CARD_IMAGE_HEIGHT, CARD_IMAGE_WIDTH, imageFromBytes } from './image.js';
import { parallelProvider } from './parallel.js';
import type { ProviderFactory } from './types.js';

const BASE_URL = 'https://gen.pollinations.ai';
export const DEFAULT_POLLINATIONS_MODEL = 'tongyi-mai/z-image-turbo';

// Not yet seen for real (the Pollinations spike has not been run): a 4xx whose body mentions
// safety is treated as the provider's filter refusing the prompt. Anything else falls through.
const SAFETY_MESSAGE = /nsfw|unsafe|safety|moderation|content policy/i;

export const pollinationsProvider: ProviderFactory = (env) => {
  const { POLLINATIONS_API_KEY } = requireEnv(env, 'pollinations', ['POLLINATIONS_API_KEY']);
  const model = env.POLLINATIONS_MODEL?.trim() || DEFAULT_POLLINATIONS_MODEL;

  return parallelProvider('pollinations', async ({ prompt, seed, signal }) => {
    const url = new URL(`${BASE_URL}/image/${encodeURIComponent(prompt)}`);
    url.searchParams.set('model', model);
    url.searchParams.set('width', String(CARD_IMAGE_WIDTH));
    url.searchParams.set('height', String(CARD_IMAGE_HEIGHT));
    url.searchParams.set('seed', String(seed));
    url.searchParams.set('safe', 'true');

    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${POLLINATIONS_API_KEY}` },
      signal,
    });
    if (!response.ok) {
      const detail = (await response.text()).slice(0, 200);
      if (response.status >= 400 && response.status < 500 && SAFETY_MESSAGE.test(detail)) {
        throw new PromptRejectedError('Pollinations safety filter');
      }
      throw new Error(`Pollinations HTTP ${response.status}`);
    }
    return imageFromBytes(new Uint8Array(await response.arrayBuffer()));
  });
};
