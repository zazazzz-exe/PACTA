import { describe, it, expect } from 'vitest';
import {
  applySlippage,
  DEFAULT_SLIPPAGE_BPS,
  assetKey,
  sameAsset,
  hasTrustline,
  mergeToAssets,
  assetIdFromHop,
  buildQuote,
} from './convert';
import { baseUnitsToHuman } from './adapters/ChainAdapter';
import type { AssetBalance } from './adapters/ChainAdapter';

const XLM = { code: 'XLM' };
const USDC = { code: 'USDC', issuer: 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5' };

const bal = (code: string, issuer: string | undefined, amount: string): AssetBalance => ({
  asset: issuer ? { code, issuer } : { code },
  amount,
  baseUnits: 0n,
});

describe('baseUnitsToHuman', () => {
  it('inverts humanToBaseUnits', () => {
    expect(baseUnitsToHuman(1_000_000_000n)).toBe('100');
    expect(baseUnitsToHuman(15_000_000n)).toBe('1.5');
    expect(baseUnitsToHuman(1n)).toBe('0.0000001');
    expect(baseUnitsToHuman(0n)).toBe('0');
  });
});

describe('applySlippage', () => {
  it('reduces by the bps in base units', () => {
    expect(applySlippage(1_000_000_000n, 50)).toBe(995_000_000n); // -0.5%
    expect(applySlippage(1_000_000_000n, 0)).toBe(1_000_000_000n);
    expect(DEFAULT_SLIPPAGE_BPS).toBe(50);
  });
});

describe('assetKey / sameAsset', () => {
  it('keys native and issued distinctly', () => {
    expect(assetKey(XLM)).toBe('XLM:native');
    expect(assetKey(USDC)).toBe(`USDC:${USDC.issuer}`);
    expect(sameAsset(XLM, { code: 'XLM' })).toBe(true);
    expect(sameAsset(XLM, USDC)).toBe(false);
  });
});

describe('hasTrustline', () => {
  it('native never needs a trustline', () => {
    expect(hasTrustline([], XLM)).toBe(true);
  });
  it('true only when the issued asset is already held', () => {
    expect(hasTrustline([bal('USDC', USDC.issuer, '0')], USDC)).toBe(true);
    expect(hasTrustline([bal('XLM', undefined, '10')], USDC)).toBe(false);
  });
});

describe('mergeToAssets', () => {
  it('unions known + held, drops the from-asset, de-dupes', () => {
    const balances = [bal('XLM', undefined, '10'), bal('USDC', USDC.issuer, '5')];
    const out = mergeToAssets([XLM, USDC], balances, XLM);
    expect(out.map(assetKey)).toEqual([`USDC:${USDC.issuer}`]);
  });
});

describe('assetIdFromHop', () => {
  it('maps native and issued hops', () => {
    expect(assetIdFromHop({ asset_type: 'native' })).toEqual({ code: 'XLM' });
    expect(
      assetIdFromHop({ asset_type: 'credit_alphanum4', asset_code: 'USDC', asset_issuer: USDC.issuer }),
    ).toEqual({ code: 'USDC', issuer: USDC.issuer });
  });
});

describe('buildQuote', () => {
  it('sets amountOut, min-received after slippage, and maps the path', () => {
    const record = {
      destination_amount: '4.5000000',
      path: [{ asset_type: 'native' }],
    };
    const q = buildQuote(XLM, USDC, '100', record, 50);
    expect(q.from).toEqual(XLM);
    expect(q.to).toEqual(USDC);
    expect(q.amountIn).toBe('100');
    expect(q.amountOut).toBe('4.5000000');
    expect(q.minReceived).toBe('4.4775'); // 4.5 * 0.995
    expect(q.path).toEqual([{ code: 'XLM' }]);
    expect(q.sender).toBeUndefined();
  });
});
