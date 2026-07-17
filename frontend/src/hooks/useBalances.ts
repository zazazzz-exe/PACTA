import { useCallback, useEffect, useState } from 'react';
import { adapter } from '../lib/adapters/StellarAdapter';
import { totalPhp as sumPhp } from '../lib/prices';
import type { AssetBalance } from '../lib/adapters/ChainAdapter';
import { friendlyError } from '../lib/errors';

export function useBalances(address: string | null) {
  const [balances, setBalances] = useState<AssetBalance[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (isStale?: () => boolean) => {
    if (!address) {
      setBalances([]);
      setError(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await adapter.getBalances(address);
      if (!isStale?.()) setBalances(result);
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

  return {
    balances,
    totalPhp: sumPhp(balances),
    loading,
    error,
    refetch: () => void load(),
  };
}
