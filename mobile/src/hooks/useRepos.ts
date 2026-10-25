import { useSQLiteContext } from 'expo-sqlite';
import { useMemo } from 'react';
import { createRepos, type Repos } from '../db/repositories';

/** Repositories bound to the app's database connection (from SQLiteProvider in the root layout). */
export function useRepos(): Repos {
  const db = useSQLiteContext();
  return useMemo(() => createRepos(db), [db]);
}
