import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { handleGenerate } from '../lib/handleGenerate.js';
import {
  getProviderChain,
  PromptRejectedError,
  type ImageProvider,
} from '../lib/providers/index.js';
import { MOCK_HEIGHT, MOCK_WIDTH } from '../lib/providers/mock.js';

const URL = 'http://localhost/api/generate';

function post(body: unknown): Request {
  return new Request(URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

const mockOnly = () => getProviderChain({ IMAGE_PROVIDERS: 'mock' });
const allow = async () => true;

function failing(message = 'upstream down'): ImageProvider {
  return { name: 'pollinations', generate: () => Promise.reject(new Error(message)) };
}

// Never resolves and ignores its signal: only the handler's own timeout can stop it.
const hanging: ImageProvider = { name: 'cloudflare', generate: () => new Promise(() => {}) };

let errorSpy: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => {
  errorSpy.mockRestore();
});

describe('handleGenerate', () => {
  it('returns 3 portrait PNG placeholders in mock mode', async () => {
    const response = await handleGenerate(
      post({ prompt: 'a fox reading a book', style: 'watercolour', count: 3 }),
      { getProviders: mockOnly },
    );
    expect(response.status).toBe(200);

    const body = (await response.json()) as {
      images: { base64: string; mimeType: string }[];
      provider: string;
    };
    expect(body.provider).toBe('mock');
    expect(body.images).toHaveLength(3);
    expect(new Set(body.images.map((image) => image.base64)).size).toBe(3);

    for (const image of body.images) {
      expect(image.mimeType).toBe('image/png');
      const png = Buffer.from(image.base64, 'base64');
      // IHDR width and height live at bytes 16-23.
      expect(png.readUInt32BE(16)).toBe(MOCK_WIDTH);
      expect(png.readUInt32BE(20)).toBe(MOCK_HEIGHT);
    }
  });

  it('honours a smaller count', async () => {
    const response = await handleGenerate(post({ prompt: 'a fox', count: 1 }), {
      getProviders: mockOnly,
    });
    const body = (await response.json()) as { images: unknown[] };
    expect(body.images).toHaveLength(1);
  });

  it('rejects non-POST methods with 405', async () => {
    const response = await handleGenerate(new Request(URL, { method: 'GET' }), {
      getProviders: mockOnly,
    });
    expect(response.status).toBe(405);
    expect(response.headers.get('Allow')).toBe('POST');
    expect(await response.json()).toMatchObject({ error: { code: 'method_not_allowed' } });
  });

  it.each([
    ['malformed JSON', '{"prompt":'],
    ['a missing prompt', { style: 'cartoon' }],
    ['a too-long prompt', { prompt: 'a'.repeat(301) }],
    ['an oversized body', { prompt: 'a fox', padding: 'x'.repeat(20_000) }],
  ])('returns 400 invalid_request for %s', async (_label, body) => {
    const response = await handleGenerate(post(body), { getProviders: mockOnly });
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ error: { code: 'invalid_request' } });
  });

  it('returns 500 when IMAGE_PROVIDERS is misconfigured', async () => {
    const response = await handleGenerate(post({ prompt: 'a fox' }), {
      getProviders: () => getProviderChain({ IMAGE_PROVIDERS: 'nope' }),
    });
    expect(response.status).toBe(500);
    expect(await response.json()).toMatchObject({ error: { code: 'internal_error' } });
  });

  it('falls back to the next provider when the first fails', async () => {
    const response = await handleGenerate(post({ prompt: 'a fox' }), {
      reserveRound: allow,
      getProviders: () => [failing(), ...mockOnly()],
    });
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ provider: 'mock' });
  });

  it('falls back when a provider exceeds the timeout, even if it ignores the signal', async () => {
    const response = await handleGenerate(post({ prompt: 'a fox' }), {
      reserveRound: allow,
      getProviders: () => [hanging, ...mockOnly()],
      providerTimeoutMs: 20,
    });
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ provider: 'mock' });
  });

  it('falls back when a provider returns the wrong number of images', async () => {
    const short: ImageProvider = {
      name: 'cloudflare',
      generate: async () => [{ base64: 'abc', mimeType: 'image/jpeg' }],
    };
    const response = await handleGenerate(post({ prompt: 'a fox', count: 3 }), {
      reserveRound: allow,
      getProviders: () => [short, ...mockOnly()],
    });
    expect(await response.json()).toMatchObject({ provider: 'mock' });
  });

  it('returns 422 prompt_rejected without trying fallbacks when a provider filter refuses', async () => {
    const fallback = vi.fn(mockOnly()[0]!.generate);
    const response = await handleGenerate(post({ prompt: 'a fox' }), {
      reserveRound: allow,
      getProviders: () => [
        { name: 'cloudflare', generate: () => Promise.reject(new PromptRejectedError('nsfw')) },
        { name: 'mock', generate: fallback },
      ],
    });
    expect(response.status).toBe(422);
    expect(await response.json()).toMatchObject({ error: { code: 'prompt_rejected' } });
    expect(fallback).not.toHaveBeenCalled();
  });

  it('returns 502 provider_error when every provider fails, without logging the prompt', async () => {
    const response = await handleGenerate(post({ prompt: 'a secret fox prompt' }), {
      reserveRound: allow,
      getProviders: () => [failing(), failing('also down')],
    });
    expect(response.status).toBe(502);
    expect(await response.json()).toMatchObject({ error: { code: 'provider_error' } });
    expect(JSON.stringify(errorSpy.mock.calls)).not.toContain('secret fox');
  });

  it('rejects blocklisted prompts with 422 before any provider or budget is used', async () => {
    const generate = vi.fn(mockOnly()[0]!.generate);
    const reserveRound = vi.fn(allow);
    const response = await handleGenerate(post({ prompt: 'Mickey Mouse at a party' }), {
      reserveRound,
      getProviders: () => [{ name: 'cloudflare', generate }],
    });
    expect(response.status).toBe(422);
    expect(await response.json()).toMatchObject({ error: { code: 'prompt_rejected' } });
    expect(generate).not.toHaveBeenCalled();
    expect(reserveRound).not.toHaveBeenCalled();
  });

  it('sends providers the templated prompt, not the raw description', async () => {
    const generate = vi.fn(mockOnly()[0]!.generate);
    await handleGenerate(post({ prompt: 'a fox reading', style: 'cartoon' }), {
      reserveRound: allow,
      getProviders: () => [{ name: 'cloudflare', generate }],
    });
    const sent = generate.mock.calls[0]![0];
    expect(sent.prompt).toContain('Subject: a fox reading');
    expect(sent.prompt).toContain('cartoon');
    expect(sent.prompt).toMatch(/^Greeting card front illustration/);
  });

  it('returns 429 daily_limit_reached without calling providers when the budget is used up', async () => {
    const generate = vi.fn(mockOnly()[0]!.generate);
    const response = await handleGenerate(post({ prompt: 'a fox' }), {
      reserveRound: async () => false,
      getProviders: () => [{ name: 'cloudflare', generate }],
    });
    expect(response.status).toBe(429);
    expect(await response.json()).toMatchObject({ error: { code: 'daily_limit_reached' } });
    expect(generate).not.toHaveBeenCalled();
  });

  it('fails closed with 500 when the daily limit cannot be checked', async () => {
    const response = await handleGenerate(post({ prompt: 'a fox' }), {
      reserveRound: () => Promise.reject(new Error('Upstash down')),
      getProviders: () => [{ name: 'cloudflare', generate: mockOnly()[0]!.generate }],
    });
    expect(response.status).toBe(500);
    expect(await response.json()).toMatchObject({ error: { code: 'internal_error' } });
  });

  it('skips the daily limit (no Upstash needed) when only mock is configured', async () => {
    vi.stubEnv('UPSTASH_REDIS_REST_URL', '');
    vi.stubEnv('KV_REST_API_URL', '');
    const response = await handleGenerate(post({ prompt: 'a fox' }), { getProviders: mockOnly });
    expect(response.status).toBe(200);
    vi.unstubAllEnvs();
  });

  describe('deadline', () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    it('gives the fallback only the time left before the overall deadline', async () => {
      let fallbackSignal: AbortSignal | undefined;
      const slowFallback: ImageProvider = {
        name: 'pollinations',
        generate: (_request, { signal }) => {
          fallbackSignal = signal;
          return new Promise(() => {});
        },
      };
      const pending = handleGenerate(post({ prompt: 'a fox' }), {
        reserveRound: allow,
        getProviders: () => [hanging, slowFallback],
        providerTimeoutMs: 40_000,
        deadlineMs: 55_000,
      });
      await vi.advanceTimersByTimeAsync(40_000);
      expect(fallbackSignal?.aborted).toBe(false);
      await vi.advanceTimersByTimeAsync(15_000);
      expect(fallbackSignal?.aborted).toBe(true);
      expect((await pending).status).toBe(502);
    });

    it('does not start a fallback with less than 5 s left', async () => {
      const fallback = vi.fn(mockOnly()[0]!.generate);
      const pending = handleGenerate(post({ prompt: 'a fox' }), {
        reserveRound: allow,
        getProviders: () => [hanging, { name: 'mock', generate: fallback }],
        providerTimeoutMs: 40_000,
        deadlineMs: 43_000,
      });
      await vi.advanceTimersByTimeAsync(40_000);
      expect((await pending).status).toBe(502);
      expect(fallback).not.toHaveBeenCalled();
    });
  });
});
