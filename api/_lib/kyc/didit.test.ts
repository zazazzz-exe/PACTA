import { describe, it, expect, beforeAll } from 'vitest';
import { createHmac } from 'crypto';
import { diditProvider } from './didit';

const SECRET = 'test-didit-webhook-secret';
beforeAll(() => {
  process.env.DIDIT_WEBHOOK_SECRET = SECRET;
});

const hmacHex = (msg: string) => createHmac('sha256', SECRET).update(msg, 'utf8').digest('hex');
const nowTs = () => Math.floor(Date.now() / 1000);

function webhook(status: string, extraHeaders: Record<string, string> = {}, ts = nowTs()) {
  const body = {
    webhook_type: 'status.updated',
    timestamp: ts,
    session_id: 'sess_123',
    status,
    vendor_data: 'GABC',
  };
  const raw = JSON.stringify(body);
  return {
    headers: { 'x-timestamp': String(ts), 'x-signature': hmacHex(raw), ...extraHeaders },
    rawBody: raw,
  };
}

describe('diditProvider', () => {
  it('is a hosted provider (capture = false)', () => {
    expect(diditProvider.capture).toBe(false);
  });

  it('accepts a valid raw signature and maps Approved -> verified', async () => {
    const r = await diditProvider.parseWebhook(webhook('Approved'));
    expect(r.providerRef).toBe('sess_123');
    expect(r.outcome).toBe('verified');
  });

  it('maps Declined -> rejected', async () => {
    expect((await diditProvider.parseWebhook(webhook('Declined'))).outcome).toBe('rejected');
  });

  it('maps In Review -> pending', async () => {
    expect((await diditProvider.parseWebhook(webhook('In Review'))).outcome).toBe('pending');
  });

  it('accepts the X-Signature-Simple fallback', async () => {
    const ts = nowTs();
    const body = { webhook_type: 'status.updated', timestamp: ts, session_id: 'sess_9', status: 'Approved' };
    const raw = JSON.stringify(body);
    const simple = hmacHex(`${ts}:sess_9:Approved:status.updated`);
    const r = await diditProvider.parseWebhook({
      headers: { 'x-timestamp': String(ts), 'x-signature-simple': simple },
      rawBody: raw,
    });
    expect(r.outcome).toBe('verified');
  });

  it('rejects a bad signature', async () => {
    await expect(
      diditProvider.parseWebhook(webhook('Approved', { 'x-signature': 'deadbeef' })),
    ).rejects.toThrow();
  });

  it('rejects a stale timestamp', async () => {
    await expect(diditProvider.parseWebhook(webhook('Approved', {}, nowTs() - 1000))).rejects.toThrow();
  });
});
