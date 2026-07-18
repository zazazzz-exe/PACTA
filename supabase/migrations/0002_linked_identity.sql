-- PACTA linked identity across wallets (Phase 4b).
--
-- Lets one verified identity own several wallets. Adds a grouping id to
-- kyc_profile: wallets that share identity_id are one identity, and a wallet is
-- "verified" if ANY wallet in its group is verified (resolved at read time in
-- api/_lib/kyc/identity.ts). Verified state stays physically on the verifier's
-- row (never duplicated), so:
--   * the verification write path (apply.ts, start-verification, submit-media,
--     webhook, refresh) is UNCHANGED, and
--   * the existing gov_id_hash unique index (one identity per government ID —
--     anti-sybil) stays intact, because linking never writes a new gov_id_hash.
--
-- Safe to run more than once (idempotent). Apply with the Supabase SQL editor,
-- `supabase db push`, or psql — same as 0001.

-- Volatile default => each EXISTING row gets its own distinct uuid on rewrite,
-- so every current wallet starts as its own singleton identity. New/first-contact
-- wallets also default to a fresh singleton identity.
alter table kyc_profile
  add column if not exists identity_id uuid not null default gen_random_uuid();

create index if not exists kyc_profile_identity_idx on kyc_profile (identity_id);
