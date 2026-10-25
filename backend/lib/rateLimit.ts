// Global daily budget of generation rounds (FR-4.6), stored in Upstash Redis.
// One counter per UTC day (Cloudflare's free allocation also resets at 00:00 UTC); nothing about
// the user is stored. Talks to Upstash's REST API with plain fetch, so no extra dependency.
import type { Env } from './providers/index.js';

export const DEFAULT_DAILY_GENERATION_LIMIT = 20;
const KEY_TTL_SECONDS = 48 * 60 * 60;
const UPSTASH_TIMEOUT_MS = 5_000;

/** Upstash missing or unreachable. The handler fails closed (500) so credits can't run away. */
export class RateLimitError extends Error {}

export function dailyLimitFromEnv(env: Env): number {
  const value = Number(env.DAILY_GENERATION_LIMIT);
  return Number.isInteger(value) && value > 0 ? value : DEFAULT_DAILY_GENERATION_LIMIT;
}

export function dailyKey(now: Date): string {
  return `generations:${now.toISOString().slice(0, 10)}`;
}

// The Vercel Marketplace integration names them KV_REST_API_*; Upstash's own docs use UPSTASH_*.
function upstashConfig(env: Env): { url: string; token: string } {
  const url = (env.UPSTASH_REDIS_REST_URL || env.KV_REST_API_URL)?.trim();
  const token = (env.UPSTASH_REDIS_REST_TOKEN || env.KV_REST_API_TOKEN)?.trim();
  if (!url || !token) {
    throw new RateLimitError('Upstash is not configured (UPSTASH_REDIS_REST_URL/TOKEN).');
  }
  return { url: url.replace(/\/+$/, ''), token };
}

/**
 * Counts one round against today's budget. Returns false if the budget was already used up.
 * Throws RateLimitError if Upstash is missing or fails.
 */
export async function reserveDailyRound(env: Env, now = new Date()): Promise<boolean> {
  const { url, token } = upstashConfig(env);
  const key = dailyKey(now);

  let response: Response;
  try {
    response = await fetch(`${url}/pipeline`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify([
        ['INCR', key],
        ['EXPIRE', key, KEY_TTL_SECONDS],
      ]),
      signal: AbortSignal.timeout(UPSTASH_TIMEOUT_MS),
    });
  } catch (error) {
    throw new RateLimitError(`Upstash request failed: ${(error as Error).message}`);
  }
  if (!response.ok) throw new RateLimitError(`Upstash HTTP ${response.status}`);

  const results = (await response.json().catch(() => undefined)) as
    { result?: unknown }[] | undefined;
  const count = results?.[0]?.result;
  if (typeof count !== 'number') throw new RateLimitError('Upstash returned no counter value.');
  return count <= dailyLimitFromEnv(env);
}
