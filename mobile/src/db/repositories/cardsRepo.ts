import type { Card, CardContent, CardStatus } from '../../domain/models';
import { expectOneRow, nowIso, type Db } from '../database';

interface CardRow {
  id: number;
  friend_id: number | null;
  status: CardStatus;
  art_prompt: string | null;
  style: string | null;
  front_text: string | null;
  inside_message: string | null;
  generations_used: number;
  created_at: string;
  updated_at: string;
}

function toCard(row: CardRow): Card {
  return {
    id: row.id,
    friendId: row.friend_id,
    status: row.status,
    artPrompt: row.art_prompt,
    style: row.style,
    frontText: row.front_text,
    insideMessage: row.inside_message,
    generationsUsed: row.generations_used,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const CONTENT_COLUMNS: Record<keyof CardContent, string> = {
  artPrompt: 'art_prompt',
  style: 'style',
  frontText: 'front_text',
  insideMessage: 'inside_message',
};

export function createCardsRepo(db: Db) {
  async function getById(id: number): Promise<Card | null> {
    const row = await db.getFirstAsync<CardRow>('SELECT * FROM cards WHERE id = ?', [id]);
    return row ? toCard(row) : null;
  }

  async function getByIdOrThrow(id: number): Promise<Card> {
    const card = await getById(id);
    if (!card) throw new Error(`Card ${id} not found`);
    return card;
  }

  return {
    getById,

    async create(friendId: number): Promise<Card> {
      const now = nowIso();
      const result = await db.runAsync(
        'INSERT INTO cards (friend_id, created_at, updated_at) VALUES (?, ?, ?)',
        [friendId, now, now],
      );
      return getByIdOrThrow(result.lastInsertRowId);
    },

    /** The friend's most recent card that is not yet ordered (drives "Resume card", FR-4.1). */
    async getActiveForFriend(friendId: number): Promise<Card | null> {
      const row = await db.getFirstAsync<CardRow>(
        `SELECT * FROM cards WHERE friend_id = ? AND status IN ('draft', 'approved')
         ORDER BY updated_at DESC, id DESC LIMIT 1`,
        [friendId],
      );
      return row ? toCard(row) : null;
    },

    /** Saves draft content. Ordered cards are read-only (FR-6.6), so updating one throws. */
    async updateContent(id: number, patch: Partial<CardContent>): Promise<Card> {
      const keys = (Object.keys(patch) as (keyof CardContent)[]).filter(
        (key) => key in CONTENT_COLUMNS,
      );
      const sets = keys.map((key) => `${CONTENT_COLUMNS[key]} = ?`);
      const result = await db.runAsync(
        `UPDATE cards SET ${[...sets, 'updated_at = ?'].join(', ')}
         WHERE id = ? AND status != 'ordered'`,
        [...keys.map((key) => patch[key] ?? null), nowIso(), id],
      );
      expectOneRow(result, `Update card ${id}`);
      return getByIdOrThrow(id);
    },

    /** Moves a card between draft and approved. Use ordersRepo.create to mark it ordered. */
    async setStatus(id: number, status: Exclude<CardStatus, 'ordered'>): Promise<Card> {
      const result = await db.runAsync(
        `UPDATE cards SET status = ?, updated_at = ? WHERE id = ? AND status != 'ordered'`,
        [status, nowIso(), id],
      );
      expectOneRow(result, `Set status of card ${id}`);
      return getByIdOrThrow(id);
    },

    async incrementGenerationsUsed(id: number): Promise<Card> {
      const result = await db.runAsync(
        `UPDATE cards SET generations_used = generations_used + 1, updated_at = ?
         WHERE id = ? AND status != 'ordered'`,
        [nowIso(), id],
      );
      expectOneRow(result, `Count generation for card ${id}`);
      return getByIdOrThrow(id);
    },

    /** Deletes a card that is not ordered. Returns the image files the caller should delete. */
    async delete(id: number): Promise<{ deletedImagePaths: string[] }> {
      let deletedImagePaths: string[] = [];
      await db.withTransactionAsync(async () => {
        const rows = await db.getAllAsync<{ image_path: string }>(
          'SELECT image_path FROM card_designs WHERE card_id = ?',
          [id],
        );
        deletedImagePaths = rows.map((row) => row.image_path);
        const result = await db.runAsync(`DELETE FROM cards WHERE id = ? AND status != 'ordered'`, [
          id,
        ]);
        expectOneRow(result, `Delete card ${id}`);
      });
      return { deletedImagePaths };
    },
  };
}

export type CardsRepo = ReturnType<typeof createCardsRepo>;
