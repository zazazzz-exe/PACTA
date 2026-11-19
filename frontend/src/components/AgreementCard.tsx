import { m } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { type Agreement, Status } from '../lib/contract';
import { fromBaseUnits, shortAddr } from '../lib/format';
import { deadlineLabel, isTerminal, needsAttentionReason, pendingNextStep } from '../lib/agreementView';
import { tokenCodeForSac } from '../lib/pactSummary';
import { amountValue, formatBaseUnits, formatFiat } from '../lib/money';
import { useDisplayCurrency } from '../lib/displayCurrency';
import { navigate } from '../lib/router';
import { StatusPill } from './StatusPill';
import { Avatar } from './Avatar';
import { EASE } from './motion/MotionProvider';

// One Pact as a card: title, counterparty and your role, total amount in the
// display currency plus the real token amount, funds the contract holds now,
// a thin milestone bar, the status and the next required action. Every value
// is read from the contract.
export function AgreementCard({ a, you }: { a: Agreement; you: string | null }) {
  const [currency] = useDisplayCurrency();
  const counterparty = you === a.trader ? a.investor : a.trader;
  const yourRole = you === a.investor ? 'You pay' : you === a.trader ? 'You get paid' : null;
  const code = tokenCodeForSac(a.token);
  const terminal = isTerminal(a.status);
  const nowSec = Math.floor(Date.now() / 1000);

  const total = formatBaseUnits(a.capital, code);
  const totalFiat = amountValue(code, fromBaseUnits(a.capital), currency);
  const securedBase = a.status === Status.Active && a.capital_deposited ? a.capital - a.released_amount : 0n;
  const secured = formatBaseUnits(securedBase, code);
  const securedFiat = amountValue(code, fromBaseUnits(securedBase), currency);
  const released = Number(a.released_milestones);
  const milestones = Number(a.milestones);

  const next =
    needsAttentionReason(a, you, nowSec) ??
    (a.status === Status.Pending
      ? pendingNextStep(a, you)
      : a.status === Status.Active
        ? deadlineLabel(a, nowSec)
        : a.status === Status.Completed
          ? 'Completed. Bond returned to the recipient.'
          : a.status === Status.Refunded
            ? 'Refunded to the sender.'
            : 'Cancelled before funding.');

  return (
    <button
      onClick={() => navigate(`/agreement/${a.id}`)}
      className={`wallet-lift group flex w-full flex-col gap-4 rounded-card border border-card bg-paper p-5 text-left shadow-card focus:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
        terminal ? 'opacity-80 hover:opacity-100' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[12px] font-bold uppercase tracking-[0.1em] text-slate">Pact #{a.id.toString()}</p>
          <div className="mt-1.5 flex min-w-0 items-center gap-2">
            <Avatar addr={counterparty} size="sm" />
            <span className="mono truncate text-[13px] text-ink">{shortAddr(counterparty, 4, 4)}</span>
          </div>
          {yourRole && <p className="mt-1 text-[12px] font-semibold text-accent">{yourRole}</p>}
        </div>
        <StatusPill status={a.status} />
      </div>

      <div>
        <p className="mono text-[24px] font-bold leading-tight text-ink" title={total.full}>
          {totalFiat !== undefined ? formatFiat(totalFiat, currency) : `${total.display} ${code}`}
        </p>
        {totalFiat !== undefined && (
          <p className="mono text-[12px] text-slate">
            {total.display} {code}
          </p>
        )}
      </div>

      <div>
        <div className="flex items-center justify-between gap-2 text-[12px]">
          <span className="text-slate">
            Secured{' '}
            <span className="mono font-semibold text-ink">
              {securedFiat !== undefined ? formatFiat(securedFiat, currency) : `${secured.display} ${code}`}
            </span>
          </span>
          <span className="font-semibold text-slate">
            {released} of {milestones} milestones
          </span>
        </div>
        <div
          className="mt-2 h-1.5 overflow-hidden rounded-pill bg-mist"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={milestones}
          aria-valuenow={released}
          aria-label={`${released} of ${milestones} milestones released`}
        >
          <m.div
            className="h-full origin-left rounded-pill bg-gradient-to-r from-accent to-cyan"
            initial={{ scaleX: 0 }}
            animate={{ scaleX: milestones > 0 ? released / milestones : 0 }}
            transition={{ duration: 0.6, ease: EASE, delay: 0.1 }}
          />
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-card pt-3">
        <p className="min-w-0 text-[13px] text-slate">{next}</p>
        <span className="inline-flex shrink-0 items-center gap-1 text-[13px] font-bold text-accent">
          View <ArrowRight size={15} aria-hidden className="transition-transform group-hover:translate-x-0.5" />
        </span>
      </div>
    </button>
  );
}
