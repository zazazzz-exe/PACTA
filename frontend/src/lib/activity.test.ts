import { describe, it, expect } from 'vitest';
import { parseActivity, timeAgo, type RawPaymentRecord } from './activity';

const ME = 'GDCOP33NLUKXJXALCJCPTXJUGS42GZRM5YOYLS5RTKMLZNPORM2Z76GI';
const OTHER = 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5';

const rec = (r: Partial<RawPaymentRecord>): RawPaymentRecord => ({
  id: '1',
  type: 'payment',
  created_at: '2026-07-18T00:00:00Z',
  transaction_hash: 'h1',
  ...r,
});

describe('parseActivity', () => {
  it('classifies a received native payment', () => {
    const out = parseActivity([rec({ type: 'payment', from: OTHER, to: ME, amount: '10.0000000', asset_type: 'native' })], ME);
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ kind: 'received', counterparty: OTHER, assetCode: 'XLM', amount: '10.0000000' });
  });

  it('classifies a sent issued payment', () => {
    const out = parseActivity(
      [rec({ type: 'payment', from: ME, to: OTHER, amount: '5.0000000', asset_type: 'credit_alphanum4', asset_code: 'USDC' })],
      ME,
    );
    expect(out[0]).toMatchObject({ kind: 'sent', counterparty: OTHER, assetCode: 'USDC' });
  });

  it('uses source asset/amount for a sent path payment', () => {
    const out = parseActivity(
      [rec({
        type: 'path_payment_strict_send',
        from: ME,
        to: OTHER,
        amount: '4.5',
        asset_type: 'credit_alphanum4',
        asset_code: 'USDC',
        source_amount: '100',
        source_asset_type: 'native',
      })],
      ME,
    );
    expect(out[0]).toMatchObject({ kind: 'sent', assetCode: 'XLM', amount: '100' });
  });

  it('classifies create_account funding as received', () => {
    const out = parseActivity(
      [rec({ type: 'create_account', account: ME, funder: OTHER, starting_balance: '2.5', amount: undefined })],
      ME,
    );
    expect(out[0]).toMatchObject({ kind: 'received', counterparty: OTHER, assetCode: 'XLM', amount: '2.5' });
  });

  it('drops unsupported record types', () => {
    const out = parseActivity([rec({ type: 'invoke_host_function' })], ME);
    expect(out).toHaveLength(0);
  });
});

describe('timeAgo', () => {
  const now = Date.parse('2026-07-18T12:00:00Z');
  it('formats recent spans', () => {
    expect(timeAgo('2026-07-18T11:59:40Z', now)).toBe('just now');
    expect(timeAgo('2026-07-18T11:30:00Z', now)).toBe('30m');
    expect(timeAgo('2026-07-18T09:00:00Z', now)).toBe('3h');
    expect(timeAgo('2026-07-16T12:00:00Z', now)).toBe('2d');
  });
  it('returns empty for an unparseable timestamp', () => {
    expect(timeAgo('not-a-date', now)).toBe('');
  });
});
