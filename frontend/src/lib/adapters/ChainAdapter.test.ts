import { describe, it, expect } from 'vitest';
import { parseBalances, humanToBaseUnits, type RawBalanceLine } from './ChainAdapter';

describe('humanToBaseUnits', () => {
  it('converts a 7-decimal Horizon string exactly', () => {
    expect(humanToBaseUnits('100.0000000')).toBe(1_000_000_000n);
  });
  it('handles fewer decimals and integers', () => {
    expect(humanToBaseUnits('1.5')).toBe(15_000_000n);
    expect(humanToBaseUnits('42')).toBe(420_000_000n);
  });
  it('does not lose precision on large balances', () => {
    expect(humanToBaseUnits('1234567.8901234')).toBe(12_345_678_901_234n);
  });
});

describe('parseBalances', () => {
  it('maps native XLM', () => {
    const raw: RawBalanceLine[] = [{ asset_type: 'native', balance: '100.0000000' }];
    const out = parseBalances(raw);
    expect(out).toHaveLength(1);
    expect(out[0].asset).toEqual({ code: 'XLM' });
    expect(out[0].amount).toBe('100.0000000');
    expect(out[0].baseUnits).toBe(1_000_000_000n);
  });

  it('maps issued assets with code + issuer', () => {
    const raw: RawBalanceLine[] = [
      { asset_type: 'credit_alphanum4', balance: '50.0000000', asset_code: 'USDC', asset_issuer: 'GISSUER' },
    ];
    const out = parseBalances(raw);
    expect(out[0].asset).toEqual({ code: 'USDC', issuer: 'GISSUER' });
    expect(out[0].baseUnits).toBe(500_000_000n);
  });

  it('skips liquidity pool shares', () => {
    const raw: RawBalanceLine[] = [
      { asset_type: 'liquidity_pool_shares', balance: '1.0000000' },
      { asset_type: 'native', balance: '5.0000000' },
    ];
    const out = parseBalances(raw);
    expect(out).toHaveLength(1);
    expect(out[0].asset.code).toBe('XLM');
  });

  it('never sets displayValuePhp (pricing is a separate concern)', () => {
    const out = parseBalances([{ asset_type: 'native', balance: '1.0000000' }]);
    expect(out[0].displayValuePhp).toBeUndefined();
  });
});
