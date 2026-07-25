import { useCallback, useEffect, useRef, useState } from 'react';
import { getAgreement, type Agreement } from '../lib/contract';
import { getActiveNetwork } from '../lib/activeNetwork';
import { friendlyError } from '../lib/errors';
import { pactEvents } from '../lib/pactEvents';
import { pushEvent } from '../lib/notify';

const POLL_MS = 6000;

// Polls one Pact while mounted (Soroban has no push). Gated on supportsPacts so
// the escrow contract is never read off testnet. Emits alert toasts on changes
// (bond posted, capital deposited, milestone released, completed, refunded) by
// diffing consecutive reads via pactEvents. Pauses polling while the tab is
// hidden and stops entirely when unmounted or the network stops supporting Pacts.
export function usePactLive(id: bigint | null) {
  const [agreement, setAgreement] = useState<Agreement | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const prev = useRef<Agreement | null>(null);

  const load = useCallback(async () => {
    if (id === null || !getActiveNetwork().supportsPacts) return;
    setLoading(true);
    try {
      const next = await getAgreement(id);
      for (const e of pactEvents(prev.current, next)) pushEvent(e);
      prev.current = next;
      setAgreement(next);
      setError(null);
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    // Reset the diff baseline whenever the Pact id changes (or Pacts become
    // unsupported) so a stale prev read never leaks events across Pacts.
    prev.current = null;
    setAgreement(null);
    setError(null);

    if (id === null || !getActiveNetwork().supportsPacts) return;

    void load();
    const tick = () => {
      if (!document.hidden) void load();
    };
    const timer = window.setInterval(tick, POLL_MS);
    const onVis = () => {
      if (!document.hidden) void load();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [id, load]);

  return { agreement, loading, error, refetch: () => void load() };
}
