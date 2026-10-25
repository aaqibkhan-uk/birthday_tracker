import { useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';

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
export function useFocusedQuery<T>(load: () => Promise<T>): QueryState<T> & {
  reload: () => void;
} {
  const [state, setState] = useState<QueryState<T>>({
    data: undefined,
    loadedAt: new Date(),
    error: null,
  });
  // Only the latest request may update state, so a slow earlier load cannot overwrite it.
  const latest = useRef(0);

  const reload = useCallback(() => {
    const request = ++latest.current;
    load().then(
      (data) => request === latest.current && setState({ data, loadedAt: new Date(), error: null }),
      (error: unknown) =>
        request === latest.current &&
        setState((prev) => ({
          ...prev,
          error: error instanceof Error ? error : new Error(String(error)),
        })),
    );
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      reload();
      return () => {
        // Losing focus invalidates any load still in flight.
        latest.current++;
      };
    }, [reload]),
  );

  return { ...state, reload };
}
