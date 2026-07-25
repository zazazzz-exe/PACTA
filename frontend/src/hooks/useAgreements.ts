import { useCallback, useEffect, useState } from 'react';
import { getAllAgreements, type Agreement } from '../lib/contract';
import { friendlyError } from '../lib/errors';

// `enabled` (default true) gates the actual contract read. The Pact/escrow
// contract is testnet-only (see lib/networks.ts supportsPacts); callers pass
// `enabled: net.supportsPacts` so getAllAgreements (contract.ts) is never
// invoked while the connected wallet is on an unsupported/mainnet network.
export function useAgreements(publicKey?: string, enabled = true) {
  const [agreements, setAgreements] = useState<Agreement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!enabled) {
      setLoading(false);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const all = await getAllAgreements(publicKey);
      // newest first
      all.sort((a, b) => Number(b.id - a.id));
      setAgreements(all);
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setLoading(false);
    }
  }, [publicKey, enabled]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { agreements, loading, error, refresh };
}
