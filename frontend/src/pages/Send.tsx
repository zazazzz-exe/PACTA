import { useMemo, useState, type ReactNode } from 'react';
import { AnimatePresence, m } from 'framer-motion';
import { ArrowLeft, ArrowUp, ArrowUpRight, CheckCircle2, ClipboardPaste, CloudOff, ShieldCheck } from 'lucide-react';
import { useWallet } from '../hooks/useWallet';
import { useBalances } from '../hooks/useBalances';
import { adapter } from '../lib/adapters/StellarAdapter';
import type { AssetBalance } from '../lib/adapters/ChainAdapter';
import { Button } from '../components/Button';
import { ConnectButton } from '../components/ConnectButton';
import { TokenIcon } from '../components/TokenIcon';
import { Keypad, applyKey, useCoarsePointer } from '../components/Keypad';
import { setPendingSend } from '../lib/pendingSend';
import { navigate } from '../lib/router';
import { isValidStellarAddress, shortAddr } from '../lib/format';
import { txExplorerUrl } from '../lib/config';
import { friendlyError } from '../lib/errors';
import { useOffline, isOffline, outboxEnqueue } from '../lib/outbox';
import { useActiveNetwork } from '../lib/activeNetwork';
import { useDisplayCurrency } from '../lib/displayCurrency';
import { useFeesCovered } from '../hooks/useFeesCovered';
import { usePhoneRecipient } from '../hooks/usePhoneRecipient';
import { ContactCard } from '../components/ContactCard';
import { t } from '../lib/strings';
import { amountValue, formatAssetAmount, formatFiat } from '../lib/money';
import { DUR, EASE } from '../components/motion/MotionProvider';

const keyOf = (b: AssetBalance) => `${b.asset.code}:${b.asset.issuer ?? 'native'}`;

// The adapter bids the SDK BASE_FEE (100 stroops) per operation and a send is
// one operation, so the network fee is at most 0.00001 XLM.
const MAX_FEE_XLM = 0.00001;

const card = 'rounded-card border border-card bg-paper p-4 shadow-card sm:p-5';

// `embedded`: rendered inside the Home bottom sheet; the sheet shows the title
// and `onDone` closes it. The /send route renders it as a full page.
export function Send({ embedded = false, onDone }: { embedded?: boolean; onDone?: () => void } = {}) {
  const { address } = useWallet();
  const { balances, loading } = useBalances(address);
  const net = useActiveNetwork();
  const [currency] = useDisplayCurrency();
  const feesCovered = useFeesCovered();
  const coarse = useCoarsePointer();

  const [to, setTo] = useState('');
  // The recipient field takes a Stellar address or a phone number (pay by phone).
  const phone = usePhoneRecipient(to);
  const recipient = phone.state === 'found' ? phone.contact.address : phone.state === 'none' ? to.trim() : '';
  const [assetKey, setAssetKey] = useState('');
  const [amount, setAmount] = useState('');
  const [reviewing, setReviewing] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sentHash, setSentHash] = useState<string | null>(null);
  const [queued, setQueued] = useState(false);
  const offline = useOffline();

  const selected = useMemo(() => {
    if (balances.length === 0) return undefined;
    return balances.find((b) => keyOf(b) === assetKey) ?? balances[0];
  }, [balances, assetKey]);

  if (!address) {
    return (
      <div className="mx-auto max-w-app px-1 py-16 text-center">
        <h1 className="text-[22px] font-bold tracking-tight text-ink">Send</h1>
        <p className="mt-2 text-[14px] text-slate">Connect a wallet to send a payment.</p>
        <div className="mt-6 flex justify-center">
          <ConnectButton />
        </div>
      </div>
    );
  }

  const code = selected?.asset.code ?? '';
  const amountNum = Number(amount);
  const fiat = amount && code ? amountValue(code, amountNum, currency) : undefined;

  // Success receipt.
  if (sentHash) {
    return (
      <Done
        tone="mint"
        icon={<CheckCircle2 size={28} aria-hidden />}
        title="Payment sent"
        body={
          <>
            {formatAssetAmount(amount, code).display} {code} to <span className="mono">{shortAddr(recipient)}</span>
          </>
        }
        link={{ href: txExplorerUrl(sentHash), label: 'View on Stellar Expert' }}
        again="Send another"
        onAgain={() => {
          setSentHash(null);
          setAmount('');
        }}
        onDone={() => (onDone ? onDone() : navigate('/home'))}
      />
    );
  }

  // Queued (offline) receipt.
  if (queued) {
    return (
      <Done
        tone="deadline"
        icon={<CloudOff size={26} aria-hidden />}
        title="Queued"
        body={
          <>
            {amount} {code} to <span className="mono">{shortAddr(recipient)}</span> will send automatically when you are back online.
          </>
        }
        again="Queue another"
        onAgain={() => {
          setQueued(false);
          setAmount('');
        }}
        onDone={() => (onDone ? onDone() : navigate('/home'))}
      />
    );
  }

  const maxNum = selected ? Number(selected.amount) : 0;
  const formError = phone.state === 'looking'
    ? 'Finding this number.'
    : phone.state === 'missing' || phone.state === 'error'
      ? 'Enter a wallet address or a phone number linked to PACTA.'
      : !isValidStellarAddress(recipient)
    ? 'Enter a valid recipient address or phone number.'
    : recipient === address
      ? 'You cannot send to yourself.'
      : !(amountNum > 0)
        ? 'Enter an amount greater than zero.'
        : amountNum > maxNum
          ? 'Amount is more than your balance.'
          : null;
  const ready = !formError && !!selected;

  async function doSendNow() {
    if (!selected) return;
    // Offline: queue the payment instead of submitting; it auto-sends on reconnect.
    if (isOffline()) {
      outboxEnqueue({ to: recipient, assetCode: selected.asset.code, issuer: selected.asset.issuer, amount });
      setReviewing(false);
      setQueued(true);
      return;
    }
    setSending(true);
    setError(null);
    try {
      const res = await adapter.send({ from: address!, to: recipient, asset: selected.asset, amount });
      setReviewing(false);
      setSentHash(res.hash);
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setSending(false);
    }
  }

  function doSendProtected() {
    setPendingSend({
      trader: recipient,
      capital: amount,
      assetCode: selected!.asset.code,
      assetIssuer: selected!.asset.issuer,
    });
    navigate('/create');
  }

  async function paste() {
    try {
      const text = await navigator.clipboard.readText();
      if (text) setTo(text.trim());
    } catch {
      /* clipboard blocked: the user can paste into the field */
    }
  }

  // Review card before anything is signed.
  if (reviewing && selected) {
    const native = code === 'XLM' && !selected.asset.issuer;
    // With the fee relayer on, PACTA pays the fee: only the amount leaves the wallet.
    const fee = feesCovered ? 0 : MAX_FEE_XLM;
    const total = native
      ? `${formatAssetAmount(String(amountNum + fee), 'XLM').display} XLM`
      : fee
        ? `${formatAssetAmount(amount, code).display} ${code} + ${MAX_FEE_XLM} XLM`
        : `${formatAssetAmount(amount, code).display} ${code}`;
    return (
      <m.div
        className="mx-auto max-w-app space-y-4 px-1"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: DUR.ui, ease: EASE }}
      >
        <button
          type="button"
          onClick={() => {
            setReviewing(false);
            setError(null);
          }}
          className="inline-flex min-h-tap items-center gap-1.5 rounded-pill pr-3 text-[14px] font-semibold text-slate hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <ArrowLeft size={18} aria-hidden /> Edit payment
        </button>
        <section aria-labelledby="send-review" className="overflow-hidden rounded-card border border-card bg-paper shadow-card">
          <div className="bg-balance px-5 pb-5 pt-4 text-center">
            <h2 id="send-review" className="text-[13px] font-bold uppercase tracking-[0.12em] text-slate">
              {offline ? 'Review queued payment' : 'Review payment'}
            </h2>
            <p className="mono mt-2 text-[32px] font-bold leading-tight text-ink">
              {formatAssetAmount(amount, code).display} <span className="text-[18px] text-slate">{code}</span>
            </p>
            {fiat !== undefined && (
              <p className="mono text-[13px] text-slate">
                {formatFiat(fiat, currency)}
                {currency === 'PHP' ? ' · estimate' : ''}
              </p>
            )}
          </div>
          <dl className="divide-y divide-[var(--hairline)] text-[14px]">
            <Line
              label="Recipient"
              value={
                <span>
                  {phone.state === 'found' && <span className="mr-1.5 font-semibold">{phone.contact.maskedName ?? to.trim()}</span>}
                  <span className="mono">{shortAddr(recipient, 6, 6)}</span>
                </span>
              }
            />
            <Line label="Amount" value={<span className="mono">{formatAssetAmount(amount, code).display} {code}</span>} />
            <Line label="Network fee" value={feesCovered ? <span className="font-semibold text-mint">{t('fee.coveredLabel')}</span> : <span className="mono">up to {MAX_FEE_XLM} XLM</span>} />
            <Line label="Total deduction" value={<span className="mono font-bold">{total}</span>} />
            <Line label="Network" value={<span className="capitalize">Stellar {net.label}</span>} />
          </dl>
        </section>
        <p className="px-1 text-[13px] text-slate">
          {offline
            ? 'You are offline. This payment is queued and sent automatically when you reconnect.'
            : 'A direct payment is final and cannot be undone. Your wallet asks you to approve it.'}
        </p>
        {error && (
          <p role="alert" className="rounded-tile bg-refund-tint px-3 py-2 text-[13px] text-refund-deep">
            {error}
          </p>
        )}
        <Button className="w-full" onClick={doSendNow} disabled={sending}>
          {sending ? 'Sending…' : offline ? 'Queue payment' : 'Confirm and send'}
        </Button>
      </m.div>
    );
  }

  return (
    <div className="mx-auto max-w-app space-y-4 px-1">
      {!embedded && <h1 className="text-[22px] font-bold tracking-tight text-ink">Send</h1>}

      {/* Recipient */}
      <section className={card}>
        <label htmlFor="send-to" className="text-[13px] font-semibold text-slate">
          Recipient
        </label>
        <div className="mt-2 flex items-center gap-2 rounded-tile border border-card bg-deep pl-3.5 focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/20">
          <input
            id="send-to"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            placeholder="Wallet address or phone number"
            spellCheck={false}
            autoComplete="off"
            className="mono h-12 min-w-0 flex-1 bg-transparent text-[14px] text-ink placeholder:text-fog focus:outline-none"
          />
          <button
            type="button"
            onClick={paste}
            className="mr-1 inline-flex min-h-tap items-center gap-1.5 rounded-pill px-3 text-[13px] font-bold text-accent hover:bg-accent-tint focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <ClipboardPaste size={16} aria-hidden /> Paste
          </button>
        </div>
        <ContactCard lookup={phone} />
      </section>

      {/* Amount */}
      <section className={card} aria-labelledby="send-amount-label">
        <div className="flex items-center justify-between gap-2">
          <span id="send-amount-label" className="text-[13px] font-semibold text-slate">
            Amount
          </span>
          {selected && (
            <span className="text-[12px] text-slate">
              Available <span className="mono font-semibold text-ink">{formatAssetAmount(selected.amount, code).display}</span> {code}
            </span>
          )}
        </div>

        {balances.length > 1 && (
          <div role="radiogroup" aria-label="Asset" className="mt-3 flex flex-wrap gap-2">
            {balances.map((b) => {
              const on = selected && keyOf(b) === keyOf(selected);
              return (
                <button
                  key={keyOf(b)}
                  type="button"
                  role="radio"
                  aria-checked={!!on}
                  onClick={() => setAssetKey(keyOf(b))}
                  className={`inline-flex min-h-tap items-center gap-2 rounded-pill border py-1 pl-1 pr-3.5 text-[14px] font-bold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                    on ? 'border-accent bg-accent-tint text-ink' : 'border-card bg-deep text-slate hover:text-ink'
                  }`}
                >
                  <TokenIcon code={b.asset.code} seed={keyOf(b)} size={30} />
                  {b.asset.code}
                </button>
              );
            })}
          </div>
        )}

        <div className="mt-4 flex items-baseline justify-center gap-2">
          <input
            aria-labelledby="send-amount-label"
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ''))}
            inputMode={coarse ? 'none' : 'decimal'}
            readOnly={coarse}
            placeholder="0"
            disabled={loading && balances.length === 0}
            className="mono w-full min-w-0 bg-transparent text-center text-[44px] font-bold leading-none text-ink placeholder:text-fog focus:outline-none"
            style={{ maxWidth: `${Math.max(2, amount.length + 1)}ch` }}
          />
          <span className="text-[20px] font-bold text-slate">{code}</span>
        </div>
        <div className="mt-2 flex items-center justify-center gap-3 text-[13px]">
          <span className="mono text-slate">
            {fiat !== undefined ? `${formatFiat(fiat, currency)}${currency === 'PHP' ? ' · estimate' : ''}` : amount ? 'No rate for this asset' : ' '}
          </span>
          {selected && selected.asset.issuer && (
            <button
              type="button"
              onClick={() => setAmount(selected.amount.replace(/\.?0+$/, ''))}
              className="min-h-tap rounded-pill px-3 font-bold text-accent hover:bg-accent-tint focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              Max
            </button>
          )}
        </div>

        {coarse && (
          <div className="mt-4">
            <Keypad onKey={(k) => setAmount((v) => applyKey(v, k))} />
          </div>
        )}
      </section>

      <AnimatePresence initial={false}>
        {formError && phone.state !== 'looking' && (to.trim() !== '' || amount !== '') && (
          <m.p
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="px-1 text-[13px] font-semibold text-refund"
          >
            {formError}
          </m.p>
        )}
      </AnimatePresence>

      {/* The fork */}
      <div className="grid gap-3 sm:grid-cols-2">
        <button
          disabled={!ready}
          onClick={() => setReviewing(true)}
          className="wallet-lift flex w-full items-start gap-3 rounded-card border border-card bg-paper p-4 text-left shadow-card disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[14px] bg-accent-tint text-accent">
            <ArrowUp size={18} aria-hidden />
          </span>
          <span>
            <span className="block text-[15px] font-bold text-ink">{offline ? 'Queue payment' : 'Send now'}</span>
            <span className="block text-[13px] text-slate">
              {offline ? 'Queued while offline, delivered when you reconnect.' : 'Pay directly. Fast and final.'}
            </span>
          </span>
        </button>

        {net.supportsPacts ? (
          <button
            disabled={!ready}
            onClick={doSendProtected}
            className="wallet-lift flex w-full items-start gap-3 rounded-card border border-accent/40 bg-mist p-4 text-left shadow-card disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[14px] bg-gradient-to-br from-accent to-accent-deep text-on-accent">
              <ShieldCheck size={18} aria-hidden />
            </span>
            <span>
              <span className="block text-[15px] font-bold text-ink">Send protected (a Pact)</span>
              <span className="block text-[13px] text-slate">Release in milestones, backed by a bond, refundable if they fail to deliver.</span>
            </span>
          </button>
        ) : (
          <div className="rounded-card border border-card bg-mist px-4 py-3 text-[13px] text-slate">
            Protected payments are not available on this network yet.
          </div>
        )}
      </div>
    </div>
  );
}

function Line({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 px-5 py-3">
      <dt className="text-slate">{label}</dt>
      <dd className="text-right text-ink">{value}</dd>
    </div>
  );
}

function Done({
  tone,
  icon,
  title,
  body,
  link,
  again,
  onAgain,
  onDone,
}: {
  tone: 'mint' | 'deadline';
  icon: ReactNode;
  title: string;
  body: ReactNode;
  link?: { href: string; label: string };
  again: string;
  onAgain: () => void;
  onDone: () => void;
}) {
  return (
    <m.div
      className="mx-auto max-w-app space-y-5 px-1"
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: DUR.screen, ease: EASE }}
    >
      <div className="rounded-card border border-card bg-paper p-6 text-center shadow-card">
        <span
          className={`mx-auto grid h-14 w-14 place-items-center rounded-[18px] ${tone === 'mint' ? 'bg-mint-soft text-mint' : 'bg-deadline-tint text-deadline-deep'}`}
        >
          {icon}
        </span>
        <h1 className="mt-4 text-[22px] font-bold tracking-tight text-ink">{title}</h1>
        <p className="mt-1 text-[14px] text-slate">{body}</p>
        {link && (
          <a
            href={link.href}
            target="_blank"
            rel="noreferrer"
            className="mt-3 inline-flex min-h-tap items-center gap-1 text-[13px] font-bold text-accent hover:opacity-80"
          >
            {link.label} <ArrowUpRight size={14} aria-hidden />
          </a>
        )}
      </div>
      <div className="flex gap-3">
        <Button variant="secondary" className="flex-1" onClick={onAgain}>
          {again}
        </Button>
        <Button className="flex-1" onClick={onDone}>
          Done
        </Button>
      </div>
    </m.div>
  );
}
