import { useCallback, useEffect, useState } from 'react';

// A per-device UI preference in localStorage (hidden balance, display currency,
// dismissed tips). Never for secrets or anything that must persist reliably:
// if storage is blocked it silently lasts for this page only. Every mounted
// hook with the same key stays in sync, so a choice made on one screen shows
// everywhere at once.
const EVENT = 'pacta:stored-state';

function read<T extends string | boolean>(key: string, initial: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    if (raw === null) return initial;
    if (typeof initial === 'boolean') return (raw === 'true') as T;
    return raw as T;
  } catch {
    return initial;
  }
}

export function useStoredState<T extends string | boolean>(key: string, initial: T): [T, (v: T) => void] {
  const [value, setValue] = useState<T>(() => read(key, initial));

  useEffect(() => {
    const onChange = (e: Event) => {
      const d = (e as CustomEvent<{ key: string; value: T }>).detail;
      if (d && d.key === key) setValue(d.value);
    };
    window.addEventListener(EVENT, onChange);
    return () => window.removeEventListener(EVENT, onChange);
  }, [key]);

  const set = useCallback(
    (v: T) => {
      setValue(v);
      try {
        window.localStorage.setItem(key, String(v));
      } catch {
        /* storage blocked */
      }
      window.dispatchEvent(new CustomEvent(EVENT, { detail: { key, value: v } }));
    },
    [key],
  );
  return [value, set];
}
