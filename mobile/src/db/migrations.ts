import type { Db } from './database';

/**
 * Append-only list of migrations. Migration N (1-based) brings the database to
 * `PRAGMA user_version = N`. Never edit a migration that has shipped; add a new one.
 */
export const MIGRATIONS: readonly string[] = [
  // 1: initial schema (CLAUDE.md §9)
  `
  CREATE TABLE friends (
    id                    INTEGER PRIMARY KEY AUTOINCREMENT,
    name                  TEXT NOT NULL,
    birth_day             INTEGER NOT NULL CHECK (birth_day BETWEEN 1 AND 31),
    birth_month           INTEGER NOT NULL CHECK (birth_month BETWEEN 1 AND 12),
    birth_year            INTEGER,
    address_line1         TEXT,
    address_line2         TEXT,
    city                  TEXT,
    postcode              TEXT,
    reminder_offset_days  INTEGER NOT NULL DEFAULT 7 CHECK (reminder_offset_days IN (0, 1, 7, 14)),
    created_at            TEXT NOT NULL,
    updated_at            TEXT NOT NULL
  );

  CREATE TABLE cards (
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    friend_id         INTEGER REFERENCES friends(id) ON DELETE SET NULL,
    status            TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'ordered')),
    art_prompt        TEXT,
    style             TEXT,
    front_text        TEXT,
    inside_message    TEXT,
    generations_used  INTEGER NOT NULL DEFAULT 0,
    created_at        TEXT NOT NULL,
    updated_at        TEXT NOT NULL
  );
  CREATE INDEX idx_cards_friend_id ON cards(friend_id);

  CREATE TABLE card_designs (
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    card_id           INTEGER NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
    generation_round  INTEGER NOT NULL,
    prompt_used       TEXT NOT NULL,
    image_path        TEXT NOT NULL,
    is_selected       INTEGER NOT NULL DEFAULT 0 CHECK (is_selected IN (0, 1)),
    created_at        TEXT NOT NULL
  );
  CREATE INDEX idx_card_designs_card_id ON card_designs(card_id);

  CREATE TABLE orders (
    id                       INTEGER PRIMARY KEY AUTOINCREMENT,
    card_id                  INTEGER NOT NULL UNIQUE REFERENCES cards(id),
    destination_type         TEXT NOT NULL CHECK (destination_type IN ('friend', 'self')),
    recipient_name           TEXT NOT NULL,
    address_line1            TEXT NOT NULL,
    address_line2            TEXT,
    city                     TEXT NOT NULL,
    postcode                 TEXT NOT NULL,
    image_path               TEXT NOT NULL,
    front_text               TEXT,
    inside_message           TEXT NOT NULL,
    confirmation_email       TEXT NOT NULL,
    price_pence              INTEGER NOT NULL,
    estimated_delivery_date  TEXT NOT NULL,
    status                   TEXT NOT NULL DEFAULT 'confirmed',
    created_at               TEXT NOT NULL
  );

  CREATE TABLE user_profile (
    id                      INTEGER PRIMARY KEY CHECK (id = 1),
    name                    TEXT,
    email                   TEXT,
    address_line1           TEXT,
    address_line2           TEXT,
    city                    TEXT,
    postcode                TEXT,
    notifications_prompted  INTEGER NOT NULL DEFAULT 0
  );
  INSERT INTO user_profile (id) VALUES (1);
  `,
];

export async function getSchemaVersion(db: Db): Promise<number> {
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version', []);
  return row?.user_version ?? 0;
}

/** Applies each pending migration in its own transaction, bumping user_version with it. */
export async function migrate(db: Db, migrations: readonly string[] = MIGRATIONS): Promise<void> {
  const current = await getSchemaVersion(db);
  if (current > migrations.length) {
    throw new Error(`Database version ${current} is newer than this app (${migrations.length}).`);
  }
  for (let version = current + 1; version <= migrations.length; version++) {
    const sql = migrations[version - 1];
    await db.withTransactionAsync(async () => {
      await db.execAsync(sql);
      await db.execAsync(`PRAGMA user_version = ${version}`);
    });
  }
}
