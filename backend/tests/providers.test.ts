import { describe, expect, it } from 'vitest';

import {
  getProviderChain,
  parseProviderList,
  ProviderConfigError,
} from '../lib/providers/index.js';
import { requireEnv } from '../lib/providers/errors.js';
import { mockProvider } from '../lib/providers/mock.js';
import { parallelProvider } from '../lib/providers/parallel.js';
import { describeProviderContract } from './providerContract.js';

describeProviderContract('mock', () => mockProvider);

describe('parseProviderList', () => {
  it('defaults to mock when unset or blank', () => {
    expect(parseProviderList(undefined)).toEqual(['mock']);
    expect(parseProviderList(' , ')).toEqual(['mock']);
  });

  it('keeps order, trims, lowercases and removes duplicates', () => {
    expect(parseProviderList(' Cloudflare, pollinations ,cloudflare')).toEqual([
      'cloudflare',
      'pollinations',
    ]);
  });

  it('rejects unknown names', () => {
    expect(() => parseProviderList('mock,dalle')).toThrow(ProviderConfigError);
  });
});

describe('getProviderChain', () => {
  it('builds the configured chain', () => {
    expect(getProviderChain({ IMAGE_PROVIDERS: 'mock' }).map((p) => p.name)).toEqual(['mock']);
  });

  it('fails fast for providers that are not implemented yet', () => {
    expect(() => getProviderChain({ IMAGE_PROVIDERS: 'cloudflare,mock' })).toThrow(
      /not implemented/,
    );
  });
});

describe('requireEnv', () => {
  it('returns trimmed values', () => {
    expect(requireEnv({ A: ' x ', B: 'y' }, 'cloudflare', ['A', 'B'])).toEqual({ A: 'x', B: 'y' });
  });

  it('names every missing variable', () => {
    expect(() => requireEnv({ A: '' }, 'cloudflare', ['A', 'B'])).toThrow(
      'Provider "cloudflare" needs: A, B.',
    );
  });
});

describe('parallelProvider', () => {
  const png = { base64: 'iVBORw0KGgo=', mimeType: 'image/png' as const };

  it('makes one call per image with distinct seeds and the shared signal', async () => {
    const seeds: number[] = [];
    const provider = parallelProvider('mock', async ({ seed, signal }) => {
      expect(signal.aborted).toBe(false);
      seeds.push(seed);
      return png;
    });
    const images = await provider.generate(
      { prompt: 'a fox', count: 3 },
      { signal: new AbortController().signal },
    );
    expect(images).toHaveLength(3);
    expect(new Set(seeds).size).toBe(3);
  });

  it('aborts the remaining calls when one fails', async () => {
    const signals: AbortSignal[] = [];
    let calls = 0;
    const provider = parallelProvider('mock', ({ signal }) => {
      signals.push(signal);
      calls += 1;
      return calls === 1
        ? Promise.reject(new Error('boom'))
        : new Promise((_, reject) => signal.addEventListener('abort', () => reject(signal.reason)));
    });
    await expect(
      provider.generate({ prompt: 'a fox', count: 3 }, { signal: new AbortController().signal }),
    ).rejects.toThrow('boom');
    expect(signals.every((signal) => signal.aborted)).toBe(true);
  });
});
