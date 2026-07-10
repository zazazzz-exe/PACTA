export const config = { runtime: 'nodejs' };

import { db } from './_lib/db';
import { json, logError } from './_lib/http';
import { readSession } from './_lib/session';
import { getProvider } from './_lib/kyc';

// Return the connected wallet's KYC status. Session-authed: the address comes
// from the signed cookie, never from the request body, so a caller can only ever
// read their own status. Poll this while status is 'pending'.

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'GET') return json({ error: 'method' }, 405);

  const address = readSession(req);
  if (!address) return json({ error: 'unauthorized' }, 401);

  try {
    const supa = db();
    const { data, error } = await supa
      .from('kyc_profile')
      .select('status, masked_name, doc_type, doc_country, doc_expiry, status_updated_at')
      .eq('wallet_address', address)
      .maybeSingle();
    if (error) throw error;
    return json({
      kycStatus: data?.status ?? 'unverified',
      maskedName: data?.masked_name ?? null,
      docType: data?.doc_type ?? null,
      docCountry: data?.doc_country ?? null,
      docExpiry: data?.doc_expiry ?? null,
      updatedAt: data?.status_updated_at ?? null,
      // 'capture' = document/liveness captured in-app; 'hosted' = redirect flow.
      providerMode: getProvider().capture ? 'capture' : 'hosted',
    });
  } catch (e) {
    logError('kyc-status', e);
    return json({ error: 'server_error' }, 500);
  }
}
