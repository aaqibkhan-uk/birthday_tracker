// Client for the backend's POST /api/generate (CLAUDE.md §10, FR-4.4, FR-4.9).
// No React or Expo imports, so it is unit-tested with a stubbed fetch.
import type { CardStyle } from '../domain/card';

export interface GeneratedImage {
  base64: string;
  mimeType: 'image/png' | 'image/jpeg';
}

/**
 * Why a generation failed. Only a successful round counts toward the per-card cap, so every
 * failure here is free for the user (FR-4.4, FR-4.7).
 */
export type GenerationFailure =
  | 'timeout'
  | 'network'
  | 'rejected'
  | 'daily_limit'
  | 'provider'
  | 'invalid_request'
  | 'not_configured'
  | 'unexpected';

export type GenerationResult =
  | { ok: true; images: GeneratedImage[] }
  | { ok: false; failure: GenerationFailure; message: string };

export interface GenerateOptions {
  apiUrl: string;
  timeoutMs: number;
  count: number;
  fetchImpl?: typeof fetch;
}

const MESSAGES: Record<GenerationFailure, string> = {
  timeout: 'That took too long. Please try again.',
  network: "Couldn't reach the design service. Check your connection and try again.",
  rejected:
    "We can't make a design from that description. Try describing something different, without real people, brands or famous characters.",
  daily_limit: "We've reached today's limit for new designs. Please try again tomorrow.",
  provider: 'The design service had a problem. Please try again.',
  invalid_request: 'That description could not be sent. Please edit it and try again.',
  not_configured: 'The design service is not set up in this build (EXPO_PUBLIC_API_URL).',
  unexpected: 'Something went wrong. Please try again.',
};

/** Whether the user can usefully press "Try again" with the same description. */
export function isRetryable(failure: GenerationFailure): boolean {
  return ['timeout', 'network', 'provider', 'unexpected'].includes(failure);
}

const fail = (failure: GenerationFailure): GenerationResult => ({
  ok: false,
  failure,
  message: MESSAGES[failure],
});

function failureForStatus(status: number): GenerationFailure {
  if (status === 422) return 'rejected';
  if (status === 429) return 'daily_limit';
  if (status === 400) return 'invalid_request';
  if (status === 502 || status === 503 || status === 504) return 'provider';
  return 'unexpected';
}

function isGeneratedImage(value: unknown): value is GeneratedImage {
  if (typeof value !== 'object' || value === null) return false;
  const { base64, mimeType } = value as Record<string, unknown>;
  return (
    typeof base64 === 'string' &&
    base64.length > 0 &&
    (mimeType === 'image/png' || mimeType === 'image/jpeg')
  );
}

export async function generateImages(
  prompt: string,
  style: CardStyle | null,
  { apiUrl, timeoutMs, count, fetchImpl = fetch }: GenerateOptions,
): Promise<GenerationResult> {
  if (!apiUrl) return fail('not_configured');

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(`${apiUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: prompt.trim(), ...(style ? { style } : {}), count }),
      signal: controller.signal,
    });
    if (!response.ok) return fail(failureForStatus(response.status));

    const body: unknown = await response.json();
    const images = (body as { images?: unknown } | null)?.images;
    if (!Array.isArray(images) || images.length !== count || !images.every(isGeneratedImage)) {
      return fail('unexpected');
    }
    return { ok: true, images };
  } catch {
    // An abort means our timeout fired; anything else thrown by fetch is a network failure.
    return fail(controller.signal.aborted ? 'timeout' : 'network');
  } finally {
    clearTimeout(timer);
  }
}
