import { ArrowUp, ArrowDown, ArrowLeftRight, RefreshCw } from 'lucide-react';
import { useWallet } from '../hooks/useWallet';
import { useBalances } from '../hooks/useBalances';
import { BalanceHeader } from '../components/BalanceHeader';
import { AssetRow } from '../components/AssetRow';
import { ConnectButton } from '../components/ConnectButton';
import { navigate } from '../lib/router';

function Action({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex flex-1 flex-col items-center gap-2 rounded-card border border-hairline bg-paper py-4 text-[13px] font-medium text-ink transition hover:border-accent/30 hover:bg-accent-tint focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
    >
      <span className="grid h-10 w-10 place-items-center rounded-pill bg-accent text-white">
        {icon}
      </span>
      {label}
    </button>
  );
}

export function Home() {
  const { address } = useWallet();
  const { balances, totalPhp, loading, error, refetch } = useBalances(address);

  if (!address) {
    return (
      <div className="mx-auto max-w-app px-1 py-16 text-center">
        <h1 className="text-[22px] font-semibold tracking-tight text-ink">Your wallet</h1>
        <p className="mt-2 text-[14px] text-slate">
          Connect a wallet to see your balance, send, receive, and convert.
        </p>
        <div className="mt-6 flex justify-center">
          <ConnectButton />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-app space-y-5 px-1">
      <BalanceHeader address={address} totalPhp={totalPhp} loading={loading} />

      <div className="flex gap-3">
        <Action icon={<ArrowUp size={18} aria-hidden />} label="Send" onClick={() => navigate('/send')} />
        <Action icon={<ArrowDown size={18} aria-hidden />} label="Receive" onClick={() => navigate('/receive')} />
        <Action icon={<ArrowLeftRight size={18} aria-hidden />} label="Convert" onClick={() => navigate('/convert')} />
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between px-1">
          <h2 className="text-[13px] font-semibold uppercase tracking-wider text-slate">Assets</h2>
          <button
            onClick={refetch}
            aria-label="Refresh balances"
            className="grid h-8 w-8 place-items-center rounded-control text-slate hover:bg-mist focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
          >
            <RefreshCw size={15} aria-hidden className={loading ? 'animate-spin' : ''} />
          </button>
        </div>

        {error && (
          <div className="rounded-card border border-refund/40 bg-refund-tint px-4 py-3 text-[13px] text-refund-deep">
            {error}
          </div>
        )}

        {loading && balances.length === 0 && (
          <div className="space-y-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-16 animate-pulse rounded-card bg-mist" />
            ))}
          </div>
        )}

        {!loading && !error && balances.length === 0 && (
          <div className="rounded-card border border-hairline bg-paper px-4 py-8 text-center text-[14px] text-slate">
            No assets yet. Receive some XLM to get started.
          </div>
        )}

        <div className="space-y-2">
          {balances.map((b) => (
            <AssetRow key={`${b.asset.code}:${b.asset.issuer ?? 'native'}`} balance={b} />
          ))}
        </div>
      </div>
    </div>
  );
}
