import { db } from './_lib/db';
import { json, logError } from './_lib/http';
import { getProvider } from './_lib/kyc';
import { applyOutcome } from './_lib/kyc/apply';

// Async result callback from the provider (HMAC-authenticated). Looks up the
// wallet by provider_ref and applies the outcome. No media is ever received or
// stored here.

async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') return json({ error: 'method' }, 405);

  const rawBody = await req.text();
  const headers: Record<string, string> = {};
  req.headers.forEach((v, k) => {
    headers[k] = v;
  });

  try {
    const provider = getProvider();

    let result;
    try {
      result = await provider.parseWebhook({ headers, rawBody });
    } catch {
      return json({ error: 'invalid_signature' }, 401);
    }

    const supa = db();
    const { data, error } = await supa
      .from('kyc_profile')
      .select('wallet_address')
      .eq('provider_ref', result.providerRef)
      .maybeSingle();
    if (error) throw error;
    if (!data) return json({ error: 'unknown_ref' }, 404);

    await applyOutcome(supa, provider, data.wallet_address, result.providerRef, result.outcome);
    return json({ ok: true });
  } catch (e) {
    logError('kyc-webhook', e);
    return json({ error: 'server_error' }, 500);
  }
}

export default { fetch: handler };
