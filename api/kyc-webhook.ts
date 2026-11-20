import { db } from './_lib/db.js';
import { json, logError } from './_lib/http.js';
import { getProvider, kycUnavailable } from './_lib/kyc/index.js';
import { applyOutcome } from './_lib/kyc/apply.js';

// Async result callback from the provider (HMAC-authenticated). Looks up the
// wallet by provider_ref and applies the outcome. No media is ever received or
// stored here.
//
// Replay protection: the provider checks freshness from the SIGNED body
// timestamp, and each signed delivery's digest (webhookId) is recorded in
// kyc_webhook_seen. A repeat hits the primary key and is rejected with 409. If
// applying the outcome fails, the record is removed so a genuine retry works.

const SEEN_RETENTION_MS = 60 * 60 * 1000; // well past the 5-minute freshness window

export async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') return json({ error: 'method' }, 405);
  const unavailable = kycUnavailable();
  if (unavailable) return unavailable;

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

    if (!result.webhookId) throw new Error('webhook_id_missing');
    const supa = db();

    // Best-effort cleanup: stale deliveries are rejected by freshness anyway.
    await supa
      .from('kyc_webhook_seen')
      .delete()
      .lt('created_at', new Date(Date.now() - SEEN_RETENTION_MS).toISOString());

    const seen = await supa
      .from('kyc_webhook_seen')
      .insert({ body_hash: result.webhookId, provider: provider.id });
    if (seen.error) {
      if (seen.error.code === '23505') return json({ error: 'duplicate_webhook' }, 409);
      throw seen.error;
    }
    const forget = () =>
      supa.from('kyc_webhook_seen').delete().eq('body_hash', result.webhookId as string);

    const { data, error } = await supa
      .from('kyc_profile')
      .select('wallet_address')
      .eq('provider_ref', result.providerRef)
      .maybeSingle();
    if (error) {
      await forget();
      throw error;
    }
    if (!data) {
      await forget();
      return json({ error: 'unknown_ref' }, 404);
    }

    try {
      await applyOutcome(supa, provider, data.wallet_address, result.providerRef, result.outcome);
    } catch (e) {
      await forget();
      throw e;
    }
    return json({ ok: true });
  } catch (e) {
    logError('kyc-webhook', e);
    return json({ error: 'server_error' }, 500);
  }
}

export default { fetch: handler };
