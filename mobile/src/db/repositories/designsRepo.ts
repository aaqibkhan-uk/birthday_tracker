import type { CardDesign } from '../../domain/models';
import { expectOneRow, nowIso, type Db } from '../database';

interface CardDesignRow {
  id: number;
  card_id: number;
  generation_round: number;
  prompt_used: string;
  image_path: string;
  is_selected: number;
  created_at: string;
}

function toDesign(row: CardDesignRow): CardDesign {
  return {
    id: row.id,
    cardId: row.card_id,
    generationRound: row.generation_round,
    promptUsed: row.prompt_used,
    imagePath: row.image_path,
    isSelected: row.is_selected === 1,
    createdAt: row.created_at,
  };
}

export function createDesignsRepo(db: Db) {
  async function listByCard(cardId: number): Promise<CardDesign[]> {
    const rows = await db.getAllAsync<CardDesignRow>(
      'SELECT * FROM card_designs WHERE card_id = ? ORDER BY generation_round, id',
      [cardId],
    );
    return rows.map(toDesign);
  }

  return {
    listByCard,

    /** Stores one generation round's images (already saved to disk). */
    async addRound(
      cardId: number,
      generationRound: number,
      promptUsed: string,
      imagePaths: readonly string[],
    ): Promise<CardDesign[]> {
      const now = nowIso();
      await db.withTransactionAsync(async () => {
        for (const imagePath of imagePaths) {
          await db.runAsync(
            `INSERT INTO card_designs (card_id, generation_round, prompt_used, image_path, created_at)
             VALUES (?, ?, ?, ?, ?)`,
            [cardId, generationRound, promptUsed, imagePath, now],
          );
        }
      });
      return (await listByCard(cardId)).filter((d) => d.generationRound === generationRound);
    },

    /**
     * Makes `designId` the card's only selected design. Like any change to the card, this puts an
     * approved card back to draft. Ordered cards are read-only, so this throws for them.
     */
    async select(cardId: number, designId: number): Promise<void> {
      await db.withTransactionAsync(async () => {
        expectOneRow(
          await db.runAsync(
            `UPDATE cards SET status = 'draft', updated_at = ? WHERE id = ? AND status != 'ordered'`,
            [nowIso(), cardId],
          ),
          `Select a design on card ${cardId}`,
        );
        await db.runAsync('UPDATE card_designs SET is_selected = 0 WHERE card_id = ?', [cardId]);
        const result = await db.runAsync(
          'UPDATE card_designs SET is_selected = 1 WHERE id = ? AND card_id = ?',
          [designId, cardId],
        );
        expectOneRow(result, `Select design ${designId} on card ${cardId}`);
      });
    },

    async getSelected(cardId: number): Promise<CardDesign | null> {
      const row = await db.getFirstAsync<CardDesignRow>(
        'SELECT * FROM card_designs WHERE card_id = ? AND is_selected = 1',
        [cardId],
      );
      return row ? toDesign(row) : null;
    },

    /** Removes unselected designs (FR-4.11). Returns the image files the caller should delete. */
    async deleteUnselected(cardId: number): Promise<{ deletedImagePaths: string[] }> {
      let deletedImagePaths: string[] = [];
      await db.withTransactionAsync(async () => {
        const rows = await db.getAllAsync<{ image_path: string }>(
          'SELECT image_path FROM card_designs WHERE card_id = ? AND is_selected = 0',
          [cardId],
        );
        deletedImagePaths = rows.map((row) => row.image_path);
        await db.runAsync('DELETE FROM card_designs WHERE card_id = ? AND is_selected = 0', [
          cardId,
        ]);
      });
      return { deletedImagePaths };
    },
  };
}

export type DesignsRepo = ReturnType<typeof createDesignsRepo>;
