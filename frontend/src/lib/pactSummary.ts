// Pure summary of a Pact for the Home "Active Pacts" row. Mirrors the contract
// (PRD §8.2): each tranche is capital / milestones and the final release sweeps
// the remainder; Pending waits for the bond and/or the deposit.
import type { Agreement } from './contract';
import { MAINNET_SACS, TESTNET_SACS } from './tokenSac';

// Contract Status enum values (PRD §8.3). Kept local so this module has no
// runtime dependency on the wallet / bindings (and stays unit-testable).
export const Status = { Pending: 0, Active: 1, Completed: 2, Refunded: 3, Cancelled: 4 } as const;
const NAMES = Object.keys(Status) as Array<keyof typeof Status>;

export type PactPhase = 'awaitingBond' | 'awaitingDeposit' | 'releasing' | 'allReleased';

export interface PactSummary {
  id: bigint;
  role: 'sender' | 'recipient';
  counterparty: string;
  tokenCode: string;
  released: number;
  total: number;
  progress: number; // 0..1
  phase: PactPhase;
  /** 1-based index of the next milestone to release, or null when none left */
  nextIndex: number | null;
  /** base units of the next tranche, or null when none left */
  nextAmount: bigint | null;
  /** total agreement amount, base units */
  capital: bigint;
  /** funds currently held by the contract for this Pact, base units */
  secured: bigint;
}

// SAC contract address -> asset code ("XLM", "USDC"), across both networks.
export function tokenCodeForSac(sac: string): string {
  for (const map of [TESTNET_SACS, MAINNET_SACS]) {
    for (const [key, addr] of Object.entries(map)) if (addr === sac) return key.split(':')[0];
  }
  return 'tokens';
}

export const statusOf = (a: Agreement): number => {
  const s = (a as { status: unknown }).status;
  if (typeof s === 'number') return s;
  const byName = (n: string) => (NAMES.includes(n as keyof typeof Status) ? Status[n as keyof typeof Status] : -1);
  if (typeof s === 'string') return byName(s);
  if (s && typeof s === 'object' && 'tag' in s) return byName((s as { tag: string }).tag);
  return -1;
};

export function isOpenPact(a: Agreement): boolean {
  const s = statusOf(a);
  return s === Status.Pending || s === Status.Active;
}

export function summarizePact(a: Agreement, me: string): PactSummary | null {
  const role = a.investor === me ? 'sender' : a.trader === me ? 'recipient' : null;
  if (!role) return null;
  const total = Number(a.milestones);
  const released = Number(a.released_milestones);
  const capital = BigInt(a.capital);
  const releasedAmount = BigInt(a.released_amount);
  const s = statusOf(a);

  let phase: PactPhase;
  if (s === Status.Pending) phase = a.bond_posted ? 'awaitingDeposit' : 'awaitingBond';
  else if (released >= total) phase = 'allReleased';
  else phase = 'releasing';

  const left = released < total;
  const tranche = total > 0 ? capital / BigInt(total) : 0n;
  const nextAmount = !left ? null : released === total - 1 ? capital - releasedAmount : tranche;

  return {
    id: BigInt(a.id),
    role,
    counterparty: role === 'sender' ? a.trader : a.investor,
    tokenCode: tokenCodeForSac(a.token),
    released,
    total,
    progress: total > 0 ? released / total : 0,
    phase,
    nextIndex: left ? released + 1 : null,
    nextAmount,
    capital,
    secured: a.capital_deposited && s === Status.Active ? capital - releasedAmount : 0n,
  };
}
