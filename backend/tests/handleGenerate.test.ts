import { describe, expect, it, vi } from 'vitest';

import { handleGenerate } from '../lib/handleGenerate.js';
import { getProviderChain, type ImageProvider } from '../lib/providers/index.js';
import { MOCK_HEIGHT, MOCK_WIDTH } from '../lib/providers/mock.js';

const URL = 'http://localhost/api/generate';

function post(body: unknown): Request {
  return new Request(URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

const mockOnly = () => getProviderChain({ IMAGE_PROVIDER: 'mock' });

const failingProvider: ImageProvider = {
  name: 'pollinations',
  generate: () => Promise.reject(new Error('upstream down')),
};

describe('handleGenerate', () => {
  it('returns 3 portrait PNG placeholders in mock mode', async () => {
    const response = await handleGenerate(
      post({ prompt: 'a fox reading a book', style: 'watercolour', count: 3 }),
      mockOnly,
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
      expect(png.subarray(0, 8)).toEqual(
        Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      );
      // IHDR width and height live at bytes 16-23.
      expect(png.readUInt32BE(16)).toBe(MOCK_WIDTH);
      expect(png.readUInt32BE(20)).toBe(MOCK_HEIGHT);
    }
  });

  it('honours a smaller count', async () => {
    const response = await handleGenerate(post({ prompt: 'a fox', count: 1 }), mockOnly);
    const body = (await response.json()) as { images: unknown[] };
    expect(body.images).toHaveLength(1);
  });

  it('defaults to the mock provider when IMAGE_PROVIDER is unset', () => {
    expect(getProviderChain({}).map((provider) => provider.name)).toEqual(['mock']);
  });

  it('rejects non-POST methods with 405', async () => {
    const response = await handleGenerate(new Request(URL, { method: 'GET' }), mockOnly);
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
    const response = await handleGenerate(post(body), mockOnly);
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ error: { code: 'invalid_request' } });
  });

  it('returns 500 when IMAGE_PROVIDER is misconfigured', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const response = await handleGenerate(post({ prompt: 'a fox' }), () =>
      getProviderChain({ IMAGE_PROVIDER: 'nope' }),
    );
    expect(response.status).toBe(500);
    expect(await response.json()).toMatchObject({ error: { code: 'internal_error' } });
    errorSpy.mockRestore();
  });

  it('falls back to the next provider when the first fails', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const response = await handleGenerate(post({ prompt: 'a fox' }), () => [
      failingProvider,
      ...mockOnly(),
    ]);
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ provider: 'mock' });
    errorSpy.mockRestore();
  });

  it('returns 502 provider_error when every provider fails, without logging the prompt', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const response = await handleGenerate(post({ prompt: 'a secret fox prompt' }), () => [
      failingProvider,
    ]);
    expect(response.status).toBe(502);
    expect(await response.json()).toMatchObject({ error: { code: 'provider_error' } });
    expect(JSON.stringify(errorSpy.mock.calls)).not.toContain('secret fox');
    errorSpy.mockRestore();
  });
});
