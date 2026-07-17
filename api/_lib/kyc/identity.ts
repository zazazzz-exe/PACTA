import type { SupabaseClient } from '@supabase/supabase-js';

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
  const { data: self } = await supa
    .from('kyc_profile')
    .select(COLS)
    .eq('wallet_address', wallet)
    .maybeSingle<ProfileRow>();

  if (!self) {
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

// Shape the resolved group for the UI, marking the verifier and the caller's
// current wallet.
export function linkedWalletsFrom(resolved: ResolvedIdentity, current: string): LinkedWallet[] {
  return resolved.wallets.map((address) => ({
    address,
    isVerifier: address === resolved.verifierAddress,
    isCurrent: address === current,
  }));
}
