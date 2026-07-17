import { describe, it, expect } from 'vitest';
import { Asset } from '@stellar/stellar-sdk';
import { assetFromId } from './stellarAssets';

describe('assetFromId', () => {
  it('maps native XLM (no issuer) to Asset.native()', () => {
    const a = assetFromId({ code: 'XLM' });
    expect(a.isNative()).toBe(true);
  });

  it('maps an issued asset to a code+issuer Asset', () => {
    const issuer = 'GDCOP33NLUKXJXALCJCPTXJUGS42GZRM5YOYLS5RTKMLZNPORM2Z76GI';
    const a = assetFromId({ code: 'USDC', issuer });
    expect(a.isNative()).toBe(false);
    expect(a.getCode()).toBe('USDC');
    expect(a.getIssuer()).toBe(issuer);
    expect(a).toBeInstanceOf(Asset);
  });

  it('throws when a non-native asset has no issuer', () => {
    expect(() => assetFromId({ code: 'USDC' })).toThrow();
  });
});
