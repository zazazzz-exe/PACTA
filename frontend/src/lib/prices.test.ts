import { describe, it, expect } from 'vitest';
import { priceForAssetPhp, displayValuePhp, withDisplayValues, totalPhp } from './prices';
import { parsePhpRates } from './config';
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

describe('parsePhpRates', () => {
  const defaults = { XLM: 22, USDC: 56 };

  it('returns the defaults when unset or blank', () => {
    expect(parsePhpRates(undefined, defaults)).toEqual(defaults);
    expect(parsePhpRates('   ', defaults)).toEqual(defaults);
  });
  it('overrides individual rates and adds new codes', () => {
    expect(parsePhpRates('XLM:25,PHPX:1', defaults)).toEqual({ XLM: 25, USDC: 56, PHPX: 1 });
  });
  it('uppercases codes and trims whitespace', () => {
    expect(parsePhpRates(' xlm : 30 ', defaults).XLM).toBe(30);
  });
  it('ignores malformed pairs rather than dropping the whole table', () => {
    expect(parsePhpRates('XLM:notanumber,USDC:60,:5,BAD', defaults)).toEqual({ XLM: 22, USDC: 60 });
  });
  it('rejects zero and negative rates', () => {
    expect(parsePhpRates('XLM:0,USDC:-3', defaults)).toEqual(defaults);
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
