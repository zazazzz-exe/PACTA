import { randomBytes } from 'crypto';
import { db } from './_lib/db';
import { json, isValidAddress, logError, clientIp } from './_lib/http';
import { hmacHex } from './_lib/kyc/hash';
import { overLimit } from './_lib/ratelimit';

// Issue a single-use, short-lived wallet-ownership challenge. The client signs
// the returned `challenge` string with the wallet and posts it back to
// /api/kyc-verify-wallet. No auth required (this is how a session begins).

const NONCE_TTL_MS = 5 * 60 * 1000;
// Abuse brakes (per minute). The per-address limit is counted per (address, IP)
// pair, so a caller spamming a victim's address only exhausts their own bucket
// and cannot lock the victim out. The per-IP limit caps one caller across all
// addresses, and a higher per-address ceiling across all IPs is the backstop
// against many IPs. When the IP is unknown, the plain per-address limit applies.
export const NONCE_LIMIT_PER_ADDRESS_IP = 5;
export const NONCE_LIMIT_PER_IP = 20;
export const NONCE_LIMIT_PER_ADDRESS_TOTAL = 30;

function buildChallenge(address: string, nonce: string, issuedAt: string): string {
  return [
    'PACTA wants to verify you own this wallet.',
    `Address: ${address}`,
    `Nonce: ${nonce}`,
    `Issued: ${issuedAt}`,
    'This signature proves ownership. It authorizes no transaction and moves no funds.',
  ].join('\n');
}

export async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') return json({ error: 'method' }, 405);

  let body: { address?: unknown };
  try {
    body = await req.json();
  } catch {
    return json({ error: 'bad_request' }, 400);
  }
  const { address } = body;
  if (!isValidAddress(address)) return json({ error: 'invalid_address' }, 400);

  const nonce = randomBytes(32).toString('base64');
  const issuedAt = new Date().toISOString();
  const expiresAt = new Date(Date.now() + NONCE_TTL_MS).toISOString();
  const challenge = buildChallenge(address, nonce, issuedAt);

  try {
    const supa = db();

    // Best-effort cleanup of expired challenges (self-maintaining, no cron).
    await supa.from('kyc_challenge').delete().lt('expires_at', new Date().toISOString());

    // Only a keyed hash of the IP is stored, never the raw IP.
    const ip = clientIp(req);
    const ipHash = ip ? hmacHex(ip) : null;
    const limited = ipHash
      ? (await overLimit(supa, 'kyc_challenge', { ip_hash: ipHash }, 60_000, NONCE_LIMIT_PER_IP)) ||
        (await overLimit(
          supa,
          'kyc_challenge',
          { wallet_address: address, ip_hash: ipHash },
          60_000,
          NONCE_LIMIT_PER_ADDRESS_IP,
        )) ||
        (await overLimit(
          supa,
          'kyc_challenge',
          { wallet_address: address },
          60_000,
          NONCE_LIMIT_PER_ADDRESS_TOTAL,
        ))
      : await overLimit(
          supa,
          'kyc_challenge',
          { wallet_address: address },
          60_000,
          NONCE_LIMIT_PER_ADDRESS_IP,
        );
    if (limited) return json({ error: 'rate_limited' }, 429);

    const { error } = await supa
      .from('kyc_challenge')
      .insert({ wallet_address: address, nonce, challenge, expires_at: expiresAt, ip_hash: ipHash });
    if (error) throw error;
    await supa.from('kyc_event').insert({ wallet_address: address, event_type: 'nonce_issued' });
    return json({ nonce, challenge, expiresAt });
  } catch (e) {
    logError('kyc-request-nonce', e);
    return json({ error: 'server_error' }, 500);
  }
}

export default { fetch: handler };
