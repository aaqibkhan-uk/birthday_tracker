import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  dailyKey,
  dailyLimitFromEnv,
  RateLimitError,
  reserveDailyRound,
} from '../lib/rateLimit.js';

const env = {
  UPSTASH_REDIS_REST_URL: 'https://example.upstash.io/',
  UPSTASH_REDIS_REST_TOKEN: 'token',
  DAILY_GENERATION_LIMIT: '2',
};
const NOW = new Date('2026-10-25T23:30:00Z');

function stubUpstash(count: number, status = 200) {
  const fetchMock = vi.fn(async () =>
    Response.json([{ result: count }, { result: 1 }], { status }),
  );
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

afterEach(() => vi.unstubAllGlobals());

describe('reserveDailyRound', () => {
  it('increments the UTC-day counter with an expiry in one pipeline call', async () => {
    const fetchMock = stubUpstash(1);
    expect(await reserveDailyRound(env, NOW)).toBe(true);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://example.upstash.io/pipeline');
    expect(init.headers).toMatchObject({ Authorization: 'Bearer token' });
    expect(JSON.parse(init.body as string)).toEqual([
      ['INCR', 'generations:2026-10-25'],
      ['EXPIRE', 'generations:2026-10-25', 172_800],
    ]);
  });

  it('allows up to the limit and refuses beyond it', async () => {
    stubUpstash(2);
    expect(await reserveDailyRound(env, NOW)).toBe(true);
    stubUpstash(3);
    expect(await reserveDailyRound(env, NOW)).toBe(false);
  });

  it('accepts the Vercel Marketplace variable names', async () => {
    stubUpstash(1);
    await expect(
      reserveDailyRound({ KV_REST_API_URL: 'https://kv.example', KV_REST_API_TOKEN: 't' }, NOW),
    ).resolves.toBe(true);
  });

  it('throws RateLimitError when not configured, so the handler fails closed', async () => {
    await expect(reserveDailyRound({}, NOW)).rejects.toBeInstanceOf(RateLimitError);
  });

  it('throws RateLimitError on an HTTP error or network failure', async () => {
    stubUpstash(1, 500);
    await expect(reserveDailyRound(env, NOW)).rejects.toBeInstanceOf(RateLimitError);
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.reject(new Error('offline'))),
    );
    await expect(reserveDailyRound(env, NOW)).rejects.toBeInstanceOf(RateLimitError);
  });
});

describe('helpers', () => {
  it('keys by UTC date', () => {
    expect(dailyKey(new Date('2026-10-26T00:30:00+01:00'))).toBe('generations:2026-10-25');
  });

  it('defaults the limit to 20 when unset or invalid', () => {
    expect(dailyLimitFromEnv({})).toBe(20);
    expect(dailyLimitFromEnv({ DAILY_GENERATION_LIMIT: 'abc' })).toBe(20);
    expect(dailyLimitFromEnv({ DAILY_GENERATION_LIMIT: '5' })).toBe(5);
  });
});
