import { describe, it, expect } from 'vitest';
import { priceForAssetPhp, displayValuePhp, withDisplayValues, totalPhp } from './prices';
import type { AssetBalance } from './adapters/ChainAdapter';

const xlm: AssetBalance = { asset: { code: 'XLM' }, amount: '100.0000000', baseUnits: 1_000_000_000n };
const usdc: AssetBalance = { asset: { code: 'USDC', issuer: 'G...' }, amount: '10.0000000', baseUnits: 100_000_000n };
const unknown: AssetBalance = { asset: { code: 'FOO', issuer: 'G...' }, amount: '5.0000000', baseUnits: 50_000_000n };

describe('priceForAssetPhp', () => {
  it('knows XLM and USDC', () => {
    expect(priceForAssetPhp({ code: 'XLM' })).toBe(22);
    expect(priceForAssetPhp({ code: 'USDC' })).toBe(56);
  });
  it('returns undefined for unknown assets', () => {
    expect(priceForAssetPhp({ code: 'FOO' })).toBeUndefined();
  });
});

describe('displayValuePhp', () => {
  it('multiplies amount by rate', () => {
    expect(displayValuePhp(xlm)).toBe(2200); // 100 * 22
    expect(displayValuePhp(usdc)).toBe(560); // 10 * 56
  });
  it('is undefined for unpriced assets', () => {
    expect(displayValuePhp(unknown)).toBeUndefined();
  });
});

describe('withDisplayValues + totalPhp', () => {
  it('fills known values and sums only those', () => {
    const enriched = withDisplayValues([xlm, usdc, unknown]);
    expect(enriched[0].displayValuePhp).toBe(2200);
    expect(enriched[2].displayValuePhp).toBeUndefined();
    expect(totalPhp(enriched)).toBe(2760);
  });
});
