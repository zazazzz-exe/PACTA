import { describe, it, expect } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { resolveIdentity, linkedWalletsFrom, type ResolvedIdentity } from './identity';

// Minimal chainable + thenable mock of the supabase query builder used by
// resolveIdentity: `.select().eq(...).maybeSingle()` (self row) and
// `.select().eq(...)` awaited directly (group rows).
interface Row {
  wallet_address: string;
  identity_id: string;
  status: string;
  masked_name: string | null;
  doc_type: string | null;
  doc_country: string | null;
  doc_expiry: string | null;
  status_updated_at: string | null;
}

function row(wallet: string, identity: string, status: string, masked: string | null = null): Row {
  return {
    wallet_address: wallet,
    identity_id: identity,
    status,
    masked_name: masked,
    doc_type: null,
    doc_country: null,
    doc_expiry: null,
    status_updated_at: null,
  };
}

function mockSupa(rows: Row[], opts: { failIdentityCol?: boolean } = {}): SupabaseClient {
  // failIdentityCol simulates migration 0002 not being applied: any query that
  // selects the identity_id column errors, like a real "column does not exist".
  const colErr = { message: 'column kyc_profile.identity_id does not exist', code: '42703' };
  const client = {
    from() {
      const filters: [string, unknown][] = [];
      let cols = '';
      const apply = () => rows.filter((r) => filters.every(([c, v]) => (r as Record<string, unknown>)[c] === v));
      const fail = () => opts.failIdentityCol === true && cols.includes('identity_id');
      const builder = {
        select(c?: string) { cols = c ?? ''; return builder; },
        eq(c: string, v: unknown) { filters.push([c, v]); return builder; },
        maybeSingle() {
          return fail()
            ? Promise.resolve({ data: null, error: colErr })
            : Promise.resolve({ data: apply()[0] ?? null, error: null });
        },
        then(res: (x: { data: Row[] | null; error: unknown }) => unknown, rej?: (e: unknown) => unknown) {
          return (fail()
            ? Promise.resolve({ data: null, error: colErr })
            : Promise.resolve({ data: apply(), error: null })
          ).then(res, rej);
        },
      };
      return builder;
    },
  };
  return client as unknown as SupabaseClient;
}

const A = 'GA000000000000000000000000000000000000000000000000000001';
const B = 'GB000000000000000000000000000000000000000000000000000002';
const C = 'GC000000000000000000000000000000000000000000000000000003';

describe('resolveIdentity', () => {
  it('returns unverified for a wallet with no profile row', async () => {
    const r = await resolveIdentity(mockSupa([]), A);
    expect(r.status).toBe('unverified');
    expect(r.identityId).toBeNull();
    expect(r.wallets).toEqual([A]);
    expect(r.verifierAddress).toBeNull();
  });

  it('reports a solo verified wallet as verified', async () => {
    const r = await resolveIdentity(mockSupa([row(A, 'id1', 'verified', 'J** D**')]), A);
    expect(r.status).toBe('verified');
    expect(r.verifierAddress).toBe(A);
    expect(r.maskedName).toBe('J** D**');
    expect(r.wallets).toEqual([A]);
  });

  it('resolves an unverified wallet as verified when a linked sibling is verified', async () => {
    const supa = mockSupa([
      row(A, 'id1', 'verified', 'J** D**'),
      row(B, 'id1', 'unverified'),
    ]);
    const r = await resolveIdentity(supa, B); // ask about the UNVERIFIED wallet
    expect(r.status).toBe('verified');
    expect(r.verifierAddress).toBe(A);
    expect(r.maskedName).toBe('J** D**'); // PII comes from the verifier
    expect(new Set(r.wallets)).toEqual(new Set([A, B]));
  });

  it('stays unverified when no wallet in the group is verified', async () => {
    const supa = mockSupa([
      row(A, 'id1', 'unverified'),
      row(B, 'id1', 'pending'),
    ]);
    const r = await resolveIdentity(supa, A);
    expect(r.status).toBe('unverified');
    expect(r.verifierAddress).toBeNull();
  });

  it('does not leak across identities', async () => {
    const supa = mockSupa([
      row(A, 'id1', 'verified'),
      row(C, 'id2', 'unverified'), // different identity
    ]);
    const r = await resolveIdentity(supa, C);
    expect(r.status).toBe('unverified');
    expect(r.wallets).toEqual([C]);
  });

  it('falls back to a per-wallet read when identity_id is missing (migration 0002 not applied)', async () => {
    // Without the fallback, the grouped read errors and status silently reads
    // 'unverified' even though the wallet is verified in the DB.
    const supa = mockSupa([row(A, 'id1', 'verified', 'J** D**')], { failIdentityCol: true });
    const r = await resolveIdentity(supa, A);
    expect(r.status).toBe('verified');
    expect(r.identityId).toBeNull();
    expect(r.verifierAddress).toBe(A);
    expect(r.maskedName).toBe('J** D**');
    expect(r.wallets).toEqual([A]);
  });
});

describe('linkedWalletsFrom', () => {
  const resolved: ResolvedIdentity = {
    identityId: 'id1',
    status: 'verified',
    maskedName: null,
    docType: null,
    docCountry: null,
    docExpiry: null,
    updatedAt: null,
    verifierAddress: A,
    wallets: [A, B],
  };
  it('marks the verifier and the current wallet', () => {
    const out = linkedWalletsFrom(resolved, B);
    expect(out).toEqual([
      { address: A, isVerifier: true, isCurrent: false },
      { address: B, isVerifier: false, isCurrent: true },
    ]);
  });
});
