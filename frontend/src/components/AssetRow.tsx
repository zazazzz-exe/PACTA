import type { AssetBalance } from '../lib/adapters/ChainAdapter';

// Trim trailing zeros for a scannable amount ("100" not "100.0000000").
function trim(amount: string): string {
  if (!amount.includes('.')) return amount;
  return amount.replace(/\.?0+$/, '');
}

export function AssetRow({ balance }: { balance: AssetBalance }) {
  const php = balance.displayValuePhp;
  return (
    <div className="flex items-center justify-between rounded-card border border-hairline bg-paper px-4 py-3.5">
      <div className="flex items-center gap-3">
        <span className="grid h-9 w-9 place-items-center rounded-pill bg-accent-tint text-[12px] font-semibold text-accent-deep">
          {balance.asset.code.slice(0, 4)}
        </span>
        <span className="text-[15px] font-medium text-ink">{balance.asset.code}</span>
      </div>
      <div className="text-right">
        <div className="mono text-[15px] text-ink">{trim(balance.amount)}</div>
        {php !== undefined && (
          <div className="text-[12px] text-slate">
            {'≈'} {'₱'}
            {Math.round(php).toLocaleString()}
          </div>
        )}
      </div>
    </div>
  );
}
