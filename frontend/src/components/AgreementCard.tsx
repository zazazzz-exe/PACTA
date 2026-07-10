import { type Agreement, Status } from '../lib/contract';
import { formatAmount, shortAddr } from '../lib/format';
import { statusAmount, deadlineLabel, pendingNextStep, isTerminal } from '../lib/agreementView';
import { navigate } from '../lib/router';
import { StatusPill } from './StatusPill';
import { MilestoneBar } from './MilestoneBar';
import { Avatar } from './Avatar';

const STRIP: Record<Status, string> = {
  [Status.Pending]: 'bg-deadline',
  [Status.Active]: 'bg-accent strip-pulse',
  [Status.Completed]: 'bg-accent-deep',
  [Status.Refunded]: 'bg-refund',
  [Status.Cancelled]: 'bg-fog',
};

export function AgreementCard({ a, you }: { a: Agreement; you: string | null }) {
  const counterparty = you === a.trader ? a.investor : a.trader;
  const counterpartyRole = you === a.investor ? 'Provider' : 'Client';
  const yourRole =
    you === a.investor ? "You're the client" : you === a.trader ? "You're the provider" : null;
  const { amount, label } = statusAmount(a);
  const terminal = isTerminal(a.status);
  const nowSec = Math.floor(Date.now() / 1000);

  return (
    <button
      onClick={() => navigate(`/agreement/${a.id}`)}
      className={`group relative w-full overflow-hidden text-left rounded-card border border-hairline bg-paper p-5 shadow-card transition duration-300 hover:-translate-y-1 hover:border-accent/35 hover:shadow-pop focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 ${
        terminal ? 'opacity-60 hover:opacity-100' : ''
      }`}
    >
      <span
        className={`absolute left-0 top-0 h-full w-1 rounded-l-card ${STRIP[a.status]}`}
        aria-hidden
      />
      <div className="pl-2">
      <div className="flex items-center gap-3">
        <Avatar addr={counterparty} />
        <div className="min-w-0 flex-1">
          <p className="text-[11px] text-fog">{counterpartyRole}</p>
          <p className="mono text-sm text-ink truncate">{shortAddr(counterparty, 6, 6)}</p>
          {yourRole && <p className="text-[11px] text-accent">{yourRole}</p>}
        </div>
        <StatusPill status={a.status} />
      </div>

      <div className="mt-4 flex items-baseline gap-2">
        <span className="mono text-[22px] font-medium text-ink">{formatAmount(amount)}</span>
        <span className="text-[13px] text-slate">{label}</span>
      </div>

      {a.status === Status.Active && (
        <p className="mt-1.5 text-[12px] font-medium text-deadline-deep">
          {deadlineLabel(a, nowSec)}
        </p>
      )}

      <div className="mt-4">
        {a.status === Status.Active || a.status === Status.Completed ? (
          <MilestoneBar
            released={a.released_milestones}
            total={a.milestones}
            releasedAmount={a.released_amount}
          />
        ) : a.status === Status.Pending ? (
          <p className="text-[13px] text-slate">{pendingNextStep(a, you)}</p>
        ) : (
          <p className="text-[13px] text-slate">Funds returned to you</p>
        )}
      </div>

      <p className="mono text-[11px] text-fog mt-3">agr-{a.id.toString().padStart(3, '0')}</p>
      </div>
    </button>
  );
}
