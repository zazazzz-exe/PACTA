import { useMemo, useState } from 'react';
import { ArrowUp, ShieldCheck, CheckCircle2, ArrowUpRight } from 'lucide-react';
import { useWallet } from '../hooks/useWallet';
import { useBalances } from '../hooks/useBalances';
import { adapter } from '../lib/adapters/StellarAdapter';
import type { AssetBalance } from '../lib/adapters/ChainAdapter';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { Button } from '../components/Button';
import { CopyButton } from '../components/CopyButton';
import { ConnectButton } from '../components/ConnectButton';
import { setPendingSend } from '../lib/pendingSend';
import { navigate } from '../lib/router';
import { isValidStellarAddress, shortAddr } from '../lib/format';
import { txExplorerUrl } from '../lib/config';
import { friendlyError } from '../lib/errors';

const keyOf = (b: AssetBalance) => `${b.asset.code}:${b.asset.issuer ?? 'native'}`;

export function Send() {
  const { address } = useWallet();
  const { balances, loading } = useBalances(address);

  const [to, setTo] = useState('');
  const [assetKey, setAssetKey] = useState('');
  const [amount, setAmount] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sentHash, setSentHash] = useState<string | null>(null);

  const selected = useMemo(() => {
    if (balances.length === 0) return undefined;
    return balances.find((b) => keyOf(b) === assetKey) ?? balances[0];
  }, [balances, assetKey]);

  if (!address) {
    return (
      <div className="mx-auto max-w-app px-1 py-16 text-center">
        <h1 className="text-[22px] font-semibold tracking-tight text-ink">Send</h1>
        <p className="mt-2 text-[14px] text-slate">Connect a wallet to send a payment.</p>
        <div className="mt-6 flex justify-center">
          <ConnectButton />
        </div>
      </div>
    );
  }

  // Success receipt.
  if (sentHash) {
    return (
      <div className="mx-auto max-w-app space-y-5 px-1 text-center">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-pill bg-accent text-white">
          <CheckCircle2 size={28} aria-hidden />
        </span>
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight text-ink">Sent</h1>
          <p className="mt-1 text-[14px] text-slate">
            {amount} {selected?.asset.code} to <span className="mono">{shortAddr(to)}</span>
          </p>
        </div>
        <a
          href={txExplorerUrl(sentHash)}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-[13px] text-accent-deep hover:opacity-80"
        >
          View on Stellar Expert <ArrowUpRight size={14} aria-hidden />
        </a>
        <div className="flex gap-3">
          <Button variant="secondary" className="flex-1" onClick={() => { setSentHash(null); setAmount(''); }}>
            Send another
          </Button>
          <Button className="flex-1" onClick={() => navigate('/home')}>Done</Button>
        </div>
      </div>
    );
  }

  const amountNum = Number(amount);
  const maxNum = selected ? Number(selected.amount) : 0;
  const isXlm = selected?.asset.code === 'XLM' && !selected?.asset.issuer;

  const formError =
    !isValidStellarAddress(to.trim())
      ? 'Enter a valid recipient address.'
      : to.trim() === address
        ? 'You cannot send to yourself.'
        : !(amountNum > 0)
          ? 'Enter an amount greater than zero.'
          : amountNum > maxNum
            ? 'Amount is more than your balance.'
            : null;

  const ready = !formError && !!selected;

  async function doSendNow() {
    if (!selected) return;
    setSending(true);
    setError(null);
    try {
      const res = await adapter.send({ from: address!, to: to.trim(), asset: selected.asset, amount });
      setConfirming(false);
      setSentHash(res.hash);
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setSending(false);
    }
  }

  function doSendProtected() {
    setPendingSend({ trader: to.trim(), capital: amount });
    navigate('/create');
  }

  return (
    <div className="mx-auto max-w-app space-y-5 px-1">
      <h1 className="text-[22px] font-semibold tracking-tight text-ink">Send</h1>

      <label className="block">
        <span className="mb-1.5 block text-[13px] text-slate">Recipient address</span>
        <input
          value={to}
          onChange={(e) => setTo(e.target.value)}
          placeholder="G..."
          spellCheck={false}
          className="mono h-12 w-full rounded-control border border-hairline bg-paper px-3.5 text-ink placeholder:text-fog focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/15"
        />
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="mb-1.5 block text-[13px] text-slate">Asset</span>
          <select
            value={selected ? keyOf(selected) : ''}
            onChange={(e) => setAssetKey(e.target.value)}
            disabled={loading || balances.length === 0}
            className="h-12 w-full rounded-control border border-hairline bg-paper px-3 text-ink focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/15"
          >
            {balances.map((b) => (
              <option key={keyOf(b)} value={keyOf(b)}>
                {b.asset.code}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1.5 block text-[13px] text-slate">Amount</span>
          <input
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            type="number"
            min="0"
            step="any"
            placeholder="0.0"
            className="mono h-12 w-full rounded-control border border-hairline bg-paper px-3.5 text-ink placeholder:text-fog focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/15"
          />
        </label>
      </div>
      {selected && (
        <p className="-mt-2 text-[12px] text-slate">
          Balance: <span className="mono">{selected.amount}</span> {selected.asset.code}
        </p>
      )}

      {formError && amount !== '' && <p className="text-[13px] text-refund">{formError}</p>}
      {error && <p className="text-[13px] text-refund">{error}</p>}

      {/* The fork */}
      <div className="space-y-3 pt-1">
        <button
          disabled={!ready}
          onClick={() => setConfirming(true)}
          className="flex w-full items-start gap-3 rounded-card border border-hairline bg-paper p-4 text-left transition hover:border-accent/30 disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
        >
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-pill bg-mist text-slate">
            <ArrowUp size={18} aria-hidden />
          </span>
          <span>
            <span className="block text-[15px] font-medium text-ink">Send now</span>
            <span className="block text-[13px] text-slate">Pay directly. Fast and final.</span>
          </span>
        </button>

        <button
          disabled={!ready || !isXlm}
          onClick={doSendProtected}
          className="flex w-full items-start gap-3 rounded-card border border-accent/30 bg-accent-tint p-4 text-left transition hover:border-accent/50 disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
        >
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-pill bg-accent text-white">
            <ShieldCheck size={18} aria-hidden />
          </span>
          <span>
            <span className="block text-[15px] font-medium text-ink">Send protected (a Pact)</span>
            <span className="block text-[13px] text-slate">
              {isXlm
                ? 'Release in milestones, backed by a bond, refundable if they fail to deliver.'
                : 'Protected payments support XLM in this build.'}
            </span>
          </span>
        </button>
      </div>

      <ConfirmDialog
        open={confirming}
        title="Send now"
        description={
          <>
            You are sending <span className="mono text-ink">{amount} {selected?.asset.code}</span> to{' '}
            <span className="mono text-ink">{shortAddr(to.trim())}</span>. This is final and cannot be undone.
          </>
        }
        confirmLabel="Send"
        busy={sending}
        onConfirm={doSendNow}
        onCancel={() => setConfirming(false)}
      />

      <div className="flex items-center justify-center gap-1.5 pt-1 text-[12px] text-slate">
        <span className="mono">{shortAddr(address)}</span>
        <CopyButton value={address} />
      </div>
    </div>
  );
}
