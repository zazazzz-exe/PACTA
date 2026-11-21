import { BadgeCheck, Loader2, UserRound } from 'lucide-react';
import type { PhoneLookup } from '../hooks/usePhoneRecipient';
import { shortAddr } from '../lib/format';

// Who a phone number resolves to, shown under the recipient field before the
// user sends. Verified wallets show the masked name from identity verification.
export function ContactCard({ lookup }: { lookup: PhoneLookup }) {
  if (lookup.state === 'none') return null;
  if (lookup.state === 'looking') {
    return (
      <p className="mt-3 flex items-center gap-2 text-[13px] text-slate" aria-live="polite">
        <Loader2 size={14} className="animate-spin" aria-hidden /> Finding this number
      </p>
    );
  }
  if (lookup.state === 'missing') {
    return (
      <p className="mt-3 text-[13px] text-slate" aria-live="polite">
        No PACTA wallet uses this number yet. Ask them for their wallet address instead.
      </p>
    );
  }
  if (lookup.state === 'error') {
    return (
      <p className="mt-3 text-[13px] font-semibold text-refund" role="alert">
        {lookup.message}
      </p>
    );
  }
  const c = lookup.contact;
  return (
    <div className="mt-3 flex items-center gap-3 rounded-tile border border-card bg-mist px-3.5 py-3" aria-live="polite">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-pill bg-accent-tint text-accent">
        <UserRound size={18} aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1.5 text-[15px] font-semibold text-ink">
          {c.maskedName ?? 'PACTA wallet'}
          {c.verified && (
            <span className="inline-flex items-center gap-1 text-[12px] font-semibold text-mint">
              <BadgeCheck size={14} aria-hidden /> Verified
            </span>
          )}
        </p>
        <p className="mono text-[12px] text-slate">{shortAddr(c.address, 6, 6)}</p>
      </div>
    </div>
  );
}
