import { useCallback, useState } from 'react';

// A per-device UI preference in localStorage (hidden balance, display currency,
// dismissed tips). Never for secrets or anything that must persist reliably:
// if storage is blocked it silently lasts for this page only.
export function useStoredState<T extends string | boolean>(key: string, initial: T): [T, (v: T) => void] {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = window.localStorage.getItem(key);
      if (raw === null) return initial;
      if (typeof initial === 'boolean') return (raw === 'true') as T;
      return raw as T;
    } catch {
      return initial;
    }
  });
  const set = useCallback(
    (v: T) => {
      setValue(v);
      try {
        window.localStorage.setItem(key, String(v));
      } catch {
        /* storage blocked */
      }
    },
    [key],
  );
  return [value, set];
}
