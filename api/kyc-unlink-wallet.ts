import { randomUUID } from 'crypto';
import { db } from './_lib/db';
import { json, isValidAddress, logError } from './_lib/http';
import { readSession } from './_lib/session';
import { resolveIdentity, linkedWalletsFrom } from './_lib/kyc/identity';

// Remove a wallet from the connected identity. Two cases:
//   * Removing a NON-verifier linked wallet just detaches it (it reverts to its
//     own unverified singleton identity).
//   * Removing the VERIFIER wallet (or your only wallet) erases the identity's
//     verified data — every linked wallet then reads unverified — and requires
//     explicit confirmation, so you never strand a verified identity.
// Session-authed: you can only manage wallets on your OWN identity.

const ERASE_COLUMNS = {
  status: 'erased',
  provider: null,
  provider_ref: null,
  doc_type: null,
  doc_country: null,
  doc_expiry: null,
  gov_id_hash: null,
  name_hash: null,
  masked_name: null,
  first_verified_at: null,
} as const;

async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') return json({ error: 'method' }, 405);

  const sessionAddr = readSession(req);
  if (!sessionAddr) return json({ error: 'unauthorized' }, 401);

  let body: { address?: unknown; confirm?: unknown };
  try {
    body = await req.json();
  } catch {
    return json({ error: 'bad_request' }, 400);
  }
  const target = body.address;
  if (!isValidAddress(target)) return json({ error: 'invalid_address' }, 400);

  try {
    const supa = db();
    const nowIso = new Date().toISOString();

    const me = await resolveIdentity(supa, sessionAddr);
    if (!me.identityId || !me.wallets.includes(target)) {
      return json({ error: 'not_in_identity' }, 400);
    }

    const removingVerifier = target === me.verifierAddress;
    const onlyOne = me.wallets.length <= 1;

    if (removingVerifier || onlyOne) {
      // Identity-wide erasure of the verified data.
      if (body.confirm !== true) return json({ error: 'confirm_required' }, 400);
      const eraseTarget = me.verifierAddress ?? target;
      await supa
        .from('kyc_event')
        .insert({ wallet_address: eraseTarget, event_type: 'erasure_requested' });
      await supa.from('kyc_consent').delete().eq('wallet_address', eraseTarget);
      const { error } = await supa
        .from('kyc_profile')
        .update({ ...ERASE_COLUMNS, status_updated_at: nowIso })
        .eq('wallet_address', eraseTarget);
      if (error) throw error;
      await supa.from('kyc_event').insert({ wallet_address: eraseTarget, event_type: 'erased' });
      return json({ erased: true });
    }

    // Detach a non-verifier wallet into its own fresh singleton identity.
    const { error } = await supa
      .from('kyc_profile')
      .update({ identity_id: randomUUID() })
      .eq('wallet_address', target);
    if (error) throw error;
    await supa
      .from('kyc_event')
      .insert({ wallet_address: target, event_type: 'wallet_unlinked', detail: { from: sessionAddr } });

    const resolved = await resolveIdentity(supa, sessionAddr);
    return json({ unlinked: true, wallets: linkedWalletsFrom(resolved, sessionAddr) });
  } catch (e) {
    logError('kyc-unlink-wallet', e);
    return json({ error: 'server_error' }, 500);
  }
}

export default { fetch: handler };
