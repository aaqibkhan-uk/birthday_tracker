import {
  DEFAULT_REMINDER_OFFSET,
  isReminderOffset,
  type Friend,
  type FriendInput,
} from '../../domain/friend';
import { expectOneRow, nowIso, type Db } from '../database';

interface FriendRow {
  id: number;
  name: string;
  birth_day: number;
  birth_month: number;
  birth_year: number | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  postcode: string | null;
  reminder_offset_days: number;
  created_at: string;
  updated_at: string;
}

function toFriend(row: FriendRow): Friend {
  return {
    id: row.id,
    name: row.name,
    birthDay: row.birth_day,
    birthMonth: row.birth_month,
    birthYear: row.birth_year,
    addressLine1: row.address_line1,
    addressLine2: row.address_line2,
    city: row.city,
    postcode: row.postcode,
    // The CHECK constraint guarantees a valid offset; the fallback only satisfies the type.
    reminderOffsetDays: isReminderOffset(row.reminder_offset_days)
      ? row.reminder_offset_days
      : DEFAULT_REMINDER_OFFSET,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function inputParams(input: FriendInput) {
  return [
    input.name,
    input.birthDay,
    input.birthMonth,
    input.birthYear,
    input.addressLine1,
    input.addressLine2,
    input.city,
    input.postcode,
    input.reminderOffsetDays,
  ];
}

export function createFriendsRepo(db: Db) {
  async function getById(id: number): Promise<Friend | null> {
    const row = await db.getFirstAsync<FriendRow>('SELECT * FROM friends WHERE id = ?', [id]);
    return row ? toFriend(row) : null;
  }

  async function getByIdOrThrow(id: number): Promise<Friend> {
    const friend = await getById(id);
    if (!friend) throw new Error(`Friend ${id} not found`);
    return friend;
  }

  return {
    getById,

    async list(): Promise<Friend[]> {
      const rows = await db.getAllAsync<FriendRow>(
        'SELECT * FROM friends ORDER BY name COLLATE NOCASE, id',
        [],
      );
      return rows.map(toFriend);
    },

    async create(input: FriendInput): Promise<Friend> {
      const now = nowIso();
      const result = await db.runAsync(
        `INSERT INTO friends (name, birth_day, birth_month, birth_year, address_line1, address_line2,
           city, postcode, reminder_offset_days, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [...inputParams(input), now, now],
      );
      return getByIdOrThrow(result.lastInsertRowId);
    },

    async update(id: number, input: FriendInput): Promise<Friend> {
      const result = await db.runAsync(
        `UPDATE friends SET name = ?, birth_day = ?, birth_month = ?, birth_year = ?,
           address_line1 = ?, address_line2 = ?, city = ?, postcode = ?, reminder_offset_days = ?,
           updated_at = ?
         WHERE id = ?`,
        [...inputParams(input), nowIso(), id],
      );
      expectOneRow(result, `Update friend ${id}`);
      return getByIdOrThrow(id);
    },

    /**
     * Deletes the friend and their draft/approved cards (designs cascade). Ordered cards stay,
     * with friend_id set to NULL (CLAUDE.md §9). Returns the image files the caller should delete.
     */
    async delete(id: number): Promise<{ deletedImagePaths: string[] }> {
      let deletedImagePaths: string[] = [];
      await db.withTransactionAsync(async () => {
        const rows = await db.getAllAsync<{ image_path: string }>(
          `SELECT d.image_path FROM card_designs d JOIN cards c ON c.id = d.card_id
           WHERE c.friend_id = ? AND c.status IN ('draft', 'approved')`,
          [id],
        );
        deletedImagePaths = rows.map((row) => row.image_path);
        await db.runAsync(
          `DELETE FROM cards WHERE friend_id = ? AND status IN ('draft', 'approved')`,
          [id],
        );
        expectOneRow(
          await db.runAsync('DELETE FROM friends WHERE id = ?', [id]),
          `Delete friend ${id}`,
        );
      });
      return { deletedImagePaths };
    },
  };
}

export type FriendsRepo = ReturnType<typeof createFriendsRepo>;
