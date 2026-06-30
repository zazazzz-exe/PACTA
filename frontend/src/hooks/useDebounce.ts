import { useEffect, useState } from 'react';

// Returns `value` after it has stopped changing for `delay` ms. Used to avoid
// firing the Risk Lens on every keystroke in the create form (spec §8 note).
export function useDebounce<T>(value: T, delay = 600): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}
