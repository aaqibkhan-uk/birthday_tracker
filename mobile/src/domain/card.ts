// Pure card-flow rules (FR-4.x). No React or Expo imports.
import { ART_PROMPT_MAX_LENGTH, GENERATION_ROUNDS_PER_CARD } from '../config';
import type { Card } from './models';

// Must match backend/lib/validation.ts STYLES (the backend rejects anything else).
export const CARD_STYLES = ['watercolour', 'cartoon', 'minimalist', 'vintage', 'playful'] as const;
export type CardStyle = (typeof CARD_STYLES)[number];

export function isCardStyle(value: string | null): value is CardStyle {
  return value !== null && (CARD_STYLES as readonly string[]).includes(value);
}

export function getRemainingGenerations(card: Pick<Card, 'generationsUsed'>): number {
  return Math.max(0, GENERATION_ROUNDS_PER_CARD - card.generationsUsed);
}

/** Null if the prompt can be sent, otherwise a message for the user. */
export function validateArtPrompt(prompt: string | null): string | null {
  const trimmed = (prompt ?? '').trim();
  if (trimmed === '') return 'Describe the picture you would like on the front.';
  if (trimmed.length > ART_PROMPT_MAX_LENGTH)
    return `Keep the description under ${ART_PROMPT_MAX_LENGTH} characters.`;
  return null;
}

export type CardStep = 'describe' | 'designs' | 'message';

/** Where "Resume card" lands (FR-4.1): the furthest step the draft has reached. */
export function getResumeStep(hasDesigns: boolean, hasSelectedDesign: boolean): CardStep {
  if (hasSelectedDesign) return 'message';
  if (hasDesigns) return 'designs';
  return 'describe';
}
