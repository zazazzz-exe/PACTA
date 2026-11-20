import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, m } from 'framer-motion';
import { ArrowDownUp, CheckCircle2, ArrowUpRight, ChevronDown, Loader2 } from 'lucide-react';
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
import { txExplorerUrl } from '../lib/config';
import { useActiveNetwork } from '../lib/activeNetwork';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { Button } from '../components/Button';
import { ConnectButton } from '../components/ConnectButton';
import { friendlyError } from '../lib/errors';
import { navigate } from '../lib/router';
import { useDisplayCurrency } from '../lib/displayCurrency';
import { useFeesCovered } from '../hooks/useFeesCovered';
import { t } from '../lib/strings';
import { amountValue, formatAssetAmount, formatFiat } from '../lib/money';
import { TokenIcon } from '../components/TokenIcon';
import { DUR, EASE } from '../components/motion/MotionProvider';

const keyOf = (b: AssetBalance) => assetKey(b.asset);

export function Convert() {
  const { address } = useWallet();
  const { balances, loading, refetch } = useBalances(address);
  const net = useActiveNetwork();
  const [currency] = useDisplayCurrency();
  const feesCovered = useFeesCovered();

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
    () => (from ? mergeToAssets(net.knownAssets, balances, from.asset) : []),
    [balances, from, net.knownAssets],
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
          setError(e instanceof NoRouteError ? 'No route for this pair.' : friendlyError(e));
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
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-[18px] bg-mint-soft text-mint">
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
          className="inline-flex min-h-tap items-center gap-1 text-[13px] text-accent hover:opacity-80"
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

  const inUsd = from && amount ? amountValue(from.asset.code, amountNum, currency) : undefined;
  const outUsd = quote && to ? amountValue(to.code, Number(quote.amountOut), currency) : undefined;
  const rate = quote && amountNum > 0 ? Number(quote.amountOut) / amountNum : undefined;
  const fiatLine = (v: number | undefined) => (v === undefined ? ' ' : `${formatFiat(v, currency)}${currency === 'PHP' ? ' · estimate' : ''}`);

  return (
    <div className="mx-auto max-w-app space-y-4 px-1">
      <h1 className="text-[22px] font-bold tracking-tight text-ink">Convert</h1>

      {/* From / To cards with a round flip control between them */}
      <div className="relative space-y-2">
        <section className="rounded-card border border-card bg-paper p-4 shadow-card sm:p-5" aria-label="From">
          <div className="flex items-center justify-between text-[13px]">
            <span className="font-semibold text-slate">From</span>
            {from && (
              <span className="text-slate">
                Available <span className="mono font-semibold text-ink">{formatAssetAmount(from.amount, from.asset.code).display}</span>
              </span>
            )}
          </div>
          <div className="mt-3 flex items-center gap-3">
            <AssetPicker
              label="From asset"
              value={from ? keyOf(from) : ''}
              code={from?.asset.code}
              disabled={loading || balances.length === 0}
              options={balances.map((b) => ({ key: keyOf(b), code: b.asset.code }))}
              onChange={setFromKey}
            />
            <input
              aria-label="Amount to convert"
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ''))}
              inputMode="decimal"
              placeholder="0"
              className="mono min-w-0 flex-1 bg-transparent text-right text-[30px] font-bold text-ink placeholder:text-fog focus:outline-none"
            />
          </div>
          <div className="mt-1 flex items-center justify-between text-[12px]">
            {from && from.asset.issuer ? (
              <button
                type="button"
                onClick={() => setAmount(from.amount.replace(/\.?0+$/, ''))}
                className="min-h-tap rounded-pill px-2 font-bold text-accent hover:bg-accent-tint focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                Max
              </button>
            ) : (
              <span />
            )}
            <span className="mono text-slate">{fiatLine(inUsd)}</span>
          </div>
        </section>

        <div className="pointer-events-none absolute inset-x-0 top-1/2 z-10 flex -translate-y-1/2 justify-center">
          <m.button
            type="button"
            onClick={flip}
            disabled={!toHeld}
            aria-label="Swap from and to"
            title={toHeld ? 'Swap from and to' : 'You need a balance of the destination asset to flip'}
            whileTap={toHeld ? { scale: 0.92, rotate: 180 } : undefined}
            className="pointer-events-auto grid h-12 w-12 place-items-center rounded-pill border-4 border-canvas bg-accent text-on-accent shadow-glow transition hover:bg-accent-deep disabled:bg-mist disabled:text-slate disabled:shadow-none focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <ArrowDownUp size={18} aria-hidden />
          </m.button>
        </div>

        <section className="rounded-card border border-card bg-mist p-4 shadow-card sm:p-5" aria-label="To">
          <div className="flex items-center justify-between text-[13px]">
            <span className="font-semibold text-slate">To (estimated)</span>
            {toBalance && (
              <span className="text-slate">
                Balance <span className="mono font-semibold text-ink">{formatAssetAmount(toBalance.amount, toBalance.asset.code).display}</span>
              </span>
            )}
          </div>
          <div className="mt-3 flex items-center gap-3">
            <AssetPicker
              label="To asset"
              value={to ? assetKey(to) : ''}
              code={to?.code}
              disabled={!from || toOptions.length === 0}
              options={toOptions.map((a) => ({ key: assetKey(a), code: a.code }))}
              onChange={setToKey}
            />
            <AnimatePresence mode="popLayout" initial={false}>
              <m.span
                key={quote?.amountOut ?? (quoting ? 'q' : 'none')}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: DUR.ui, ease: EASE }}
                className="mono flex min-w-0 flex-1 justify-end truncate text-right text-[30px] font-bold text-ink"
              >
                {quoting ? (
                  <Loader2 size={22} className="animate-spin text-slate" aria-label="Finding the best rate" />
                ) : quote ? (
                  formatAssetAmount(quote.amountOut, to?.code ?? '').display
                ) : (
                  <span className="text-fog">0</span>
                )}
              </m.span>
            </AnimatePresence>
          </div>
          <p className="mono mt-1 text-right text-[12px] text-slate">{fiatLine(outUsd)}</p>
        </section>
      </div>

      {overBalance && <p className="px-1 text-[13px] font-semibold text-refund">Amount is more than your balance.</p>}

      {/* Details */}
      {quote && validAmount && (
        <m.dl
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: DUR.ui, ease: EASE }}
          className="divide-y divide-[var(--hairline)] rounded-card border border-card bg-paper text-[13px] shadow-card"
        >
          {rate !== undefined && (
            <Detail label="Exchange rate" value={`1 ${from?.asset.code} ≈ ${formatAssetAmount(rate.toFixed(7), to?.code ?? '').display} ${to?.code}`} />
          )}
          <Detail label="Estimated output" value={`${formatAssetAmount(quote.amountOut, to?.code ?? '').display} ${to?.code}`} />
          <Detail label="Minimum received" value={`${formatAssetAmount(quote.minReceived, to?.code ?? '').display} ${to?.code}`} />
          <Detail label="Slippage tolerance" value={`${DEFAULT_SLIPPAGE_BPS / 100}%`} />
          <Detail label="Network fee" value={feesCovered ? t('fee.coveredLabel') : 'up to 0.00001 XLM'} />
          {needTrust && (
            <p className="px-4 py-3 text-[12px] text-slate">
              A trustline for {to?.code} will be added in the same transaction (a small XLM reserve applies).
            </p>
          )}
        </m.dl>
      )}

      {error && <p className="px-1 text-[13px] font-semibold text-refund">{error}</p>}

      <Button className="w-full" disabled={!ready} onClick={() => setConfirming(true)}>
        Review conversion
      </Button>

      <ConfirmDialog
        open={confirming}
        title="Confirm conversion"
        description={
          <>
            You are converting <span className="mono text-ink">{amount} {from?.asset.code}</span> to about{' '}
            <span className="mono text-ink">{quote?.amountOut} {to?.code}</span> (at least{' '}
            <span className="mono text-ink">{quote?.minReceived} {to?.code}</span>). {feesCovered ? t('fee.coveredNote') : 'Network fee up to 0.00001 XLM.'}
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

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3">
      <dt className="text-slate">{label}</dt>
      <dd className="mono text-right text-ink">{value}</dd>
    </div>
  );
}

// A token chip that is really a native <select> (keyboard and screen-reader
// friendly), styled as a rounded asset pill.
function AssetPicker({
  label,
  value,
  code,
  options,
  disabled,
  onChange,
}: {
  label: string;
  value: string;
  code?: string;
  options: { key: string; code: string }[];
  disabled?: boolean;
  onChange: (key: string) => void;
}) {
  return (
    <label className="relative inline-flex min-h-tap shrink-0 items-center gap-2 rounded-pill border border-card bg-deep py-1 pl-1 pr-8 focus-within:ring-2 focus-within:ring-accent">
      <span className="sr-only">{label}</span>
      {code ? <TokenIcon code={code} size={32} /> : <span className="h-8 w-8 rounded-full bg-mist" />}
      <span className="text-[15px] font-bold text-ink">{code ?? '...'}</span>
      <ChevronDown size={16} aria-hidden className="pointer-events-none absolute right-2.5 text-slate" />
      <select
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className="absolute -inset-px cursor-pointer rounded-pill opacity-0 disabled:cursor-not-allowed"
      >
        {options.map((o) => (
          <option key={o.key} value={o.key}>
            {o.code}
          </option>
        ))}
      </select>
    </label>
  );
}
