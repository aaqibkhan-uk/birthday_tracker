// Keyword blocklist checked before generation (FR-4.7). The providers' own safety filters are the
// second line of defence. Matching is on whole words, ignoring case and accents, so innocent words
// that merely contain a blocked one ("grape", "Scunthorpe") pass.

// Each entry is a word or phrase in normalised form (lowercase, letters/digits, single spaces).
// A trailing "s" (plural) is also matched.
// prettier-ignore
const BLOCKLIST = {
  sexual: [
    'sex', 'sexy', 'nude', 'nudity', 'naked', 'porn', 'porno', 'pornographic', 'nsfw', 'erotic',
    'xxx', 'boob', 'boobs', 'breast', 'nipple', 'genital', 'penis', 'vagina', 'lingerie',
    'topless', 'bikini', 'fetish', 'horny', 'orgasm', 'stripper', 'seductive', 'rape',
  ],
  violence: [
    'kill', 'killing', 'killed', 'murder', 'blood', 'bloody', 'gore', 'gory', 'corpse',
    'dead body', 'decapitated', 'beheaded', 'torture', 'gun', 'rifle', 'pistol', 'shotgun',
    'weapon', 'bomb', 'suicide', 'self harm', 'stab', 'stabbing', 'massacre',
    'terrorist', 'war crime',
  ],
  hate: [
    'nazi', 'swastika', 'kkk', 'white power', 'hitler', 'genocide', 'nigger', 'nigga',
    'faggot', 'retard', 'kike', 'chink', 'spic', 'tranny',
  ],
  // Real people: a starter list of the names most likely to be tried. Not exhaustive.
  realPeople: [
    'trump', 'biden', 'obama', 'putin', 'elon musk', 'taylor swift', 'beyonce',
    'king charles', 'queen elizabeth', 'prince harry', 'prince william', 'kim kardashian',
    'harry styles', 'ed sheeran', 'adele', 'rihanna', 'messi', 'ronaldo',
    'keir starmer', 'rishi sunak', 'boris johnson', 'oprah', 'mr beast', 'mrbeast',
  ],
  brands: [
    'disney', 'pixar', 'marvel', 'dc comics', 'dreamworks', 'nintendo', 'pokemon', 'lego',
    'barbie', 'nike', 'adidas', 'coca cola', 'pepsi', 'mcdonalds', 'starbucks', 'apple logo',
    'google', 'tesla', 'ferrari', 'gucci', 'louis vuitton', 'hello kitty', 'sanrio',
  ],
  characters: [
    'mickey mouse', 'minnie mouse', 'donald duck', 'winnie the pooh', 'spiderman',
    'spider man', 'batman', 'superman', 'wonder woman', 'iron man', 'hulk', 'harry potter',
    'hogwarts', 'elsa', 'olaf', 'simba', 'pikachu', 'mario', 'luigi', 'sonic',
    'peppa pig', 'bluey', 'paw patrol', 'shrek', 'minion', 'minions', 'spongebob', 'yoda',
    'darth vader', 'star wars', 'gandalf', 'gruffalo', 'paddington', 'snoopy', 'garfield',
    'barney', 'teletubbies', 'thomas the tank engine', 'moana', 'buzz lightyear',
  ],
} as const satisfies Record<string, readonly string[]>;

export type BlockCategory = keyof typeof BLOCKLIST;

export type ModerationResult = { ok: true } | { ok: false; category: BlockCategory };

/** Lowercase, strip accents, turn everything that isn't a letter or digit into single spaces. */
export function normalise(text: string): string {
  return text
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[’']/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export function moderatePrompt(prompt: string): ModerationResult {
  const padded = ` ${normalise(prompt)} `;
  for (const [category, terms] of Object.entries(BLOCKLIST)) {
    if (
      (terms as readonly string[]).some(
        (term) => padded.includes(` ${term} `) || padded.includes(` ${term}s `),
      )
    ) {
      return { ok: false, category: category as BlockCategory };
    }
  }
  return { ok: true };
}
