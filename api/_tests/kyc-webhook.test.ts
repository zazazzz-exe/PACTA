import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fakeSupabase, type FakeDb } from '../_lib/testing/fakeSupabase';
import { signWebhookBody } from '../_lib/kyc/mock';

let fake: FakeDb;
vi.mock('../_lib/db', () => ({ db: () => fake }));
const applyOutcome = vi.fn();
vi.mock('../_lib/kyc/apply', () => ({ applyOutcome: (...a: unknown[]) => applyOutcome(...a) }));

const { handler } = await import('../kyc-webhook');

const WALLET = 'G' + 'A'.repeat(55);

function delivery(outcome = 'verified', providerRef = 'ref_1') {
  const raw = JSON.stringify({ providerRef, outcome });
  return () =>
    new Request('https://pacta.test/api/kyc-webhook', {
      method: 'POST',
      headers: { 'x-kyc-signature': signWebhookBody(raw) },
      body: raw,
    });
}

beforeEach(() => {
  process.env.KYC_WEBHOOK_SECRET = 'test-webhook-secret';
  delete process.env.KYC_PROVIDER; // development: mock provider
  fake = fakeSupabase({ unique: { kyc_webhook_seen: 'body_hash' } });
  fake.tables.kyc_profile = [{ wallet_address: WALLET, provider_ref: 'ref_1' }];
  applyOutcome.mockReset();
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('POST /api/kyc-webhook replay protection', () => {
  it('applies a fresh, signed delivery once and records it', async () => {
    const res = await handler(delivery()());
    expect(res.status).toBe(200);
    expect(applyOutcome).toHaveBeenCalledOnce();
    expect(fake.tables.kyc_webhook_seen).toHaveLength(1);
    expect(fake.tables.kyc_webhook_seen[0].provider).toBe('mock');
  });

  it('rejects an exact repeat with 409 and does not re-apply it', async () => {
    const d = delivery();
    expect((await handler(d())).status).toBe(200);
    const again = await handler(d());
    expect(again.status).toBe(409);
    expect(await again.json()).toEqual({ error: 'duplicate_webhook' });
    expect(applyOutcome).toHaveBeenCalledOnce();
  });

  it('treats a different signed delivery as new', async () => {
    expect((await handler(delivery('pending')())).status).toBe(200);
    expect((await handler(delivery('verified')())).status).toBe(200);
    expect(applyOutcome).toHaveBeenCalledTimes(2);
  });

  it('forgets the delivery when applying fails, so a genuine retry works', async () => {
    applyOutcome.mockRejectedValueOnce(new Error('db down'));
    const d = delivery();
    expect((await handler(d())).status).toBe(500);
    expect(fake.tables.kyc_webhook_seen).toHaveLength(0);
    expect((await handler(d())).status).toBe(200);
  });

  it('forgets the delivery for an unknown provider reference', async () => {
    expect((await handler(delivery('verified', 'ref_unknown')())).status).toBe(404);
    expect(fake.tables.kyc_webhook_seen).toHaveLength(0);
  });

  it('rejects a bad signature before touching the database', async () => {
    const res = await handler(
      new Request('https://pacta.test/api/kyc-webhook', {
        method: 'POST',
        headers: { 'x-kyc-signature': 'deadbeef' },
        body: JSON.stringify({ providerRef: 'ref_1', outcome: 'verified' }),
      }),
    );
    expect(res.status).toBe(401);
    expect(fake.tables.kyc_webhook_seen ?? []).toHaveLength(0);
  });

  it('fails closed in production with the mock provider', async () => {
    process.env.VERCEL_ENV = 'production';
    try {
      expect((await handler(delivery()())).status).toBe(503);
      expect(applyOutcome).not.toHaveBeenCalled();
    } finally {
      delete process.env.VERCEL_ENV;
    }
  });
});
