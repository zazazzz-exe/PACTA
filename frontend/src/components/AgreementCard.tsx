import { type Agreement, Status } from '../lib/contract';
import { formatAmount, shortAddr } from '../lib/format';
import { navigate } from '../lib/router';
import { StatusPill } from './StatusPill';
import { MilestoneBar } from './MilestoneBar';
import { Avatar } from './Avatar';

export function AgreementCard({ a, you }: { a: Agreement; you: string | null }) {
  const counterparty = you === a.trader ? a.investor : a.trader;
  const role = you === a.investor ? 'Trader' : you === a.trader ? 'Investor' : 'Trader';
  const protectedAmount = a.capital - a.released_amount;

  return (
    <button
      onClick={() => navigate(`/agreement/${a.id}`)}
      className="w-full text-left bg-paper border border-hairline rounded-card shadow-card p-5 transition duration-200 hover:-translate-y-0.5 hover:border-hairline-strong hover:shadow-pop focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
    >
      <div className="flex items-center gap-3">
        <Avatar addr={counterparty} />
        <div className="min-w-0 flex-1">
          <p className="text-[11px] text-fog">{role}</p>
          <p className="mono text-sm text-ink truncate">{shortAddr(counterparty, 6, 6)}</p>
        </div>
        <StatusPill status={a.status} />
      </div>

      <div className="mt-4 flex items-baseline gap-2">
        <span className="mono text-[22px] font-medium text-ink">{formatAmount(protectedAmount)}</span>
        <span className="text-[13px] text-slate">protected</span>
      </div>

      <div className="mt-4">
        <MilestoneBar
          released={a.released_milestones}
          total={a.milestones}
          releasedAmount={a.released_amount}
        />
      </div>

      {a.status !== Status.Active && (
        <p className="mono text-[11px] text-fog mt-3">agr-{a.id.toString().padStart(3, '0')}</p>
      )}
    </button>
  );
}
