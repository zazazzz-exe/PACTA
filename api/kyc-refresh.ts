import { db } from './_lib/db';
import { json, logError } from './_lib/http';
import { readSession } from './_lib/session';
import { getProvider } from './_lib/kyc';
import { applyOutcome } from './_lib/kyc/apply';

// Pull the latest decision for the wallet's in-flight session and apply it.
// Used when the user returns from a hosted provider (Didit), so status resolves
// even if the webhook is delayed or not configured. Session-authed.

async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') return json({ error: 'method' }, 405);

  const address = readSession(req);
  if (!address) return json({ error: 'unauthorized' }, 401);

  try {
    const supa = db();
    const { data, error } = await supa
      .from('kyc_profile')
      .select('provider_ref, status')
      .eq('wallet_address', address)
      .maybeSingle();
    if (error) throw error;
    if (!data?.provider_ref) return json({ kycStatus: data?.status ?? 'unverified' });

    const provider = getProvider();
    const result = await provider.getResult(data.provider_ref);
    await applyOutcome(supa, provider, address, data.provider_ref, result.outcome, result);
    return json({ kycStatus: result.outcome === 'verified' ? 'verified' : result.outcome });
  } catch (e) {
    logError('kyc-refresh', e);
    return json({ error: 'server_error' }, 500);
  }
}

export default { fetch: handler };
