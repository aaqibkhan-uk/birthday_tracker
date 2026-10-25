// TESTS ONLY: never import from app code (better-sqlite3 is a Node module and a dev dependency).
import Database from 'better-sqlite3';
import { initDatabase, type Db } from './database';

/** A fresh, migrated in-memory database implementing the same `Db` interface as expo-sqlite. */
export async function createTestDb(): Promise<Db> {
  const sqlite = new Database(':memory:');
  const db: Db = {
    execAsync: async (sql) => {
      sqlite.exec(sql);
    },
    runAsync: async (sql, params) => {
      const result = sqlite.prepare(sql).run(...params);
      return { lastInsertRowId: Number(result.lastInsertRowid), changes: result.changes };
    },
    getFirstAsync: async <T>(sql: string, params: unknown[]) =>
      (sqlite.prepare(sql).get(...params) as T | undefined) ?? null,
    getAllAsync: async <T>(sql: string, params: unknown[]) =>
      sqlite.prepare(sql).all(...params) as T[],
    withTransactionAsync: async (task) => {
      sqlite.exec('BEGIN');
      try {
        await task();
        sqlite.exec('COMMIT');
      } catch (error) {
        sqlite.exec('ROLLBACK');
        throw error;
      }
    },
  };
  await initDatabase(db);
  return db;
}
