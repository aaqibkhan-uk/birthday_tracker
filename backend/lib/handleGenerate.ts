// POST /api/generate (CLAUDE.md §10). Kept separate from api/ so it can be tested without Vercel.
// Order: validate → moderate → daily budget → prompt template → provider chain.
import { errorResponse } from './errors.js';
import { moderatePrompt } from './moderation.js';
import { buildCardPrompt } from './promptTemplate.js';
import {
  getProviderChain,
  PromptRejectedError,
  type GeneratedImage,
  type ImageProvider,
} from './providers/index.js';
import { reserveDailyRound } from './rateLimit.js';
import { validateGenerateRequest } from './validation.js';

// Generous for a 300-character prompt; rejects oversized bodies before parsing.
const MAX_BODY_BYTES = 10_000;

// The app gives up after 60 s (FR-4.4). A Cloudflare round takes ~26 s, so the primary gets up to
// 40 s; the whole chain must answer within 55 s, so a fallback only gets the time that is left.
export const DEFAULT_PROVIDER_TIMEOUT_MS = 40_000;
export const DEFAULT_GENERATION_DEADLINE_MS = 55_000;
// Not worth starting a fallback with less time than this.
const MIN_PROVIDER_TIME_MS = 5_000;

const REJECTED_MESSAGE =
  "That description can't be used for a card. Please try describing it differently.";

export interface HandleGenerateOptions {
  getProviders?: () => ImageProvider[];
  providerTimeoutMs?: number;
  deadlineMs?: number;
  /** Counts the round against the daily budget; false = budget used up. Throws if unavailable. */
  reserveRound?: (providers: ImageProvider[]) => Promise<boolean>;
}

function msFromEnv(name: string, fallback: number): number {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

// Mock rounds cost nothing, so they skip Upstash (local dev and tests need no Redis).
async function defaultReserveRound(providers: ImageProvider[]): Promise<boolean> {
  if (providers.every((provider) => provider.name === 'mock')) return true;
  return reserveDailyRound(process.env);
}

/** Like AbortSignal.timeout, but clearable (and driven by setTimeout, so tests can fake it). */
function timeoutSignal(ms: number): { signal: AbortSignal; clear: () => void } {
  const controller = new AbortController();
  const timer = setTimeout(
    () => controller.abort(new DOMException(`timed out after ${ms} ms`, 'TimeoutError')),
    ms,
  );
  return { signal: controller.signal, clear: () => clearTimeout(timer) };
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
    providerTimeoutMs = msFromEnv('PROVIDER_TIMEOUT_MS', DEFAULT_PROVIDER_TIMEOUT_MS),
    deadlineMs = msFromEnv('GENERATION_DEADLINE_MS', DEFAULT_GENERATION_DEADLINE_MS),
    reserveRound = defaultReserveRound,
  }: HandleGenerateOptions = {},
): Promise<Response> {
  const startedAt = Date.now();
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

  // Blocked prompts never reach a provider or the daily budget (FR-4.7).
  if (!moderatePrompt(validation.value.prompt).ok) {
    return errorResponse(422, 'prompt_rejected', REJECTED_MESSAGE);
  }

  let providers: ImageProvider[];
  try {
    providers = getProviders();
  } catch (error) {
    console.error('Provider configuration error:', (error as Error).message);
    return errorResponse(500, 'internal_error', 'Image generation is not configured.');
  }

  // Counted before calling providers: a failed round may still have used provider credits.
  try {
    if (!(await reserveRound(providers))) {
      return errorResponse(
        429,
        'daily_limit_reached',
        "Today's design limit has been reached. Please try again tomorrow.",
      );
    }
  } catch (error) {
    console.error('Daily limit unavailable:', (error as Error).message);
    return errorResponse(500, 'internal_error', 'Image generation is not configured.');
  }

  const providerRequest = {
    ...validation.value,
    prompt: buildCardPrompt(validation.value.prompt, validation.value.style),
  };

  for (const provider of providers) {
    const remainingMs = deadlineMs - (Date.now() - startedAt);
    if (remainingMs < Math.min(MIN_PROVIDER_TIME_MS, providerTimeoutMs)) {
      console.error(`Skipping provider "${provider.name}": generation deadline reached.`);
      break;
    }
    const { signal, clear } = timeoutSignal(Math.min(providerTimeoutMs, remainingMs));
    try {
      const images = await abortable(provider.generate(providerRequest, { signal }), signal);
      assertValidImages(images, validation.value.count);
      return Response.json({ images, provider: provider.name });
    } catch (error) {
      if (error instanceof PromptRejectedError) {
        return errorResponse(422, 'prompt_rejected', REJECTED_MESSAGE);
      }
      // Never log the prompt (CLAUDE.md §10): provider name and error message only.
      console.error(`Provider "${provider.name}" failed:`, (error as Error).message);
    } finally {
      clear();
    }
  }

  return errorResponse(502, 'provider_error', 'Image generation failed. Please try again.');
}
