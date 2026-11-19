import { describe, it, expect } from 'vitest';
import { summarizePact, isOpenPact, tokenCodeForSac, Status } from './pactSummary';
import type { Agreement } from './contract';
import { TOKEN_ADDRESS } from './config';

const ME = 'G' + 'A'.repeat(55);
const THEM = 'G' + 'B'.repeat(55);

const pact = (over: Partial<Agreement> = {}): Agreement =>
  ({
    id: 7n,
    investor: ME,
    trader: THEM,
    token: TOKEN_ADDRESS,
    capital: 1_000_000_000n, // 100.0
    bond: 200_000_000n,
    milestones: 3,
    released_milestones: 0,
    released_amount: 0n,
    profit_share_bps: 0,
    created_at: 0n,
    start_time: 0n,
    deadline: 0n,
    status: Status.Active,
    bond_posted: true,
    capital_deposited: true,
    ...over,
  }) as Agreement;

describe('summarizePact', () => {
  it('describes the next equal tranche and progress for the sender', () => {
    const s = summarizePact(pact({ released_milestones: 1, released_amount: 333_333_333n }), ME)!;
    expect(s).toMatchObject({ role: 'sender', counterparty: THEM, tokenCode: 'XLM', released: 1, total: 3, nextIndex: 2, phase: 'releasing' });
    expect(s.nextAmount).toBe(333_333_333n);
    expect(s.progress).toBeCloseTo(1 / 3);
  });

  it('gives the final milestone the remainder (no rounding dust)', () => {
    const s = summarizePact(pact({ released_milestones: 2, released_amount: 666_666_666n }), ME)!;
    expect(s.nextIndex).toBe(3);
    expect(s.nextAmount).toBe(333_333_334n);
  });

  it('shows the recipient view and pending phases', () => {
    expect(summarizePact(pact({ status: Status.Pending, bond_posted: false }), THEM)).toMatchObject({
      role: 'recipient',
      counterparty: ME,
      phase: 'awaitingBond',
    });
    expect(summarizePact(pact({ status: Status.Pending, bond_posted: true, capital_deposited: false }), ME)!.phase).toBe('awaitingDeposit');
  });

  it('ignores Pacts that are not mine', () => {
    expect(summarizePact(pact(), 'G' + 'C'.repeat(55))).toBeNull();
  });
});

describe('isOpenPact / tokenCodeForSac', () => {
  it('only Pending and Active are open', () => {
    expect(isOpenPact(pact({ status: Status.Active }))).toBe(true);
    expect(isOpenPact(pact({ status: Status.Pending }))).toBe(true);
    expect(isOpenPact(pact({ status: Status.Completed }))).toBe(false);
    expect(isOpenPact(pact({ status: Status.Refunded }))).toBe(false);
  });
  it('maps known SACs to codes', () => {
    expect(tokenCodeForSac(TOKEN_ADDRESS)).toBe('XLM');
    expect(tokenCodeForSac('CUNKNOWN')).toBe('tokens');
  });
});
