import { useEffect, useState, type ReactNode } from 'react';
import { ChevronLeft, Clock, Loader2, RotateCcw, ShieldX } from 'lucide-react';
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
import {
  formatAmount,
  formatXlmFull,
  shortAddr,
  shortHash,
  fromTimestamp,
  countdown,
} from '../lib/format';
import { friendlyError } from '../lib/errors';
import { navigate } from '../lib/router';
import { CONTRACT_ID, contractExplorerUrl, txExplorerUrl } from '../lib/config';
import { StatusPill } from '../components/StatusPill';
import { MilestoneBar } from '../components/MilestoneBar';
import { ReputationBadge } from '../components/ReputationBadge';
import { Avatar } from '../components/Avatar';
import { Button } from '../components/Button';
import { ProofPanel } from '../components/ProofPanel';
import { CopyButton } from '../components/CopyButton';
import { AmountDisplay } from '../components/AmountDisplay';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { Reveal } from '../components/Reveal';

interface Pending {
  key: string;
  title: string;
  description: ReactNode;
  confirmLabel: string;
  variant: 'primary' | 'danger';
  fn: () => Promise<WriteResult<unknown>>;
}

export function AgreementDetail({ id }: { id: bigint }) {
  const { address, kycStatus } = useWallet();
  const { agreement: a, loading, error, refresh } = useAgreement(id, address ?? undefined);
  const [busy, setBusy] = useState<string | null>(null);
  const [actionErr, setActionErr] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));
  const [pending, setPending] = useState<Pending | null>(null);

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
      setTimeout(refresh, 4500); // RPC can lag a few seconds
    } catch (e) {
      setActionErr(friendlyError(e));
    } finally {
      setBusy(null);
    }
  }

  // Open the plain-language confirm step; the signature only happens on confirm.
  function ask(p: Pending) {
    setPending(p);
  }

  // Additive money actions (post bond, deposit, release) are gated on KYC
  // verification (Option B). Fund-returning actions (complete, emergency refund,
  // cancel) are never gated, so a user can always reclaim their own funds.
  function gated(p: Pending) {
    if (kycStatus === 'verified') ask(p);
    else navigate('/verify');
  }
  async function onConfirm() {
    if (!pending) return;
    await run(pending.key, pending.fn);
    setPending(null);
  }

  const agrId = `agr-${id.toString().padStart(3, '0')}`;

  if (loading && !a) {
    return (
      <div className="mx-auto max-w-app flex items-center justify-center py-20 text-slate">
        <Loader2 className="animate-spin" size={20} aria-hidden />
      </div>
    );
  }
  if (error || !a) {
    return (
      <div className="mx-auto max-w-app">
        <div className="bg-paper border border-hairline rounded-card shadow-card p-6 text-center">
          <p className="text-refund text-[14px]">{error ?? 'Agreement not found.'}</p>
          <Button variant="secondary" className="mt-4" onClick={() => navigate('/dashboard')}>
            Back to dashboard
          </Button>
        </div>
      </div>
    );
  }

  const isInvestor = address === a.investor;
  const isTrader = address === a.trader;
  const allReleased = a.released_milestones >= a.milestones;
  const deadlinePassed = now >= Number(a.deadline);
  const unreleased = a.capital - a.released_amount;
  const nextTranche =
    a.released_milestones + 1 >= a.milestones ? unreleased : a.capital / BigInt(a.milestones);
  const traderShort = shortAddr(a.trader, 4, 4);
  const signNote = <span className="block mt-2 text-[12px] text-fog">You will sign a transaction on testnet.</span>;

  const headline = (() => {
    switch (a.status) {
      case Status.Active:
        return { amount: unreleased, label: 'Protected in escrow', bond: a.bond, proof: unreleased + a.bond };
      case Status.Pending:
        return { amount: a.capital, label: 'Capital in escrow once funded', bond: a.bond, proof: (a.capital_deposited ? a.capital : 0n) + (a.bond_posted ? a.bond : 0n) };
      case Status.Completed:
        return { amount: a.capital, label: 'Capital released to provider', bond: undefined, proof: a.capital };
      case Status.Refunded:
        return { amount: unreleased + a.bond, label: 'Refunded to client', bond: undefined, proof: unreleased + a.bond };
      default:
        return { amount: a.capital, label: 'Agreement cancelled', bond: undefined, proof: 0n };
    }
  })();

  const counterparty = isTrader ? a.investor : a.trader;
  const counterRole = isTrader ? 'Client' : 'Provider';
  const closed =
    a.status === Status.Completed || a.status === Status.Refunded || a.status === Status.Cancelled;

  const hasAction =
    (isTrader && a.status === Status.Pending && !a.bond_posted) ||
    (isInvestor && a.status === Status.Pending) ||
    (isInvestor && a.status === Status.Active);

  return (
    <div className="mx-auto max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/dashboard')}
          aria-label="Back to dashboard"
          className="grid h-11 w-11 place-items-center rounded-control text-slate hover:bg-mist focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
        >
          <ChevronLeft size={20} aria-hidden />
        </button>
        <span className="mono text-[13px] text-slate flex-1">{agrId}</span>
        <StatusPill status={a.status} />
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
        {/* Main column */}
        <div className="space-y-5">
          <Reveal>
            <div className="bg-paper border border-hairline rounded-card shadow-card p-5">
              <AmountDisplay amount={headline.amount} label={headline.label} bond={headline.bond} />
            </div>
          </Reveal>

          <Reveal delay={60}>
            <button
              onClick={() => navigate(`/trader/${a.trader}`)}
              className="w-full text-left bg-paper border border-hairline rounded-card shadow-card p-5 transition hover:border-hairline-strong focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
            >
              <div className="flex items-center gap-3">
                <Avatar addr={counterparty} />
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] text-fog">{counterRole}</p>
                  <p className="mono text-sm text-ink truncate">{shortAddr(counterparty, 6, 6)}</p>
                </div>
                <ReputationBadge trader={a.trader} publicKey={address ?? undefined} />
              </div>
            </button>
          </Reveal>

          <Reveal delay={120}>
            <div className="bg-paper border border-hairline rounded-card shadow-card p-5">
              <MilestoneBar
                released={a.released_milestones}
                total={a.milestones}
                releasedAmount={a.released_amount}
              />
            </div>
          </Reveal>

          {a.status === Status.Active && (
            <Reveal delay={180}>
              <div
                className={`rounded-control p-4 flex items-center gap-2.5 text-[13px] ${
                  deadlinePassed ? 'bg-refund-tint text-refund-deep' : 'bg-deadline-tint text-deadline-deep'
                }`}
              >
                <Clock size={16} aria-hidden />
                {deadlinePassed ? (
                  <span>Refund available. The deadline has passed.</span>
                ) : (
                  <span>
                    Deadline in <span className="mono">{countdown(Number(a.deadline), now)}</span>
                    <span className="text-deadline/70"> · {fromTimestamp(a.deadline).toLocaleString()}</span>
                  </span>
                )}
              </div>
            </Reveal>
          )}
        </div>

        {/* Aside: actions + proof */}
        <aside className="space-y-4 lg:sticky lg:top-20">
          <Reveal delay={60}>
          <div className="space-y-4">
          {txHash && (
            <div className="rounded-control bg-accent-tint text-accent-deep p-3 text-[13px] flex items-center gap-2">
              <span>Done.</span>
              <a
                className="mono underline hover:text-accent focus:outline-none"
                href={txExplorerUrl(txHash)}
                target="_blank"
                rel="noreferrer"
              >
                tx {shortHash(txHash)}
              </a>
              <CopyButton value={txHash} label="Copy transaction hash" className="ml-auto -my-1" />
            </div>
          )}
          {actionErr && <p className="text-refund text-[13px]">{actionErr}</p>}

          {hasAction && (
            <div className="space-y-3">
              {/* Trader + Pending + not bonded -> Post bond */}
              {isTrader && a.status === Status.Pending && !a.bond_posted && (
                <Button
                  className="w-full"
                  disabled={!!busy}
                  onClick={() =>
                    gated({
                      key: 'bond',
                      title: 'Post security bond',
                      description: (
                        <>
                          Post a bond of <span className="mono text-ink">{formatAmount(a.bond)}</span>. It
                          is held by the contract as protection and returned to you when the agreement
                          completes.
                          {signNote}
                        </>
                      ),
                      confirmLabel: 'Post bond',
                      variant: 'primary',
                      fn: () => postBond(address!, a.id),
                    })
                  }
                >
                  Post bond ({formatAmount(a.bond)})
                </Button>
              )}

              {/* Investor + Pending + not deposited -> Deposit capital */}
              {isInvestor && a.status === Status.Pending && !a.capital_deposited && (
                <Button
                  className="w-full"
                  disabled={!!busy}
                  onClick={() =>
                    gated({
                      key: 'deposit',
                      title: 'Deposit capital',
                      description: (
                        <>
                          Deposit <span className="mono text-ink">{formatAmount(a.capital)}</span> into the
                          escrow contract. It is released to the provider milestone by milestone.
                          {signNote}
                        </>
                      ),
                      confirmLabel: 'Deposit',
                      variant: 'primary',
                      fn: () => depositCapital(address!, a.id),
                    })
                  }
                >
                  Deposit capital ({formatAmount(a.capital)})
                </Button>
              )}

              {/* Investor + Active + milestones remaining -> Release */}
              {isInvestor && a.status === Status.Active && !allReleased && (
                <Button
                  className="w-full"
                  disabled={!!busy}
                  onClick={() =>
                    gated({
                      key: 'release',
                      title: 'Release next milestone',
                      description: (
                        <>
                          Release the next milestone to the provider. About{' '}
                          <span className="mono text-ink">{formatAmount(nextTranche)}</span> goes to{' '}
                          <span className="mono text-ink">{traderShort}</span>.{signNote}
                        </>
                      ),
                      confirmLabel: 'Release',
                      variant: 'primary',
                      fn: () => releaseMilestone(address!, a.id),
                    })
                  }
                >
                  Release next milestone
                </Button>
              )}

              {/* Investor + Active + all released -> Complete */}
              {isInvestor && a.status === Status.Active && allReleased && (
                <Button
                  className="w-full"
                  disabled={!!busy}
                  onClick={() =>
                    ask({
                      key: 'complete',
                      title: 'Complete agreement',
                      description: (
                        <>
                          Complete this agreement. The <span className="mono text-ink">{formatAmount(a.bond)}</span>{' '}
                          bond is returned to the provider.{signNote}
                        </>
                      ),
                      confirmLabel: 'Complete',
                      variant: 'primary',
                      fn: () => complete(address!, a.id),
                    })
                  }
                >
                  Complete and return bond
                </Button>
              )}

              {/* Investor + Active -> Emergency refund (locked until deadline) */}
              {isInvestor && a.status === Status.Active && (
                <div>
                  <Button
                    variant="danger"
                    className="w-full"
                    disabled={!!busy || !deadlinePassed}
                    onClick={() =>
                      ask({
                        key: 'refund',
                        title: 'Emergency refund',
                        description: (
                          <>
                            Reclaim <span className="mono text-ink">{formatAmount(unreleased)}</span> of
                            unreleased capital plus the <span className="mono text-ink">{formatAmount(a.bond)}</span>{' '}
                            bond, totalling <span className="mono text-ink">{formatAmount(unreleased + a.bond)}</span>,
                            back to you. The provider forfeits the bond.{signNote}
                          </>
                        ),
                        confirmLabel: 'Refund to me',
                        variant: 'danger',
                        fn: () => emergencyRefund(address!, a.id),
                      })
                    }
                  >
                    <RotateCcw size={18} aria-hidden /> Emergency refund
                  </Button>
                  {!deadlinePassed && (
                    <p className="mt-1.5 text-[13px] text-slate text-center">
                      Refund unlocks when the deadline passes.
                    </p>
                  )}
                </div>
              )}

              {/* Investor + Pending -> Cancel */}
              {isInvestor && a.status === Status.Pending && (
                <Button
                  variant="danger"
                  className="w-full"
                  disabled={!!busy}
                  onClick={() =>
                    ask({
                      key: 'cancel',
                      title: 'Cancel agreement',
                      description: (
                        <>
                          Cancel this agreement. Any deposited capital and posted bond are returned to
                          their owners.{signNote}
                        </>
                      ),
                      confirmLabel: 'Cancel agreement',
                      variant: 'danger',
                      fn: () => cancel(address!, a.id),
                    })
                  }
                >
                  <ShieldX size={18} aria-hidden /> Cancel agreement
                </Button>
              )}
            </div>
          )}

          {closed && (
            <p className="text-[13px] text-slate">This agreement is closed. No further actions.</p>
          )}
          {!isInvestor && !isTrader && !closed && (
            <p className="text-[13px] text-slate">
              You are viewing this agreement. Only the client and provider can act on it.
            </p>
          )}

          <ProofPanel
            id={agrId}
            protectedAmount={formatXlmFull(headline.proof)}
            txHash={txHash ? shortHash(txHash) : undefined}
            contractShort={shortAddr(CONTRACT_ID, 6, 6)}
            explorerUrl={contractExplorerUrl()}
          />
          </div>
          </Reveal>
        </aside>
      </div>

      <ConfirmDialog
        open={!!pending}
        title={pending?.title ?? ''}
        description={pending?.description}
        confirmLabel={pending?.confirmLabel ?? 'Confirm'}
        variant={pending?.variant ?? 'primary'}
        busy={!!busy}
        onConfirm={onConfirm}
        onCancel={() => !busy && setPending(null)}
      />
    </div>
  );
}
