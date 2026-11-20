import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Account, Asset, FeeBumpTransaction, Keypair, Operation, TransactionBuilder, rpc } from '@stellar/stellar-sdk';
import { fakeSupabase, type FakeDb } from '../_lib/testing/fakeSupabase';
import { issueSessionToken } from '../_lib/session';

let fake: FakeDb;
vi.mock('../_lib/db', () => ({ db: () => fake }));

// The network is stubbed: submissions are captured, never sent.
const submitted: (FeeBumpTransaction | { toXDR(): string })[] = [];
let outcome: Record<string, unknown> = { status: 'success', hash: 'h1', feeCharged: 360_039, returnValue: 'AAAABQAAAAAAAAAE' };
vi.mock('../_lib/relay/submit', () => ({
  submitAndWait: async (_s: unknown, tx: FeeBumpTransaction) => {
    submitted.push(tx);
    return outcome;
  },
}));

const { handler } = await import('../relay');

const seed = (n: number) => Keypair.fromRawEd25519Seed(Buffer.alloc(32, n));
const SPONSOR = seed(60);
const USER = seed(61);
const OTHER = seed(62);
const PASS = 'Test SDF Network ; September 2015';
const USDC = new Asset('USDC', 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5');

function req(action: string, body?: unknown, opts: { wallet?: string; ip?: string; method?: string } = {}) {
  const headers: Record<string, string> = { 'content-type': 'application/json', 'x-forwarded-for': opts.ip ?? '203.0.113.9' };
  if (opts.wallet) headers.cookie = `pacta_sess=${issueSessionToken(opts.wallet)}`;
  return handler(
    new Request(`https://pacta.test/api/relay?action=${action}`, {
      method: opts.method ?? 'POST',
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
  );
}

let seq = 1;
function payment(signer = USER) {
  const tx = new TransactionBuilder(new Account(signer.publicKey(), String(seq++)), { fee: '100', networkPassphrase: PASS })
    .addOperation(Operation.payment({ destination: OTHER.publicKey(), asset: USDC, amount: '1' }))
    .setTimeout(180)
    .build();
  tx.sign(signer);
  return tx.toXDR();
}

const today = () => new Date().toISOString();
const spent = (wallet: string, stroops: number) => ({ wallet_address: wallet, ip_hash: 'x', kind: 'classic', fee_max: stroops, fee_charged: stroops, status: 'success', created_at: today() });

beforeEach(() => {
  process.env.RELAYER_SECRET_KEY = SPONSOR.secret();
  process.env.SESSION_JWT_SECRET = 'test-session-secret-test-session-secret';
  process.env.KYC_HASH_SECRET = 'test-hash-secret';
  fake = fakeSupabase({ autoId: ['relay_tx'] });
  submitted.length = 0;
  outcome = { status: 'success', hash: 'h1', feeCharged: 360_039, returnValue: 'AAAABQAAAAAAAAAE' };
  vi.spyOn(rpc.Server.prototype, 'getAccount').mockImplementation(async (id: string) => new Account(id, '1000'));
  vi.spyOn(console, 'info').mockImplementation(() => {});
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  delete process.env.RELAYER_SECRET_KEY;
  delete process.env.RELAYER_WALLET_DAILY_CAP_XLM;
  delete process.env.RELAYER_DAILY_CAP_XLM;
  delete process.env.RELAYER_WALLET_PER_HOUR;
});

describe('status', () => {
  it('reports the sponsor and limits', async () => {
    const res = await req('status', undefined, { method: 'GET' });
    expect(await res.json()).toMatchObject({ enabled: true, network: 'testnet', sponsor: SPONSOR.publicKey(), maxTxFeeXlm: 1 });
  });
  it('is off, and sponsors nothing, without a sponsor secret', async () => {
    delete process.env.RELAYER_SECRET_KEY;
    expect((await (await req('status', undefined, { method: 'GET' })).json()).enabled).toBe(false);
    expect((await req('submit', { xdr: payment() })).status).toBe(503);
  });
});

describe('submit', () => {
  it('wraps a user-signed transaction in a fee bump paid by PACTA and logs it', async () => {
    const res = await req('submit', { xdr: payment() });
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ status: 'success', hash: 'h1', feeChargedXlm: 0.0360039 });
    const fb = submitted[0] as FeeBumpTransaction;
    expect(fb).toBeInstanceOf(FeeBumpTransaction);
    expect(fb.feeSource).toBe(SPONSOR.publicKey());
    expect(fb.innerTransaction.source).toBe(USER.publicKey());
    const row = fake.tables.relay_tx[0];
    expect(row).toMatchObject({ wallet_address: USER.publicKey(), kind: 'classic', status: 'success', fee_charged: 360_039 });
    expect(JSON.stringify(row)).not.toContain('203.0.113.9');
  });
  it('refuses what is not on the allowlist, without spending or logging a sponsored row', async () => {
    const tx = new TransactionBuilder(new Account(USER.publicKey(), '5'), { fee: '100', networkPassphrase: PASS })
      .addOperation(Operation.setOptions({ homeDomain: 'x.example' }))
      .setTimeout(180)
      .build();
    tx.sign(USER);
    const res = await req('submit', { xdr: tx.toXDR() });
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ error: 'not_sponsored', reason: 'op_not_allowed:setOptions' });
    expect(submitted).toHaveLength(0);
    expect(fake.tables.relay_tx ?? []).toHaveLength(0);
  });
  it('rejects malformed bodies', async () => {
    expect((await req('submit', { xdr: 5 })).status).toBe(400);
    expect((await req('submit', { xdr: payment(), extra: 1 })).status).toBe(400);
    expect((await req('nope', {})).status).toBe(404);
  });
  it('stops at the per-wallet daily cap', async () => {
    fake.tables.relay_tx = [spent(USER.publicKey(), 49_999_900)]; // 4.99999 of 5 XLM
    const res = await req('submit', { xdr: payment() });
    expect(res.status).toBe(429);
    expect((await res.json()).error).toBe('wallet_cap');
    expect((await req('submit', { xdr: payment(OTHER) })).status).toBe(200); // someone else is fine
  });
  it('stops at the global daily cap', async () => {
    fake.tables.relay_tx = [spent(OTHER.publicKey(), 1_000_000_000)];
    const res = await req('submit', { xdr: payment() });
    expect((await res.json()).error).toBe('daily_cap');
  });
  it('ignores yesterday and refused rows when counting spend', async () => {
    const old = { ...spent(USER.publicKey(), 49_000_000), created_at: new Date(Date.now() - 2 * 86_400_000).toISOString() };
    fake.tables.relay_tx = [old, { ...spent(USER.publicKey(), 49_000_000), status: 'refused' }];
    expect((await req('submit', { xdr: payment() })).status).toBe(200);
  });
  it('rate limits a wallet per hour', async () => {
    process.env.RELAYER_WALLET_PER_HOUR = '2';
    expect((await req('submit', { xdr: payment() })).status).toBe(200);
    expect((await req('submit', { xdr: payment() })).status).toBe(200);
    const res = await req('submit', { xdr: payment() });
    expect((await res.json()).error).toBe('rate_limited');
  });
  it('records a failed transaction with the fee the network still charged', async () => {
    outcome = { status: 'failed', hash: 'h2', feeCharged: 200, error: 'txFeeBumpInnerFailed:txFailed' };
    const res = await req('submit', { xdr: payment() });
    expect(res.status).toBe(422);
    expect(fake.tables.relay_tx[0]).toMatchObject({ status: 'failed', fee_charged: 200, error: 'txFeeBumpInnerFailed:txFailed' });
  });
  it('a transaction rejected before inclusion costs nothing', async () => {
    outcome = { status: 'rejected', hash: 'h3', feeCharged: 0, error: 'txBadSeq' };
    await req('submit', { xdr: payment() });
    expect(fake.tables.relay_tx[0]).toMatchObject({ status: 'rejected', fee_charged: 0 });
  });
});

describe('sponsored activation', () => {
  const horizon = (status: number, balances: unknown[] = []) =>
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ balances }), { status })));

  it('needs a wallet session', async () => {
    expect((await req('activate')).status).toBe(401);
    expect((await req('activate-submit', { xdr: 'x' })).status).toBe(401);
  });

  it('builds the sponsored activation for a new wallet, then submits it once signed', async () => {
    horizon(404);
    const res = await req('activate', undefined, { wallet: USER.publicKey() });
    const body = await res.json();
    expect(body).toMatchObject({ activated: false, needs: { account: true, trustline: true } });

    const tx = TransactionBuilder.fromXDR(body.xdr, PASS) as ReturnType<typeof TransactionBuilder.fromXDR> & { sign(k: Keypair): void; toXDR(): string };
    tx.sign(USER);
    const sub = await req('activate-submit', { xdr: tx.toXDR() }, { wallet: USER.publicKey() });
    expect(sub.status).toBe(200);
    expect(fake.tables.relay_tx[0]).toMatchObject({ kind: 'activation', wallet_address: USER.publicKey(), status: 'success' });
    // reserves count against the caps: 1 XLM account + 0.5 XLM trustline, kept after settling
    expect(fake.tables.relay_tx[0]).toMatchObject({ fee_max: 400, reserves: 15_000_000 });
  });

  it('says so when the wallet is already set up', async () => {
    horizon(200, [{ asset_code: 'USDC', asset_issuer: USDC.getIssuer() }]);
    expect(await (await req('activate', undefined, { wallet: USER.publicKey() })).json()).toEqual({ activated: true });
  });

  it('refuses an activation signed for a different wallet', async () => {
    horizon(404);
    const body = await (await req('activate', undefined, { wallet: USER.publicKey() })).json();
    const tx = TransactionBuilder.fromXDR(body.xdr, PASS) as unknown as { sign(k: Keypair): void; toXDR(): string };
    tx.sign(USER);
    const res = await req('activate-submit', { xdr: tx.toXDR() }, { wallet: OTHER.publicKey() });
    expect(res.status).toBe(400);
    expect(submitted).toHaveLength(0);
  });

  it('caps activations per IP per day', async () => {
    fake.tables.relay_tx = Array.from({ length: 3 }, () => ({ wallet_address: 'G', ip_hash: null, kind: 'activation', fee_max: 1, status: 'success', created_at: today() }));
    // Rows above have no ip hash; add three from this IP.
    const { hmacHex } = await import('../_lib/kyc/hash');
    for (const r of fake.tables.relay_tx) r.ip_hash = hmacHex('203.0.113.9');
    horizon(404);
    const body = await (await req('activate', undefined, { wallet: USER.publicKey() })).json();
    const tx = TransactionBuilder.fromXDR(body.xdr, PASS) as unknown as { sign(k: Keypair): void; toXDR(): string };
    tx.sign(USER);
    const res = await req('activate-submit', { xdr: tx.toXDR() }, { wallet: USER.publicKey() });
    expect((await res.json()).error).toBe('activation_cap');
  });
});

describe('reserves count toward the caps', () => {
  it('a wallet whose activation locked 1.5 XLM has 3.5 XLM of fees left today', async () => {
    fake.tables.relay_tx = [{ wallet_address: USER.publicKey(), ip_hash: 'x', kind: 'activation', fee_max: 400, fee_charged: 400, reserves: 15_000_000, status: 'success', created_at: today() }];
    process.env.RELAYER_WALLET_DAILY_CAP_XLM = '1.5';
    const res = await req('submit', { xdr: payment() });
    expect((await res.json()).error).toBe('wallet_cap');
  });
});
