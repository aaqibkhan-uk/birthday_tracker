// Cloudflare and Pollinations with `fetch` stubbed: no network, no credits spent.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { cloudflareProvider } from '../lib/providers/cloudflare.js';
import { ProviderConfigError, PromptRejectedError } from '../lib/providers/index.js';
import { pollinationsProvider } from '../lib/providers/pollinations.js';
import { describeProviderContract } from './providerContract.js';

const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46]);
const cloudflareEnv = { CLOUDFLARE_ACCOUNT_ID: 'acc', CLOUDFLARE_API_TOKEN: 'cf-token' };
const pollinationsEnv = { POLLINATIONS_API_KEY: 'sk_test' };
const signal = () => new AbortController().signal;

type FetchArgs = [string | URL, RequestInit | undefined];

function stubFetch(respond: (url: string, init?: RequestInit) => Response) {
  const fetchMock = vi.fn(async (input: string | URL, init?: RequestInit) => {
    init?.signal?.throwIfAborted();
    return respond(String(input), init);
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

const cloudflareOk = () =>
  Response.json({ success: true, result: { image: JPEG.toString('base64') } });
const pollinationsOk = () =>
  new Response(JPEG, { status: 200, headers: { 'Content-Type': 'image/jpeg' } });

afterEach(() => vi.unstubAllGlobals());

describe('cloudflare', () => {
  beforeEach(() => stubFetch(cloudflareOk));
  describeProviderContract('cloudflare', () => cloudflareProvider(cloudflareEnv));

  it('posts multipart form data with the portrait size to the flux-2 model', async () => {
    const fetchMock = stubFetch(cloudflareOk);
    await cloudflareProvider(cloudflareEnv).generate(
      { prompt: 'a fox', count: 1 },
      { signal: signal() },
    );
    const [url, init] = fetchMock.mock.calls[0] as FetchArgs;
    expect(url).toBe(
      'https://api.cloudflare.com/client/v4/accounts/acc/ai/run/@cf/black-forest-labs/flux-2-klein-4b',
    );
    expect(init?.headers).toMatchObject({ Authorization: 'Bearer cf-token' });
    const form = init?.body as FormData;
    expect(form.get('prompt')).toBe('a fox');
    expect(form.get('width')).toBe('768');
    expect(form.get('height')).toBe('1072');
  });

  it('turns an NSFW refusal into PromptRejectedError', async () => {
    stubFetch(() =>
      Response.json(
        {
          success: false,
          errors: [{ code: 3030, message: 'AiError: Input prompt contains NSFW content.' }],
        },
        { status: 400 },
      ),
    );
    await expect(
      cloudflareProvider(cloudflareEnv).generate({ prompt: 'x', count: 3 }, { signal: signal() }),
    ).rejects.toBeInstanceOf(PromptRejectedError);
  });

  it.each([
    [
      'quota used up',
      () =>
        Response.json(
          { success: false, errors: [{ code: 4006, message: 'daily free allocation used' }] },
          { status: 429 },
        ),
    ],
    ['a non-JSON error page', () => new Response('<html>bad gateway</html>', { status: 502 })],
    ['a success without an image', () => Response.json({ success: true, result: {} })],
    [
      'an image that is not PNG/JPEG',
      () => Response.json({ success: true, result: { image: 'aGVsbG8=' } }),
    ],
  ])('throws a plain error (so the chain falls back) on %s', async (_label, respond) => {
    stubFetch(respond);
    const error = await cloudflareProvider(cloudflareEnv)
      .generate({ prompt: 'x', count: 1 }, { signal: signal() })
      .catch((e: unknown) => e);
    expect(error).toBeInstanceOf(Error);
    expect(error).not.toBeInstanceOf(PromptRejectedError);
  });

  it('needs an account id and token', () => {
    expect(() => cloudflareProvider({})).toThrow(ProviderConfigError);
  });
});

describe('pollinations', () => {
  beforeEach(() => stubFetch(pollinationsOk));
  describeProviderContract('pollinations', () => pollinationsProvider(pollinationsEnv));

  it('requests the portrait size with the safety filter on', async () => {
    const fetchMock = stubFetch(pollinationsOk);
    await pollinationsProvider(pollinationsEnv).generate(
      { prompt: 'a fox', count: 1 },
      { signal: signal() },
    );
    const [url, init] = fetchMock.mock.calls[0] as FetchArgs;
    const parsed = new URL(url);
    expect(parsed.pathname).toBe('/image/a%20fox');
    expect(parsed.searchParams.get('width')).toBe('768');
    expect(parsed.searchParams.get('height')).toBe('1072');
    expect(parsed.searchParams.get('safe')).toBe('true');
    expect(init?.headers).toMatchObject({ Authorization: 'Bearer sk_test' });
  });

  it('turns a safety refusal into PromptRejectedError', async () => {
    stubFetch(() => new Response('{"error":"NSFW content detected"}', { status: 400 }));
    await expect(
      pollinationsProvider(pollinationsEnv).generate(
        { prompt: 'x', count: 1 },
        { signal: signal() },
      ),
    ).rejects.toBeInstanceOf(PromptRejectedError);
  });

  it('throws a plain error on other failures', async () => {
    stubFetch(() => new Response('Insufficient pollen', { status: 402 }));
    const error = await pollinationsProvider(pollinationsEnv)
      .generate({ prompt: 'x', count: 1 }, { signal: signal() })
      .catch((e: unknown) => e);
    expect(error).not.toBeInstanceOf(PromptRejectedError);
  });

  it('needs an API key', () => {
    expect(() => pollinationsProvider({})).toThrow(ProviderConfigError);
  });
});
