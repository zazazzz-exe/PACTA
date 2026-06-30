import { type Agreement, Status } from '../lib/contract';
import { formatAmount, shortAddr } from '../lib/format';
import { navigate } from '../lib/router';
import { StatusPill } from './StatusPill';
import { MilestoneBar } from './MilestoneBar';
import { Countdown } from './Countdown';

export function AgreementCard({ a, you }: { a: Agreement; you: string | null }) {
  const role =
    you === a.investor ? 'You are the investor' : you === a.trader ? 'You are the trader' : null;

  return (
    <button
      onClick={() => navigate(`/agreement/${a.id}`)}
      className="card group w-full p-5 text-left transition-transform hover:-translate-y-0.5 hover:border-accent/30"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="label">Agreement</span>
            <span className="mono text-sm text-ink">#{a.id.toString()}</span>
          </div>
          {role && <span className="mt-1 block text-xs text-accent">{role}</span>}
        </div>
        <StatusPill status={a.status} />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4">
        <div>
          <div className="label">Capital</div>
          <div className="mono text-lg text-ink">{formatAmount(a.capital)}</div>
        </div>
        <div>
          <div className="label">Bond</div>
          <div className="mono text-lg text-ink">{formatAmount(a.bond)}</div>
        </div>
      </div>

      <div className="mt-4">
        <MilestoneBar released={a.released_milestones} total={a.milestones} />
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-hairline pt-3">
        <div className="text-xs text-ink-muted">
          Trader <span className="mono text-ink">{shortAddr(a.trader)}</span>
        </div>
        {a.status === Status.Active && (
          <Countdown deadlineSec={Number(a.deadline)} className="text-xs" />
        )}
      </div>
    </button>
  );
}
