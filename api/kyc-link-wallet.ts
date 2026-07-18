import { db } from './_lib/db';
import { json, isValidAddress, logError } from './_lib/http';
import { readSession } from './_lib/session';
import { verifyWalletSignature } from './_lib/kyc/verifySignature';
import { overLimit } from './_lib/ratelimit';
import { resolveIdentity, linkedWalletsFrom } from './_lib/kyc/identity';

// Link a second wallet (B) to the connected, verified identity (A). Requires TWO
// proofs: an already-verified authenticated session (A's cookie) AND a fresh
// ownership signature from B. A stranger's wallet can never inherit someone's
// KYC. No re-verification: B joins A's identity group and is verified by group.

async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') return json({ error: 'method' }, 405);

  const sessionAddr = readSession(req);
  if (!sessionAddr) return json({ error: 'unauthorized' }, 401);

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
  if (address === sessionAddr) return json({ error: 'cannot_link_self' }, 400);

  try {
    const supa = db();
    const nowIso = new Date().toISOString();

    // Proof 1: the session must resolve to a verified identity.
    const me = await resolveIdentity(supa, sessionAddr);
    if (me.status !== 'verified' || !me.identityId) return json({ error: 'not_verified' }, 403);

    // Throttle brute-force signature attempts on B (same brake as verify-wallet).
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

    // Proof 2: atomic single-use consume of B's ownership nonce, then verify B's
    // signature — identical mechanics to kyc-verify-wallet.
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

    // Ensure B has a profile row (creates an unverified singleton if new).
    const { error: upsertErr } = await supa
      .from('kyc_profile')
      .upsert({ wallet_address: address }, { onConflict: 'wallet_address', ignoreDuplicates: true });
    if (upsertErr) throw upsertErr;

    const b = await resolveIdentity(supa, address);
    // Already part of this identity: idempotent success.
    if (b.identityId === me.identityId) {
      const resolved = await resolveIdentity(supa, sessionAddr);
      return json({ linked: true, wallets: linkedWalletsFrom(resolved, sessionAddr) });
    }
    // B belongs to a DIFFERENT verified identity: never silently merge.
    if (b.status === 'verified') return json({ error: 'already_verified_elsewhere' }, 409);

    // Point B at A's identity.
    const { error: linkErr } = await supa
      .from('kyc_profile')
      .update({ identity_id: me.identityId })
      .eq('wallet_address', address);
    if (linkErr) throw linkErr;

    await supa.from('kyc_event').insert([
      { wallet_address: sessionAddr, event_type: 'wallet_linked', detail: { linked: address } },
      { wallet_address: address, event_type: 'wallet_linked', detail: { into: sessionAddr } },
    ]);

    // Build the updated wallet list from what we already know (A's group + B),
    // avoiding another round-trip to resolve the identity.
    const wallets = linkedWalletsFrom(
      { ...me, wallets: [...me.wallets.filter((w) => w !== address), address] },
      sessionAddr,
    );
    return json({ linked: true, wallets });
  } catch (e) {
    logError('kyc-link-wallet', e);
    return json({ error: 'server_error' }, 500);
  }
}

export default { fetch: handler };
