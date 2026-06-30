import { useEffect, useState } from 'react';
import { getReputation, type Reputation } from '../lib/contract';
import { formatAmount } from '../lib/format';

export function ReputationBadge({ trader, publicKey }: { trader: string; publicKey?: string }) {
  const [rep, setRep] = useState<Reputation | null>(null);

  useEffect(() => {
    let alive = true;
    getReputation(trader, publicKey)
      .then((r) => alive && setRep(r))
      .catch(() => alive && setRep(null));
    return () => {
      alive = false;
    };
  }, [trader, publicKey]);

  if (!rep) {
    return <span className="mono text-xs text-ink-faint">reputation loading...</span>;
  }

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
      <span className="inline-flex items-center gap-1 text-accent" title="Completed agreements">
        <span aria-hidden>✓</span>
        <span className="mono">{rep.completed}</span>
        <span className="text-ink-faint">completed</span>
      </span>
      <span className="inline-flex items-center gap-1 text-danger" title="Refunded agreements">
        <span aria-hidden>⚠</span>
        <span className="mono">{rep.refunded}</span>
        <span className="text-ink-faint">refunded</span>
      </span>
      <span className="inline-flex items-center gap-1 text-ink-muted" title="Total volume handled">
        <span aria-hidden>Σ</span>
        <span className="mono">{formatAmount(rep.total_volume)}</span>
      </span>
    </div>
  );
}
