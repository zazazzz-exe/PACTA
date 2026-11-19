import { describe, it, expect } from 'vitest';
import {
  formatAssetAmount,
  formatBaseUnits,
  formatFiat,
  balanceValue,
  totalValue,
  phpPerUsd,
  relativeTime,
  isFiatLike,
} from './money';
import type { AssetBalance } from './adapters/ChainAdapter';

const L = 'en-US';
const RATES = { XLM: 22, USDC: 56 };
const bal = (code: string, amount: string, issuer?: string): AssetBalance => ({
  asset: { code, issuer },
  amount,
  baseUnits: BigInt(Math.round(Number(amount) * 1e7)),
});

describe('formatAssetAmount', () => {
  it('uses exactly 2 decimals for fiat-like assets, with separators', () => {
    expect(formatAssetAmount('1250.0000000', 'USDC', L).display).toBe('1,250.00');
    expect(formatAssetAmount('0.1', 'USDC', L).display).toBe('0.10');
    expect(formatAssetAmount('1234567.891', 'PHP', L).display).toBe('1,234,567.89');
  });

  it('shows XLM with 2 to 4 decimals', () => {
    expect(formatAssetAmount('1240', 'XLM', L).display).toBe('1,240.00');
    expect(formatAssetAmount('12.3456789', 'XLM', L).display).toBe('12.3457');
    expect(formatAssetAmount('0.5', 'XLM', L).display).toBe('0.50');
  });

  it('keeps the exact value for the tooltip', () => {
    expect(formatAssetAmount('12.3456789', 'XLM', L).full).toBe('12.3456789 XLM');
    expect(formatAssetAmount('100.0000000', 'USDC', L).full).toBe('100 USDC');
  });

  it('never shows a tiny non-zero balance as zero', () => {
    expect(formatAssetAmount('0.00001', 'XLM', L).display).toBe('<0.0001');
    expect(formatAssetAmount('0.001', 'USDC', L).display).toBe('<0.01');
    expect(formatAssetAmount('0', 'USDC', L).display).toBe('0.00');
  });

  it('respects the locale', () => {
    expect(formatAssetAmount('1250.5', 'USDC', 'de-DE').display).toBe('1.250,50');
  });

  it('passes through a non-numeric value unchanged', () => {
    expect(formatAssetAmount('abc', 'XLM', L).display).toBe('abc');
  });
});

describe('formatBaseUnits', () => {
  it('converts 7-decimal base units at the UI boundary', () => {
    expect(formatBaseUnits(12_500_000_000n, 'USDC', L)).toEqual({ display: '1,250.00', full: '1250 USDC' });
    expect(formatBaseUnits(1n, 'XLM', L).full).toBe('0.0000001 XLM');
    expect(formatBaseUnits(-250_000_000n, 'XLM', L).display).toBe('-25.00');
  });
});

describe('currency values', () => {
  it('derives USD from the USDC peso rate', () => {
    expect(phpPerUsd(RATES)).toBe(56);
    expect(balanceValue(bal('USDC', '100'), 'USD', RATES)).toBeCloseTo(100);
    expect(balanceValue(bal('USDC', '100'), 'PHP', RATES)).toBeCloseTo(5600);
    expect(balanceValue(bal('XLM', '56'), 'USD', RATES)).toBeCloseTo(22);
  });

  it('returns undefined when there is no rate', () => {
    expect(balanceValue(bal('ABC', '10'), 'USD', RATES)).toBeUndefined();
    expect(balanceValue(bal('USDC', '10'), 'USD', { XLM: 22 })).toBeUndefined();
  });

  it('sums only assets with a rate', () => {
    const total = totalValue([bal('USDC', '100'), bal('XLM', '56'), bal('ABC', '9')], 'USD', RATES);
    expect(total).toBeCloseTo(122);
  });

  it('formats USD plainly and PHP as an approximation', () => {
    expect(formatFiat(1250, 'USD', L)).toBe('$1,250.00');
    expect(formatFiat(72812.5, 'PHP', L)).toBe('≈ ₱72,812.50');
  });

  it('knows which codes are fiat-like', () => {
    expect(isFiatLike('usdc')).toBe(true);
    expect(isFiatLike('XLM')).toBe(false);
  });
});

describe('relativeTime', () => {
  const now = new Date('2026-11-20T10:00:00Z');
  it('describes recent times in words', () => {
    expect(relativeTime('2026-11-20T09:59:50Z', now, L)).toBe('now');
    expect(relativeTime('2026-11-20T09:58:00Z', now, L)).toBe('2 minutes ago');
    expect(relativeTime('2026-11-20T07:00:00Z', now, L)).toBe('3 hours ago');
    expect(relativeTime('2026-11-19T10:00:00Z', now, L)).toBe('yesterday');
  });
  it('falls back to a date after a week, and to empty for bad input', () => {
    expect(relativeTime('2026-11-01T10:00:00Z', now, L)).toBe('Nov 1');
    expect(relativeTime('not-a-date', now, L)).toBe('');
  });
});
