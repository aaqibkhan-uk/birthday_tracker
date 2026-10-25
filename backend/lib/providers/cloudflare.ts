// Cloudflare Workers AI (primary). Free plan: 10,000 Neurons/day, resets 00:00 UTC.
// API notes: docs/image-providers.md. One image per call, so three calls run in parallel.
import { PromptRejectedError, requireEnv } from './errors.js';
import { CARD_IMAGE_HEIGHT, CARD_IMAGE_WIDTH, imageFromBytes } from './image.js';
import { parallelProvider, type SingleImageInput } from './parallel.js';
import type { ProviderFactory } from './types.js';

export const DEFAULT_CLOUDFLARE_MODEL = '@cf/black-forest-labs/flux-2-klein-4b';

// Cloudflare's code for "Input prompt contains NSFW content". The message check is a backstop in
// case the code changes; it never matches quota or auth errors.
const NSFW_ERROR_CODE = 3030;
const NSFW_MESSAGE = /nsfw|unsafe|inappropriate/i;

interface CloudflareResponse {
  success?: boolean;
  result?: { image?: string };
  errors?: { code?: number; message?: string }[];
}

interface CloudflareBody {
  body: FormData | string;
  headers?: Record<string, string>;
}

function requestBody(model: string, { prompt, seed }: SingleImageInput): CloudflareBody {
  if (model.includes('flux-2')) {
    // FLUX.2 models take multipart form data, even for a prompt-only request.
    const form = new FormData();
    form.append('prompt', prompt);
    form.append('width', String(CARD_IMAGE_WIDTH));
    form.append('height', String(CARD_IMAGE_HEIGHT));
    form.append('seed', String(seed));
    return { body: form };
  }
  // flux-1-schnell: JSON, square 1024x1024 output only, not 5:7.
  return {
    body: JSON.stringify({ prompt, steps: 4, seed }),
    headers: { 'Content-Type': 'application/json' },
  };
}

export const cloudflareProvider: ProviderFactory = (env) => {
  const { CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_API_TOKEN } = requireEnv(env, 'cloudflare', [
    'CLOUDFLARE_ACCOUNT_ID',
    'CLOUDFLARE_API_TOKEN',
  ]);
  const model = env.CLOUDFLARE_IMAGE_MODEL?.trim() || DEFAULT_CLOUDFLARE_MODEL;
  const url = `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/ai/run/${model}`;

  return parallelProvider('cloudflare', async (input) => {
    const { body, headers } = requestBody(model, input);
    const response = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${CLOUDFLARE_API_TOKEN}`, ...headers },
      body,
      signal: input.signal,
    });

    let json: CloudflareResponse;
    try {
      json = (await response.json()) as CloudflareResponse;
    } catch {
      throw new Error(`Cloudflare HTTP ${response.status}: response was not JSON`);
    }

    const errors = json.errors ?? [];
    if (errors.some((e) => e.code === NSFW_ERROR_CODE || NSFW_MESSAGE.test(e.message ?? ''))) {
      throw new PromptRejectedError('Cloudflare safety filter');
    }
    const image = json.result?.image;
    if (!response.ok || !image) {
      // Includes "daily free allocation used up": the chain falls back to the next provider.
      const detail = errors.map((e) => `${e.code ?? '?'} ${e.message ?? ''}`.trim()).join('; ');
      throw new Error(`Cloudflare HTTP ${response.status}: ${detail || 'no image in response'}`);
    }
    return imageFromBytes(Buffer.from(image, 'base64'));
  });
};
