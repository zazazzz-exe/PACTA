import { randomUUID, createHmac, timingSafeEqual } from 'crypto';
import type {
  KycProvider,
  KycOutcome,
  StartInput,
  StartResult,
  SubmitMediaInput,
  SubmitMediaResult,
  ProviderResult,
  WebhookRequest,
} from './types';

// Sandbox provider. It drains and DISCARDS all media (never persisted), and
// decides the outcome from an `x-mock-outcome` hint the submit endpoint forwards.
// A real vendor implements the same KycProvider interface and is selected via
// KYC_PROVIDER; nothing else changes.

const WEBHOOK_HEADER = 'x-kyc-signature';

function webhookSecret(): string {
  const s = process.env.KYC_WEBHOOK_SECRET;
  if (!s) throw new Error('kyc_webhook_secret_not_configured');
  return s;
}

// How the mock "vendor" would sign a webhook body. Exposed for tests and for a
// manually posted webhook while developing the async path.
export function signWebhookBody(rawBody: string): string {
  return `sha256=${createHmac('sha256', webhookSecret()).update(rawBody).digest('hex')}`;
}

async function drain(media: ReadableStream<Uint8Array> | null): Promise<void> {
  if (!media) return;
  const reader = media.getReader();
  for (;;) {
    const { done } = await reader.read();
    if (done) break; // consumed and discarded, never buffered whole or stored
  }
}

function outcomeFrom(mock?: 'pass' | 'fail' | 'pending'): KycOutcome {
  if (mock === 'fail') return 'rejected';
  if (mock === 'pending') return 'pending';
  return 'verified';
}

// Deterministic synthetic identity so the hashing/masking paths run with no real
// PII. Derived from the providerRef so each verification hashes to a distinct
// value (the gov_id_hash unique index stays happy).
function syntheticResult(providerRef: string, outcome: KycOutcome): ProviderResult {
  const tag = providerRef.replace(/[^a-z0-9]/gi, '').slice(-8).toUpperCase() || 'MOCK0000';
  return {
    providerRef,
    outcome,
    docExpiry: '2030-01-01',
    govIdNumber: `MOCK-${tag}`,
    fullName: 'Juan Dela Cruz',
    livenessPassed: outcome === 'verified',
    reasonCode: outcome === 'rejected' ? 'mock_rejected' : undefined,
  };
}

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

export const mockProvider: KycProvider = {
  id: 'mock',
  capture: true,

  async startVerification(_input: StartInput): Promise<StartResult> {
    return { providerRef: `mock_${randomUUID()}`, uploadMode: 'stream-through' };
  },

  async submitMedia(input: SubmitMediaInput): Promise<SubmitMediaResult> {
    await drain(input.media);
    return { status: outcomeFrom(input.mockOutcome) };
  },

  async getResult(providerRef: string): Promise<ProviderResult> {
    return syntheticResult(providerRef, 'verified');
  },

  async parseWebhook(req: WebhookRequest): Promise<ProviderResult> {
    const provided = req.headers[WEBHOOK_HEADER] ?? req.headers[WEBHOOK_HEADER.toLowerCase()];
    if (!provided || !safeEqual(provided, signWebhookBody(req.rawBody))) {
      throw new Error('invalid_webhook_signature');
    }
    const body = JSON.parse(req.rawBody) as { providerRef?: string; outcome?: KycOutcome };
    if (!body.providerRef || !body.outcome) throw new Error('invalid_webhook_body');
    return syntheticResult(body.providerRef, body.outcome);
  },
};
