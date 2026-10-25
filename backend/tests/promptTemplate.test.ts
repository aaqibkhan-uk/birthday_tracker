import { describe, expect, it } from 'vitest';

import { buildCardPrompt } from '../lib/promptTemplate.js';
import { STYLES } from '../lib/validation.js';

describe('buildCardPrompt', () => {
  it('wraps the subject in the card template', () => {
    const prompt = buildCardPrompt('a fox reading a book', 'watercolour');
    expect(prompt).toMatch(/^Greeting card front illustration, portrait orientation\./);
    expect(prompt).toContain('Subject: a fox reading a book, placed in the lower two thirds');
    expect(prompt).toContain('watercolour');
    expect(prompt).toContain('Suitable for all ages.');
  });

  it('addresses the spike findings: blank objects and an empty top third', () => {
    const prompt = buildCardPrompt('a fox reading a book');
    expect(prompt).toContain('No text, letters, numbers, words');
    expect(prompt).toContain('books, signs, labels and banners are completely blank');
    expect(prompt).toContain('The top third is calm, open background');
  });

  it('has a phrase for every style and a default without one', () => {
    const prompts = STYLES.map((style) => buildCardPrompt('a cat', style));
    expect(new Set(prompts).size).toBe(STYLES.length);
    expect(buildCardPrompt('a cat')).toContain('Style: warm, friendly illustration.');
  });
});
