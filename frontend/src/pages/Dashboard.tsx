import { useMemo, useState } from 'react';
import { useWallet } from '../hooks/useWallet';
import { useAgreements } from '../hooks/useAgreements';
import { AgreementCard } from '../components/AgreementCard';
import { navigate } from '../lib/router';

type Filter = 'all' | 'investor' | 'trader';

export function Dashboard() {
  const { address } = useWallet();
  const { agreements, loading, error, refresh } = useAgreements(address ?? undefined);
  const [filter, setFilter] = useState<Filter>('all');

  const filtered = useMemo(() => {
    if (!address || filter === 'all') return agreements;
    if (filter === 'investor') return agreements.filter((a) => a.investor === address);
    return agreements.filter((a) => a.trader === address);
  }, [agreements, address, filter]);

  if (!address) {
    return <ConnectGate />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink">Agreements</h1>
          <p className="text-sm text-ink-muted">Every agreement held by the Pacta contract.</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn-ghost px-3 py-2" onClick={refresh} disabled={loading}>
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
          <button className="btn-primary" onClick={() => navigate('/create')}>
            New agreement
          </button>
        </div>
      </div>

      <div className="flex items-center gap-1.5">
        <FilterTab on={filter === 'all'} onClick={() => setFilter('all')}>
          All
        </FilterTab>
        <FilterTab on={filter === 'investor'} onClick={() => setFilter('investor')}>
          As investor
        </FilterTab>
        <FilterTab on={filter === 'trader'} onClick={() => setFilter('trader')}>
          As trader
        </FilterTab>
      </div>

      {error && (
        <div className="card border-danger/30 bg-danger-soft p-4 text-sm text-danger">{error}</div>
      )}

      {loading && agreements.length === 0 ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {[0, 1].map((i) => (
            <div key={i} className="card h-56 animate-pulse bg-surface/60" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-10 text-center">
          <p className="text-ink-muted">No agreements here yet.</p>
          <button className="btn-primary mt-4" onClick={() => navigate('/create')}>
            Create your first agreement
          </button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {filtered.map((a) => (
            <AgreementCard key={a.id.toString()} a={a} you={address} />
          ))}
        </div>
      )}
    </div>
  );
}

function FilterTab({
  on,
  onClick,
  children,
}: {
  on: boolean;
  onClick: () => void;
  children: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
        on ? 'bg-accent-soft text-accent' : 'text-ink-muted hover:text-ink'
      }`}
    >
      {children}
    </button>
  );
}

function ConnectGate() {
  const { connect, connecting } = useWallet();
  return (
    <div className="card p-10 text-center">
      <h1 className="text-xl font-semibold text-ink">Connect your wallet</h1>
      <p className="mx-auto mt-2 max-w-sm text-sm text-ink-muted">
        Your wallet is your login. Connect to see your agreements and create new ones.
      </p>
      <button className="btn-primary mt-5" onClick={connect} disabled={connecting}>
        {connecting ? 'Connecting...' : 'Connect Wallet'}
      </button>
    </div>
  );
}
