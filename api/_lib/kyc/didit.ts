import { createHmac, timingSafeEqual } from 'crypto';
import type {
  KycProvider,
  KycOutcome,
  DocType,
  StartInput,
  StartResult,
  SubmitMediaInput,
  SubmitMediaResult,
  ProviderResult,
  WebhookRequest,
} from './types';

// Didit (didit.me) provider — HOSTED flow. We create a verification session,
// redirect the user to Didit's `url`, and receive the result via webhook and/or
// a decision fetch. Media (ID + selfie) goes straight to Didit; it never touches
// our server. Docs: https://docs.didit.me
//
// Config (server env): DIDIT_API_KEY, DIDIT_WORKFLOW_ID, DIDIT_WEBHOOK_SECRET,
// optional DIDIT_BASE_URL (default https://verification.didit.me).

function base(): string {
  return process.env.DIDIT_BASE_URL || 'https://verification.didit.me';
}
function apiKey(): string {
  const k = process.env.DIDIT_API_KEY;
  if (!k) throw new Error('didit_not_configured');
  return k;
}

// Didit session status (case-sensitive) -> our outcome.
function mapStatus(status: string): KycOutcome {
  switch (status) {
    case 'Approved':
      return 'verified';
    case 'Declined':
    case 'Expired':
    case 'Kyc Expired':
      return 'rejected';
    default:
      // In Review, In Progress, Not Started, Awaiting User, Abandoned, Resubmitted
      return 'pending';
  }
}

function mapDocType(t?: string): DocType | undefined {
  const s = (t || '').toLowerCase();
  if (s.includes('passport')) return 'passport';
  if (s.includes('driver')) return 'drivers_license';
  if (s.includes('national') || s.includes('identity') || s.includes('id'))
    return 'national_id';
  return undefined;
}

// Map a Didit decision payload to our normalized result. Field names are read
// defensively (Didit's exact keys can vary by workflow/version); confirm against
// a real decision payload and adjust here if needed.
function mapDecision(providerRef: string, d: Record<string, any>): ProviderResult {
  const idv = d.id_verification ?? d.id_verifications?.[0] ?? {};
  const fm = d.face_match ?? d.face_matches?.[0] ?? {};
  const fullName =
    idv.full_name ??
    [idv.first_name, idv.last_name].filter(Boolean).join(' ') ??
    undefined;
  return {
    providerRef,
    outcome: mapStatus(d.status),
    docType: mapDocType(idv.document_type),
    country: idv.issuing_state ?? idv.issuing_country ?? idv.issuing_country_code ?? undefined,
    docExpiry: idv.date_of_expiry ?? idv.expiration_date ?? undefined,
    govIdNumber: idv.document_number ?? idv.personal_number ?? undefined,
    fullName: fullName || undefined,
    livenessPassed:
      typeof fm.status === 'string' ? fm.status.toLowerCase() === 'approved' : undefined,
  };
}

function hmacHex(secret: string, msg: string): string {
  return createHmac('sha256', secret).update(msg, 'utf8').digest('hex');
}
function safeEqualHex(a: string, b: string): boolean {
  const ab = Buffer.from(a, 'utf8');
  const bb = Buffer.from(b, 'utf8');
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

// Canonical JSON: recursively sort object keys, compact separators, unicode
// preserved (matches Didit's X-Signature-V2).
function sortKeys(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(sortKeys);
  if (v && typeof v === 'object') {
    const src = v as Record<string, unknown>;
    return Object.keys(src)
      .sort()
      .reduce<Record<string, unknown>>((acc, k) => {
        acc[k] = sortKeys(src[k]);
        return acc;
      }, {});
  }
  return v;
}

export const diditProvider: KycProvider = {
  id: 'didit',
  capture: false,

  async startVerification(input: StartInput): Promise<StartResult> {
    const workflowId = process.env.DIDIT_WORKFLOW_ID;
    if (!workflowId) throw new Error('didit_not_configured');
    const res = await fetch(`${base()}/v3/session/`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': apiKey() },
      body: JSON.stringify({
        workflow_id: workflowId,
        vendor_data: input.walletAddress,
        callback: input.callbackUrl,
      }),
    });
    if (!res.ok) throw new Error(`didit_session_${res.status}`);
    const data = (await res.json()) as { session_id: string; url: string };
    return { providerRef: data.session_id, uploadMode: 'provider-hosted', url: data.url };
  },

  async submitMedia(_input: SubmitMediaInput): Promise<SubmitMediaResult> {
    // Hosted flow: the app never streams media here.
    throw new Error('submit_media_not_supported_for_hosted_provider');
  },

  async getResult(providerRef: string): Promise<ProviderResult> {
    const res = await fetch(`${base()}/v3/session/${providerRef}/decision/`, {
      headers: { 'x-api-key': apiKey() },
    });
    if (!res.ok) throw new Error(`didit_decision_${res.status}`);
    const data = (await res.json()) as Record<string, any>;
    return mapDecision(providerRef, data);
  },

  async parseWebhook(req: WebhookRequest): Promise<ProviderResult> {
    const secret = process.env.DIDIT_WEBHOOK_SECRET;
    if (!secret) throw new Error('didit_webhook_secret_not_configured');

    const h = (name: string) => req.headers[name] ?? req.headers[name.toLowerCase()];

    // Replay defense: X-Timestamp must be within 5 minutes.
    const ts = Number(h('x-timestamp'));
    if (!ts || Math.abs(Date.now() / 1000 - ts) > 300) throw new Error('stale_webhook');

    const body = JSON.parse(req.rawBody) as Record<string, any>;
    const v2 = h('x-signature-v2');
    const raw = h('x-signature');
    const simple = h('x-signature-simple');

    const okV2 = v2 && safeEqualHex(v2, hmacHex(secret, JSON.stringify(sortKeys(body))));
    const okRaw = raw && safeEqualHex(raw, hmacHex(secret, req.rawBody));
    const simpleStr = `${body.timestamp}:${body.session_id}:${body.status}:${body.webhook_type}`;
    const okSimple = simple && safeEqualHex(simple, hmacHex(secret, simpleStr));
    if (!okV2 && !okRaw && !okSimple) throw new Error('invalid_webhook_signature');

    return {
      providerRef: body.session_id,
      outcome: mapStatus(body.status),
    };
  },
};
