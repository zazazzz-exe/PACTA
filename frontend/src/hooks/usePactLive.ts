import { useCallback, useEffect, useRef, useState } from 'react';
import { getAgreement, Status, type Agreement } from '../lib/contract';
import { getActiveNetwork } from '../lib/activeNetwork';
import { friendlyError } from '../lib/errors';
import { pactEvents } from '../lib/pactEvents';
import { pushEvent } from '../lib/notify';

const POLL_MS = 6000;
// Warn once when an active Pact is within this many seconds of its deadline.
// Tuned so demo Pacts (duration 60) alert mid-window; raise for longer Pacts.
const DEADLINE_WARN_S = 30;

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
  const warned = useRef(false);

  const load = useCallback(async () => {
    if (id === null || !getActiveNetwork().supportsPacts) return;
    setLoading(true);
    try {
      const next = await getAgreement(id);
      for (const e of pactEvents(prev.current, next)) pushEvent(e);
      prev.current = next;
      setAgreement(next);
      // Warn once when an active Pact's deadline is close but not yet passed.
      if (!warned.current && next.status === Status.Active) {
        const remaining = Number(next.deadline) - Math.floor(Date.now() / 1000);
        if (remaining > 0 && remaining <= DEADLINE_WARN_S) {
          warned.current = true;
          pushEvent({ kind: 'deadline-near' });
        }
      }
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
    warned.current = false;
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
