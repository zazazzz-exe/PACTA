// Provider-agnostic KYC contract. A real vendor drops in by implementing
// KycProvider (see mock.ts / didit.ts) and registering it in index.ts — no
// endpoint, schema, or frontend change required.

export type KycOutcome = 'pending' | 'verified' | 'rejected';
export type DocType = 'passport' | 'national_id' | 'drivers_license';

export interface StartInput {
  walletAddress: string;
  docType?: DocType; // capture providers only
  country?: string; // capture providers only
  callbackUrl?: string; // hosted providers: browser return URL
}

export interface StartResult {
  providerRef: string;
  uploadMode: 'stream-through' | 'provider-hosted';
  providerSessionToken?: string;
  url?: string; // hosted providers: redirect the user here to verify
}

export interface SubmitMediaInput {
  providerRef: string;
  // The raw request body. The provider consumes it (streams to the vendor); it
  // is NEVER persisted by us. May be null in tests. Unused by hosted providers.
  media: ReadableStream<Uint8Array> | null;
  // Dev-only: honored by the mock provider to force an outcome.
  mockOutcome?: 'pass' | 'fail' | 'pending';
}

export interface SubmitMediaResult {
  status: KycOutcome;
}

// Normalized result, whether obtained by polling getResult or a webhook. The
// govIdNumber / fullName are used to derive hashes + a masked name, then dropped.
export interface ProviderResult {
  providerRef: string;
  outcome: KycOutcome;
  docType?: DocType;
  country?: string;
  docExpiry?: string; // ISO date
  govIdNumber?: string;
  fullName?: string;
  livenessPassed?: boolean;
  reasonCode?: string; // non-PII
}

export interface WebhookRequest {
  headers: Record<string, string>;
  rawBody: string;
}

export interface KycProvider {
  readonly id: string;
  // true  = the app captures the document + selfie and streams them here (mock).
  // false = hosted/redirect flow; the user verifies on the provider (didit).
  readonly capture: boolean;
  startVerification(input: StartInput): Promise<StartResult>;
  submitMedia(input: SubmitMediaInput): Promise<SubmitMediaResult>;
  getResult(providerRef: string): Promise<ProviderResult>;
  // Verifies authenticity (HMAC) and normalizes a webhook payload. Throws if the
  // signature is invalid.
  parseWebhook(req: WebhookRequest): Promise<ProviderResult>;
}
