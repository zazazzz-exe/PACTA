import { shortAddr } from '../lib/format';
import { useActiveNetwork } from '../lib/activeNetwork';
import { CopyButton } from './CopyButton';

export function BalanceHeader({
  address,
  totalPhp,
  loading,
}: {
  address: string;
  totalPhp: number;
  loading: boolean;
}) {
  const net = useActiveNetwork();

  return (
    <div className="rounded-hero border border-card bg-balance px-5 py-6 text-center text-ink">
      <div className="text-[12px] font-medium uppercase tracking-wider text-slate">
        Estimated total
      </div>
      <div className="mono mt-1 text-[34px] font-bold leading-tight text-ink">
        {loading ? (
          <span className="inline-block h-9 w-40 animate-pulse rounded-control bg-mist align-middle" />
        ) : (
          <>
            {'≈'} {'₱'}
            {Math.round(totalPhp).toLocaleString()}
          </>
        )}
      </div>
      {/* The peso figure comes from indicative rates, not a live price feed. On
          mainnet it sits next to real funds, so it has to read as an estimate. */}
      {!loading && (
        <div className="mt-1 text-[11px] text-slate">Indicative rate, not a quote</div>
      )}
      <div className="mt-3 inline-flex items-center gap-1.5 text-[12px] text-slate">
        <span className="mono">{shortAddr(address)}</span>
        <CopyButton value={address} className="text-slate" />
        <span className="ml-1 inline-flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-pill bg-signal" aria-hidden />
          {net.label}
        </span>
      </div>
    </div>
  );
}
