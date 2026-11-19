import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, animate, m, useReducedMotion } from 'framer-motion';
import { Eye, EyeOff } from 'lucide-react';
import type { AssetBalance } from '../../lib/adapters/ChainAdapter';
import { formatFiat, totalValue, type DisplayCurrency } from '../../lib/money';
import { shortAddr } from '../../lib/format';
import { t } from '../../lib/strings';
import { useStoredState } from '../../lib/useStoredState';
import { CopyButton } from '../CopyButton';
import { EASE, DUR } from '../motion/MotionProvider';

// The calm balance surface (DESIGN §7.6): total with hide/show, USD/PHP toggle
// (USD by default because balances are USDC; PHP always an estimate), the
// indicative-rate note and the address chip. Counts up once on first load,
// crossfades on currency change, flashes softly when a refresh changes it.
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
      className="relative overflow-hidden rounded-card border border-card bg-balance p-5"
    >
      {/* soft decorative circles, 8-12% */}
      <span
        aria-hidden
        className="pointer-events-none absolute -right-10 -top-12 h-40 w-40 rounded-full"
        style={{ background: 'var(--balance-deco)' }}
      />
      <span
        aria-hidden
        className="pointer-events-none absolute -bottom-16 right-16 h-32 w-32 rounded-full"
        style={{ background: 'var(--balance-deco)' }}
      />

      <div className="relative">
        <div className="flex items-center justify-between gap-3">
          <span className="text-[13px] font-semibold text-slate">{t('balance.label')}</span>
          <div role="radiogroup" aria-label={t('balance.currency')} className="inline-flex rounded-pill bg-paper/70 p-1">
            {(['USD', 'PHP'] as const).map((c) => (
              <button
                key={c}
                type="button"
                role="radio"
                aria-checked={currency === c}
                onClick={() => onCurrency(c)}
                className={`min-h-tap min-w-tap rounded-pill px-3 text-[13px] font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                  currency === c ? 'bg-accent text-on-accent' : 'text-slate hover:text-ink'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-2 flex items-center gap-2">
          <div className="relative min-h-[52px] flex-1" aria-live="polite">
            {!ready ? (
              <span className="mt-2 inline-block h-10 w-48 animate-pulse rounded-tile bg-mist" aria-label="Loading balance" />
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
            className="grid h-11 w-11 shrink-0 place-items-center rounded-pill text-slate transition hover:bg-paper/70 hover:text-ink active:scale-[0.96] focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            {hidden ? <EyeOff size={20} aria-hidden /> : <Eye size={20} aria-hidden />}
          </button>
        </div>

        <p className="mt-1 text-[13px] text-slate">
          {currency === 'PHP' && <span className="font-semibold">{t('balance.estimate')} · </span>}
          {t('balance.indicative')}
        </p>

        <div className="mt-4 inline-flex items-center gap-1 rounded-pill bg-paper/70 py-0.5 pl-3 pr-0.5">
          <span className="mono text-[13px] text-ink">{shortAddr(address, 4, 4)}</span>
          <CopyButton value={address} label={t('balance.copyAddress')} className="text-slate" />
        </div>
      </div>
    </section>
  );
}
