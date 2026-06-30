import { useEffect, useState } from 'react';
import { ChevronLeft, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';
import { useWallet } from '../hooks/useWallet';
import {
  getReputation,
  getAllAgreements,
  type Reputation,
  type Agreement,
} from '../lib/contract';
import { formatAmount, formatPhp, shortAddr } from '../lib/format';
import { friendlyError } from '../lib/errors';
import { navigate } from '../lib/router';
import { Avatar } from '../components/Avatar';
import { StatusPill } from '../components/StatusPill';
import { RiskLens } from '../components/RiskLens';
import { useRiskLens } from '../hooks/useRiskLens';

// §7.5 — what an investor checks before agreeing to work with a trader.
export function TraderProfile({ address }: { address: string }) {
  const { address: me } = useWallet();
  const lens = useRiskLens(address);
  const [rep, setRep] = useState<Reputation | null>(null);
  const [history, setHistory] = useState<Agreement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    Promise.all([getReputation(address, me ?? undefined), getAllAgreements(me ?? undefined)])
      .then(([r, all]) => {
        if (!alive) return;
        setRep(r);
        setHistory(all.filter((a) => a.trader === address).sort((a, b) => Number(b.id - a.id)));
      })
      .catch((e) => alive && setError(friendlyError(e)))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [address, me]);

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div className="flex items-center gap-2">
        <button
          onClick={() => navigate('/dashboard')}
          aria-label="Back to dashboard"
          className="grid h-11 w-11 place-items-center rounded-control text-slate hover:bg-mist focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
        >
          <ChevronLeft size={20} aria-hidden />
        </button>
        <h1 className="text-[22px] font-medium tracking-tight text-ink">Trader</h1>
      </div>

      {/* Identity + reputation summary */}
      <div className="bg-paper border border-hairline rounded-card shadow-card p-5">
        <div className="flex items-center gap-3">
          <Avatar addr={address} className="h-12 w-12 text-base" />
          <div className="min-w-0">
            <p className="mono text-sm text-ink truncate">{shortAddr(address, 8, 8)}</p>
            {me === address && <p className="text-[12px] text-accent">This is you</p>}
          </div>
        </div>

        {loading && !rep ? (
          <div className="flex items-center justify-center py-8 text-slate">
            <Loader2 className="animate-spin" size={20} aria-hidden />
          </div>
        ) : rep ? (
          <div className="mt-5 grid grid-cols-3 gap-3">
            <Stat
              icon={<CheckCircle2 size={16} className="text-accent" aria-hidden />}
              value={rep.completed}
              label="Completed"
            />
            <Stat
              icon={<AlertTriangle size={16} className="text-refund" aria-hidden />}
              value={rep.refunded}
              label="Refunded"
            />
            <div>
              <p className="mono text-[22px] font-medium text-ink leading-none">
                {formatAmount(rep.total_volume, false)}
              </p>
              <p className="text-[12px] text-slate mt-1">Volume (XLM)</p>
              <p className="text-[11px] text-fog">{formatPhp(rep.total_volume)}</p>
            </div>
          </div>
        ) : null}
      </div>

      {error && <p className="text-refund text-[13px]">{error}</p>}

      {/* AI Risk Lens — counterparty read before reaching out */}
      <RiskLens read={lens.data} loading={lens.loading} error={lens.error} />

      {/* History */}
      <div>
        <h2 className="text-[13px] font-medium uppercase tracking-wide text-fog mb-3">
          Past agreements
        </h2>
        {history.length === 0 ? (
          <p className="text-[14px] text-slate">No agreements for this trader yet.</p>
        ) : (
          <div className="space-y-3">
            {history.map((a) => (
              <button
                key={a.id.toString()}
                onClick={() => navigate(`/agreement/${a.id}`)}
                className="w-full flex items-center justify-between gap-3 bg-paper border border-hairline rounded-card shadow-card p-4 transition hover:border-hairline-strong focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
              >
                <div className="text-left">
                  <p className="mono text-[12px] text-fog">agr-{a.id.toString().padStart(3, '0')}</p>
                  <p className="mono text-sm text-ink">{formatAmount(a.capital)}</p>
                </div>
                <StatusPill status={a.status} />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ icon, value, label }: { icon: React.ReactNode; value: number; label: string }) {
  return (
    <div>
      <p className="mono text-[22px] font-medium text-ink leading-none flex items-center gap-1.5">
        {icon}
        {value}
      </p>
      <p className="text-[12px] text-slate mt-1">{label}</p>
    </div>
  );
}
