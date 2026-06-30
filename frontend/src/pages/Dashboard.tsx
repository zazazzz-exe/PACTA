import { useEffect, useMemo, useState } from 'react';
import { Plus, Loader2, Wallet } from 'lucide-react';
import { useWallet } from '../hooks/useWallet';
import { useTour } from '../components/Tour';
import { dashboardSteps } from '../lib/tours';
import { seenTour, markTourSeen } from '../lib/tourSeen';
import { useAgreements } from '../hooks/useAgreements';
import { AgreementCard } from '../components/AgreementCard';
import { Button } from '../components/Button';
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

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div className="animate-rise flex items-center justify-between">
        <h1 className="text-[22px] font-medium tracking-tight text-ink">Your agreements</h1>
        <Button
          className="h-11 w-11 p-0 rounded-pill"
          aria-label="New agreement"
          data-tour="new"
          onClick={() => navigate('/create')}
        >
          <Plus size={20} aria-hidden />
        </Button>
      </div>

      <div className="animate-rise inline-flex rounded-pill bg-mist p-1 border border-hairline" style={{ animationDelay: '60ms' }} data-tour="filters">
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

      {error && <p className="text-refund text-[13px]">{error}</p>}

      {loading && agreements.length === 0 ? (
        <div className="flex items-center justify-center py-16 text-slate">
          <Loader2 className="animate-spin" size={20} aria-hidden />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((a, i) => (
            <div
              key={a.id.toString()}
              className="animate-rise"
              style={{ animationDelay: `${Math.min(i * 60, 360)}ms` }}
              data-tour={i === 0 ? 'card' : undefined}
            >
              <AgreementCard a={a} you={address} />
            </div>
          ))}
        </div>
      )}
    </div>
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
