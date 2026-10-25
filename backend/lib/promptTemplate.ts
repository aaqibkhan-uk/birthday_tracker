// Wraps the user's description in the card prompt template (CLAUDE.md §10).
// The Milestone 0 spike showed two problems this wording targets: pseudo-lettering on objects
// (book covers) and the subject filling the upper third, where the app draws the front text.
import type { Style } from './validation.js';

// Fixed phrases only: the style is never free text (see STYLES in validation.ts).
const STYLE_PHRASES: Readonly<Record<Style, string>> = {
  watercolour: 'soft watercolour painting, gentle washes of colour, visible paper texture',
  cartoon: 'bright, clean cartoon illustration with bold outlines',
  minimalist: 'minimalist flat illustration, a few simple shapes, limited palette',
  vintage: 'vintage storybook illustration, muted colours, slight print grain',
  playful: 'playful, colourful, whimsical illustration',
};

const DEFAULT_STYLE_PHRASE = 'warm, friendly illustration';

export function buildCardPrompt(subject: string, style?: Style): string {
  const stylePhrase = style ? STYLE_PHRASES[style] : DEFAULT_STYLE_PHRASE;
  return [
    'Greeting card front illustration, portrait orientation.',
    `Subject: ${subject}, placed in the lower two thirds of the picture.`,
    `Style: ${stylePhrase}.`,
    'The top third is calm, open background (plain sky or a soft wash of colour) with no objects in it.',
    'No text, letters, numbers, words, signatures or logos anywhere in the image;',
    'books, signs, labels and banners are completely blank.',
    'Suitable for all ages.',
  ].join(' ');
}
