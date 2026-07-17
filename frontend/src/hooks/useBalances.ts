import { useCallback, useEffect, useState } from 'react';
import { adapter } from '../lib/adapters/StellarAdapter';
import { totalPhp as sumPhp } from '../lib/prices';
import type { AssetBalance } from '../lib/adapters/ChainAdapter';
import { friendlyError } from '../lib/errors';

export function useBalances(address: string | null) {
  const [balances, setBalances] = useState<AssetBalance[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!address) {
      setBalances([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setBalances(await adapter.getBalances(address));
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setLoading(false);
    }
  }, [address]);

  useEffect(() => {
    void load();
  }, [load]);

  return {
    balances,
    totalPhp: sumPhp(balances),
    loading,
    error,
    refetch: () => void load(),
  };
}
