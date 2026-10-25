import { GENERATION_ROUNDS_PER_CARD } from '../config';
import { createRepos, type Repos } from '../db/repositories';
import { createTestDb } from '../db/testDb';
import { generateRound } from './designGeneration';
import { deleteImages, saveDesignImage } from './fileStorage';
import { generateImages } from './imageApi';

jest.mock('./fileStorage', () => ({
  saveDesignImage: jest.fn(
    async (cardId: number, round: number, index: number) =>
      `designs/card-${cardId}/r${round}-${index}.png`,
  ),
  deleteImages: jest.fn(),
}));
jest.mock('./imageApi', () => ({
  ...jest.requireActual('./imageApi'),
  generateImages: jest.fn(),
}));

const mockGenerate = generateImages as jest.MockedFunction<typeof generateImages>;
const png = { base64: 'iVBORw0KGgo=', mimeType: 'image/png' as const };

let repos: Repos;
let cardId: number;

beforeEach(async () => {
  jest.clearAllMocks();
  repos = createRepos(await createTestDb());
  const friend = await repos.friendsRepo.create({
    name: 'Sam',
    birthDay: 3,
    birthMonth: 1,
    birthYear: null,
    addressLine1: null,
    addressLine2: null,
    city: null,
    postcode: null,
    reminderOffsetDays: 7,
  });
  cardId = (await repos.cardsRepo.create(friend.id)).id;
  await repos.cardsRepo.updateContent(cardId, { artPrompt: '  a fox  ', style: 'watercolour' });
});

describe('generateRound', () => {
  it('saves 3 designs and counts the round', async () => {
    mockGenerate.mockResolvedValue({ ok: true, images: [png, png, png] });

    expect(await generateRound(repos, cardId)).toEqual({ ok: true });

    expect(mockGenerate).toHaveBeenCalledWith('a fox', 'watercolour', expect.any(Object));
    const designs = await repos.designsRepo.listByCard(cardId);
    expect(designs.map((d) => [d.generationRound, d.imagePath, d.promptUsed])).toEqual([
      [1, `designs/card-${cardId}/r1-0.png`, 'a fox'],
      [1, `designs/card-${cardId}/r1-1.png`, 'a fox'],
      [1, `designs/card-${cardId}/r1-2.png`, 'a fox'],
    ]);
    expect((await repos.cardsRepo.getById(cardId))?.generationsUsed).toBe(1);
  });

  it.each(['timeout', 'rejected', 'provider', 'network'] as const)(
    'does not count a %s failure',
    async (failure) => {
      mockGenerate.mockResolvedValue({ ok: false, failure, message: 'x' });
      expect(await generateRound(repos, cardId)).toMatchObject({ ok: false, failure });
      expect((await repos.cardsRepo.getById(cardId))?.generationsUsed).toBe(0);
      expect(saveDesignImage).not.toHaveBeenCalled();
    },
  );

  it('stops at the per-card cap without calling the backend', async () => {
    mockGenerate.mockResolvedValue({ ok: true, images: [png, png, png] });
    for (let i = 0; i < GENERATION_ROUNDS_PER_CARD; i++) {
      expect(await generateRound(repos, cardId)).toEqual({ ok: true });
    }
    mockGenerate.mockClear();

    expect(await generateRound(repos, cardId)).toMatchObject({ failure: 'cap_reached' });
    expect(mockGenerate).not.toHaveBeenCalled();
    const rounds = (await repos.designsRepo.listByCard(cardId)).map((d) => d.generationRound);
    expect([...new Set(rounds)]).toEqual([1, 2, 3]);
  });

  it('rejects an empty description without calling the backend', async () => {
    await repos.cardsRepo.updateContent(cardId, { artPrompt: '   ' });
    expect(await generateRound(repos, cardId)).toMatchObject({ failure: 'invalid_request' });
    expect(mockGenerate).not.toHaveBeenCalled();
  });

  it('cleans up written files and does not count the round if saving fails', async () => {
    mockGenerate.mockResolvedValue({ ok: true, images: [png, png, png] });
    jest.spyOn(repos.designsRepo, 'addRound').mockRejectedValueOnce(new Error('disk full'));
    jest.spyOn(console, 'warn').mockImplementation(() => {});

    expect(await generateRound(repos, cardId)).toMatchObject({ failure: 'unexpected' });
    expect(deleteImages).toHaveBeenCalledWith([
      `designs/card-${cardId}/r1-0.png`,
      `designs/card-${cardId}/r1-1.png`,
      `designs/card-${cardId}/r1-2.png`,
    ]);
    expect((await repos.cardsRepo.getById(cardId))?.generationsUsed).toBe(0);
  });
});
