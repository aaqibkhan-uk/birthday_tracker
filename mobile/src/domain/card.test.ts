import { GENERATION_ROUNDS_PER_CARD } from '../config';
import { getRemainingGenerations, getResumeStep, isCardStyle, validateArtPrompt } from './card';

describe('getRemainingGenerations', () => {
  it('counts down from the per-card cap and never goes negative', () => {
    expect(getRemainingGenerations({ generationsUsed: 0 })).toBe(GENERATION_ROUNDS_PER_CARD);
    expect(getRemainingGenerations({ generationsUsed: 1 })).toBe(GENERATION_ROUNDS_PER_CARD - 1);
    expect(getRemainingGenerations({ generationsUsed: 99 })).toBe(0);
  });
});

describe('validateArtPrompt', () => {
  it('requires a description', () => {
    expect(validateArtPrompt(null)).toMatch(/Describe/);
    expect(validateArtPrompt('   ')).toMatch(/Describe/);
  });

  it('accepts up to 300 characters', () => {
    expect(validateArtPrompt('a'.repeat(300))).toBeNull();
    expect(validateArtPrompt('a'.repeat(301))).toMatch(/300/);
  });
});

describe('getResumeStep', () => {
  it('resumes at the furthest step reached', () => {
    expect(getResumeStep(false, false)).toBe('describe');
    expect(getResumeStep(true, false)).toBe('designs');
    expect(getResumeStep(true, true)).toBe('message');
  });

  it('resumes an approved card at the preview', () => {
    expect(getResumeStep(true, true, true)).toBe('preview');
    expect(getResumeStep(true, false, true)).toBe('designs');
  });
});

describe('isCardStyle', () => {
  it('accepts only the backend allowlist', () => {
    expect(isCardStyle('watercolour')).toBe(true);
    expect(isCardStyle('oil painting')).toBe(false);
    expect(isCardStyle(null)).toBe(false);
  });
});
