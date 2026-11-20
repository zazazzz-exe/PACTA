import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fakeSupabase, type FakeDb } from '../_lib/testing/fakeSupabase';
import { clientIp } from '../_lib/http';

let fake: FakeDb;
vi.mock('../_lib/db', () => ({ db: () => fake }));

const { handler, NONCE_LIMIT_PER_ADDRESS_IP, NONCE_LIMIT_PER_IP, NONCE_LIMIT_PER_ADDRESS_TOTAL } =
  await import('../kyc-request-nonce');

const VICTIM = 'G' + 'A'.repeat(55);
const addr = (i: number) => 'G' + String(i).padStart(55, 'B').replace(/[^A-Z2-7]/g, 'C');

function req(address: string, ip = '203.0.113.7') {
  return new Request('https://pacta.test/api/kyc-request-nonce', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-forwarded-for': `${ip}, 10.0.0.1` },
    body: JSON.stringify({ address }),
  });
}

beforeEach(() => {
  process.env.KYC_HASH_SECRET = 'test-hash-secret';
  fake = fakeSupabase();
});

describe('clientIp', () => {
  it('uses the first x-forwarded-for entry, then x-real-ip', () => {
    const h = (headers: Record<string, string>) => new Request('https://x.test', { headers });
    expect(clientIp(h({ 'x-forwarded-for': '198.51.100.1, 10.0.0.2' }))).toBe('198.51.100.1');
    expect(clientIp(h({ 'x-real-ip': '198.51.100.9' }))).toBe('198.51.100.9');
    expect(clientIp(h({}))).toBeNull();
  });
});

describe('POST /api/kyc-request-nonce rate limits', () => {
  it('issues a nonce and stores only a hash of the IP', async () => {
    const res = await handler(req(VICTIM));
    expect(res.status).toBe(200);
    const row = fake.tables.kyc_challenge[0];
    expect(row.ip_hash).toMatch(/^[0-9a-f]{64}$/);
    expect(JSON.stringify(row)).not.toContain('203.0.113.7');
  });

  it('limits one IP per address', async () => {
    for (let i = 0; i < NONCE_LIMIT_PER_ADDRESS_IP; i++) {
      expect((await handler(req(VICTIM))).status).toBe(200);
    }
    expect((await handler(req(VICTIM))).status).toBe(429);
  });

  it('limits per IP across many addresses', async () => {
    for (let i = 0; i < NONCE_LIMIT_PER_IP; i++) {
      expect((await handler(req(addr(i)))).status).toBe(200);
    }
    expect((await handler(req(addr(999)))).status).toBe(429);
  });

  it('an attacker spamming the victim address cannot lock the victim out', async () => {
    for (let i = 0; i < NONCE_LIMIT_PER_IP + 5; i++) await handler(req(VICTIM, '203.0.113.66'));
    expect((await handler(req(VICTIM, '203.0.113.66'))).status).toBe(429); // attacker refused
    expect((await handler(req(VICTIM, '198.51.100.42'))).status).toBe(200); // victim still served
  });

  it('caps one address across many IPs (backstop)', async () => {
    for (let i = 0; i < NONCE_LIMIT_PER_ADDRESS_TOTAL; i++) {
      expect((await handler(req(VICTIM, `198.51.100.${i}`))).status).toBe(200);
    }
    expect((await handler(req(VICTIM, '198.51.100.200'))).status).toBe(429);
  });

  it('falls back to the plain per-address limit when the IP is unknown', async () => {
    const noIp = () =>
      new Request('https://pacta.test/api/kyc-request-nonce', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ address: VICTIM }),
      });
    for (let i = 0; i < NONCE_LIMIT_PER_ADDRESS_IP; i++) expect((await handler(noIp())).status).toBe(200);
    expect((await handler(noIp())).status).toBe(429);
  });

  it('rejects an invalid address', async () => {
    expect((await handler(req('not-an-address'))).status).toBe(400);
  });
});
