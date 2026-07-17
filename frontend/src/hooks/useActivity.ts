import { useCallback, useEffect, useState } from 'react';
import { adapter } from '../lib/adapters/StellarAdapter';
import type { ActivityItem } from '../lib/activity';
import { friendlyError } from '../lib/errors';

export function useActivity(address: string | null) {
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (isStale?: () => boolean) => {
    if (!address) {
      setItems([]);
      setError(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await adapter.getActivity(address);
      if (!isStale?.()) setItems(result);
    } catch (e) {
      if (!isStale?.()) setError(friendlyError(e));
    } finally {
      if (!isStale?.()) setLoading(false);
    }
  }, [address]);

  useEffect(() => {
    let ignore = false;
    void load(() => ignore);
    return () => {
      ignore = true;
    };
  }, [load]);

  return { items, loading, error, refetch: () => void load() };
}
