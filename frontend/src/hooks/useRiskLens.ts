import { useEffect, useRef, useState } from 'react';
import type { RiskRead } from '../lib/riskTypes';
import { computeTraderStats, type TraderStats } from '../lib/riskStats';
import { fetchAllAgreements } from '../lib/agreements';
import { isValidStellarAddress } from '../lib/format';

interface State {
  data?: RiskRead;
  loading: boolean;
  error?: boolean;
}

export function useRiskLens(trader: string | null, contemplatedCapital?: bigint): State {
  const [state, setState] = useState<State>({ loading: false });
  const cache = useRef<Map<string, RiskRead>>(new Map());

  useEffect(() => {
    if (!trader || !isValidStellarAddress(trader)) {
      setState({ loading: false });
      return;
    }
    const key = `${trader}:${contemplatedCapital ?? ''}`;
    const cached = cache.current.get(key);
    if (cached) {
      setState({ loading: false, data: cached });
      return;
    }

    let cancelled = false;
    setState({ loading: true });
    (async () => {
      try {
        const agreements = await fetchAllAgreements();
        const stats: TraderStats = computeTraderStats(agreements, trader, contemplatedCapital);
        const res = await fetch('/api/risk-lens', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ stats }),
        });
        if (!res.ok) throw new Error();
        const data: RiskRead = await res.json();
        if (cancelled) return;
        cache.current.set(key, data);
        setState({ loading: false, data });
      } catch {
        if (!cancelled) setState({ loading: false, error: true });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [trader, contemplatedCapital]);

  return state;
}
