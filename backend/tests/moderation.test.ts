import { describe, expect, it } from 'vitest';

import { moderatePrompt, normalise } from '../lib/moderation.js';

describe('moderatePrompt', () => {
  it.each([
    ['a naked person', 'sexual'],
    ['a SEXY cat', 'sexual'],
    ['a fox covered in blood', 'violence'],
    ['two dogs with guns', 'violence'],
    ['a swastika flag', 'hate'],
    ['Taylor Swift singing', 'realPeople'],
    ['Beyoncé on stage', 'realPeople'],
    ['a Disney castle', 'brands'],
    ['Coca-Cola bottles', 'brands'],
    ['Spider-Man on a cake', 'characters'],
    ['peppa   pig, jumping', 'characters'],
    ['minions dancing', 'characters'],
  ])('blocks %j (%s)', (prompt, category) => {
    expect(moderatePrompt(prompt)).toEqual({ ok: false, category });
  });

  it.each([
    'a fox reading a book under a tree',
    'a bunch of grapes on a table',
    'a postcard from Scunthorpe',
    'a frozen lake at sunset',
    'an explosion of colourful flowers',
    'a skilled baker with a cake',
    'a gunnera plant in the garden',
    'a musk ox in the snow',
  ])('allows %j', (prompt) => {
    expect(moderatePrompt(prompt)).toEqual({ ok: true });
  });
});

describe('normalise', () => {
  it('lowercases, strips accents and punctuation', () => {
    expect(normalise("  Pokémon's  Pikachu!! ")).toBe('pokemons pikachu');
  });
});
