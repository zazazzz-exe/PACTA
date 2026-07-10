export const config = { runtime: 'nodejs' };

import { db } from './_lib/db';
import { json, logError } from './_lib/http';
import { readSession } from './_lib/session';
import { getProvider } from './_lib/kyc';
import { applyOutcome } from './_lib/kyc/apply';

// Stream the ID + liveness media straight to the provider and persist ONLY the
// result. The media is never written to disk, DB, or storage, and never logged.

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') return json({ error: 'method' }, 405);

  const address = readSession(req);
  if (!address) return json({ error: 'unauthorized' }, 401);

  const providerRef = new URL(req.url).searchParams.get('ref');
  if (!providerRef) return json({ error: 'missing_ref' }, 400);

  const hint = req.headers.get('x-mock-outcome');
  const mockOutcome =
    hint === 'pass' || hint === 'fail' || hint === 'pending' ? hint : undefined;

  try {
    const supa = db();
    const provider = getProvider();

    // Guard: the ref must belong to this wallet's in-flight verification.
    const { data: owned, error: ownErr } = await supa
      .from('kyc_profile')
      .select('wallet_address')
      .eq('wallet_address', address)
      .eq('provider_ref', providerRef)
      .maybeSingle();
    if (ownErr) throw ownErr;
    if (!owned) return json({ error: 'unknown_ref' }, 400);

    const { status } = await provider.submitMedia({
      providerRef,
      media: req.body,
      mockOutcome,
    });
    await supa
      .from('kyc_event')
      .insert({ wallet_address: address, event_type: 'media_submitted', detail: { providerRef } });

    await applyOutcome(supa, provider, address, providerRef, status);
    return json({ status });
  } catch (e) {
    logError('kyc-submit-media', e);
    return json({ error: 'server_error' }, 500);
  }
}
