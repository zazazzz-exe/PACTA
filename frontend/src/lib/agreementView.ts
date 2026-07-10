import { Status, type Agreement } from './contract';

// Pure display/correctness helpers for the dashboard and agreement cards.
// No contract calls, no data fetching — interpretation of already-fetched data.

export const isTerminal = (s: Status): boolean =>
  s === Status.Completed || s === Status.Refunded || s === Status.Cancelled;

// The headline amount + its truthful label for a given status.
export function statusAmount(a: Agreement): { amount: bigint; label: string } {
  switch (a.status) {
    case Status.Active:
      return { amount: a.capital - a.released_amount, label: 'protected' };
    case Status.Pending:
      return { amount: a.capital, label: 'to deposit' };
    case Status.Completed:
      return { amount: a.capital, label: 'settled' };
    case Status.Refunded:
      return { amount: a.capital - a.released_amount + a.bond, label: 'returned to you' };
    case Status.Cancelled:
      return {
        amount: (a.capital_deposited ? a.capital : 0n) + (a.bond_posted ? a.bond : 0n),
        label: 'returned to you',
      };
    default:
      return { amount: a.capital, label: '' };
  }
}

// One-line "needs action" reason for the connected user, or null if none.
// Active + deadline passed is scoped to the investor (only they can refund);
// Pending is scoped to whichever side still has to act.
export function needsAttentionReason(
  a: Agreement,
  you: string | null,
  nowSec: number,
): string | null {
  if (a.status === Status.Active && you === a.investor && nowSec >= Number(a.deadline)) {
    return 'Refund available — the deadline has passed';
  }
  if (a.status === Status.Pending) {
    if (you === a.trader && !a.bond_posted) return 'Post your security bond';
    if (you === a.investor && !a.capital_deposited) return 'Deposit your capital';
  }
  return null;
}

// Lower rank sorts first: needs-attention → Active → Pending → terminal.
export function urgencyRank(a: Agreement, you: string | null, nowSec: number): number {
  if (needsAttentionReason(a, you, nowSec)) return 0;
  if (a.status === Status.Active) return 1;
  if (a.status === Status.Pending) return 2;
  return 3;
}

// Deadline indicator text for Active agreements.
export function deadlineLabel(a: Agreement, nowSec: number): string {
  const secs = Number(a.deadline) - nowSec;
  if (secs <= 0) return 'Refund available';
  const days = Math.ceil(secs / 86400);
  return days === 1 ? '1 day left' : `${days} days left`;
}

// Pending "next step" line, role-aware.
export function pendingNextStep(a: Agreement, you: string | null): string {
  if (!a.bond_posted) {
    return you === a.trader ? 'Waiting for your bond' : "Waiting for the provider's bond";
  }
  if (!a.capital_deposited) {
    return you === a.investor ? 'Waiting for your deposit' : "Waiting for the client's deposit";
  }
  return 'Ready to activate';
}
