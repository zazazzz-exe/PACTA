import {
  signMessage,
  pickWalletForLink,
  currentSelectedWalletId,
  restoreSelectedWallet,
} from './wallet';
import { CONSENT_VERSION } from './consent';

// Same-origin client for the KYC endpoints (mirrors the useRiskLens fetch
// pattern). The browser holds no Supabase credentials; the session cookie set by
// /api/kyc-verify-wallet authenticates later calls automatically.

export type KycStatus =
  | 'unknown' // not yet established this session, or the service was unreachable
  | 'unverified'
  | 'pending'
  | 'verified'
  | 'rejected'
  | 'expired';

export type ProviderMode = 'capture' | 'hosted';

// A wallet on the connected identity (Phase 4b linked identity).
export interface LinkedWallet {
  address: string;
  isVerifier: boolean; // holds the identity's verification
  isCurrent: boolean; // the wallet you are connected as right now
}

export interface KycStatusRead {
  kycStatus: KycStatus;
  maskedName: string | null;
  docType: string | null;
  docCountry: string | null;
  docExpiry: string | null;
  updatedAt: string | null;
  providerMode: ProviderMode;
  linkedWallets?: LinkedWallet[];
}

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${path} ${res.status}`);
  return res.json() as Promise<T>;
}

// Prove wallet ownership: request a nonce, sign the challenge, verify server-side
// (which sets the session cookie). Returns the wallet's current KYC status.
export async function proveOwnership(address: string): Promise<KycStatus> {
  const { nonce, challenge } = await postJson<{ nonce: string; challenge: string }>(
    '/api/kyc-request-nonce',
    { address },
  );
  const { signedMessage } = await signMessage(challenge, { address });
  const { kycStatus } = await postJson<{ address: string; kycStatus: KycStatus }>(
    '/api/kyc-verify-wallet',
    { address, nonce, signedMessage },
  );
  return kycStatus;
}

// Read current status using the existing session cookie.
export async function fetchKycStatus(): Promise<KycStatusRead> {
  const res = await fetch('/api/kyc-status');
  if (!res.ok) throw new Error(`kyc-status ${res.status}`);
  return res.json() as Promise<KycStatusRead>;
}

// Record consent and start a provider verification session. Returns the ref the
// media upload is bound to.
export async function startVerification(input: {
  docType?: string;
  country?: string;
}): Promise<{ providerRef: string; uploadMode: string; url: string | null }> {
  return postJson('/api/kyc-start-verification', {
    consent: { version: CONSENT_VERSION, accepted: true },
    docType: input.docType,
    country: input.country,
  });
}

// Sync the wallet's in-flight verification from the provider (for the hosted
// flow, after the user returns). Returns the resolved status.
export async function refreshFromProvider(): Promise<{ kycStatus: KycStatus }> {
  return postJson('/api/kyc-refresh', {});
}

// Stream the captured media to the provider (never stored). `mockOutcome` only
// matters on the sandbox provider and lets a tester force pass/fail/pending.
export async function submitMedia(
  providerRef: string,
  media: FormData,
  mockOutcome?: 'pass' | 'fail' | 'pending',
): Promise<{ status: KycStatus }> {
  const res = await fetch(`/api/kyc-submit-media?ref=${encodeURIComponent(providerRef)}`, {
    method: 'POST',
    headers: mockOutcome ? { 'x-mock-outcome': mockOutcome } : undefined,
    body: media,
  });
  if (!res.ok) throw new Error(`kyc-submit-media ${res.status}`);
  return res.json() as Promise<{ status: KycStatus }>;
}

// Right to erasure: remove the stored identity data for the connected identity.
export async function eraseKyc(): Promise<{ status: KycStatus }> {
  return postJson('/api/kyc-erase', { confirm: true });
}

// Link another wallet to the connected, verified identity. Opens the wallet
// picker so the user chooses the wallet to link (e.g. Albedo or xBull), proves
// ownership of it with a fresh signature, and posts to kyc-link-wallet
// (authenticated by the current, already verified session). No re-verification
// is needed. The kit is restored to the connected wallet afterward so the app
// keeps acting as it.
export async function linkWallet(): Promise<{ linked: boolean; wallets: LinkedWallet[] }> {
  const original = currentSelectedWalletId();
  const picked = await pickWalletForLink();
  try {
    const address = picked.address;
    const { nonce, challenge } = await postJson<{ nonce: string; challenge: string }>(
      '/api/kyc-request-nonce',
      { address },
    );
    const { signedMessage } = await signMessage(challenge, { address });
    return await postJson('/api/kyc-link-wallet', { address, nonce, signedMessage });
  } finally {
    restoreSelectedWallet(original);
  }
}

// Remove a wallet from the connected identity. Removing the verifier wallet (or
// your only wallet) erases the identity's verified data and needs confirm=true.
export async function unlinkWallet(
  address: string,
  confirm = false,
): Promise<{ unlinked?: boolean; erased?: boolean; wallets?: LinkedWallet[] }> {
  return postJson('/api/kyc-unlink-wallet', { address, confirm });
}
