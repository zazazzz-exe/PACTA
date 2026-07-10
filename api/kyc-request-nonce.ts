export const config = { runtime: 'nodejs' };

import { randomBytes } from 'crypto';
import { db } from './_lib/db';
import { json, isValidAddress, logError } from './_lib/http';
import { overLimit } from './_lib/ratelimit';

// Issue a single-use, short-lived wallet-ownership challenge. The client signs
// the returned `challenge` string with the wallet and posts it back to
// /api/kyc-verify-wallet. No auth required (this is how a session begins).

const NONCE_TTL_MS = 5 * 60 * 1000;

function buildChallenge(address: string, nonce: string, issuedAt: string): string {
  return [
    'Pacta wants to verify you own this wallet.',
    `Address: ${address}`,
    `Nonce: ${nonce}`,
    `Issued: ${issuedAt}`,
    'This signature proves ownership. It authorizes no transaction and moves no funds.',
  ].join('\n');
}

export default async function handler(req: Request): Promise<Response> {
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

    // Basic abuse brake: at most 5 nonce requests per address per minute.
    if (await overLimit(supa, 'kyc_challenge', { wallet_address: address }, 60_000, 5)) {
      return json({ error: 'rate_limited' }, 429);
    }

    const { error } = await supa
      .from('kyc_challenge')
      .insert({ wallet_address: address, nonce, challenge, expires_at: expiresAt });
    if (error) throw error;
    await supa.from('kyc_event').insert({ wallet_address: address, event_type: 'nonce_issued' });
    return json({ nonce, challenge, expiresAt });
  } catch (e) {
    logError('kyc-request-nonce', e);
    return json({ error: 'server_error' }, 500);
  }
}
