import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowDownUp, CheckCircle2, ArrowUpRight, Loader2 } from 'lucide-react';
import { useWallet } from '../hooks/useWallet';
import { useBalances } from '../hooks/useBalances';
import { adapter } from '../lib/adapters/StellarAdapter';
import { NoRouteError, type AssetBalance, type Quote } from '../lib/adapters/ChainAdapter';
import {
  mergeToAssets,
  assetKey,
  sameAsset,
  hasTrustline,
  DEFAULT_SLIPPAGE_BPS,
} from '../lib/convert';
import { KNOWN_ASSETS, txExplorerUrl } from '../lib/config';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { Button } from '../components/Button';
import { ConnectButton } from '../components/ConnectButton';
import { friendlyError } from '../lib/errors';
import { navigate } from '../lib/router';

const keyOf = (b: AssetBalance) => assetKey(b.asset);

export function Convert() {
  const { address } = useWallet();
  const { balances, loading, refetch } = useBalances(address);

  const [fromKey, setFromKey] = useState('');
  const [toKey, setToKey] = useState('');
  const [amount, setAmount] = useState('');
  const [quote, setQuote] = useState<Quote | null>(null);
  const [quoting, setQuoting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [swapping, setSwapping] = useState(false);
  const [doneHash, setDoneHash] = useState<string | null>(null);

  const from = useMemo(() => {
    if (balances.length === 0) return undefined;
    return balances.find((b) => keyOf(b) === fromKey) ?? balances[0];
  }, [balances, fromKey]);

  const toOptions = useMemo(
    () => (from ? mergeToAssets(KNOWN_ASSETS, balances, from.asset) : []),
    [balances, from],
  );

  const to = useMemo(() => {
    if (toOptions.length === 0) return undefined;
    return toOptions.find((a) => assetKey(a) === toKey) ?? toOptions[0];
  }, [toOptions, toKey]);

  // Your balance of the destination asset (if you hold it), used for display and
  // to enable the flip (you can only send an asset you actually hold).
  const toBalance = useMemo(
    () => (to ? balances.find((b) => sameAsset(b.asset, to)) : undefined),
    [balances, to],
  );
  const toHeld = !!toBalance;

  const amountNum = Number(amount);
  const maxNum = from ? Number(from.amount) : 0;
  const overBalance = amountNum > maxNum;
  const validAmount = amountNum > 0 && !overBalance;

  // Debounced live quote with a stale-guard.
  const reqId = useRef(0);
  useEffect(() => {
    setQuote(null);
    setError(null);
    if (!from || !to || !validAmount) return;
    const id = ++reqId.current;
    setQuoting(true);
    const t = setTimeout(async () => {
      try {
        const q = await adapter.getQuote({ from: from.asset, to, amount });
        if (id === reqId.current) setQuote(q);
      } catch (e) {
        if (id === reqId.current) {
          setError(e instanceof NoRouteError ? 'No route for this pair on testnet.' : friendlyError(e));
        }
      } finally {
        if (id === reqId.current) setQuoting(false);
      }
    }, 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from && assetKey(from.asset), to && assetKey(to), amount]);

  if (!address) {
    return (
      <div className="mx-auto max-w-app px-1 py-16 text-center">
        <h1 className="text-[22px] font-semibold tracking-tight text-ink">Convert</h1>
        <p className="mt-2 text-[14px] text-slate">Connect a wallet to convert assets.</p>
        <div className="mt-6 flex justify-center">
          <ConnectButton />
        </div>
      </div>
    );
  }

  if (doneHash) {
    return (
      <div className="mx-auto max-w-app space-y-5 px-1 text-center">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-pill bg-accent text-white">
          <CheckCircle2 size={28} aria-hidden />
        </span>
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight text-ink">Converted</h1>
          <p className="mt-1 text-[14px] text-slate">
            {amount} {from?.asset.code} to {to?.code}
          </p>
        </div>
        <a
          href={txExplorerUrl(doneHash)}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-[13px] text-accent-deep hover:opacity-80"
        >
          View on Stellar Expert <ArrowUpRight size={14} aria-hidden />
        </a>
        <div className="flex gap-3">
          <Button
            variant="secondary"
            className="flex-1"
            onClick={() => {
              setDoneHash(null);
              setAmount('');
              setQuote(null);
            }}
          >
            Convert more
          </Button>
          <Button className="flex-1" onClick={() => navigate('/home')}>Done</Button>
        </div>
      </div>
    );
  }

  const needTrust = to ? !hasTrustline(balances, to) : false;
  const ready = !!from && !!to && !!quote && validAmount && !quoting && !sameAsset(from.asset, to);

  // Swap the from/to assets. Only possible when you hold the current "to" asset
  // (it becomes the new "from").
  function flip() {
    if (!from || !to || !toHeld) return;
    const newFrom = assetKey(to);
    const newTo = keyOf(from);
    setFromKey(newFrom);
    setToKey(newTo);
    setAmount('');
    setQuote(null);
    setError(null);
  }

  async function doSwap() {
    if (!quote || !address) return;
    setSwapping(true);
    setError(null);
    try {
      const res = await adapter.swap({ ...quote, sender: address });
      setConfirming(false);
      setDoneHash(res.hash);
      refetch();
    } catch (e) {
      setError(friendlyError(e));
      setConfirming(false);
    } finally {
      setSwapping(false);
    }
  }

  return (
    <div className="mx-auto max-w-app space-y-5 px-1">
      <h1 className="text-[22px] font-semibold tracking-tight text-ink">Convert</h1>

      {/* From / To with a one-tap flip */}
      <div className="space-y-2">
        <div className="rounded-card border border-hairline bg-paper p-3.5">
          <div className="flex items-center justify-between text-[12px] text-slate">
            <span>From</span>
            {from && (
              <span>
                Balance: <span className="mono text-ink">{from.amount}</span> {from.asset.code}
              </span>
            )}
          </div>
          <select
            value={from ? keyOf(from) : ''}
            onChange={(e) => setFromKey(e.target.value)}
            disabled={loading || balances.length === 0}
            className="mt-1 h-9 w-full bg-transparent text-[16px] font-medium text-ink focus:outline-none"
          >
            {balances.map((b) => (
              <option key={keyOf(b)} value={keyOf(b)}>
                {b.asset.code}
              </option>
            ))}
          </select>
        </div>

        <div className="relative flex justify-center">
          <button
            onClick={flip}
            disabled={!toHeld}
            aria-label="Swap from and to"
            title={toHeld ? 'Swap from and to' : 'You need a balance of the destination asset to flip'}
            className="-my-4 grid h-9 w-9 place-items-center rounded-pill border border-hairline bg-paper text-slate shadow-card transition hover:border-accent/40 hover:text-accent disabled:opacity-40 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
          >
            <ArrowDownUp size={16} aria-hidden />
          </button>
        </div>

        <div className="rounded-card border border-hairline bg-paper p-3.5">
          <div className="flex items-center justify-between text-[12px] text-slate">
            <span>To</span>
            {toBalance && (
              <span>
                Balance: <span className="mono text-ink">{toBalance.amount}</span> {to?.code}
              </span>
            )}
          </div>
          <select
            value={to ? assetKey(to) : ''}
            onChange={(e) => setToKey(e.target.value)}
            disabled={!from || toOptions.length === 0}
            className="mt-1 h-9 w-full bg-transparent text-[16px] font-medium text-ink focus:outline-none"
          >
            {toOptions.map((a) => (
              <option key={assetKey(a)} value={assetKey(a)}>
                {a.code}
              </option>
            ))}
          </select>
        </div>
      </div>

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

      {overBalance && <p className="text-[13px] text-refund">Amount is more than your balance.</p>}

      {/* Quote panel */}
      {validAmount && !overBalance && (
        <div className="rounded-card border border-hairline bg-paper p-4 text-[13px]">
          {quoting ? (
            <span className="flex items-center gap-2 text-slate">
              <Loader2 size={15} className="animate-spin" aria-hidden /> Finding the best rate...
            </span>
          ) : quote ? (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-slate">You get about</span>
                <span className="mono text-ink">{quote.amountOut} {to?.code}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate">Minimum received</span>
                <span className="mono text-ink">{quote.minReceived} {to?.code}</span>
              </div>
              <p className="text-[12px] text-slate">Slippage tolerance {DEFAULT_SLIPPAGE_BPS / 100}%.</p>
              {needTrust && (
                <p className="text-[12px] text-slate">
                  A trustline for {to?.code} will be added in the same transaction (a small XLM reserve applies).
                </p>
              )}
            </div>
          ) : null}
        </div>
      )}

      {error && <p className="text-[13px] text-refund">{error}</p>}

      <button
        disabled={!ready}
        onClick={() => setConfirming(true)}
        className="flex w-full items-center justify-center gap-2 rounded-control bg-accent px-4 py-3.5 text-[15px] font-medium text-white transition hover:bg-accent-deep disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
      >
        <ArrowDownUp size={18} aria-hidden /> Convert
      </button>

      <ConfirmDialog
        open={confirming}
        title="Convert"
        description={
          <>
            You are converting <span className="mono text-ink">{amount} {from?.asset.code}</span> to about{' '}
            <span className="mono text-ink">{quote?.amountOut} {to?.code}</span> (at least{' '}
            <span className="mono text-ink">{quote?.minReceived} {to?.code}</span>).
            {needTrust && ' A trustline for the destination asset will be added.'}
          </>
        }
        confirmLabel="Convert"
        busy={swapping}
        onConfirm={doSwap}
        onCancel={() => {
          setConfirming(false);
          setError(null);
        }}
      />
    </div>
  );
}
