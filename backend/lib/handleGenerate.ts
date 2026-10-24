// POST /api/generate (CLAUDE.md §10). Kept separate from api/ so it can be tested without Vercel.
// Moderation, prompt template and the daily limit are added in Milestone 4.
import { errorResponse } from './errors.js';
import {
  getProviderChain,
  PromptRejectedError,
  type GeneratedImage,
  type ImageProvider,
} from './providers/index.js';
import { validateGenerateRequest } from './validation.js';

// Generous for a 300-character prompt; rejects oversized bodies before parsing.
const MAX_BODY_BYTES = 10_000;

// The app gives up after 60 s (FR-4.4). 25 s per provider leaves room for one fallback.
export const DEFAULT_PROVIDER_TIMEOUT_MS = 25_000;

export interface HandleGenerateOptions {
  getProviders?: () => ImageProvider[];
  providerTimeoutMs?: number;
}

function timeoutFromEnv(): number {
  const value = Number(process.env.PROVIDER_TIMEOUT_MS);
  return Number.isFinite(value) && value > 0 ? value : DEFAULT_PROVIDER_TIMEOUT_MS;
}

/** Rejects when `signal` aborts, even if the provider ignores the signal. */
function abortable<T>(promise: Promise<T>, signal: AbortSignal): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const onAbort = () => reject(signal.reason);
    if (signal.aborted) return onAbort();
    signal.addEventListener('abort', onAbort, { once: true });
    promise.then(resolve, reject).finally(() => signal.removeEventListener('abort', onAbort));
  });
}

function assertValidImages(images: GeneratedImage[], count: number): void {
  if (!Array.isArray(images) || images.length !== count) {
    throw new Error(`expected ${count} images, got ${Array.isArray(images) ? images.length : 0}`);
  }
  for (const image of images) {
    if (!image.base64 || !['image/jpeg', 'image/png'].includes(image.mimeType)) {
      throw new Error('provider returned an invalid image');
    }
  }
}

export async function handleGenerate(
  request: Request,
  {
    getProviders = getProviderChain,
    providerTimeoutMs = timeoutFromEnv(),
  }: HandleGenerateOptions = {},
): Promise<Response> {
  if (request.method !== 'POST') {
    return errorResponse(405, 'method_not_allowed', 'Use POST.', { Allow: 'POST' });
  }

  const text = await request.text();
  if (Buffer.byteLength(text) > MAX_BODY_BYTES) {
    return errorResponse(400, 'invalid_request', 'Request body is too large.');
  }

  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return errorResponse(400, 'invalid_request', 'Request body must be valid JSON.');
  }

  const validation = validateGenerateRequest(body);
  if (!validation.ok) {
    return errorResponse(400, 'invalid_request', validation.message);
  }

  let providers: ImageProvider[];
  try {
    providers = getProviders();
  } catch (error) {
    console.error('Provider configuration error:', (error as Error).message);
    return errorResponse(500, 'internal_error', 'Image generation is not configured.');
  }

  for (const provider of providers) {
    const signal = AbortSignal.timeout(providerTimeoutMs);
    try {
      const images = await abortable(provider.generate(validation.value, { signal }), signal);
      assertValidImages(images, validation.value.count);
      return Response.json({ images, provider: provider.name });
    } catch (error) {
      if (error instanceof PromptRejectedError) {
        return errorResponse(
          422,
          'prompt_rejected',
          "That description can't be used for a card. Please try describing it differently.",
        );
      }
      // Never log the prompt (CLAUDE.md §10): provider name and error message only.
      console.error(`Provider "${provider.name}" failed:`, (error as Error).message);
    }
  }

  return errorResponse(502, 'provider_error', 'Image generation failed. Please try again.');
}
