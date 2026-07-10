import { createHmac } from 'crypto';

// Keyed HMAC (not a bare hash) so low-entropy values like ID numbers cannot be
// brute-forced from the stored digest. Returns lowercase hex.
export function hmacHex(value: string): string {
  const secret = process.env.KYC_HASH_SECRET;
  if (!secret) throw new Error('kyc_hash_secret_not_configured');
  return createHmac('sha256', secret).update(normalize(value)).digest('hex');
}

function normalize(s: string): string {
  return s.trim().replace(/\s+/g, ' ').toUpperCase();
}

// 'Juan Dela Cruz' -> 'J** D** C**'. UI-only; carries no recoverable PII.
export function maskName(fullName: string): string {
  return fullName
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((p) => `${p[0].toUpperCase()}**`)
    .join(' ');
}
