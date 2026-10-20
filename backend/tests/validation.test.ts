import { describe, expect, it } from 'vitest';

import { MAX_PROMPT_LENGTH, validateGenerateRequest } from '../lib/validation.js';

describe('validateGenerateRequest', () => {
  it('accepts a valid request and defaults count to 3', () => {
    expect(
      validateGenerateRequest({ prompt: '  a fox reading a book  ', style: 'watercolour' }),
    ).toEqual({
      ok: true,
      value: { prompt: 'a fox reading a book', style: 'watercolour', count: 3 },
    });
  });

  it('treats missing, null or empty style as no style', () => {
    for (const style of [undefined, null, '']) {
      const result = validateGenerateRequest({ prompt: 'a fox', style });
      expect(result).toEqual({ ok: true, value: { prompt: 'a fox', style: undefined, count: 3 } });
    }
  });

  it('accepts a prompt of exactly the maximum length', () => {
    expect(validateGenerateRequest({ prompt: 'a'.repeat(MAX_PROMPT_LENGTH) }).ok).toBe(true);
  });

  it.each([
    ['a non-object body', 'hello'],
    ['an array body', []],
    ['null', null],
    ['a missing prompt', {}],
    ['a blank prompt', { prompt: '   ' }],
    ['a non-string prompt', { prompt: 42 }],
    ['a too-long prompt', { prompt: 'a'.repeat(MAX_PROMPT_LENGTH + 1) }],
    ['an unknown style', { prompt: 'a fox', style: 'photorealistic' }],
    ['a non-string style', { prompt: 'a fox', style: 3 }],
    ['count 0', { prompt: 'a fox', count: 0 }],
    ['count 4', { prompt: 'a fox', count: 4 }],
    ['a fractional count', { prompt: 'a fox', count: 1.5 }],
    ['a string count', { prompt: 'a fox', count: '3' }],
  ])('rejects %s', (_label, body) => {
    expect(validateGenerateRequest(body).ok).toBe(false);
  });
});
