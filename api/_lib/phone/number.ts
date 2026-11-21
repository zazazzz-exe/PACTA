import { createHmac, timingSafeEqual } from 'crypto';

// Phone numbers for pay-by-phone (docs/pay-by-phone.md). Numbers are only ever
// held in memory while a request runs; the database stores a keyed HMAC of the
// E.164 form. The key (PHONE_PEPPER) lives in the server environment, never in
// the database, so a database leak alone cannot reverse the hashes.

// Normalize to E.164. Philippine local forms are accepted (0917 123 4567,
// 917 123 4567, 63917...), anything else needs a leading +country code.
export function normalizePhone(input: unknown): string | null {
  if (typeof input !== 'string' || input.length > 32) return null;
  const s = input.trim().replace(/[\s().-]/g, '');
  let e164: string;
  if (/^\+\d+$/.test(s)) e164 = s;
  else if (/^0\d{10}$/.test(s)) e164 = '+63' + s.slice(1);
  else if (/^9\d{9}$/.test(s)) e164 = '+63' + s;
  else if (/^63\d{10}$/.test(s)) e164 = '+' + s;
  else return null;
  if (!/^\+[1-9]\d{7,14}$/.test(e164)) return null;
  // Philippine numbers must be mobile numbers (+63 9xx xxx xxxx).
  if (e164.startsWith('+63') && !/^\+639\d{9}$/.test(e164)) return null;
  return e164;
}

function pepper(): string {
  const p = process.env.PHONE_PEPPER;
  if (!p || p.length < 32) throw new Error('phone_pepper_not_configured');
  return p;
}

// Lookup key for a number. Domain-separated from the OTP hashes.
export function phoneHash(e164: string): string {
  return createHmac('sha256', pepper()).update(`phone:${e164}`).digest('hex');
}

// One-time codes are stored hashed too, bound to their row.
export function codeHash(otpId: string | number, code: string): string {
  return createHmac('sha256', pepper()).update(`otp:${otpId}:${code}`).digest('hex');
}

export function sameHash(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

// '+639171234567' -> '+63 ••• ••• 4567' (for an SMS log line, never stored).
export function maskPhone(e164: string): string {
  return `${e164.slice(0, 3)} ••• ••• ${e164.slice(-4)}`;
}
