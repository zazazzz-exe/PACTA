import { useCallback, useEffect, useState } from 'react';
import { ShieldCheck, ArrowUpRight, Plus, Wallet, Loader2, X, BadgeCheck } from 'lucide-react';
import { useWallet } from '../hooks/useWallet';
import {
  fetchKycStatus,
  linkWallet,
  unlinkWallet,
  type KycStatusRead,
  type LinkedWallet,
} from '../lib/kycClient';
import { getReputation, type Reputation } from '../lib/contract';
import { currentWalletName } from '../lib/wallet';
import { Avatar } from '../components/Avatar';
import { IdentityBadge } from '../components/kyc/IdentityBadge';
import { CopyButton } from '../components/CopyButton';
import { ConnectButton } from '../components/ConnectButton';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { Button } from '../components/Button';
import { navigate } from '../lib/router';
import { shortAddr, formatAmount, formatPhp } from '../lib/format';
import { friendlyError } from '../lib/errors';

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
  const { address, kycStatus, refreshKyc } = useWallet();
  const [kyc, setKyc] = useState<KycStatusRead | null>(null);
  const [rep, setRep] = useState<Reputation | null>(null);
  const [repLoading, setRepLoading] = useState(false);

  // Linked-wallet management state.
  const [linking, setLinking] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [eraseTarget, setEraseTarget] = useState<LinkedWallet | null>(null);
  const [busyAddr, setBusyAddr] = useState<string | null>(null);

  const loadKyc = useCallback(async (isStale?: () => boolean) => {
    try {
      const k = await fetchKycStatus();
      if (!isStale?.()) setKyc(k);
    } catch {
      if (!isStale?.()) setKyc(null);
    }
  }, []);

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
    void loadKyc(() => ignore);
    void getReputation(address, address)
      .then((r) => { if (!ignore) setRep(r); })
      .catch(() => { if (!ignore) setRep(null); })
      .finally(() => { if (!ignore) setRepLoading(false); });
    return () => { ignore = true; };
  }, [address, loadKyc]);

  // Re-read status here and refresh the global gating status after a change.
  const reload = useCallback(async () => {
    await loadKyc();
    await refreshKyc();
  }, [loadKyc, refreshKyc]);

  async function doLink() {
    setLinking(true);
    setActionError(null);
    try {
      // Use the wallet list the link endpoint returns, so we only refresh the
      // global gating status once (no extra kyc-status fetch for the list).
      const res = await linkWallet();
      setKyc((prev) => (prev ? { ...prev, linkedWallets: res.wallets } : prev));
      await refreshKyc();
    } catch (e) {
      // The user closing the wallet picker is not an error.
      const msg = e instanceof Error ? e.message : String(e);
      if (!/cancel/i.test(msg)) setActionError(linkErrorMessage(e));
    } finally {
      setLinking(false);
    }
  }

  async function doRemove(w: LinkedWallet, confirm: boolean) {
    setBusyAddr(w.address);
    setActionError(null);
    try {
      await unlinkWallet(w.address, confirm);
      setEraseTarget(null);
      await reload();
    } catch (e) {
      setActionError(friendlyError(e));
    } finally {
      setBusyAddr(null);
    }
  }

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
  const linked = kyc?.linkedWallets ?? [];

  return (
    <div className="mx-auto max-w-app space-y-4 px-1">
      <h1 className="text-[22px] font-semibold tracking-tight text-ink">Profile</h1>

      {/* Identity */}
      <div className="flex items-center gap-3 rounded-card border border-hairline bg-paper p-4">
        <Avatar addr={address} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="mono truncate text-[14px] text-ink">{shortAddr(address)}</span>
            <CopyButton value={address} label="Copy address" />
          </div>
          <p className="mt-0.5 flex items-center gap-1 text-[12px] text-slate">
            <Wallet size={12} aria-hidden /> Connected with {currentWalletName()}
          </p>
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

      {/* Linked wallets (only meaningful once verified) */}
      {verified && (
        <div className="rounded-card border border-hairline bg-paper p-4">
          <div className="flex items-center gap-2">
            <h2 className="text-[13px] font-semibold uppercase tracking-wider text-slate">Linked wallets</h2>
            <span className="rounded-pill bg-accent-tint px-2 py-0.5 text-[11px] font-semibold text-accent-deep">
              {linked.length}
            </span>
          </div>
          <p className="mt-1.5 text-[12px] text-slate">
            Wallets that share this verified identity. Any of them can send protected payments as you.
          </p>

          <ul className="mt-3 space-y-2">
            {linked.map((w) => (
              <li key={w.address} className="flex items-center gap-2.5 rounded-control border border-hairline bg-canvas px-3 py-2.5">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-pill bg-mist text-slate">
                  <Wallet size={15} aria-hidden />
                </span>
                <span className="mono min-w-0 flex-1 truncate text-[13px] text-ink">{shortAddr(w.address)}</span>
                {w.isVerifier && (
                  <span className="inline-flex items-center gap-1 rounded-pill bg-accent-tint px-2 py-0.5 text-[11px] text-accent-deep">
                    <BadgeCheck size={12} aria-hidden /> Verified
                  </span>
                )}
                {w.isCurrent && <span className="text-[11px] text-slate">This wallet</span>}
                <button
                  onClick={() =>
                    w.isVerifier || linked.length <= 1
                      ? setEraseTarget(w)
                      : void doRemove(w, false)
                  }
                  disabled={busyAddr === w.address}
                  aria-label={`Remove ${shortAddr(w.address)}`}
                  className="grid h-7 w-7 shrink-0 place-items-center rounded-pill text-slate hover:bg-mist hover:text-refund disabled:opacity-40 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
                >
                  {busyAddr === w.address ? <Loader2 size={14} className="animate-spin" aria-hidden /> : <X size={14} aria-hidden />}
                </button>
              </li>
            ))}
          </ul>

          <button
            onClick={doLink}
            disabled={linking}
            className="mt-3 inline-flex items-center gap-1.5 rounded-control border border-hairline bg-paper px-3 py-2 text-[13px] text-accent-deep transition hover:border-accent/30 disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
          >
            {linking ? <Loader2 size={15} className="animate-spin" aria-hidden /> : <Plus size={15} aria-hidden />}
            {linking ? 'Linking...' : 'Link a wallet'}
          </button>
          <p className="mt-1.5 text-[12px] text-slate">
            Opens your wallet picker. Choose another wallet (xBull runs in the browser, no install), sign once, and it joins this identity.
          </p>

          {actionError && <p className="mt-2 text-[13px] text-refund">{actionError}</p>}
        </div>
      )}

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

      {/* Confirm dialog for removing the verifier wallet / erasing the identity */}
      <ConfirmDialog
        open={eraseTarget !== null}
        title="Erase verified identity?"
        description={
          <>
            {shortAddr(eraseTarget?.address ?? '')} holds your verification. Removing it erases your
            verified identity, and {linked.length > 1 ? `all ${linked.length} linked wallets` : 'this wallet'} will
            become unverified. You can verify again later.
          </>
        }
        confirmLabel="Erase identity"
        variant="danger"
        busy={busyAddr !== null}
        onConfirm={() => eraseTarget && doRemove(eraseTarget, true)}
        onCancel={() => setEraseTarget(null)}
      />
    </div>
  );
}

// Extract a string message from an Error, a { message } object (the wallet kit
// throws these), or anything else.
function errMessage(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (e && typeof e === 'object' && typeof (e as { message?: unknown }).message === 'string') {
    return (e as { message: string }).message;
  }
  return String(e);
}

// Map link-specific server errors to friendly copy.
function linkErrorMessage(e: unknown): string {
  const msg = errMessage(e);
  if (/signMessage|does not support/i.test(msg))
    return 'That wallet cannot sign the ownership proof. Use Freighter or xBull.';
  if (/409/.test(msg)) return 'That wallet is already verified as a separate identity.';
  if (/403/.test(msg)) return 'Verify this identity first before linking more wallets.';
  if (/401/.test(msg)) return 'Could not prove ownership of that wallet. Make sure it is the active account, then try again.';
  if (/400/.test(msg)) return 'That wallet cannot be linked (it may already be this wallet).';
  return friendlyError(e);
}
