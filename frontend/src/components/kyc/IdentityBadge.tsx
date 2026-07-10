import { ShieldCheck } from 'lucide-react';
import type { KycStatus } from '../../lib/kycClient';

// Small "Verified identity" pill. Renders nothing unless the status is verified,
// so it is safe to drop anywhere the connected user's status is known.
export function IdentityBadge({
  status,
  maskedName,
  className = '',
}: {
  status: KycStatus;
  maskedName?: string | null;
  className?: string;
}) {
  if (status !== 'verified') return null;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-pill bg-accent-tint px-2.5 py-1 text-[12px] font-medium text-accent-deep ${className}`}
    >
      <ShieldCheck size={13} aria-hidden />
      Verified{maskedName ? ` · ${maskedName}` : ''}
    </span>
  );
}
