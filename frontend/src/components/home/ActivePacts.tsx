import { m } from 'framer-motion';
import { ChevronRight, ShieldCheck } from 'lucide-react';
import type { PactSummary } from '../../lib/pactSummary';
import { formatBaseUnits } from '../../lib/money';
import { shortAddr } from '../../lib/format';
import { t } from '../../lib/strings';
import { Avatar } from '../ui/Avatar';
import { Button } from '../ui/Button';
import { ProgressRing } from '../ui/ProgressRing';
import { SectionHeader } from './SectionHeader';

// Horizontal row of open Pacts (DESIGN §7.6): progress ring, counterparty, and
// the next milestone with its amount. A friendly empty state otherwise.
export function ActivePacts({
  pacts,
  loading,
  onOpen,
  onStart,
  onSeeAll,
}: {
  pacts: PactSummary[];
  loading: boolean;
  onOpen: (id: bigint) => void;
  onStart: () => void;
  onSeeAll: () => void;
}) {
  return (
    <section aria-labelledby="home-pacts">
      <SectionHeader id="home-pacts" title={t('pacts.title')} action={pacts.length ? { label: t('pacts.seeAll'), onClick: onSeeAll } : undefined} />
      {loading && pacts.length === 0 ? (
        <div className="flex gap-3 overflow-hidden">
          {[0, 1].map((i) => (
            <div key={i} className="h-[132px] w-[260px] shrink-0 animate-pulse rounded-card bg-mist" />
          ))}
        </div>
      ) : pacts.length === 0 ? (
        <div className="flex items-center gap-4 rounded-card border border-card bg-paper p-5 shadow-card">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-pill bg-apricot-soft text-apricot">
            <ShieldCheck size={22} aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[15px] font-bold text-ink">{t('pacts.empty.title')}</p>
            <p className="mt-0.5 text-[13px] text-slate">{t('pacts.empty.body')}</p>
          </div>
          <Button size="sm" onClick={onStart}>
            {t('pacts.empty.cta')}
          </Button>
        </div>
      ) : (
        <ul className="-mx-4 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
          {pacts.map((p) => (
            <li key={String(p.id)} className="snap-start">
              <PactCard pact={p} onOpen={() => onOpen(p.id)} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function nextLine(p: PactSummary): string {
  if (p.phase === 'awaitingBond') return t('pacts.awaitingBond');
  if (p.phase === 'awaitingDeposit') return t('pacts.awaitingDeposit');
  if (p.phase === 'allReleased' || p.nextIndex === null) return t('pacts.allReleased');
  return t('pacts.next', { n: p.nextIndex, total: p.total });
}

function PactCard({ pact: p, onOpen }: { pact: PactSummary; onOpen: () => void }) {
  // The next tranche only matters while milestones are being released.
  const amount = p.phase === 'releasing' && p.nextAmount !== null ? formatBaseUnits(p.nextAmount, p.tokenCode) : null;
  return (
    <m.button
      type="button"
      onClick={onOpen}
      whileTap={{ scale: 0.96 }}
      className="flex w-[260px] flex-col gap-3 rounded-card border border-card bg-paper p-4 text-left shadow-card transition hover:border-accent/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
    >
      <div className="flex items-center gap-3">
        <ProgressRing value={p.progress} tone="apricot" label={t('pacts.progress', { done: p.released, total: p.total })}>
          {p.released}/{p.total}
        </ProgressRing>
        <div className="min-w-0 flex-1">
          <p className="text-[12px] font-semibold text-slate">{p.role === 'sender' ? t('pacts.youSend') : t('pacts.youReceive')}</p>
          <div className="mt-0.5 flex items-center gap-2">
            <Avatar addr={p.counterparty} size="sm" />
            <span className="mono truncate text-[13px] text-ink">{shortAddr(p.counterparty, 4, 4)}</span>
          </div>
        </div>
        <ChevronRight size={18} aria-hidden className="shrink-0 text-fog" />
      </div>
      <div className="flex items-end justify-between gap-2">
        <span className="text-[13px] text-slate">{nextLine(p)}</span>
        {amount && (
          <span className="mono text-[15px] font-semibold text-ink" title={amount.full}>
            {amount.display} <span className="text-[12px] text-slate">{p.tokenCode}</span>
          </span>
        )}
      </div>
    </m.button>
  );
}
