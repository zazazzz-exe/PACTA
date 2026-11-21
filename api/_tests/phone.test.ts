import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Keypair } from '@stellar/stellar-sdk';
import { fakeSupabase, type FakeDb } from '../_lib/testing/fakeSupabase';
import { issueSessionToken } from '../_lib/session';
import { LIMITS } from '../_lib/phone/store';

let fake: FakeDb;
vi.mock('../_lib/db', () => ({ db: () => fake }));
const { handler } = await import('../phone');

const ME = Keypair.fromRawEd25519Seed(Buffer.alloc(32, 70)).publicKey();
const YOU = Keypair.fromRawEd25519Seed(Buffer.alloc(32, 71)).publicKey();
const PHONE = '0917 123 4567';
const E164 = '+639171234567';

function call(action: string, body?: unknown, opts: { wallet?: string; method?: string; ip?: string; query?: string } = {}) {
  const headers: Record<string, string> = { 'content-type': 'application/json', 'x-forwarded-for': opts.ip ?? '203.0.113.30' };
  if (opts.wallet) headers.cookie = `pacta_sess=${issueSessionToken(opts.wallet)}`;
  return handler(
    new Request(`https://pacta.test/api/phone?action=${action}${opts.query ?? ''}`, {
      method: opts.method ?? (body === undefined ? 'GET' : 'POST'),
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
  );
}

async function link(wallet: string, phone = PHONE) {
  const start = await (await call('start', { phone }, { wallet })).json();
  return call('verify', { code: start.devCode }, { wallet });
}

beforeEach(() => {
  process.env.SESSION_JWT_SECRET = 'test-session-secret-test-session-secret';
  process.env.KYC_HASH_SECRET = 'test-hash-secret';
  process.env.PHONE_PEPPER = 'pepper-'.repeat(8);
  delete process.env.VERCEL_ENV;
  fake = fakeSupabase({ autoId: ['phone_otp', 'phone_event'] });
  vi.spyOn(console, 'info').mockImplementation(() => {});
});
afterEach(() => vi.restoreAllMocks());

describe('register a number', () => {
  it('needs a wallet session', async () => {
    expect((await call('start', { phone: PHONE })).status).toBe(401);
    expect((await call('status')).status).toBe(401);
  });

  it('sends a code, links on the right code, and stores only hashes', async () => {
    const res = await call('start', { phone: PHONE }, { wallet: ME });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({ sent: true, expiresInSec: 600 });
    expect(body.devCode).toMatch(/^\d{6}$/);
    expect((console.info as unknown as { mock: { calls: string[][] } }).mock.calls.some((c) => c[0].includes('+63 ••• ••• 4567'))).toBe(true);

    expect((await call('verify', { code: body.devCode }, { wallet: ME })).status).toBe(200);
    expect(await (await call('status', undefined, { wallet: ME })).json()).toMatchObject({ linked: true, public: false });

    const everything = JSON.stringify(fake.tables);
    expect(everything).not.toContain('9171234567');
    expect(everything).not.toContain(body.devCode);
  });

  it('rejects a wrong code and locks the code after five tries', async () => {
    await call('start', { phone: PHONE }, { wallet: ME });
    let last: Response | undefined;
    for (let i = 0; i < LIMITS.otpAttempts; i++) last = await call('verify', { code: '000000' }, { wallet: ME });
    expect(await last!.json()).toMatchObject({ error: 'wrong_code', attemptsLeft: 0 });
    expect(await (await call('verify', { code: '000000' }, { wallet: ME })).json()).toMatchObject({ error: 'no_code' });
  });

  it('a new code replaces the previous one', async () => {
    const first = await (await call('start', { phone: PHONE }, { wallet: ME })).json();
    await call('start', { phone: PHONE }, { wallet: ME });
    expect(await (await call('verify', { code: first.devCode }, { wallet: ME })).json()).toMatchObject({ error: 'wrong_code' });
  });

  it('expired codes do not work', async () => {
    const s = await (await call('start', { phone: PHONE }, { wallet: ME })).json();
    for (const r of fake.tables.phone_otp) r.expires_at = new Date(Date.now() - 1000).toISOString();
    expect(await (await call('verify', { code: s.devCode }, { wallet: ME })).json()).toMatchObject({ error: 'no_code' });
  });

  it('limits codes per wallet and per number (no SMS bombing)', async () => {
    for (let i = 0; i < LIMITS.otpPerWallet10Min; i++) expect((await call('start', { phone: PHONE }, { wallet: ME })).status).toBe(200);
    expect((await call('start', { phone: PHONE }, { wallet: ME })).status).toBe(429);
    // Someone else hammering the same number is stopped by the per-number limit.
    expect((await call('start', { phone: PHONE }, { wallet: YOU })).status).toBe(429);
  });

  it('refuses invalid numbers', async () => {
    expect(await (await call('start', { phone: '12345' }, { wallet: ME })).json()).toMatchObject({ error: 'invalid_phone' });
  });

  it('keeps one wallet per number', async () => {
    await link(ME);
    const res = await link(YOU);
    expect(res.status).toBe(409);
    expect((await res.json()).error).toBe('number_in_use');
  });

  it('changes and unlinks a number', async () => {
    await link(ME);
    await link(ME, '09181112222');
    expect(fake.tables.phone_link.filter((l) => l.wallet_address === ME)).toHaveLength(1);
    expect(await (await call('lookup', { phone: PHONE }, { wallet: YOU })).json()).toEqual({ found: false });
    expect(await (await call('lookup', { phone: '09181112222' }, { wallet: YOU })).json()).toMatchObject({ found: true, address: ME });
    await call('unlink', {}, { wallet: ME });
    expect(await (await call('status', undefined, { wallet: ME })).json()).toMatchObject({ linked: false });
  });

  it('fails closed without a pepper or an SMS sender', async () => {
    delete process.env.PHONE_PEPPER;
    expect((await call('start', { phone: PHONE }, { wallet: ME })).status).toBe(503);
    process.env.PHONE_PEPPER = 'pepper-'.repeat(8);
    process.env.VERCEL_ENV = 'production';
    expect(await (await call('start', { phone: PHONE }, { wallet: ME })).json()).toMatchObject({ error: 'sms_unavailable' });
  });
});

describe('lookups in the app', () => {
  it('resolve a number to the wallet and show whether it is verified', async () => {
    await link(ME);
    fake.tables.kyc_profile = [{ wallet_address: ME, identity_id: 'i1', status: 'verified', provider: 'didit', masked_name: 'J** D**' }];
    const res = await call('lookup', { phone: '+639171234567' }, { wallet: YOU });
    expect(await res.json()).toEqual({ found: true, address: ME, verified: true, maskedName: 'J** D**' });
  });
  it('need a session and are rate limited, misses most of all', async () => {
    expect((await call('lookup', { phone: PHONE })).status).toBe(401);
    for (let i = 0; i < LIMITS.missesPerWalletHour; i++) {
      expect((await call('lookup', { phone: `0917000${String(i).padStart(4, '0')}` }, { wallet: YOU })).status).toBe(200);
    }
    expect((await call('lookup', { phone: '09170009999' }, { wallet: YOU })).status).toBe(429);
  });
  it('ignore development-verified numbers in production', async () => {
    await link(ME);
    process.env.VERCEL_ENV = 'production';
    expect(await (await call('lookup', { phone: PHONE }, { wallet: YOU })).json()).toEqual({ found: false });
  });
});

describe('public SEP-2 federation', () => {
  const fed = (q: string, type = 'name', ip?: string) => call('federation', undefined, { query: `&q=${encodeURIComponent(q)}&type=${type}`, ip });

  it('answers only for numbers whose owner opted in', async () => {
    await link(ME);
    expect((await fed(`${E164}*getpacta.app`)).status).toBe(404);
    await call('visibility', { public: true }, { wallet: ME });
    const res = await fed(`${E164}*getpacta.app`);
    expect(res.status).toBe(200);
    expect(res.headers.get('access-control-allow-origin')).toBe('*');
    expect(await res.json()).toEqual({ stellar_address: `${E164}*getpacta.app`, account_id: ME });
    await call('visibility', { public: false }, { wallet: ME });
    expect((await fed(`${E164}*getpacta.app`)).status).toBe(404);
  });
  it('supports name lookups only, on our domain', async () => {
    expect((await fed(ME, 'id')).status).toBe(501);
    expect((await fed(`${E164}*evil.example`)).status).toBe(404);
    expect((await fed('nonsense')).status).toBe(404);
  });
  it('rate limits misses per IP', async () => {
    for (let i = 0; i < LIMITS.federationMissesPerIpHour; i++) await fed(`+63917000${String(i).padStart(4, '0')}*getpacta.app`, 'name', '198.51.100.77');
    expect((await fed(`${E164}*getpacta.app`, 'name', '198.51.100.77')).status).toBe(429);
  });
});
