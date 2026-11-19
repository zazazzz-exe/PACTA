import { describe, it, expect } from 'vitest';
import { applyKey } from '../components/Keypad';
import { pactSteps } from './pactSteps';
import { paymentRequest } from './paymentRequest';
import { amountValue } from './money';
import type { Agreement } from './contract';
import { Status } from './pactSummary';

const base = {
  id: 1n,
  investor: 'GINV',
  trader: 'GTRA',
  token: 'CUNKNOWN',
  capital: 1_000_000_000n, // 100
  bond: 100_000_000n,
  milestones: 3,
  released_milestones: 0,
  released_amount: 0n,
  profit_share_bps: 0,
  created_at: 0n,
  start_time: 0n,
  deadline: 0n,
  status: Status.Pending,
  bond_posted: false,
  capital_deposited: false,
} as unknown as Agreement;

describe('keypad', () => {
  it('builds decimal amounts', () => {
    let v = '';
    for (const k of ['0', '.', '5', '0']) v = applyKey(v, k);
    expect(v).toBe('0.50');
    expect(applyKey('', '.')).toBe('0.');
    expect(applyKey('1.5', '.')).toBe('1.5');
    expect(applyKey('0', '7')).toBe('7');
    expect(applyKey('12', 'back')).toBe('1');
  });
  it('stops at 7 decimals (Stellar precision)', () => {
    expect(applyKey('1.1234567', '8')).toBe('1.1234567');
  });
});

describe('payment request QR', () => {
  it('is the plain address without an amount', () => {
    expect(paymentRequest('GABC', '')).toBe('GABC');
    expect(paymentRequest('GABC', '0')).toBe('GABC');
  });
  it('is a SEP-7 pay URI with amount and issued asset', () => {
    const uri = paymentRequest('GABC', '25', { code: 'USDC', issuer: 'GISS' });
    expect(uri.startsWith('web+stellar:pay?')).toBe(true);
    const q = new URLSearchParams(uri.split('?')[1]);
    expect(q.get('destination')).toBe('GABC');
    expect(q.get('amount')).toBe('25');
    expect(q.get('asset_code')).toBe('USDC');
    expect(q.get('asset_issuer')).toBe('GISS');
  });
  it('omits asset fields for native XLM', () => {
    const q = new URLSearchParams(paymentRequest('GABC', '1', { code: 'XLM' }).split('?')[1]);
    expect(q.has('asset_code')).toBe(false);
  });
});

describe('display value of an amount', () => {
  const rates = { USDC: 58, XLM: 23.2 };
  it('converts through the indicative PHP rates', () => {
    expect(amountValue('USDC', 10, 'USD', rates)).toBeCloseTo(10);
    expect(amountValue('XLM', 10, 'PHP', rates)).toBeCloseTo(232);
    expect(amountValue('XLM', 10, 'USD', rates)).toBeCloseTo(4);
  });
  it('has no value without a rate', () => {
    expect(amountValue('ABC', 10, 'USD', rates)).toBeUndefined();
  });
});

describe('Pact timeline', () => {
  it('starts at the bond for a new Pact', () => {
    const s = pactSteps(base);
    expect(s).toHaveLength(2 + 3 + 1);
    // bond and deposit can come in either order, so both are next
    expect(s[0].state).toBe('current');
    expect(s[1].state).toBe('current');
    expect(s.slice(2).every((x) => x.state === 'todo')).toBe(true);
  });
  it('marks released milestones and the next one; the final tranche sweeps the remainder', () => {
    const s = pactSteps({
      ...base,
      status: Status.Active,
      bond_posted: true,
      capital_deposited: true,
      released_milestones: 1,
      released_amount: 333_333_333n,
    } as Agreement);
    expect(s.map((x) => x.state)).toEqual(['done', 'done', 'done', 'current', 'todo', 'todo']);
    // 33.3333334 (the remainder) shown at 4 decimals for an unknown token
    expect(s[4].detail).toBe('33.3333 tokens');
  });
  it('ends with a stopped step when refunded', () => {
    const s = pactSteps({ ...base, status: Status.Refunded, bond_posted: true, capital_deposited: true } as Agreement);
    expect(s[s.length - 1]).toMatchObject({ title: 'Refunded to the sender', state: 'stopped' });
    expect(s.some((x) => x.state === 'current')).toBe(false);
  });
});
