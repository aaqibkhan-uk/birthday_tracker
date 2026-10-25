import { useCallback } from 'react';
import type { CardContent } from '../domain/models';
import { useFocusedQuery } from './useFocusedQuery';
import { useRepos } from './useRepos';

/**
 * A card with its designs, reloaded on focus. `saveContent` writes each change straight to
 * SQLite (FR-4.10: auto-save, so leaving the flow or the app being killed loses nothing) and
 * updates the local copy immediately so typing stays responsive.
 */
export function useCardDraft(cardId: number) {
  const { cardsRepo, designsRepo } = useRepos();
  const load = useCallback(async () => {
    const card = await cardsRepo.getById(cardId);
    const designs = card ? await designsRepo.listByCard(cardId) : [];
    return { card, designs };
  }, [cardsRepo, designsRepo, cardId]);
  const query = useFocusedQuery(load);
  const { setData } = query;

  const saveContent = useCallback(
    (patch: Partial<CardContent>) => {
      setData((prev) => (prev?.card ? { ...prev, card: { ...prev.card, ...patch } } : prev));
      cardsRepo.updateContent(cardId, patch).catch((error: unknown) => {
        console.warn('Auto-save failed', error);
      });
    },
    [cardsRepo, cardId, setData],
  );

  return { ...query, saveContent };
}
