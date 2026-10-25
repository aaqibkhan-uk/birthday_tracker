// One generation round for a card: call the backend, save the images, record them (FR-4.4–4.6).
import { API_URL, DESIGNS_PER_ROUND, GENERATION_TIMEOUT_MS } from '../config';
import { getRemainingGenerations, isCardStyle, validateArtPrompt } from '../domain/card';
import type { Repos } from '../db/repositories';
import { deleteImages, saveDesignImage } from './fileStorage';
import { generateImages, type GenerationFailure } from './imageApi';

export type RoundResult =
  { ok: true } | { ok: false; failure: GenerationFailure | 'cap_reached'; message: string };

/**
 * Only a fully saved round counts toward the cap: the counter is incremented after the images
 * are on disk and in the database, so failures and rejections are free (FR-4.4, FR-4.7).
 */
export async function generateRound(
  { cardsRepo, designsRepo }: Pick<Repos, 'cardsRepo' | 'designsRepo'>,
  cardId: number,
): Promise<RoundResult> {
  // Read the card fresh so the cap check and round number never use a stale copy.
  const card = await cardsRepo.getById(cardId);
  if (!card) return { ok: false, failure: 'unexpected', message: 'This card no longer exists.' };
  if (getRemainingGenerations(card) === 0) {
    return {
      ok: false,
      failure: 'cap_reached',
      message: "You've used all the designs for this card.",
    };
  }
  const promptError = validateArtPrompt(card.artPrompt);
  const prompt = (card.artPrompt ?? '').trim();
  if (promptError) return { ok: false, failure: 'invalid_request', message: promptError };

  const result = await generateImages(prompt, isCardStyle(card.style) ? card.style : null, {
    apiUrl: API_URL,
    timeoutMs: GENERATION_TIMEOUT_MS,
    count: DESIGNS_PER_ROUND,
  });
  if (!result.ok) return result;

  const round = card.generationsUsed + 1;
  const paths: string[] = [];
  try {
    result.images.forEach((image, index) => {
      paths.push(saveDesignImage(card.id, round, index, image));
    });
    await designsRepo.addRound(card.id, round, prompt, paths);
    await cardsRepo.incrementGenerationsUsed(card.id);
  } catch (error) {
    deleteImages(paths);
    console.warn('Saving designs failed', error);
    return {
      ok: false,
      failure: 'unexpected',
      message: 'Could not save the designs. Please try again.',
    };
  }
  return { ok: true };
}
