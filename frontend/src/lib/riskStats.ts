import { Status, type Agreement } from './contract';

export interface TraderStats {
  address: string;
  hasHistory: boolean;
  totalAgreements: number;
  completed: number;
  refunded: number;
  active: number;
  pending: number;
  cancelled: number;
  completionRate: number | null; // completed / (completed + refunded), null if none resolved
  totalVolumeXlm: number;
  avgDealXlm: number | null;
  largestDealXlm: number | null;
  refundsRecent: number; // refunds whose deadline was within ~30 days (proxy, see spec §14)
  daysSinceLastActivity: number | null;
  contemplatedCapitalXlm: number | null; // the deal the investor is considering (create flow)
  dealVsLargestRatio: number | null; // contemplated / largestDeal
}

const toXlm = (base: bigint) => Number(base) / 1e7;

// Soroban enums render differently across binding versions (spec §14). Our
// generated bindings decode `status` as a NUMBER (the Status enum); also
// tolerate a plain string or a {tag} object from other binding versions.
function statusOf(a: Agreement): string {
  const s = (a as { status: unknown }).status;
  if (typeof s === 'number') return Status[s] ?? String(s);
  if (typeof s === 'string') return s;
  if (s && typeof s === 'object' && 'tag' in s) return (s as { tag: string }).tag;
  return String(s);
}

export function computeTraderStats(
  all: Agreement[],
  trader: string,
  contemplatedCapital?: bigint,
): TraderStats {
  const mine = all.filter((a) => a.trader === trader);
  const nowSec = Math.floor(Date.now() / 1000);
  const within30d = 30 * 86400;

  const by = (s: string) => mine.filter((a) => statusOf(a) === s);
  const completed = by('Completed').length;
  const refunded = by('Refunded').length;
  const active = by('Active').length;
  const pending = by('Pending').length;
  const cancelled = by('Cancelled').length;

  const capitals = mine.map((a) => toXlm(a.capital));
  const totalVolumeXlm = capitals.reduce((s, v) => s + v, 0);
  const largestDealXlm = capitals.length ? Math.max(...capitals) : null;
  const avgDealXlm = capitals.length ? totalVolumeXlm / capitals.length : null;

  const refundsRecent = by('Refunded').filter(
    (a) => nowSec - Number(a.deadline) <= within30d,
  ).length;

  const activityTimes = mine.map((a) =>
    Number(a.start_time) > 0 ? Number(a.start_time) : Number(a.created_at),
  );
  const lastActivity = activityTimes.length ? Math.max(...activityTimes) : null;
  const daysSinceLastActivity =
    lastActivity != null ? Math.floor((nowSec - lastActivity) / 86400) : null;

  const resolved = completed + refunded;
  const contemplatedCapitalXlm =
    contemplatedCapital != null ? toXlm(contemplatedCapital) : null;

  return {
    address: trader,
    hasHistory: mine.length > 0,
    totalAgreements: mine.length,
    completed,
    refunded,
    active,
    pending,
    cancelled,
    completionRate: resolved > 0 ? completed / resolved : null,
    totalVolumeXlm: round(totalVolumeXlm),
    avgDealXlm: avgDealXlm != null ? round(avgDealXlm) : null,
    largestDealXlm: largestDealXlm != null ? round(largestDealXlm) : null,
    refundsRecent,
    daysSinceLastActivity,
    contemplatedCapitalXlm: contemplatedCapitalXlm != null ? round(contemplatedCapitalXlm) : null,
    dealVsLargestRatio:
      contemplatedCapitalXlm != null && largestDealXlm
        ? round(contemplatedCapitalXlm / largestDealXlm, 2)
        : null,
  };
}

const round = (n: number, d = 2) => Math.round(n * 10 ** d) / 10 ** d;
