// Consent copy shown in the verification wizard. The VERSION must match the
// server's CONSENT_VERSION (api/_lib/kyc/consent.ts); the server hashes its own
// canonical text, so this is the human-facing display of the same agreement.
export const CONSENT_VERSION = 'dpa-2026-01';

export const CONSENT_LINES = [
  'I consent to PACTA verifying my identity for this wallet.',
  'My government ID and a liveness selfie are sent to a verification provider and are not stored by PACTA.',
  'PACTA keeps only the verification result, document metadata, and a masked name, and I can request erasure at any time.',
];
