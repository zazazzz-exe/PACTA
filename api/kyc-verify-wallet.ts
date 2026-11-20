import { db } from './_lib/db';
import { json, isValidAddress, logError, clientIp } from './_lib/http';
import { hmacHex } from './_lib/kyc/hash';
import { issueSessionToken, sessionCookie } from './_lib/session';
import { verifyWalletSignature } from './_lib/kyc/verifySignature';
import { overLimit } from './_lib/ratelimit';
import { resolveIdentity } from './_lib/kyc/identity';

// Consume the ownership nonce, verify the signature, and — on success — issue a
// session cookie. The nonce is consumed ATOMICALLY (single-use) before the
// signature is checked, so a nonce can never be replayed even under a race.

// Failed-signature brakes (per 10 minutes). Failures are counted per (address,
// IP) pair, so someone posting bad signatures for a victim's address only
// exhausts their own bucket and cannot lock the victim out. The per-IP limit
// caps one caller across all addresses, and a higher per-address ceiling across
// all IPs is the backstop against many IPs. With no known IP, the plain
// per-address limit applies. Only a keyed hash of the IP is stored.
export const VERIFY_WINDOW_MS = 10 * 60_000;
export const VERIFY_FAIL_LIMIT_PER_ADDRESS_IP = 10;
export const VERIFY_FAIL_LIMIT_PER_IP = 30;
export const VERIFY_FAIL_LIMIT_PER_ADDRESS_TOTAL = 50;
const FAILED = 'wallet_verify_failed';

export async function handler(req: Request): Promise<Response> {
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

    const ip = clientIp(req);
    const ipHash = ip ? hmacHex(ip) : null;
    const limited = ipHash
      ? (await overLimit(supa, 'kyc_event', { event_type: FAILED, 'detail->>ip_hash': ipHash }, VERIFY_WINDOW_MS, VERIFY_FAIL_LIMIT_PER_IP)) ||
        (await overLimit(
          supa,
          'kyc_event',
          { wallet_address: address, event_type: FAILED, 'detail->>ip_hash': ipHash },
          VERIFY_WINDOW_MS,
          VERIFY_FAIL_LIMIT_PER_ADDRESS_IP,
        )) ||
        (await overLimit(
          supa,
          'kyc_event',
          { wallet_address: address, event_type: FAILED },
          VERIFY_WINDOW_MS,
          VERIFY_FAIL_LIMIT_PER_ADDRESS_TOTAL,
        ))
      : await overLimit(
          supa,
          'kyc_event',
          { wallet_address: address, event_type: FAILED },
          VERIFY_WINDOW_MS,
          VERIFY_FAIL_LIMIT_PER_ADDRESS_IP,
        );
    if (limited) return json({ error: 'rate_limited' }, 429);

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
        .insert({ wallet_address: address, event_type: FAILED, detail: ipHash ? { ip_hash: ipHash } : null });
      return json({ error: 'bad_signature' }, 401);
    }

    // First contact: create an unverified profile if none exists (never clobber
    // an existing status).
    const { error: upsertErr } = await supa
      .from('kyc_profile')
      .upsert({ wallet_address: address }, { onConflict: 'wallet_address', ignoreDuplicates: true });
    if (upsertErr) throw upsertErr;

    // Group-resolved status, so a linked wallet shows verified right on connect.
    const kycStatus = (await resolveIdentity(supa, address)).status;

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
