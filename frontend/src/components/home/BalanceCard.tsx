import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, animate, m, useReducedMotion } from 'framer-motion';
import { Eye, EyeOff } from 'lucide-react';
import type { AssetBalance } from '../../lib/adapters/ChainAdapter';
import { formatFiat, totalValue, type DisplayCurrency } from '../../lib/money';
import { shortAddr } from '../../lib/format';
import { t } from '../../lib/strings';
import { useStoredState } from '../../lib/useStoredState';
import { CopyButton } from '../CopyButton';
import { EASE, DUR, SPRING } from '../motion/MotionProvider';

// The total balance card (the Home hero): a layered navy-blue card with the
// total (hide/show), a USD | PHP switch (USD by default because balances are
// USDC; PHP always an estimate), the indicative-rate note and the address with
// copy. Counts up once on first load, crossfades on currency change, flashes
// softly when a refresh changes it. The display currency never changes amounts.
export function BalanceCard({
  address,
  balances,
  loading,
  currency,
  onCurrency,
}: {
  address: string;
  balances: AssetBalance[];
  loading: boolean;
  currency: DisplayCurrency;
  onCurrency: (c: DisplayCurrency) => void;
}) {
  const [hidden, setHidden] = useStoredState<boolean>('pacta.home.hideBalance', false);
  const reduce = useReducedMotion();
  const total = totalValue(balances, currency);
  const ready = !(loading && balances.length === 0);

  // Count up once, the first time a real total is available.
  const [shown, setShown] = useState(total);
  const counted = useRef(false);
  useEffect(() => {
    if (!ready) return;
    if (counted.current || reduce) {
      setShown(total);
      return;
    }
    counted.current = true;
    const controls = animate(0, total, { duration: 0.6, ease: EASE, onUpdate: setShown });
    return () => controls.stop();
  }, [ready, total, reduce]);

  // Soft one-time flash when a later refresh changes the value.
  const [flash, setFlash] = useState(0);
  const prev = useRef<number | null>(null);
  useEffect(() => {
    if (!ready) return;
    if (prev.current !== null && Math.abs(prev.current - total) > 0.005) setFlash((n) => n + 1);
    prev.current = total;
  }, [ready, total]);

  return (
    <section
      aria-label={t('balance.label')}
      className="wallet-balance relative isolate overflow-hidden rounded-card border border-card bg-balance p-5 shadow-balance sm:p-6"
    >
      {/* Layered decoration, always behind the content: a soft blue radial
          glow, two outline rings and a dot grid. Text sits on the gradient
          stops checked by scripts/check-contrast.ts. */}
      <span aria-hidden className="wallet-balance-glow pointer-events-none absolute inset-0 -z-10 bg-balance-glow" />
      <svg aria-hidden className="pointer-events-none absolute -right-16 -top-20 -z-10 h-64 w-64" viewBox="0 0 256 256" fill="none">
        <circle cx="128" cy="128" r="104" stroke="var(--balance-deco)" strokeWidth="18" />
        <circle cx="128" cy="128" r="62" stroke="var(--balance-deco)" strokeWidth="2" />
      </svg>
      <svg aria-hidden className="pointer-events-none absolute -bottom-10 left-1/3 -z-10 h-28 w-40 opacity-70" viewBox="0 0 160 112">
        <defs>
          <pattern id="balance-dots" width="12" height="12" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1.4" fill="var(--balance-deco)" />
          </pattern>
        </defs>
        <rect width="160" height="112" fill="url(#balance-dots)" />
      </svg>

      <div className="relative">
        <div className="flex items-center justify-between gap-3">
          <span className="text-[12px] font-bold uppercase tracking-[0.12em] text-slate">{t('balance.label')}</span>
          <CurrencySwitch currency={currency} onCurrency={onCurrency} />
        </div>

        <div className="mt-3 flex items-center gap-2">
          <div className="relative min-h-[52px] flex-1" aria-live="polite">
            {!ready ? (
              <span className="mt-2 inline-block h-10 w-48 animate-pulse rounded-tile bg-paper/60" aria-label="Loading balance" />
            ) : (
              <AnimatePresence mode="popLayout" initial={false}>
                <m.p
                  key={`${currency}-${hidden}`}
                  initial={{ opacity: 0, y: reduce ? 0 : 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: reduce ? 0 : -6 }}
                  transition={{ duration: DUR.ui, ease: EASE }}
                  className="mono text-[40px] font-bold leading-tight tracking-tight text-ink"
                >
                  {hidden ? (
                    <span aria-label={t('balance.hidden')}>••••••</span>
                  ) : (
                    <m.span
                      key={flash}
                      initial={flash ? { opacity: 0.45 } : false}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.4, ease: EASE }}
                    >
                      {formatFiat(shown, currency)}
                    </m.span>
                  )}
                </m.p>
              </AnimatePresence>
            )}
          </div>
          <button
            type="button"
            onClick={() => setHidden(!hidden)}
            aria-label={hidden ? t('balance.show') : t('balance.hide')}
            aria-pressed={hidden}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-pill bg-paper/40 text-slate transition hover:bg-paper/70 hover:text-ink active:scale-[0.96] focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            {hidden ? <EyeOff size={20} aria-hidden /> : <Eye size={20} aria-hidden />}
          </button>
        </div>

        <p className="mt-1 text-[13px] text-slate">
          {currency === 'PHP' && <span className="font-semibold">{t('balance.estimate')} · </span>}
          {t('balance.indicative')}
        </p>

        <div className="mt-5 flex items-center justify-between gap-3 border-t border-[var(--balance-deco)] pt-4">
          <span className="text-[12px] font-semibold text-slate">{t('balance.walletAddress')}</span>
          <div className="inline-flex items-center gap-1 rounded-pill bg-paper/50 py-0.5 pl-3 pr-0.5 ring-1 ring-[var(--balance-deco)]">
            <span className="mono text-[13px] text-ink">{shortAddr(address, 4, 4)}</span>
            <CopyButton value={address} label={t('balance.copyAddress')} className="text-slate" />
          </div>
        </div>
      </div>
    </section>
  );
}

// Compact USD | PHP segmented control with a sliding active pill and a thin
// gradient ring around it.
function CurrencySwitch({ currency, onCurrency }: { currency: DisplayCurrency; onCurrency: (c: DisplayCurrency) => void }) {
  return (
    <div className="rounded-pill bg-gradient-to-r from-[rgba(79,107,255,0.6)] via-[rgba(37,198,217,0.45)] to-[rgba(79,107,255,0.3)] p-px">
      <div role="radiogroup" aria-label={t('balance.currency')} className="inline-flex rounded-pill bg-paper/90 p-1">
        {(['USD', 'PHP'] as const).map((c) => {
          const on = currency === c;
          return (
            <button
              key={c}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => onCurrency(c)}
              className={`relative min-h-tap min-w-tap rounded-pill px-3 text-[13px] font-bold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                on ? 'text-on-accent' : 'text-slate hover:text-ink'
              }`}
            >
              {on && (
                <m.span
                  layoutId="currency-pill"
                  aria-hidden
                  className="absolute inset-0 rounded-pill bg-accent shadow-glow"
                  transition={SPRING}
                />
              )}
              <span className="relative">{c}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
