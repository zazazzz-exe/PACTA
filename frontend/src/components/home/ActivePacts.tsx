import { m } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import type { PactSummary } from '../../lib/pactSummary';
import { amountValue, formatBaseUnits, formatFiat, type DisplayCurrency } from '../../lib/money';
import { fromBaseUnits, shortAddr } from '../../lib/format';
import { t } from '../../lib/strings';
import { Avatar } from '../ui/Avatar';
import { Button } from '../ui/Button';
import { EASE } from '../motion/MotionProvider';
import { SectionHeader } from './SectionHeader';
import { PactShield } from './PactShield';

// Open Pacts on Home: a horizontal row of Pact cards (title, counterparty,
// agreement amount in the display currency plus the real token amount,
// secured funds, a thin milestone bar, status and "View Pact"). A friendly
// empty state otherwise. All figures come from the contract reads.
export function ActivePacts({
  pacts,
  loading,
  currency,
  onOpen,
  onStart,
  onSeeAll,
}: {
  pacts: PactSummary[];
  loading: boolean;
  currency: DisplayCurrency;
  onOpen: (id: bigint) => void;
  onStart: () => void;
  onSeeAll: () => void;
}) {
  return (
    <section aria-labelledby="home-pacts">
      <SectionHeader id="home-pacts" title={t('pacts.title')} action={pacts.length ? { label: t('pacts.seeAll'), onClick: onSeeAll } : undefined} />
      {loading && pacts.length === 0 ? (
        <div className="flex gap-3 overflow-hidden" aria-hidden>
          {[0, 1].map((i) => (
            <div key={i} className="h-[196px] w-[288px] shrink-0 animate-pulse rounded-card bg-mist" />
          ))}
        </div>
      ) : pacts.length === 0 ? (
        <div className="relative isolate overflow-hidden rounded-card border border-card bg-paper p-5 shadow-card">
          <span
            aria-hidden
            className="pointer-events-none absolute -right-10 -top-10 -z-10 h-40 w-40 rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(79,107,255,0.16), transparent 70%)' }}
          />
          <div className="flex items-center gap-4">
            <span className="grid h-16 w-16 shrink-0 place-items-center rounded-[20px] bg-accent-tint">
              <PactShield size={40} glow={false} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[15px] font-bold text-ink">{t('pacts.empty.title')}</p>
              <p className="mt-0.5 text-[13px] leading-snug text-slate">{t('pacts.empty.body')}</p>
            </div>
          </div>
          <Button size="sm" className="mt-4 w-full sm:w-auto" onClick={onStart}>
            {t('pacts.empty.cta')}
          </Button>
        </div>
      ) : (
        <ul className="-mx-4 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none]">
          {pacts.map((p) => (
            <li key={String(p.id)} className="snap-start">
              <PactCard pact={p} currency={currency} onOpen={() => onOpen(p.id)} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

type Tone = 'accent' | 'deadline' | 'mint';
const TONES: Record<Tone, string> = {
  accent: 'bg-accent-tint text-accent',
  deadline: 'bg-deadline-tint text-deadline-deep',
  mint: 'bg-mint-soft text-mint',
};

export function pactStatus(p: PactSummary): { label: string; tone: Tone } {
  if (p.phase === 'awaitingBond') return { label: t('pacts.status.awaitingBond'), tone: 'deadline' };
  if (p.phase === 'awaitingDeposit') return { label: t('pacts.status.awaitingDeposit'), tone: 'deadline' };
  if (p.phase === 'allReleased') return { label: t('pacts.status.released'), tone: 'mint' };
  return { label: t('pacts.status.active'), tone: 'accent' };
}

export function StatusBadge({ label, tone }: { label: string; tone: Tone }) {
  return (
    <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-pill px-2.5 py-1 text-[12px] font-bold ${TONES[tone]}`}>
      <span aria-hidden className="h-1.5 w-1.5 rounded-pill bg-current" />
      {label}
    </span>
  );
}

function fiatOf(base: bigint, code: string, currency: DisplayCurrency): string | null {
  const v = amountValue(code, fromBaseUnits(base), currency);
  return v === undefined ? null : formatFiat(v, currency);
}

function PactCard({ pact: p, currency, onOpen }: { pact: PactSummary; currency: DisplayCurrency; onOpen: () => void }) {
  const status = pactStatus(p);
  const total = formatBaseUnits(p.capital, p.tokenCode);
  const totalFiat = fiatOf(p.capital, p.tokenCode, currency);
  const secured = formatBaseUnits(p.secured, p.tokenCode);
  const securedFiat = fiatOf(p.secured, p.tokenCode, currency);
  return (
    <m.button
      type="button"
      onClick={onOpen}
      whileTap={{ scale: 0.98 }}
      className="wallet-lift flex w-[288px] flex-col gap-3 rounded-card border border-card bg-paper p-4 text-left shadow-card focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
    >
      <div>
        <div className="flex items-center justify-between gap-2">
          <p className="text-[12px] font-bold uppercase tracking-[0.1em] text-slate">{t('pacts.cardTitle', { id: String(p.id) })}</p>
          <StatusBadge {...status} />
        </div>
        <div className="mt-1.5 flex min-w-0 items-center gap-2">
          <Avatar addr={p.counterparty} size="sm" />
          <span className="truncate text-[13px] text-slate">
            {p.role === 'sender' ? t('pacts.to') : t('pacts.from')} <span className="mono text-ink">{shortAddr(p.counterparty, 4, 4)}</span>
          </span>
        </div>
      </div>

      <div>
        <p className="mono text-[22px] font-bold leading-tight text-ink" title={total.full}>
          {totalFiat ?? `${total.display} ${p.tokenCode}`}
        </p>
        {totalFiat && (
          <p className="mono text-[12px] text-slate">
            {total.display} {p.tokenCode}
          </p>
        )}
      </div>

      <div>
        <div className="flex items-center justify-between text-[12px]">
          <span className="text-slate">
            {t('pacts.secured')} <span className="mono font-semibold text-ink">{securedFiat ?? `${secured.display} ${p.tokenCode}`}</span>
          </span>
          <span className="font-semibold text-slate">{t('pacts.progress', { done: p.released, total: p.total })}</span>
        </div>
        <div
          className="mt-2 h-1.5 overflow-hidden rounded-pill bg-mist"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={p.total}
          aria-valuenow={p.released}
          aria-label={t('pacts.progress', { done: p.released, total: p.total })}
        >
          <m.div
            className="h-full origin-left rounded-pill bg-gradient-to-r from-accent to-cyan"
            initial={{ scaleX: 0 }}
            animate={{ scaleX: p.progress }}
            transition={{ duration: 0.6, ease: EASE, delay: 0.15 }}
          />
        </div>
      </div>

      <span className="inline-flex items-center gap-1 text-[13px] font-bold text-accent">
        {t('pacts.view')} <ArrowRight size={15} aria-hidden />
      </span>
    </m.button>
  );
}
