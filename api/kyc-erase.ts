export const config = { runtime: 'nodejs' };

import { db } from './_lib/db';
import { json, logError } from './_lib/http';
import { readSession } from './_lib/session';

// Right to erasure (PH Data Privacy Act). Nulls every PII-derived column, deletes
// consent rows, and leaves a PII-free tombstone. No raw media ever existed here,
// so there is nothing else to purge. Clearing gov_id_hash also frees the wallet
// to verify again later.

async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') return json({ error: 'method' }, 405);

  const address = readSession(req);
  if (!address) return json({ error: 'unauthorized' }, 401);

  let body: { confirm?: unknown };
  try {
    body = await req.json();
  } catch {
    return json({ error: 'bad_request' }, 400);
  }
  if (body.confirm !== true) return json({ error: 'confirm_required' }, 400);

  try {
    const supa = db();
    const nowIso = new Date().toISOString();

    await supa.from('kyc_event').insert({ wallet_address: address, event_type: 'erasure_requested' });
    await supa.from('kyc_consent').delete().eq('wallet_address', address);
    const { error } = await supa
      .from('kyc_profile')
      .update({
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
        status_updated_at: nowIso,
      })
      .eq('wallet_address', address);
    if (error) throw error;

    await supa.from('kyc_event').insert({ wallet_address: address, event_type: 'erased' });
    return json({ status: 'erased' });
  } catch (e) {
    logError('kyc-erase', e);
    return json({ error: 'server_error' }, 500);
  }
}

export default { fetch: handler };
