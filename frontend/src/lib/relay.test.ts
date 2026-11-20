import { describe, it, expect, vi, afterEach } from 'vitest';
vi.mock('./wallet', () => ({ signTransaction: vi.fn() }));
const { relaySubmit, RelayError } = await import('./relay');
import { friendlyError } from './errors';
const { needsSetup } = await import('../components/home/SetupWalletCard');

const respond = (status: number, body: unknown) => vi.fn(async () => new Response(JSON.stringify(body), { status }));

afterEach(() => vi.unstubAllGlobals());

describe('relaySubmit', () => {
  it('returns the hash and return value when PACTA paid and it landed', async () => {
    vi.stubGlobal('fetch', respond(200, { status: 'success', hash: 'abc', returnValue: 'AAAABQAAAAAAAAAE' }));
    expect(await relaySubmit('XDR')).toEqual({ hash: 'abc', returnValue: 'AAAABQAAAAAAAAAE' });
  });
  it('lets the caller fall back when the relayer will not or cannot pay', async () => {
    for (const [status, body, code] of [
      [429, { error: 'wallet_cap' }, 'wallet_cap'],
      [429, { error: 'daily_cap' }, 'daily_cap'],
      [400, { error: 'not_sponsored', reason: 'op_not_allowed:setOptions' }, 'not_sponsored'],
      [503, { error: 'relay_unavailable' }, 'relay_unavailable'],
    ] as const) {
      vi.stubGlobal('fetch', respond(status, body));
      const e = await relaySubmit('XDR').catch((x) => x);
      expect(e).toBeInstanceOf(RelayError);
      expect(e.code).toBe(code);
      expect(e.canFallBack).toBe(true);
    }
  });
  it('does not resubmit a transaction that reached the network and failed', async () => {
    vi.stubGlobal('fetch', respond(422, { status: 'failed', hash: 'h', error: 'txFeeBumpInnerFailed:txFailed' }));
    const e = await relaySubmit('XDR').catch((x) => x);
    expect(e.code).toBe('failed');
    expect(e.canFallBack).toBe(false);
    expect(friendlyError(e)).toBe('The transaction did not go through. Check your balance and try again.');
  });
  it('falls back when the relayer cannot be reached', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('offline'); }));
    const e = await relaySubmit('XDR').catch((x) => x);
    expect(e.code).toBe('network');
    expect(e.canFallBack).toBe(true);
  });
});

describe('friendly relayer messages', () => {
  it('never shows the raw code', () => {
    expect(friendlyError(new RelayError('daily_cap'))).toMatch(/free network fees are used up/);
    expect(friendlyError(new RelayError('rate_limited'))).toMatch(/Too many transactions/);
    expect(friendlyError(new RelayError('not_sponsored', 'op_not_allowed:setOptions'))).not.toMatch(/setOptions/);
  });
});

describe('wallet setup card', () => {
  const ISSUER = 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5';
  it('shows until the wallet holds a USDC trustline from the known issuer', () => {
    expect(needsSetup([], ISSUER)).toBe(true);
    expect(needsSetup([{ asset: { code: 'XLM' }, amount: '0', baseUnits: 0n }], ISSUER)).toBe(true);
    expect(needsSetup([{ asset: { code: 'USDC', issuer: 'GOTHER' }, amount: '0', baseUnits: 0n }], ISSUER)).toBe(true);
    expect(needsSetup([{ asset: { code: 'USDC', issuer: ISSUER }, amount: '0', baseUnits: 0n }], ISSUER)).toBe(false);
  });
});
