// Simulated escrow (Pacts) for demo mode: seeded agreements + client-side state
// transitions that mirror the real contract closely enough to demo. No network.
import { Status } from 'pacta';
import type { Agreement, Reputation } from 'pacta';
import type { CreateArgs, WriteResult } from '../contract';
import { DEMO_ADDRESS, DEMO_COUNTERPARTY } from './index';
import { demoFakeHash } from './store';

const XLM = 10_000_000n; // 1 XLM in base units
const TOKEN = 'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC';

function now(): bigint {
  return BigInt(Math.floor(Date.now() / 1000));
}

function seed(): Agreement[] {
  const t = now();
  return [
    // Active — you are paying; 1 of 4 milestones released.
    {
      id: 1n,
      investor: DEMO_ADDRESS,
      trader: DEMO_COUNTERPARTY,
      token: TOKEN,
      capital: 100n * XLM,
      bond: 20n * XLM,
      milestones: 4,
      released_milestones: 1,
      released_amount: 25n * XLM,
      profit_share_bps: 2000,
      status: Status.Active,
      capital_deposited: true,
      bond_posted: true,
      created_at: t - 3600n,
      start_time: t - 1800n,
      deadline: t + 3600n,
    },
    // Pending — you are paying; waiting on deposit + bond.
    {
      id: 2n,
      investor: DEMO_ADDRESS,
      trader: DEMO_COUNTERPARTY,
      token: TOKEN,
      capital: 50n * XLM,
      bond: 10n * XLM,
      milestones: 2,
      released_milestones: 0,
      released_amount: 0n,
      profit_share_bps: 2000,
      status: Status.Pending,
      capital_deposited: false,
      bond_posted: false,
      created_at: t - 600n,
      start_time: 0n,
      deadline: t + 86_400n,
    },
    // Completed — you were paid.
    {
      id: 3n,
      investor: DEMO_COUNTERPARTY,
      trader: DEMO_ADDRESS,
      token: TOKEN,
      capital: 200n * XLM,
      bond: 40n * XLM,
      milestones: 3,
      released_milestones: 3,
      released_amount: 200n * XLM,
      profit_share_bps: 2000,
      status: Status.Completed,
      capital_deposited: true,
      bond_posted: true,
      created_at: t - 200_000n,
      start_time: t - 190_000n,
      deadline: t - 100_000n,
    },
  ];
}

let agreements = seed();

const find = (id: bigint) => agreements.find((a) => a.id === id);
const ok = <T>(result: T): WriteResult<T> => ({ result, hash: demoFakeHash() });

// Activate once both sides have funded.
function maybeActivate(a: Agreement): void {
  if (a.status === Status.Pending && a.capital_deposited && a.bond_posted) {
    a.status = Status.Active;
    a.start_time = now();
  }
}

export function demoGetCount(): bigint {
  return BigInt(agreements.length);
}
export function demoGetAgreement(id: bigint): Agreement {
  const a = find(id);
  if (!a) throw new Error('Pact not found.');
  return { ...a };
}
export function demoGetAllAgreements(): Agreement[] {
  return agreements.map((a) => ({ ...a }));
}
export function demoGetReputation(trader: string): Reputation {
  if (trader === DEMO_ADDRESS || trader === DEMO_COUNTERPARTY) {
    return { completed: 3, refunded: 0, total_volume: 425n * XLM };
  }
  return { completed: 0, refunded: 0, total_volume: 0n };
}

export function demoCreateAgreement(args: CreateArgs): WriteResult<bigint> {
  const id = BigInt(agreements.length + 1);
  const t = now();
  agreements.push({
    id,
    investor: args.investor,
    trader: args.trader,
    token: TOKEN,
    capital: args.capital,
    bond: args.bond,
    milestones: args.milestones,
    released_milestones: 0,
    released_amount: 0n,
    profit_share_bps: args.profit_share_bps,
    status: Status.Pending,
    capital_deposited: false,
    bond_posted: false,
    created_at: t,
    start_time: 0n,
    deadline: t + args.duration,
  });
  return ok(id);
}

export function demoPostBond(id: bigint): WriteResult<void> {
  const a = find(id);
  if (a) {
    a.bond_posted = true;
    maybeActivate(a);
  }
  return ok(undefined);
}
export function demoDepositCapital(id: bigint): WriteResult<void> {
  const a = find(id);
  if (a) {
    a.capital_deposited = true;
    maybeActivate(a);
  }
  return ok(undefined);
}
export function demoReleaseMilestone(id: bigint): WriteResult<bigint> {
  const a = find(id);
  if (!a) return ok(0n);
  const last = a.released_milestones + 1 >= a.milestones;
  const tranche = last ? a.capital - a.released_amount : a.capital / BigInt(a.milestones);
  a.released_milestones += 1;
  a.released_amount += tranche;
  return ok(tranche);
}
export function demoComplete(id: bigint): WriteResult<void> {
  const a = find(id);
  if (a) a.status = Status.Completed;
  return ok(undefined);
}
export function demoEmergencyRefund(id: bigint): WriteResult<void> {
  const a = find(id);
  if (a) a.status = Status.Refunded;
  return ok(undefined);
}
export function demoCancel(id: bigint): WriteResult<void> {
  const a = find(id);
  if (a) a.status = Status.Cancelled;
  return ok(undefined);
}
