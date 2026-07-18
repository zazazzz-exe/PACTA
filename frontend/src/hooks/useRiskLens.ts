import { useEffect, useRef, useState } from 'react';
import type { RiskRead } from '../lib/riskTypes';
import { computeTraderStats, type TraderStats } from '../lib/riskStats';
import { fetchAllAgreements } from '../lib/agreements';
import { isValidStellarAddress } from '../lib/format';
import { isDemo } from '../lib/demo';

interface State {
  data?: RiskRead;
  loading: boolean;
  error?: boolean;
}

// Canned Risk Lens read for demo mode (no Gemini call).
const DEMO_RISK: RiskRead = {
  risk_level: 'low',
  headline: 'Trusted counterparty',
  summary:
    'This recipient has completed several Pacts with no refunds and a solid on-chain history.',
  signals: [
    { label: 'Completed Pacts', detail: '3 completed, 0 refunded', tone: 'positive' },
    { label: 'On-chain history', detail: 'Active for several months', tone: 'positive' },
    { label: 'New relationship', detail: 'First Pact between you two', tone: 'neutral' },
  ],
  recommendation: 'Standard milestones are fine. Release in a few steps as the work lands.',
  suggested_milestones: 4,
  suggested_first_milestone_pct: 25,
};

export function useRiskLens(trader: string | null, contemplatedCapital?: bigint): State {
  const [state, setState] = useState<State>({ loading: false });
  const cache = useRef<Map<string, RiskRead>>(new Map());

  useEffect(() => {
    if (!trader || !isValidStellarAddress(trader)) {
      setState({ loading: false });
      return;
    }
    if (isDemo()) {
      setState({ loading: true });
      const t = setTimeout(() => setState({ loading: false, data: DEMO_RISK }), 500);
      return () => clearTimeout(t);
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
