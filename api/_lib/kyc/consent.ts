// Canonical consent text and version, server-side source of truth. The stored
// consent hash is computed over THIS text, so a client cannot misrepresent what
// the user agreed to. Keep the version and wording in sync with the frontend
// copy in frontend/src/lib/consent.ts.

export const CONSENT_VERSION = 'dpa-2026-01';

export const CONSENT_TEXT = [
  'I consent to PACTA verifying my identity for this wallet.',
  'I understand that my government ID and a liveness selfie are sent to a verification provider and are not stored by PACTA.',
  'PACTA keeps only the verification result, document metadata, and a masked name, and I can request erasure at any time.',
].join('\n');
