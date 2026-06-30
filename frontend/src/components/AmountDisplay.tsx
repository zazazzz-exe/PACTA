import { Lock } from 'lucide-react';
import { formatAmount, formatPhp } from '../lib/format';

// The one big protected/capital figure per screen (DESIGN §6.4). Always pairs
// the XLM value with a local-currency anchor for non-crypto users.
export function AmountDisplay({
  label = 'Protected in escrow',
  amount,
  bond,
}: {
  label?: string;
  amount: bigint;
  bond?: bigint;
}) {
  return (
    <div>
      <p className="text-[13px] text-slate mb-1.5">{label}</p>
      <div className="flex items-baseline gap-2 flex-wrap">
        <span className="mono text-[30px] font-semibold text-ink leading-none">
          {formatAmount(amount)}
        </span>
        <span className="text-sm text-fog">{formatPhp(amount)}</span>
      </div>
      {bond != null && bond > 0n && (
        <p className="flex items-center gap-1.5 mt-2 text-[13px] text-accent">
          <Lock size={16} aria-hidden /> {formatAmount(bond)} bond held as protection
        </p>
      )}
    </div>
  );
}
