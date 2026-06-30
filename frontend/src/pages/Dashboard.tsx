import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Plus, Loader2, Wallet } from 'lucide-react';
import { useWallet } from '../hooks/useWallet';
import { useTour } from '../components/Tour';
import { dashboardSteps } from '../lib/tours';
import { seenTour, markTourSeen } from '../lib/tourSeen';
import { useAgreements } from '../hooks/useAgreements';
import { AgreementCard } from '../components/AgreementCard';
import { Button } from '../components/Button';
import { Status } from '../lib/contract';
import { needsAttentionReason, urgencyRank } from '../lib/agreementView';
import { formatAmount, formatPhp } from '../lib/format';
import { navigate } from '../lib/router';

type Filter = 'all' | 'investor' | 'trader';
const TABS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'investor', label: 'As investor' },
  { id: 'trader', label: 'As trader' },
];

export function Dashboard() {
  const { address } = useWallet();
  const { agreements, loading, error } = useAgreements(address ?? undefined);
  const [filter, setFilter] = useState<Filter>('all');
  const { start } = useTour();

  // Auto-start the dashboard tour once, after the cards have rendered.
  // Mark "seen" inside the timeout (StrictMode double-invoke safe).
  useEffect(() => {
    if (!address || loading || seenTour('dashboard')) return;
    const t = setTimeout(() => {
      markTourSeen('dashboard');
      start(dashboardSteps);
    }, 500);
    return () => clearTimeout(t);
  }, [address, loading, start]);

  const filtered = useMemo(() => {
    if (!address || filter === 'all') return agreements;
    if (filter === 'investor') return agreements.filter((a) => a.investor === address);
    return agreements.filter((a) => a.trader === address);
  }, [agreements, address, filter]);

  if (!address) return <ConnectGate />;

  const nowSec = Math.floor(Date.now() / 1000);

  // Portfolio totals (over all agreements; the filter only affects the grid).
  let protectedTotal = 0n;
  let releasedTotal = 0n;
  let bondsTotal = 0n;
  let activeCount = 0;
  for (const a of agreements) {
    releasedTotal += a.released_amount;
    if (a.status === Status.Active) {
      protectedTotal += a.capital - a.released_amount;
      bondsTotal += a.bond;
      activeCount += 1;
    }
  }

  const attention = agreements.filter((a) => needsAttentionReason(a, address, nowSec));

  // Urgency order: needs-attention → Active → Pending → terminal, newest first.
  const sorted = [...filtered].sort(
    (x, y) =>
      urgencyRank(x, address, nowSec) - urgencyRank(y, address, nowSec) || Number(y.id - x.id),
  );

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-[20px] sm:text-[22px] font-medium tracking-tight text-ink">
          Your agreements
        </h1>
        <Button className="h-11 px-4 text-[14px]" data-tour="new" onClick={() => navigate('/create')}>
          <Plus size={18} aria-hidden /> New agreement
        </Button>
      </div>

      {/* Money summary strip + allocation bar */}
      {agreements.length > 0 && (
        <div className="space-y-3">
          <div className="grid grid-cols-1 min-[420px]:grid-cols-2 lg:grid-cols-4 gap-3">
            <Metric label="Protected in escrow">
              <p className="mono text-[20px] font-medium text-accent">
                {formatAmount(protectedTotal)}
              </p>
              <p className="text-[12px] text-fog">{formatPhp(protectedTotal)}</p>
            </Metric>
            <Metric label="Active">
              <p className="mono text-[20px] font-medium text-ink">{activeCount}</p>
            </Metric>
            <Metric label="Released">
              <p className="mono text-[20px] font-medium text-ink">{formatAmount(releasedTotal)}</p>
            </Metric>
            <Metric label="Needs attention" tint={attention.length > 0}>
              <p
                className={`mono text-[20px] font-medium ${
                  attention.length > 0 ? 'text-deadline-deep' : 'text-ink'
                }`}
              >
                {attention.length}
              </p>
            </Metric>
          </div>

          <AllocationBar inEscrow={protectedTotal} released={releasedTotal} bonds={bondsTotal} />
        </div>
      )}

      {/* Filter */}
      <div
        className="inline-flex rounded-pill bg-mist p-1 border border-hairline"
        data-tour="filters"
      >
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setFilter(t.id)}
            className={`px-3.5 h-11 rounded-pill text-[13px] font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 ${
              filter === t.id ? 'bg-paper text-ink shadow-card' : 'text-slate hover:text-ink'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Needs-attention callout */}
      {attention.length > 0 && (
        <div className="rounded-card border border-deadline/30 bg-deadline-tint p-4">
          <p className="text-[13px] font-medium text-deadline-deep">Needs your attention</p>
          <ul className="mt-2.5 space-y-2">
            {attention.map((a) => (
              <li key={a.id.toString()} className="flex items-center justify-between gap-3">
                <span className="min-w-0 truncate text-[13px] text-deadline-deep">
                  <span className="mono">agr-{a.id.toString().padStart(3, '0')}</span> ·{' '}
                  {needsAttentionReason(a, address, nowSec)}
                </span>
                <button
                  onClick={() => navigate(`/agreement/${a.id}`)}
                  className="shrink-0 text-[13px] font-medium text-accent-deep hover:underline focus:outline-none focus-visible:underline"
                >
                  Review
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {error && <p className="text-refund text-[13px]">{error}</p>}

      {loading && agreements.length === 0 ? (
        <div className="flex items-center justify-center py-16 text-slate">
          <Loader2 className="animate-spin" size={20} aria-hidden />
        </div>
      ) : sorted.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sorted.map((a, i) => (
            <div key={a.id.toString()} data-tour={i === 0 ? 'card' : undefined}>
              <AgreementCard a={a} you={address} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Metric({
  label,
  tint,
  children,
}: {
  label: string;
  tint?: boolean;
  children: ReactNode;
}) {
  return (
    <div
      className={`rounded-card border p-4 ${
        tint ? 'border-deadline/30 bg-deadline-tint' : 'border-hairline bg-paper shadow-card'
      }`}
    >
      <p className="text-[12px] text-slate">{label}</p>
      <div className="mt-1">{children}</div>
    </div>
  );
}

function AllocationBar({
  inEscrow,
  released,
  bonds,
}: {
  inEscrow: bigint;
  released: bigint;
  bonds: bigint;
}) {
  const total = inEscrow + released + bonds;
  const pct = (v: bigint) => (total > 0n ? (Number(v) / Number(total)) * 100 : 0);
  return (
    <div className="rounded-card border border-hairline bg-paper p-4 shadow-card">
      <div className="flex h-2 overflow-hidden rounded-pill bg-mist">
        <div className="bg-accent" style={{ width: `${pct(inEscrow)}%` }} />
        <div className="bg-accent-deep" style={{ width: `${pct(bonds)}%` }} />
        <div className="bg-fog" style={{ width: `${pct(released)}%` }} />
      </div>
      <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-slate">
        <Legend dot="bg-accent" label="Protected" amount={inEscrow} />
        <Legend dot="bg-accent-deep" label="Bonds" amount={bonds} />
        <Legend dot="bg-fog" label="Released" amount={released} />
      </div>
    </div>
  );
}

function Legend({ dot, label, amount }: { dot: string; label: string; amount: bigint }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`h-2 w-2 rounded-pill ${dot}`} aria-hidden />
      {label} <span className="mono text-fog">{formatAmount(amount)}</span>
    </span>
  );
}

function EmptyState() {
  return (
    <div className="bg-paper border border-hairline rounded-card shadow-card p-8 text-center">
      <h2 className="text-[16px] font-medium text-ink">No agreements yet</h2>
      <p className="mt-1 text-[14px] text-slate">Create your first protected agreement.</p>
      <Button className="mt-5" onClick={() => navigate('/create')}>
        Create agreement
      </Button>
    </div>
  );
}

function ConnectGate() {
  const { connect, connecting } = useWallet();
  return (
    <div className="mx-auto max-w-app">
      <div className="bg-paper border border-hairline rounded-card shadow-card p-8 text-center">
        <h1 className="text-[18px] font-medium text-ink">Connect your wallet</h1>
        <p className="mx-auto mt-1.5 max-w-xs text-[14px] text-slate">
          Your wallet is your login. Connect to see your agreements and create new ones.
        </p>
        <Button className="mt-5" onClick={connect} disabled={connecting}>
          <Wallet size={16} aria-hidden />
          {connecting ? 'Connecting' : 'Connect wallet'}
        </Button>
      </div>
    </div>
  );
}
