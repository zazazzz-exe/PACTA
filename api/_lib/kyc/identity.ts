import type { SupabaseClient } from '@supabase/supabase-js';
import { logError } from '../http';

// Linked-identity resolution (Phase 4b). Wallets sharing kyc_profile.identity_id
// are one identity. A wallet is "verified" if ANY wallet in its group holds a
// 'verified' row. Verified state lives on that verifier row and is never
// duplicated, so this is the single source of truth for "is this wallet
// verified" and for listing the wallets on an identity.

export type GroupStatus =
  | 'unverified'
  | 'pending'
  | 'verified'
  | 'rejected'
  | 'expired'
  | 'erased';

interface ProfileRow {
  wallet_address: string;
  identity_id: string;
  status: GroupStatus;
  masked_name: string | null;
  doc_type: string | null;
  doc_country: string | null;
  doc_expiry: string | null;
  status_updated_at: string | null;
}

const COLS =
  'wallet_address, identity_id, status, masked_name, doc_type, doc_country, doc_expiry, status_updated_at';

// Same columns minus identity_id, for a graceful fallback read when migration
// 0002 has not been applied yet (the identity_id column is absent).
const LEGACY_COLS =
  'wallet_address, status, masked_name, doc_type, doc_country, doc_expiry, status_updated_at';

export interface ResolvedIdentity {
  identityId: string | null;
  status: GroupStatus;
  maskedName: string | null;
  docType: string | null;
  docCountry: string | null;
  docExpiry: string | null;
  updatedAt: string | null;
  verifierAddress: string | null; // the wallet holding the 'verified' row, if any
  wallets: string[]; // every wallet in the group
}

export interface LinkedWallet {
  address: string;
  isVerifier: boolean;
  isCurrent: boolean;
}

// Resolve the identity a wallet belongs to. One row read for the wallet, one for
// its group. If any group member is verified, the returned status/PII come from
// that verifier; otherwise from the wallet's own row.
export async function resolveIdentity(
  supa: SupabaseClient,
  wallet: string,
): Promise<ResolvedIdentity> {
  const { data: self, error: selfErr } = await supa
    .from('kyc_profile')
    .select(COLS)
    .eq('wallet_address', wallet)
    .maybeSingle<ProfileRow>();

  // If the identity_id column is missing (migration 0002 not applied) or the read
  // errors, fall back to a per-wallet read so verification status still resolves.
  // Core verification must never silently read as unverified because the optional
  // grouping query failed.
  if (selfErr) return resolveLegacy(supa, wallet, selfErr);
  if (!self) return singleton(wallet);

  const { data: group } = await supa
    .from('kyc_profile')
    .select(COLS)
    .eq('identity_id', self.identity_id);

  const rows: ProfileRow[] = (group as ProfileRow[] | null) ?? [self];
  const verifier = rows.find((r) => r.status === 'verified') ?? null;
  const source = verifier ?? self;

  return {
    identityId: self.identity_id,
    status: source.status,
    maskedName: source.masked_name,
    docType: source.doc_type,
    docCountry: source.doc_country,
    docExpiry: source.doc_expiry,
    updatedAt: source.status_updated_at,
    verifierAddress: verifier?.wallet_address ?? null,
    wallets: rows.map((r) => r.wallet_address),
  };
}

// A wallet with no profile row (or whose identity cannot be resolved) is its own
// unverified singleton identity.
function singleton(wallet: string): ResolvedIdentity {
  return {
    identityId: null,
    status: 'unverified',
    maskedName: null,
    docType: null,
    docCountry: null,
    docExpiry: null,
    updatedAt: null,
    verifierAddress: null,
    wallets: [wallet],
  };
}

// Fallback read that does not reference identity_id, used when migration 0002 is
// not yet applied. Resolves the wallet's own status so verification is never
// masked by the grouping query. The underlying error is logged, not swallowed.
async function resolveLegacy(
  supa: SupabaseClient,
  wallet: string,
  cause: unknown,
): Promise<ResolvedIdentity> {
  logError('resolveIdentity:legacy_fallback', cause);
  const { data } = await supa
    .from('kyc_profile')
    .select(LEGACY_COLS)
    .eq('wallet_address', wallet)
    .maybeSingle<Omit<ProfileRow, 'identity_id'>>();
  if (!data) return singleton(wallet);
  return {
    identityId: null,
    status: data.status,
    maskedName: data.masked_name,
    docType: data.doc_type,
    docCountry: data.doc_country,
    docExpiry: data.doc_expiry,
    updatedAt: data.status_updated_at,
    verifierAddress: data.status === 'verified' ? wallet : null,
    wallets: [wallet],
  };
}

// Shape the resolved group for the UI, marking the verifier and the caller's
// current wallet.
export function linkedWalletsFrom(resolved: ResolvedIdentity, current: string): LinkedWallet[] {
  return resolved.wallets.map((address) => ({
    address,
    isVerifier: address === resolved.verifierAddress,
    isCurrent: address === current,
  }));
}
