import { shortAddr } from '../lib/format';
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
  return (
    <div className="rounded-card border border-hairline bg-paper px-5 py-6 text-center shadow-card">
      <div className="text-[12px] font-medium uppercase tracking-wider text-slate">
        Total balance
      </div>
      <div className="mono mt-1 text-[34px] font-semibold leading-tight text-ink">
        {loading ? (
          <span className="inline-block h-9 w-40 animate-pulse rounded-control bg-mist align-middle" />
        ) : (
          <>
            {'₱'}
            {Math.round(totalPhp).toLocaleString()}
          </>
        )}
      </div>
      <div className="mt-3 inline-flex items-center gap-1.5 text-[12px] text-slate">
        <span className="mono">{shortAddr(address)}</span>
        <CopyButton value={address} />
        <span className="ml-1 inline-flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-pill bg-accent" aria-hidden />
          testnet
        </span>
      </div>
    </div>
  );
}
