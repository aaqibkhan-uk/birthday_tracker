import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

interface QueryState<T> {
  data: T | undefined;
  /** When the data was loaded; use it for date maths so a list and its "days until" agree. */
  loadedAt: Date;
  error: Error | null;
}

/**
 * Runs `load` every time the screen gains focus, so lists refresh after an add, edit or delete
 * on another screen. SQLite is the source of truth; there is no other cache.
 */
export function useFocusedQuery<T>(load: () => Promise<T>): QueryState<T> {
  const [state, setState] = useState<QueryState<T>>({
    data: undefined,
    loadedAt: new Date(),
    error: null,
  });

  useFocusEffect(
    useCallback(() => {
      let active = true;
      load().then(
        (data) => active && setState({ data, loadedAt: new Date(), error: null }),
        (error: unknown) =>
          active &&
          setState((prev) => ({
            ...prev,
            error: error instanceof Error ? error : new Error(String(error)),
          })),
      );
      return () => {
        active = false;
      };
    }, [load]),
  );

  return state;
}
