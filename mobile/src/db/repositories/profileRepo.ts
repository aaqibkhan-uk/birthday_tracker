import type { UserProfile } from '../../domain/models';
import type { Db } from '../database';

interface ProfileRow {
  name: string | null;
  email: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  postcode: string | null;
  notifications_prompted: number;
}

type ProfileDetails = Omit<UserProfile, 'notificationsPrompted'>;

const DETAIL_COLUMNS: Record<keyof ProfileDetails, string> = {
  name: 'name',
  email: 'email',
  addressLine1: 'address_line1',
  addressLine2: 'address_line2',
  city: 'city',
  postcode: 'postcode',
};

/** The single-row user profile. Migration 1 creates the row, so it always exists. */
export function createProfileRepo(db: Db) {
  async function get(): Promise<UserProfile> {
    const row = await db.getFirstAsync<ProfileRow>('SELECT * FROM user_profile WHERE id = 1', []);
    if (!row) throw new Error('user_profile row is missing');
    return {
      name: row.name,
      email: row.email,
      addressLine1: row.address_line1,
      addressLine2: row.address_line2,
      city: row.city,
      postcode: row.postcode,
      notificationsPrompted: row.notifications_prompted === 1,
    };
  }

  return {
    get,

    async update(patch: Partial<ProfileDetails>): Promise<UserProfile> {
      const keys = (Object.keys(patch) as (keyof ProfileDetails)[]).filter(
        (key) => key in DETAIL_COLUMNS,
      );
      if (keys.length > 0) {
        await db.runAsync(
          `UPDATE user_profile SET ${keys.map((key) => `${DETAIL_COLUMNS[key]} = ?`).join(', ')}
           WHERE id = 1`,
          keys.map((key) => patch[key] ?? null),
        );
      }
      return get();
    },

    async setNotificationsPrompted(prompted: boolean): Promise<void> {
      await db.runAsync('UPDATE user_profile SET notifications_prompted = ? WHERE id = 1', [
        prompted ? 1 : 0,
      ]);
    },
  };
}

export type ProfileRepo = ReturnType<typeof createProfileRepo>;
