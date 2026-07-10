import type { SupabaseClient } from '@supabase/supabase-js';
import type { KycProvider, KycOutcome, ProviderResult } from './types';
import { hmacHex, maskName } from './hash';

// Apply a provider outcome to the wallet's profile. On 'verified' it pulls the
// normalized result, derives keyed hashes + a masked name, persists ONLY those
// (the gov ID number and full name are used then dropped), and stamps
// first_verified_at once. Used by both the submit and webhook endpoints.
export async function applyOutcome(
  supa: SupabaseClient,
  provider: KycProvider,
  walletAddress: string,
  providerRef: string,
  outcome: KycOutcome,
  prefetched?: ProviderResult,
): Promise<void> {
  const nowIso = new Date().toISOString();

  if (outcome === 'verified') {
    const result = prefetched ?? (await provider.getResult(providerRef));
    const update: Record<string, unknown> = {
      status: 'verified',
      provider: provider.id,
      provider_ref: providerRef,
      status_updated_at: nowIso,
    };
    // Hosted providers (e.g. Didit) return doc metadata in the decision.
    if (result.docType) update.doc_type = result.docType;
    if (result.country) update.doc_country = result.country;
    if (result.docExpiry) update.doc_expiry = result.docExpiry;
    if (result.govIdNumber) update.gov_id_hash = hmacHex(result.govIdNumber);
    if (result.fullName) {
      update.name_hash = hmacHex(result.fullName);
      update.masked_name = maskName(result.fullName);
    }
    const { data: existing } = await supa
      .from('kyc_profile')
      .select('first_verified_at')
      .eq('wallet_address', walletAddress)
      .maybeSingle();
    if (!existing?.first_verified_at) update.first_verified_at = nowIso;

    await supa.from('kyc_profile').update(update).eq('wallet_address', walletAddress);
  } else {
    await supa
      .from('kyc_profile')
      .update({ status: outcome, status_updated_at: nowIso })
      .eq('wallet_address', walletAddress);
  }

  await supa
    .from('kyc_event')
    .insert({ wallet_address: walletAddress, event_type: 'provider_result', detail: { outcome, providerRef } });
}
