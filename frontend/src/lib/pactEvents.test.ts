import { describe, it, expect, vi } from 'vitest';

// contract.ts imports signTransaction from './wallet', which in turn pulls in
// `@creit.tech/stellar-wallets-kit` -> `@stellar/freighter-api`. That package
// does not provide a named `getAddress` export under Vitest's Node/ESM
// interop (see StellarAdapter.buildConvertTx.test.ts), so stub the module out;
// pactEvents never signs anything. (vi.mock calls are hoisted above imports.)
vi.mock('./wallet', () => ({
  signTransaction: vi.fn(),
}));

import { pactEvents } from './pactEvents';
import { Status, type Agreement } from './contract';

// Minimal Agreement factory for the fields pactEvents inspects. Real field
// names come from the `pacta` bindings (packages/pacta/dist/index.d.ts):
// bond_posted, capital_deposited, released_milestones, status.
const base = (over: Partial<Agreement>): Agreement =>
  ({
    id: 1n,
    investor: 'GINVESTOR',
    trader: 'GTRADER',
    token: 'TOKEN',
    capital: 100n,
    bond: 10n,
    milestones: 4,
    released_milestones: 0,
    released_amount: 0n,
    profit_share_bps: 0,
    created_at: 0n,
    start_time: 0n,
    deadline: 0n,
    status: Status.Active,
    bond_posted: false,
    capital_deposited: false,
    ...over,
  }) as Agreement;

describe('pactEvents', () => {
  it('emits nothing when prev is null (first load)', () => {
    expect(pactEvents(null, base({}))).toEqual([]);
  });

  it('emits nothing when nothing changed', () => {
    const prev = base({});
    const next = base({});
    expect(pactEvents(prev, next)).toEqual([]);
  });

  it('emits pact-bond when bond becomes posted', () => {
    const prev = base({ bond_posted: false });
    const next = base({ bond_posted: true });
    expect(pactEvents(prev, next)).toContainEqual({ kind: 'pact-bond' });
  });

  it('does not emit pact-bond again once already posted', () => {
    const prev = base({ bond_posted: true });
    const next = base({ bond_posted: true });
    expect(pactEvents(prev, next)).not.toContainEqual({ kind: 'pact-bond' });
  });

  it('emits pact-deposit when capital becomes deposited', () => {
    const prev = base({ capital_deposited: false });
    const next = base({ capital_deposited: true });
    expect(pactEvents(prev, next)).toContainEqual({ kind: 'pact-deposit' });
  });

  it('emits pact-release when a milestone is newly released', () => {
    const prev = base({ released_milestones: 0 });
    const next = base({ released_milestones: 1 });
    expect(pactEvents(prev, next)).toContainEqual({ kind: 'pact-release' });
  });

  it('does not emit pact-release when released_milestones is unchanged', () => {
    const prev = base({ released_milestones: 2 });
    const next = base({ released_milestones: 2 });
    expect(pactEvents(prev, next)).not.toContainEqual({ kind: 'pact-release' });
  });

  it('emits pact-complete when status transitions to Completed', () => {
    const prev = base({ status: Status.Active });
    const next = base({ status: Status.Completed });
    expect(pactEvents(prev, next)).toContainEqual({ kind: 'pact-complete' });
  });

  it('emits pact-refund when status transitions to Refunded', () => {
    const prev = base({ status: Status.Active });
    const next = base({ status: Status.Refunded });
    expect(pactEvents(prev, next)).toContainEqual({ kind: 'pact-refund' });
  });

  it('can emit multiple events in one diff', () => {
    const prev = base({ bond_posted: false, capital_deposited: false });
    const next = base({ bond_posted: true, capital_deposited: true });
    const events = pactEvents(prev, next);
    expect(events).toContainEqual({ kind: 'pact-bond' });
    expect(events).toContainEqual({ kind: 'pact-deposit' });
  });
});
