import { describe, it, expect } from 'vitest';
import { labelAsset, arrangeAssets } from './assetRegistry';
import { USDC_MAINNET_ISSUER, USDC_TESTNET_ISSUER } from './tokenSac';
import type { AssetBalance } from './adapters/ChainAdapter';

const UNKNOWN = 'GBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB';

describe('labelAsset', () => {
  it('tells duplicate USDC codes apart by issuer', () => {
    expect(labelAsset({ code: 'USDC', issuer: USDC_MAINNET_ISSUER }, 'public')).toMatchObject({
      source: 'centre.io',
      verified: true,
    });
    expect(labelAsset({ code: 'USDC', issuer: USDC_TESTNET_ISSUER }, 'testnet')).toMatchObject({
      source: 'testnet issuer',
      verified: true,
    });
    const fake = labelAsset({ code: 'USDC', issuer: UNKNOWN }, 'public');
    expect(fake).toMatchObject({ verified: false, source: 'GBBB…BBBB' });
  });

  it('labels native XLM', () => {
    expect(labelAsset({ code: 'XLM' }, 'testnet')).toMatchObject({ name: 'Stellar Lumens', source: 'stellar.org', verified: true });
  });

  it('marks fiat-style test tokens from unknown issuers as testnet only', () => {
    expect(labelAsset({ code: 'PHP', issuer: UNKNOWN }, 'testnet')).toMatchObject({ testnetOnly: true, verified: false });
    expect(labelAsset({ code: 'PHP', issuer: UNKNOWN }, 'public').testnetOnly).toBe(false);
    expect(labelAsset({ code: 'MEME', issuer: UNKNOWN }, 'testnet').testnetOnly).toBe(false);
  });
});

describe('arrangeAssets', () => {
  const b = (code: string, base: bigint): AssetBalance => ({ asset: { code }, amount: String(base), baseUnits: base });
  const values: Record<string, number | undefined> = { USDC: 100, XLM: 20, ABC: undefined, ZERO: 0 };

  it('sorts by value and collapses zero balances', () => {
    const { visible, empty } = arrangeAssets(
      [b('XLM', 5n), b('ZERO', 0n), b('USDC', 9n), b('ABC', 3n)],
      (x) => values[x.asset.code],
    );
    expect(visible.map((x) => x.asset.code)).toEqual(['USDC', 'XLM', 'ABC']);
    expect(empty.map((x) => x.asset.code)).toEqual(['ZERO']);
  });
});
