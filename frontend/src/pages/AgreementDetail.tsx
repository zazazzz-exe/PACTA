import { useEffect, useState } from 'react';
import { useWallet } from '../hooks/useWallet';
import { useAgreement } from '../hooks/useAgreements';
import {
  Status,
  postBond,
  depositCapital,
  releaseMilestone,
  complete,
  emergencyRefund,
  cancel,
  type WriteResult,
} from '../lib/contract';
import { formatAmount, shortAddr, fromTimestamp } from '../lib/format';
import { friendlyError } from '../lib/errors';
import { navigate } from '../lib/router';
import { txExplorerUrl } from '../lib/config';
import { StatusPill } from '../components/StatusPill';
import { MilestoneBar } from '../components/MilestoneBar';
import { Countdown } from '../components/Countdown';
import { ReputationBadge } from '../components/ReputationBadge';

export function AgreementDetail({ id }: { id: bigint }) {
  const { address } = useWallet();
  const { agreement: a, loading, error, refresh } = useAgreement(id, address ?? undefined);
  const [busy, setBusy] = useState<string | null>(null);
  const [actionErr, setActionErr] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));

  useEffect(() => {
    const t = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(t);
  }, []);

  async function run(label: string, fn: () => Promise<WriteResult<unknown>>) {
    setBusy(label);
    setActionErr(null);
    setTxHash(null);
    try {
      const { hash } = await fn();
      setTxHash(hash ?? null);
      await refresh();
      // RPC can lag a few seconds; refetch once more.
      setTimeout(refresh, 4500);
    } catch (e) {
      setActionErr(friendlyError(e));
    } finally {
      setBusy(null);
    }
  }

  if (loading && !a) {
    return <div className="card h-64 animate-pulse bg-surface/60" />;
  }
  if (error || !a) {
    return (
      <div className="card p-8 text-center">
        <p className="text-danger">{error ?? 'Agreement not found.'}</p>
        <button className="btn-ghost mt-4" onClick={() => navigate('/dashboard')}>
          Back to dashboard
        </button>
      </div>
    );
  }

  const isInvestor = address === a.investor;
  const isTrader = address === a.trader;
  const allReleased = a.released_milestones >= a.milestones;
  const deadlinePassed = now >= Number(a.deadline);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <button className="text-sm text-ink-muted hover:text-ink" onClick={() => navigate('/dashboard')}>
        ← Back to dashboard
      </button>

      <div className="card p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="label">Agreement</span>
              <span className="mono text-lg text-ink">#{a.id.toString()}</span>
            </div>
            <p className="mt-1 text-sm text-ink-muted">
              {isInvestor ? 'You are the investor.' : isTrader ? 'You are the trader.' : 'You are a viewer.'}
            </p>
          </div>
          <StatusPill status={a.status} />
        </div>

        <div className="mt-6 grid grid-cols-2 gap-5 sm:grid-cols-4">
          <Stat label="Capital" value={formatAmount(a.capital)} />
          <Stat label="Bond" value={formatAmount(a.bond)} />
          <Stat label="Released" value={formatAmount(a.released_amount)} />
          <Stat label="Profit share" value={`${a.profit_share_bps / 100}%`} />
        </div>

        <div className="mt-6">
          <MilestoneBar released={a.released_milestones} total={a.milestones} />
        </div>

        {a.status === Status.Active && (
          <div className="mt-5 flex items-center justify-between rounded-xl border border-hairline bg-base/40 px-4 py-3">
            <span className="text-sm text-ink-muted">Deadline</span>
            <div className="text-right">
              <Countdown deadlineSec={Number(a.deadline)} className="text-sm" />
              <div className="mono text-[11px] text-ink-faint">
                {fromTimestamp(a.deadline).toLocaleString()}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Parties */}
      <div className="card p-6">
        <div className="grid gap-5 sm:grid-cols-2">
          <Party label="Investor" addr={a.investor} you={address} />
          <div>
            <Party label="Trader" addr={a.trader} you={address} />
            <div className="mt-2">
              <ReputationBadge trader={a.trader} publicKey={address ?? undefined} />
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="card p-6">
        <div className="label mb-3">Actions</div>

        {txHash && (
          <div className="mb-4 rounded-xl border border-accent/30 bg-accent-soft p-3 text-sm text-accent">
            Transaction confirmed.{' '}
            <a className="mono underline" href={txExplorerUrl(txHash)} target="_blank" rel="noreferrer">
              {shortAddr(txHash, 6, 6)} ↗
            </a>
          </div>
        )}
        {actionErr && (
          <div className="mb-4 rounded-xl border border-danger/30 bg-danger-soft p-3 text-sm text-danger">
            {actionErr}
          </div>
        )}

        <div className="flex flex-wrap gap-3">
          {/* Trader + Pending + not bonded -> Post Bond */}
          {isTrader && a.status === Status.Pending && !a.bond_posted && (
            <button
              className="btn-primary"
              disabled={!!busy}
              onClick={() => run('bond', () => postBond(address!, a.id))}
            >
              {busy === 'bond' ? 'Signing...' : `Post bond (${formatAmount(a.bond)})`}
            </button>
          )}

          {/* Investor + Pending + not deposited -> Deposit Capital */}
          {isInvestor && a.status === Status.Pending && !a.capital_deposited && (
            <button
              className="btn-primary"
              disabled={!!busy}
              onClick={() => run('deposit', () => depositCapital(address!, a.id))}
            >
              {busy === 'deposit' ? 'Signing...' : `Deposit capital (${formatAmount(a.capital)})`}
            </button>
          )}

          {/* Investor + Active + milestones remaining -> Release Milestone */}
          {isInvestor && a.status === Status.Active && !allReleased && (
            <button
              className="btn-primary"
              disabled={!!busy}
              onClick={() => run('release', () => releaseMilestone(address!, a.id))}
            >
              {busy === 'release' ? 'Signing...' : 'Release next milestone'}
            </button>
          )}

          {/* Investor + Active + all released -> Complete */}
          {isInvestor && a.status === Status.Active && allReleased && (
            <button
              className="btn-primary"
              disabled={!!busy}
              onClick={() => run('complete', () => complete(address!, a.id))}
            >
              {busy === 'complete' ? 'Signing...' : 'Complete (return bond to trader)'}
            </button>
          )}

          {/* Investor + Active + deadline passed -> Emergency Refund */}
          {isInvestor && a.status === Status.Active && (
            <button
              className="btn-warn"
              disabled={!!busy || !deadlinePassed}
              title={deadlinePassed ? '' : 'Available once the deadline passes'}
              onClick={() => run('refund', () => emergencyRefund(address!, a.id))}
            >
              {busy === 'refund'
                ? 'Signing...'
                : deadlinePassed
                  ? 'Emergency refund'
                  : 'Emergency refund (locked)'}
            </button>
          )}

          {/* Investor + Pending -> Cancel */}
          {isInvestor && a.status === Status.Pending && (
            <button
              className="btn-danger"
              disabled={!!busy}
              onClick={() => run('cancel', () => cancel(address!, a.id))}
            >
              {busy === 'cancel' ? 'Signing...' : 'Cancel agreement'}
            </button>
          )}
        </div>

        {a.status === Status.Active && isInvestor && (
          <p className="mt-4 text-xs text-ink-faint">
            Your capital is locked in the contract. Release it step by step as trust builds. If the
            deadline passes, reclaim the unreleased capital plus the trader bond.
          </p>
        )}
        {!isInvestor && !isTrader && (
          <p className="text-sm text-ink-muted">
            You are viewing this agreement. Only the investor and trader can act on it.
          </p>
        )}
        {(a.status === Status.Completed ||
          a.status === Status.Refunded ||
          a.status === Status.Cancelled) && (
          <p className="text-sm text-ink-muted">This agreement is closed. No further actions.</p>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="label">{label}</div>
      <div className="mono mt-0.5 text-base text-ink">{value}</div>
    </div>
  );
}

function Party({ label, addr, you }: { label: string; addr: string; you: string | null }) {
  return (
    <div>
      <div className="label">{label}</div>
      <div className="mono mt-1 flex items-center gap-2 text-sm text-ink">
        {shortAddr(addr, 6, 6)}
        {you === addr && (
          <span className="rounded-md bg-accent-soft px-1.5 py-0.5 text-[10px] font-semibold uppercase text-accent">
            you
          </span>
        )}
      </div>
    </div>
  );
}
