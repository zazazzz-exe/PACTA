import { describe, it, expect, beforeAll } from 'vitest';
import { mockProvider, signWebhookBody } from './mock';

beforeAll(() => {
  process.env.KYC_WEBHOOK_SECRET = 'test-webhook-secret';
});

function stream(bytes: number[] = [1, 2, 3]): ReadableStream<Uint8Array> {
  return new ReadableStream<Uint8Array>({
    start(c) {
      c.enqueue(new Uint8Array(bytes));
      c.close();
    },
  });
}

describe('mockProvider', () => {
  it('startVerification returns a mock ref', async () => {
    const r = await mockProvider.startVerification({
      walletAddress: 'G' + 'A'.repeat(55),
      docType: 'passport',
      country: 'PH',
    });
    expect(r.providerRef.startsWith('mock_')).toBe(true);
    expect(r.uploadMode).toBe('stream-through');
  });

  it('submitMedia maps outcomes and drains the stream', async () => {
    expect(
      (await mockProvider.submitMedia({ providerRef: 'mock_x', media: stream(), mockOutcome: 'pass' }))
        .status,
    ).toBe('verified');
    expect(
      (await mockProvider.submitMedia({ providerRef: 'mock_x', media: stream(), mockOutcome: 'fail' }))
        .status,
    ).toBe('rejected');
    expect(
      (await mockProvider.submitMedia({ providerRef: 'mock_x', media: null, mockOutcome: 'pending' }))
        .status,
    ).toBe('pending');
    expect((await mockProvider.submitMedia({ providerRef: 'mock_x', media: null })).status).toBe(
      'verified',
    );
  });

  it('getResult yields synthetic hashable details', async () => {
    const r = await mockProvider.getResult('mock_abcdef12');
    expect(r.govIdNumber).toBeTruthy();
    expect(r.fullName).toBeTruthy();
    expect(r.outcome).toBe('verified');
  });

  it('parseWebhook accepts a correctly signed body', async () => {
    const raw = JSON.stringify({ providerRef: 'mock_1', outcome: 'verified' });
    const r = await mockProvider.parseWebhook({
      headers: { 'x-kyc-signature': signWebhookBody(raw) },
      rawBody: raw,
    });
    expect(r.providerRef).toBe('mock_1');
    expect(r.outcome).toBe('verified');
  });

  it('parseWebhook rejects a bad signature', async () => {
    const raw = JSON.stringify({ providerRef: 'mock_1', outcome: 'verified' });
    await expect(
      mockProvider.parseWebhook({ headers: { 'x-kyc-signature': 'sha256=deadbeef' }, rawBody: raw }),
    ).rejects.toThrow();
  });

  it('parseWebhook rejects a body missing the outcome', async () => {
    const raw = JSON.stringify({ providerRef: 'mock_1' });
    await expect(
      mockProvider.parseWebhook({ headers: { 'x-kyc-signature': signWebhookBody(raw) }, rawBody: raw }),
    ).rejects.toThrow();
  });
});
