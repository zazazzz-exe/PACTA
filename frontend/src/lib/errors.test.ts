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
});
