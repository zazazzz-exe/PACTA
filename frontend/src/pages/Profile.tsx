import { useEffect, useState } from 'react';
import { ShieldCheck, ArrowUpRight } from 'lucide-react';
import { useWallet } from '../hooks/useWallet';
import { fetchKycStatus, type KycStatusRead } from '../lib/kycClient';
import { getReputation, type Reputation } from '../lib/contract';
import { Avatar } from '../components/Avatar';
import { IdentityBadge } from '../components/kyc/IdentityBadge';
import { CopyButton } from '../components/CopyButton';
import { ConnectButton } from '../components/ConnectButton';
import { Button } from '../components/Button';
import { navigate } from '../lib/router';
import { shortAddr, formatAmount, formatPhp } from '../lib/format';

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-card border border-hairline bg-paper p-4 text-center">
      <div className="mono text-[20px] font-semibold text-ink">{value}</div>
      <div className="text-[12px] text-slate">{label}</div>
      {sub && <div className="text-[11px] text-slate">{sub}</div>}
    </div>
  );
}

export function Profile() {
  const { address, kycStatus } = useWallet();
  const [kyc, setKyc] = useState<KycStatusRead | null>(null);
  const [rep, setRep] = useState<Reputation | null>(null);
  const [repLoading, setRepLoading] = useState(false);

  // Stale-guard useEffect (mirrors useBalances): a fetch that resolves after
  // disconnect / address change must not clobber state for the new identity.
  useEffect(() => {
    let ignore = false;
    if (!address) {
      setKyc(null);
      setRep(null);
      return;
    }
    setRepLoading(true);
    void fetchKycStatus()
      .then((k) => { if (!ignore) setKyc(k); })
      .catch(() => { if (!ignore) setKyc(null); });
    void getReputation(address, address)
      .then((r) => { if (!ignore) setRep(r); })
      .catch(() => { if (!ignore) setRep(null); })
      .finally(() => { if (!ignore) setRepLoading(false); });
    return () => { ignore = true; };
  }, [address]);

  if (!address) {
    return (
      <div className="mx-auto max-w-app px-1 py-16 text-center">
        <h1 className="text-[22px] font-semibold tracking-tight text-ink">Profile</h1>
        <p className="mt-2 text-[14px] text-slate">Connect a wallet to see your profile.</p>
        <div className="mt-6 flex justify-center">
          <ConnectButton />
        </div>
      </div>
    );
  }

  const verified = kycStatus === 'verified';

  return (
    <div className="mx-auto max-w-app space-y-5 px-1">
      <h1 className="text-[22px] font-semibold tracking-tight text-ink">Profile</h1>

      {/* Identity */}
      <div className="flex items-center gap-3 rounded-card border border-hairline bg-paper p-4">
        <Avatar addr={address} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="mono truncate text-[14px] text-ink">{shortAddr(address)}</span>
            <CopyButton value={address} label="Copy address" />
          </div>
          <IdentityBadge status={kycStatus} maskedName={kyc?.maskedName} className="mt-1" />
        </div>
      </div>

      {/* KYC */}
      <div className="rounded-card border border-hairline bg-paper p-4">
        <h2 className="text-[13px] font-semibold uppercase tracking-wider text-slate">Identity verification</h2>
        {verified ? (
          <p className="mt-2 text-[14px] text-ink">
            Verified{kyc?.maskedName ? ` as ${kyc.maskedName}` : ''}
            {kyc?.docExpiry ? <span className="block text-[12px] text-slate">Document valid until {kyc.docExpiry}</span> : null}
          </p>
        ) : (
          <>
            <p className="mt-2 text-[14px] text-slate">
              Verify your identity to send protected payments (a Pact), post a bond, deposit, or release a milestone.
            </p>
            <Button className="mt-3" onClick={() => navigate('/verify')}>
              <ShieldCheck size={16} aria-hidden /> Verify identity
            </Button>
          </>
        )}
      </div>

      {/* Reputation */}
      <div className="space-y-3">
        <h2 className="text-[13px] font-semibold uppercase tracking-wider text-slate">On-chain reputation</h2>
        {repLoading && !rep ? (
          <div className="grid grid-cols-3 gap-3">
            {[0, 1, 2].map((i) => <div key={i} className="h-20 animate-pulse rounded-card bg-mist" />)}
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            <Stat label="Completed" value={String(rep?.completed ?? 0)} />
            <Stat label="Refunded" value={String(rep?.refunded ?? 0)} />
            <Stat label="Volume" value={formatAmount(rep?.total_volume ?? 0n, false)} sub={formatPhp(rep?.total_volume ?? 0n)} />
          </div>
        )}
        <button
          onClick={() => navigate('/dashboard')}
          className="inline-flex items-center gap-1 text-[13px] text-accent-deep hover:opacity-80"
        >
          View my Pacts <ArrowUpRight size={14} aria-hidden />
        </button>
      </div>
    </div>
  );
}
