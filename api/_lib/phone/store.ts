import type { SupabaseClient } from '@supabase/supabase-js';
import { isProduction } from '../kyc/index.js';
import { overLimit } from '../ratelimit.js';

// Database access for pay by phone. Only keyed hashes of numbers and IPs.

export type PhoneEventKind =
  | 'otp_sent'
  | 'otp_failed'
  | 'linked'
  | 'unlinked'
  | 'lookup'
  | 'lookup_miss'
  | 'federation'
  | 'federation_miss';

export interface PhoneLink {
  phone_hash: string;
  wallet_address: string;
  verified_via: 'sms' | 'console';
  public_federation: boolean;
  created_at: string;
}

const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

// Limits. Codes are capped per wallet, per number (no SMS bombing) and per IP;
// lookups per wallet and per IP, with a much lower ceiling on misses so the
// directory cannot be walked number by number.
export const LIMITS = {
  otpPerWallet10Min: 3,
  otpPerWalletDay: 10,
  otpPerNumberHour: 3,
  otpPerNumberDay: 6,
  otpPerIpHour: 10,
  otpAttempts: 5,
  verifyFailsPerWalletHour: 10,
  lookupsPerWalletHour: 30,
  lookupsPerWalletDay: 200,
  missesPerWalletHour: 10,
  lookupsPerIpHour: 60,
  federationPerIpHour: 30,
  federationMissesPerIpHour: 10,
} as const;

export async function logEvent(
  supa: SupabaseClient,
  e: { kind: PhoneEventKind; wallet?: string | null; phoneHash?: string | null; ipHash?: string | null },
): Promise<void> {
  const { error } = await supa
    .from('phone_event')
    .insert({ kind: e.kind, wallet_address: e.wallet ?? null, phone_hash: e.phoneHash ?? null, ip_hash: e.ipHash ?? null });
  if (error) throw error;
}

const over = (supa: SupabaseClient, filters: Record<string, string>, windowMs: number, max: number) =>
  overLimit(supa, 'phone_event', filters, windowMs, max);

export async function otpLimited(supa: SupabaseClient, wallet: string, phoneHash: string, ipHash: string | null): Promise<boolean> {
  const k = 'otp_sent';
  return (
    (await over(supa, { kind: k, wallet_address: wallet }, 10 * MIN, LIMITS.otpPerWallet10Min)) ||
    (await over(supa, { kind: k, wallet_address: wallet }, DAY, LIMITS.otpPerWalletDay)) ||
    (await over(supa, { kind: k, phone_hash: phoneHash }, HOUR, LIMITS.otpPerNumberHour)) ||
    (await over(supa, { kind: k, phone_hash: phoneHash }, DAY, LIMITS.otpPerNumberDay)) ||
    (ipHash !== null && (await over(supa, { kind: k, ip_hash: ipHash }, HOUR, LIMITS.otpPerIpHour)))
  );
}

export async function verifyLimited(supa: SupabaseClient, wallet: string): Promise<boolean> {
  return over(supa, { kind: 'otp_failed', wallet_address: wallet }, HOUR, LIMITS.verifyFailsPerWalletHour);
}

export async function lookupLimited(supa: SupabaseClient, wallet: string, ipHash: string | null): Promise<boolean> {
  return (
    (await over(supa, { kind: 'lookup', wallet_address: wallet }, HOUR, LIMITS.lookupsPerWalletHour)) ||
    (await over(supa, { kind: 'lookup', wallet_address: wallet }, DAY, LIMITS.lookupsPerWalletDay)) ||
    (await over(supa, { kind: 'lookup_miss', wallet_address: wallet }, HOUR, LIMITS.missesPerWalletHour)) ||
    (ipHash !== null && (await over(supa, { kind: 'lookup', ip_hash: ipHash }, HOUR, LIMITS.lookupsPerIpHour)))
  );
}

export async function federationLimited(supa: SupabaseClient, ipHash: string | null): Promise<boolean> {
  if (ipHash === null) return false;
  return (
    (await over(supa, { kind: 'federation', ip_hash: ipHash }, HOUR, LIMITS.federationPerIpHour)) ||
    (await over(supa, { kind: 'federation_miss', ip_hash: ipHash }, HOUR, LIMITS.federationMissesPerIpHour))
  );
}

// A development (console) verification never counts in production, even if a
// preview wrote it to the same database.
export function counts(link: PhoneLink | null): PhoneLink | null {
  if (!link) return null;
  if (link.verified_via === 'console' && isProduction()) return null;
  return link;
}

export async function linkByHash(supa: SupabaseClient, phoneHash: string): Promise<PhoneLink | null> {
  const { data, error } = await supa.from('phone_link').select('*').eq('phone_hash', phoneHash).maybeSingle();
  if (error) throw error;
  return counts((data as PhoneLink | null) ?? null);
}

export async function linkByWallet(supa: SupabaseClient, wallet: string): Promise<PhoneLink | null> {
  const { data, error } = await supa.from('phone_link').select('*').eq('wallet_address', wallet).maybeSingle();
  if (error) throw error;
  return counts((data as PhoneLink | null) ?? null);
}
