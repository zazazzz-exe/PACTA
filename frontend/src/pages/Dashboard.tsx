import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { m } from 'framer-motion';
import { Plus, Loader2, Wallet } from 'lucide-react';
import { SPRING } from '../components/motion/MotionProvider';
import { PactShield } from '../components/home/PactShield';
import { useWallet } from '../hooks/useWallet';
import { useTour } from '../components/Tour';
import { dashboardSteps } from '../lib/tours';
import { seenTour, markTourSeen } from '../lib/tourSeen';
import { useAgreements } from '../hooks/useAgreements';
import { AgreementCard } from '../components/AgreementCard';
import { Button } from '../components/Button';
import { Reveal } from '../components/Reveal';
import { Status } from '../lib/contract';
import { needsAttentionReason, urgencyRank } from '../lib/agreementView';
import { formatAmount, formatPhp } from '../lib/format';
import { navigate } from '../lib/router';
import { useActiveNetwork } from '../lib/activeNetwork';

type Filter = 'all' | 'investor' | 'trader';
const ROLES: { id: Filter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'investor', label: 'Paying' },
  { id: 'trader', label: 'Receiving' },
];

// Status tabs. The escrow has no dispute state yet (docs/DISPUTES.md), so the
// third tab (Closed) groups the Pacts that ended without completing:
// refunded or cancelled.
type Tab = 'active' | 'completed' | 'closed';
const TABS: { id: Tab; label: string }[] = [
  { id: 'active', label: 'Active' },
  { id: 'completed', label: 'Completed' },
  { id: 'closed', label: 'Closed' },
];
const inTab = (status: Status, tab: Tab) =>
  tab === 'active'
    ? status === Status.Active || status === Status.Pending
    : tab === 'completed'
      ? status === Status.Completed
      : status === Status.Refunded || status === Status.Cancelled;

export function Dashboard() {
  const net = useActiveNetwork();
  const { address } = useWallet();
  // enabled: net.supportsPacts so the escrow contract (contract.ts, testnet-only)
  // is never read while the connected wallet is on an unsupported/mainnet network.
  // The hook itself is still called unconditionally on every render (stable hook
  // order); only its internal fetch is skipped.
  const { agreements, loading, error, refresh } = useAgreements(address ?? undefined, net.supportsPacts);
  const [filter, setFilter] = useState<Filter>('all');
  const [tab, setTab] = useState<Tab>('active');
  const { start } = useTour();

  // Auto-start the dashboard tour once, after the cards have rendered.
  // Mark "seen" inside the timeout (StrictMode double-invoke safe).
  useEffect(() => {
    if (!address || !net.supportsPacts || loading || seenTour('dashboard')) return;
    const t = setTimeout(() => {
      markTourSeen('dashboard');
      start(dashboardSteps);
    }, 500);
    return () => clearTimeout(t);
  }, [address, loading, start, net.supportsPacts]);

  // Live-refresh the Pact list on an interval while mounted, testnet-supported,
  // and the tab is visible. Never reads the contract off testnet. Mirrors the
  // visibility pattern in usePactLive: pause while hidden, refresh once on return.
  useEffect(() => {
    if (!net.supportsPacts) return;
    const tick = () => {
      if (!document.hidden) void refresh();
    };
    const timer = window.setInterval(tick, 8000);
    const onVis = () => {
      if (!document.hidden) void refresh();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [net.supportsPacts, refresh]);

  const filtered = useMemo(() => {
    const byTab = agreements.filter((a) => inTab(a.status, tab));
    if (!address || filter === 'all') return byTab;
    if (filter === 'investor') return byTab.filter((a) => a.investor === address);
    return byTab.filter((a) => a.trader === address);
  }, [agreements, address, filter, tab]);

  if (!address) return <ConnectGate />;

  if (!net.supportsPacts) {
    return (
      <div className="mx-auto max-w-app px-1 py-16 text-center">
        <h1 className="text-[22px] font-semibold tracking-tight text-ink">Pacts</h1>
        <p className="mt-2 text-[14px] text-slate">
          Protected payments are not available on {net.label} yet. Switch your wallet to testnet to
          view and create Pacts.
        </p>
      </div>
    );
  }

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
        <div>
          <h1 className="text-[22px] font-bold tracking-tight text-ink">Your Pacts</h1>
          <p className="mt-0.5 max-w-lg text-[13px] text-slate">
            Protected payments you have sent or received. Funds are held by a contract and released as the
            work lands.
          </p>
        </div>
        <Button className="h-11 shrink-0 px-4 text-[14px]" data-tour="new" onClick={() => navigate('/create')}>
          <Plus size={18} aria-hidden /> New Pact
        </Button>
      </div>

      {/* Money summary strip + allocation bar */}
      {agreements.length > 0 && (
        <div className="space-y-3 animate-rise">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Metric label="Protected" accent="accent">
              <p className="mono text-[20px] font-medium text-accent">
                {formatAmount(protectedTotal)}
              </p>
              <p className="text-[12px] text-fog">{formatPhp(protectedTotal)}</p>
            </Metric>
            <Metric label="Active" accent="deep">
              <p className="mono text-[20px] font-medium text-accent-deep">{activeCount}</p>
            </Metric>
            <Metric label="Released" accent="muted">
              <p className="mono text-[20px] font-medium text-ink">{formatAmount(releasedTotal)}</p>
            </Metric>
            <Metric label="Needs attention" accent={attention.length > 0 ? 'deadline' : 'muted'} tint={attention.length > 0}>
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

      {/* Status tabs + role filter */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div role="tablist" aria-label="Pact status" className="inline-flex rounded-pill border border-card bg-paper p-1 shadow-card" data-tour="filters">
          {TABS.map((t) => {
            const on = tab === t.id;
            const count = agreements.filter((a) => inTab(a.status, t.id)).length;
            return (
              <button
                key={t.id}
                role="tab"
                aria-selected={on}
                onClick={() => setTab(t.id)}
                className={`relative h-11 rounded-pill px-3.5 text-[13px] font-bold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                  on ? 'text-on-accent' : 'text-slate hover:text-ink'
                }`}
              >
                {on && <m.span layoutId="pact-tab" aria-hidden className="absolute inset-0 rounded-pill bg-accent shadow-glow" transition={SPRING} />}
                <span className="relative">
                  {t.label}
                  {count > 0 && <span className={`mono ml-1.5 text-[12px] ${on ? 'text-on-accent' : 'text-fog'}`}>{count}</span>}
                </span>
              </button>
            );
          })}
        </div>
        <div role="radiogroup" aria-label="Your role" className="flex gap-1.5">
          {ROLES.map((r) => (
            <button
              key={r.id}
              role="radio"
              aria-checked={filter === r.id}
              onClick={() => setFilter(r.id)}
              className={`min-h-tap min-w-tap rounded-pill border px-3 text-[13px] font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                filter === r.id ? 'border-accent bg-accent-tint text-ink' : 'border-card text-slate hover:text-ink'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* Needs-attention callout */}
      {attention.length > 0 && (
        <div className="rounded-card border border-deadline/30 bg-deadline-tint p-4">
          <p className="text-[13px] font-medium text-deadline-deep">Needs your attention</p>
          <ul className="mt-2.5 space-y-2">
            {attention.map((a) => (
              <li key={a.id.toString()} className="flex items-center justify-between gap-3">
                <span className="min-w-0 truncate text-[13px] text-deadline-deep">
                  <span className="mono">Pact {a.id.toString().padStart(3, '0')}</span> ·{' '}
                  {needsAttentionReason(a, address, nowSec)}
                </span>
                <button
                  onClick={() => navigate(`/agreement/${a.id}`)}
                  className="inline-flex min-h-tap shrink-0 items-center px-1 text-[13px] font-semibold text-accent hover:underline focus:outline-none focus-visible:underline"
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
        <EmptyState tab={tab} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sorted.map((a, i) => (
            <Reveal key={a.id.toString()} delay={Math.min(i * 60, 300)}>
              <div data-tour={i === 0 ? 'card' : undefined}>
                <AgreementCard a={a} you={address} />
              </div>
            </Reveal>
          ))}
        </div>
      )}
    </div>
  );
}

function Metric({
  label,
  tint,
  accent = 'muted',
  children,
}: {
  label: string;
  tint?: boolean;
  accent?: 'accent' | 'deep' | 'deadline' | 'muted';
  children: ReactNode;
}) {
  const strip = {
    accent: 'bg-accent',
    deep: 'bg-accent-deep',
    deadline: 'bg-deadline',
    muted: 'bg-hairline-strong',
  }[accent];

  return (
    <div
      className={`relative overflow-hidden rounded-card border p-4 transition duration-300 hover:-translate-y-0.5 hover:shadow-pop ${
        tint ? 'border-deadline/30 bg-deadline-tint' : 'border-hairline bg-paper shadow-card'
      }`}
    >
      <span className={`absolute left-0 top-0 h-full w-1 ${strip}`} aria-hidden />
      <p className="pl-2 text-[12px] text-slate">{label}</p>
      <div className="mt-1 pl-2">{children}</div>
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
      <div className="flex h-2.5 overflow-hidden rounded-pill bg-mist">
        <div className="bar-segment bg-accent" style={{ width: `${pct(inEscrow)}%` }} />
        <div className="bar-segment bg-accent-deep" style={{ width: `${pct(bonds)}%` }} />
        <div className="bar-segment bg-signal/60" style={{ width: `${pct(released)}%` }} />
      </div>
      <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-slate">
        <Legend dot="bg-accent" label="Protected" amount={inEscrow} />
        <Legend dot="bg-accent-deep" label="Bonds" amount={bonds} />
        <Legend dot="bg-signal/60" label="Released" amount={released} />
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

function EmptyState({ tab }: { tab: Tab }) {
  const copy = {
    active: { title: 'No active Pacts yet', body: 'A Pact helps you protect payments and release funds step by step.' },
    completed: { title: 'No completed Pacts yet', body: 'Pacts appear here once every milestone is released.' },
    closed: { title: 'Nothing refunded or cancelled', body: 'Pacts that end early, by refund or cancellation, appear here.' },
  }[tab];
  return (
    <div className="relative isolate overflow-hidden rounded-card border border-card bg-paper p-8 text-center shadow-card">
      <span aria-hidden className="pointer-events-none absolute inset-0 -z-10 bg-balance-glow" />
      <div className="mx-auto grid h-16 w-16 place-items-center rounded-[20px] bg-accent-tint">
        <PactShield size={40} glow={false} />
      </div>
      <h2 className="mt-4 text-[17px] font-bold text-ink">{copy.title}</h2>
      <p className="mx-auto mt-1 max-w-xs text-[14px] text-slate">{copy.body}</p>
      {tab === 'active' && (
        <Button className="mt-5" onClick={() => navigate('/create')}>
          Start a Pact
        </Button>
      )}
    </div>
  );
}

function ConnectGate() {
  const { connect, connecting } = useWallet();
  return (
    <div className="mx-auto max-w-app">
      <div className="relative overflow-hidden rounded-card border border-accent/20 bg-gradient-to-br from-accent-tint to-paper p-8 text-center shadow-card">
        <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-accent/10 blur-2xl" aria-hidden />
        <div className="relative">
          <span className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full bg-accent text-on-accent shadow-pop">
            <Wallet size={24} aria-hidden />
          </span>
          <h1 className="text-[18px] font-medium text-ink">Connect your wallet</h1>
        <p className="mx-auto mt-1.5 max-w-xs text-[14px] text-slate">
          Your wallet is your login. Connect to see your Pacts and create new ones.
        </p>
        <Button className="mt-5" onClick={connect} disabled={connecting}>
          <Wallet size={16} aria-hidden />
          {connecting ? 'Connecting' : 'Connect wallet'}
        </Button>
        </div>
      </div>
    </div>
  );
}
