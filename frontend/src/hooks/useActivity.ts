import { useCallback, useEffect, useRef, useState } from 'react';
import { adapter } from '../lib/adapters/StellarAdapter';
import type { ActivityItem } from '../lib/activity';
import { friendlyError } from '../lib/errors';
import { useActiveNetwork } from '../lib/activeNetwork';
import { pushEvent } from '../lib/notify';

export function useActivity(address: string | null) {
  const net = useActiveNetwork();
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Baseline of item ids already seen, so we only toast newly-arrived
  // inbound payments, never the wallet's existing history.
  const seen = useRef<Set<string> | null>(null);

  const load = useCallback(async (isStale?: () => boolean) => {
    if (!address) {
      setItems([]);
      setError(null);
      setLoading(false);
      seen.current = null;
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await adapter.getActivity(address);
      if (!isStale?.()) {
        if (seen.current === null) {
          // First load / re-baseline after an account or network switch:
          // record what exists already, but don't toast for any of it.
          seen.current = new Set(result.map((i) => i.id));
        } else {
          for (const item of result) {
            if (!seen.current.has(item.id)) {
              seen.current.add(item.id);
              if (item.kind === 'received') {
                pushEvent({ kind: 'received', assetCode: item.assetCode, amount: item.amount });
              }
            }
          }
        }
        setItems(result);
      }
    } catch (e) {
      if (!isStale?.()) setError(friendlyError(e));
    } finally {
      if (!isStale?.()) setLoading(false);
    }
  }, [address]);

  useEffect(() => {
    // Reset the baseline on every initial load (including account/network
    // switches) so switching accounts never replays history as toasts.
    seen.current = null;
    let ignore = false;
    void load(() => ignore);
    return () => {
      ignore = true;
    };
  }, [load, net.key]);

  // Live updates: refetch history whenever the account changes on-chain.
  useEffect(() => {
    if (!address) return;
    let ignore = false;
    const unsubscribe = adapter.subscribeAccount(address, () => void load(() => ignore));
    return () => {
      ignore = true;
      unsubscribe();
    };
  }, [address, net.key, load]);

  return { items, loading, error, refetch: () => void load() };
}
