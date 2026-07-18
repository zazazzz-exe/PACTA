import { db } from './_lib/db';
import { json, logError } from './_lib/http';
import { readSession } from './_lib/session';
import { getProvider } from './_lib/kyc';
import { resolveIdentity, linkedWalletsFrom } from './_lib/kyc/identity';

// Return the connected wallet's KYC status. Session-authed: the address comes
// from the signed cookie, never from the request body, so a caller can only ever
// read their own status. Status is resolved across the wallet's linked-identity
// group (verified if any linked wallet is verified). Poll this while 'pending'.

async function handler(req: Request): Promise<Response> {
  if (req.method !== 'GET') return json({ error: 'method' }, 405);

  const address = readSession(req);
  if (!address) return json({ error: 'unauthorized' }, 401);

  try {
    const supa = db();
    const resolved = await resolveIdentity(supa, address);
    return json({
      kycStatus: resolved.status,
      maskedName: resolved.maskedName,
      docType: resolved.docType,
      docCountry: resolved.docCountry,
      docExpiry: resolved.docExpiry,
      updatedAt: resolved.updatedAt,
      // 'capture' = document/liveness captured in-app; 'hosted' = redirect flow.
      providerMode: getProvider().capture ? 'capture' : 'hosted',
      // The wallets on this identity, so Profile can render/manage them.
      linkedWallets: linkedWalletsFrom(resolved, address),
    });
  } catch (e) {
    logError('kyc-status', e);
    return json({ error: 'server_error' }, 500);
  }
}

export default { fetch: handler };
