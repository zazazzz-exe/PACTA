import { db } from './_lib/db';
import { json, logError } from './_lib/http';
import { readSession } from './_lib/session';
import { getProvider } from './_lib/kyc';
import { CONSENT_VERSION, CONSENT_TEXT } from './_lib/kyc/consent';
import { hmacHex } from './_lib/kyc/hash';
import type { DocType } from './_lib/kyc/types';

// Record versioned consent (over the server's canonical text) and initialize a
// provider session. Consent is required before anything else. Capture providers
// (mock) also take a document type/country here; hosted providers (Didit) get a
// `url` to redirect the user to and return it to the client.

const DOC_TYPES: DocType[] = ['passport', 'national_id', 'drivers_license'];

async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') return json({ error: 'method' }, 405);

  const address = readSession(req);
  if (!address) return json({ error: 'unauthorized' }, 401);

  let body: {
    consent?: { version?: unknown; accepted?: unknown };
    docType?: unknown;
    country?: unknown;
  };
  try {
    body = await req.json();
  } catch {
    return json({ error: 'bad_request' }, 400);
  }

  if (body.consent?.version !== CONSENT_VERSION || body.consent?.accepted !== true) {
    return json({ error: 'consent_required' }, 400);
  }

  const provider = getProvider();

  // Capture providers need the document type/country up front; hosted providers
  // learn them from the verification result.
  let docType: DocType | undefined;
  let country: string | undefined;
  if (provider.capture) {
    if (typeof body.docType !== 'string' || !DOC_TYPES.includes(body.docType as DocType)) {
      return json({ error: 'invalid_doc_type' }, 400);
    }
    docType = body.docType as DocType;
    country = typeof body.country === 'string' ? body.country.trim().toUpperCase() : '';
    if (!/^[A-Z]{2,3}$/.test(country)) return json({ error: 'invalid_country' }, 400);
  }

  try {
    const supa = db();
    const origin = process.env.APP_URL || new URL(req.url).origin;
    const start = await provider.startVerification({
      walletAddress: address,
      docType,
      country,
      callbackUrl: `${origin}/#/verify`,
    });

    const { error: consentErr } = await supa.from('kyc_consent').insert({
      wallet_address: address,
      policy_version: CONSENT_VERSION,
      consent_text_hash: hmacHex(CONSENT_TEXT),
    });
    if (consentErr) throw consentErr;

    const update: Record<string, unknown> = {
      provider: provider.id,
      provider_ref: start.providerRef,
      status_updated_at: new Date().toISOString(),
    };
    if (provider.capture) {
      update.doc_type = docType;
      update.doc_country = country;
    } else {
      // Hosted: the user is being redirected to the provider — mark in-progress.
      update.status = 'pending';
    }
    const { error: profErr } = await supa
      .from('kyc_profile')
      .update(update)
      .eq('wallet_address', address);
    if (profErr) throw profErr;

    await supa.from('kyc_event').insert([
      { wallet_address: address, event_type: 'consent_recorded', detail: { version: CONSENT_VERSION } },
      { wallet_address: address, event_type: 'verification_started', detail: { providerRef: start.providerRef } },
    ]);

    return json({ providerRef: start.providerRef, uploadMode: start.uploadMode, url: start.url ?? null });
  } catch (e) {
    logError('kyc-start-verification', e);
    return json({ error: 'server_error' }, 500);
  }
}

export default { fetch: handler };
