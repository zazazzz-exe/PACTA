import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fakeSupabase, type FakeDb } from '../_lib/testing/fakeSupabase';

let fake: FakeDb;
vi.mock('../_lib/db', () => ({ db: () => fake }));
// Signature checking has its own tests; here a signature of "good" is valid.
vi.mock('../_lib/kyc/verifySignature', () => ({
  verifyWalletSignature: (_a: string, _m: string, sig: string) =>
    sig === 'good' ? { ok: true, encoding: 'test' } : { ok: false },
}));
vi.mock('../_lib/kyc/identity', () => ({ resolveIdentity: async () => ({ status: 'unverified' }) }));

const {
  handler,
  VERIFY_FAIL_LIMIT_PER_ADDRESS_IP,
  VERIFY_FAIL_LIMIT_PER_IP,
  VERIFY_FAIL_LIMIT_PER_ADDRESS_TOTAL,
} = await import('../kyc-verify-wallet');

const VICTIM = 'G' + 'A'.repeat(55);
const addr = (i: number) => 'G' + String(i).padStart(55, 'B').replace(/[^A-Z2-7]/g, 'C');
let n = 0;

// A fresh, unused nonce for `address`, then a verify call with `sig` from `ip`.
async function attempt(address: string, sig: string, ip = '203.0.113.7') {
  const nonce = `nonce-${n++}`;
  fake.tables.kyc_challenge ??= [];
  fake.tables.kyc_challenge.push({
    nonce,
    wallet_address: address,
    challenge: 'c',
    used_at: null,
    expires_at: new Date(Date.now() + 60_000).toISOString(),
    created_at: new Date().toISOString(),
  });
  return handler(
    new Request('https://pacta.test/api/kyc-verify-wallet', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-forwarded-for': `${ip}, 10.0.0.1` },
      body: JSON.stringify({ address, nonce, signedMessage: sig }),
    }),
  );
}

beforeEach(() => {
  process.env.KYC_HASH_SECRET = 'test-hash-secret';
  process.env.SESSION_JWT_SECRET = 'test-session-secret-test-session-secret';
  fake = fakeSupabase();
});

describe('POST /api/kyc-verify-wallet failure limits', () => {
  it('records failures with only a hash of the IP', async () => {
    expect((await attempt(VICTIM, 'bad')).status).toBe(401);
    const ev = fake.tables.kyc_event.find((e) => e.event_type === 'wallet_verify_failed')!;
    expect((ev.detail as { ip_hash: string }).ip_hash).toMatch(/^[0-9a-f]{64}$/);
    expect(JSON.stringify(ev)).not.toContain('203.0.113.7');
  });

  it('limits one IP per address', async () => {
    for (let i = 0; i < VERIFY_FAIL_LIMIT_PER_ADDRESS_IP; i++) {
      expect((await attempt(VICTIM, 'bad')).status).toBe(401);
    }
    expect((await attempt(VICTIM, 'good')).status).toBe(429);
  });

  it('an attacker posting bad signatures cannot lock the victim out', async () => {
    for (let i = 0; i < VERIFY_FAIL_LIMIT_PER_ADDRESS_IP + 3; i++) await attempt(VICTIM, 'bad', '198.51.100.66');
    expect((await attempt(VICTIM, 'bad', '198.51.100.66')).status).toBe(429);
    const ok = await attempt(VICTIM, 'good', '203.0.113.7');
    expect(ok.status).toBe(200);
    expect(ok.headers.get('set-cookie')).toBeTruthy();
  });

  it('limits one IP across many addresses', async () => {
    for (let i = 0; i < VERIFY_FAIL_LIMIT_PER_IP; i++) await attempt(addr(i), 'bad');
    expect((await attempt(addr(999), 'good')).status).toBe(429);
  });

  it('caps an address across many IPs', async () => {
    for (let i = 0; i < VERIFY_FAIL_LIMIT_PER_ADDRESS_TOTAL; i++) await attempt(VICTIM, 'bad', `192.0.2.${i}`);
    expect((await attempt(VICTIM, 'good', '203.0.113.200')).status).toBe(429);
  });

  it('a nonce works once', async () => {
    const res = await attempt(VICTIM, 'good');
    expect(res.status).toBe(200);
    const body = { nonce: fake.tables.kyc_challenge[0].nonce as string };
    const again = await handler(
      new Request('https://pacta.test/api/kyc-verify-wallet', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ address: VICTIM, nonce: body.nonce, signedMessage: 'good' }),
      }),
    );
    expect(again.status).toBe(401);
  });
});
