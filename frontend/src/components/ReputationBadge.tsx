import { useEffect, useState } from 'react';
import { CheckCircle2, AlertTriangle } from 'lucide-react';
import { getReputation, type Reputation } from '../lib/contract';

// Reputation chip (DESIGN §6.6): completed vs refunded, accent vs refund, mono.
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
    return <span className="mono text-xs text-fog">reputation loading</span>;
  }

  return (
    <span className="mono inline-flex items-center gap-2.5 text-xs">
      <span className="inline-flex items-center gap-1 text-accent" title="Completed agreements">
        <CheckCircle2 size={14} aria-hidden />
        {rep.completed}
      </span>
      <span className="inline-flex items-center gap-1 text-refund" title="Refunded agreements">
        <AlertTriangle size={14} aria-hidden />
        {rep.refunded}
      </span>
    </span>
  );
}
