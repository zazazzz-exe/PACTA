import { describe, it, expect } from 'vitest';
import { friendlyError, horizonResultCodes } from './errors';

describe('horizonResultCodes', () => {
  it('reads result_codes from a Horizon-shaped error', () => {
    const e = {
      response: { data: { extras: { result_codes: { operations: ['op_no_trust'] } } } },
    };
    expect(horizonResultCodes(e)).toEqual({ operations: ['op_no_trust'] });
  });

  it('returns null when the shape is absent', () => {
    expect(horizonResultCodes(new Error('boom'))).toBeNull();
    expect(horizonResultCodes('plain string')).toBeNull();
    expect(horizonResultCodes(undefined)).toBeNull();
    expect(horizonResultCodes({})).toBeNull();
    expect(horizonResultCodes({ response: {} })).toBeNull();
  });
});

describe('friendlyError - Horizon result_codes', () => {
  it('maps op_no_trust to a trustline message', () => {
    const e = {
      response: { data: { extras: { result_codes: { operations: ['op_no_trust'] } } } },
    };
    expect(friendlyError(e)).toBe(
      'The recipient cannot receive this asset yet (they need a trustline for it).'
    );
  });

  it('maps tx_insufficient_balance (no operations) to a reserve message', () => {
    const e = {
      response: { data: { extras: { result_codes: { transaction: 'tx_insufficient_balance' } } } },
    };
    expect(friendlyError(e)).toBe(
      'Not enough balance to cover the amount plus the network fee and the minimum reserve.'
    );
  });

  it('prioritizes the operation code over the transaction code when both are present', () => {
    const e = {
      response: {
        data: {
          extras: {
            result_codes: {
              transaction: 'tx_failed',
              operations: ['op_underfunded'],
            },
          },
        },
      },
    };
    expect(friendlyError(e)).toBe('You do not have enough balance to send this amount.');
  });

  it('falls back to a specific-but-generic message for unmapped codes', () => {
    const e = {
      response: { data: { extras: { result_codes: { operations: ['op_mystery'] } } } },
    };
    expect(friendlyError(e)).toBe('Transaction failed (op_mystery).');
  });

  it('still maps plain contract-code errors (regression)', () => {
    expect(friendlyError(new Error('Error(Contract, #10)'))).toBe(
      'The agreement deadline has not passed yet.'
    );
  });

  it('passes through a plain string', () => {
    expect(friendlyError('Something went wrong')).toBe('Something went wrong');
  });

  it('maps path-payment op codes', () => {
    expect(
      friendlyError({ response: { data: { extras: { result_codes: { operations: ['op_too_few_offers'] } } } } }),
    ).toMatch(/not enough offers/i);
    expect(
      friendlyError({ response: { data: { extras: { result_codes: { operations: ['op_under_dest_min'] } } } } }),
    ).toMatch(/slippage limit/i);
    expect(
      friendlyError({ response: { data: { extras: { result_codes: { operations: ['op_low_reserve'] } } } } }),
    ).toMatch(/little more XLM/i);
  });
});

describe('friendlyError - escrow min duration and same party', () => {
  it('maps contract errors 12 and 13', () => {
    expect(friendlyError(new Error('Error(Contract, #12)'))).toBe(
      'That deadline is too short for a Pact. Pick a longer one.',
    );
    expect(friendlyError(new Error('Error(Contract, #13)'))).toBe('You cannot send a Pact to yourself.');
  });
});

describe('friendlyError for verification API failures', () => {
  it('never shows the raw path or status code', () => {
    for (const s of ['/api/kyc-start-verification 503', 'kyc-submit-media 500', 'kyc-status 502']) {
      const msg = friendlyError(new Error(s));
      expect(msg).toBe('Verification is busy right now. Please try again in a moment.');
    }
    expect(friendlyError(new Error('/api/kyc-verify-wallet 429'))).toMatch(/Too many attempts/);
    expect(friendlyError(new Error('/api/kyc-verify-wallet 401'))).toMatch(/session expired/);
    expect(friendlyError(new Error('/api/kyc-link-wallet 409'))).not.toMatch(/409|api/);
  });
});
