import { migrate } from './migrations';

export type BindValue = string | number | null;

export interface RunResult {
  lastInsertRowId: number;
  changes: number;
}

/**
 * The subset of expo-sqlite's async `SQLiteDatabase` that repositories use. Repositories depend
 * on this, not on expo-sqlite, so tests can run them against an in-memory better-sqlite3 database.
 */
export interface Db {
  execAsync(sql: string): Promise<void>;
  runAsync(sql: string, params: BindValue[]): Promise<RunResult>;
  getFirstAsync<T>(sql: string, params: BindValue[]): Promise<T | null>;
  getAllAsync<T>(sql: string, params: BindValue[]): Promise<T[]>;
  withTransactionAsync(task: () => Promise<void>): Promise<void>;
}

export const DATABASE_NAME = 'birthday-cards.db';

/** Runs once per connection, before any screen reads data (SQLiteProvider `onInit`). */
export async function initDatabase(db: Db): Promise<void> {
  // Foreign keys are off by default in SQLite and must be enabled on every connection.
  await db.execAsync('PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL;');
  await migrate(db);
}

export const nowIso = (): string => new Date().toISOString();

/** Throws if a write that must hit exactly one row did not. */
export function expectOneRow(result: RunResult, what: string): void {
  if (result.changes !== 1)
    throw new Error(`${what}: expected 1 row changed, got ${result.changes}`);
}
