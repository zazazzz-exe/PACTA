export const config = { runtime: 'nodejs' };

import { db } from './_lib/db';
import { json, isValidAddress, logError } from './_lib/http';
import { issueSessionToken, sessionCookie } from './_lib/session';
import { verifyWalletSignature } from './_lib/kyc/verifySignature';
import { overLimit } from './_lib/ratelimit';

// Consume the ownership nonce, verify the signature, and — on success — issue a
// session cookie. The nonce is consumed ATOMICALLY (single-use) before the
// signature is checked, so a nonce can never be replayed even under a race.

async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') return json({ error: 'method' }, 405);

  let body: { address?: unknown; nonce?: unknown; signedMessage?: unknown };
  try {
    body = await req.json();
  } catch {
    return json({ error: 'bad_request' }, 400);
  }
  const { address, nonce, signedMessage } = body;
  if (!isValidAddress(address)) return json({ error: 'invalid_address' }, 400);
  if (typeof nonce !== 'string' || typeof signedMessage !== 'string') {
    return json({ error: 'bad_request' }, 400);
  }

  try {
    const supa = db();
    const nowIso = new Date().toISOString();

    // Throttle brute-force signature attempts: block after 10 failures in 10 min.
    if (
      await overLimit(
        supa,
        'kyc_event',
        { wallet_address: address, event_type: 'wallet_verify_failed' },
        10 * 60_000,
        10,
      )
    ) {
      return json({ error: 'rate_limited' }, 429);
    }

    // Atomic single-use consume: only succeeds if the nonce is unused, unexpired,
    // and bound to this address. Returns the exact challenge that was signed.
    const { data: consumed, error: consumeErr } = await supa
      .from('kyc_challenge')
      .update({ used_at: nowIso })
      .eq('nonce', nonce)
      .eq('wallet_address', address)
      .is('used_at', null)
      .gt('expires_at', nowIso)
      .select('challenge')
      .maybeSingle();
    if (consumeErr) throw consumeErr;
    if (!consumed) return json({ error: 'invalid_nonce' }, 401);

    const verify = verifyWalletSignature(address, consumed.challenge, signedMessage);
    if (!verify.ok) {
      await supa
        .from('kyc_event')
        .insert({ wallet_address: address, event_type: 'wallet_verify_failed' });
      return json({ error: 'bad_signature' }, 401);
    }

    // First contact: create an unverified profile if none exists (never clobber
    // an existing status).
    const { error: upsertErr } = await supa
      .from('kyc_profile')
      .upsert({ wallet_address: address }, { onConflict: 'wallet_address', ignoreDuplicates: true });
    if (upsertErr) throw upsertErr;

    const { data: prof, error: readErr } = await supa
      .from('kyc_profile')
      .select('status')
      .eq('wallet_address', address)
      .maybeSingle();
    if (readErr) throw readErr;
    const kycStatus = prof?.status ?? 'unverified';

    await supa
      .from('kyc_event')
      .insert({ wallet_address: address, event_type: 'wallet_verified', detail: { encoding: verify.encoding } });

    const token = issueSessionToken(address);
    return json({ address, kycStatus }, 200, { 'set-cookie': sessionCookie(token) });
  } catch (e) {
    logError('kyc-verify-wallet', e);
    return json({ error: 'server_error' }, 500);
  }
}

export default { fetch: handler };
