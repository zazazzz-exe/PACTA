-- PactAI KYC identity layer — off-chain, server-mediated, minimal-PII.
--
-- Apply with: Supabase SQL editor, or `supabase db push`, or psql against the
-- project. Every table has RLS enabled with NO permissive policies: only the
-- service-role key (used exclusively by the repo-root api/kyc-*.ts Node
-- functions) can read or write. A leaked anon key reads nothing.
--
-- Data minimization: raw ID images and selfies are NEVER stored here. They are
-- streamed through the server to the KYC provider and discarded. We keep only
-- verification status, a provider reference, document metadata, keyed HMAC
-- hashes (for dedup), a masked display name, consent records, and a PII-free
-- audit log.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
do $$ begin
  create type kyc_status as enum
    ('unverified', 'pending', 'verified', 'rejected', 'expired', 'erased');
exception when duplicate_object then null; end $$;

do $$ begin
  create type kyc_doc_type as enum ('passport', 'national_id', 'drivers_license');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- kyc_profile — one row per wallet. The authoritative verification record.
-- ---------------------------------------------------------------------------
create table if not exists kyc_profile (
  wallet_address     text primary key,              -- Stellar G-address (ed25519)
  status             kyc_status not null default 'unverified',
  provider           text,                           -- 'mock' | vendor id
  provider_ref       text,                           -- provider's opaque reference
  doc_type           kyc_doc_type,
  doc_country        text,                           -- ISO-3166 alpha-2/3
  doc_expiry         date,
  gov_id_hash        text,                           -- hex HMAC(KYC_HASH_SECRET, gov id); dedup/sybil
  name_hash          text,                           -- hex HMAC(KYC_HASH_SECRET, normalized name)
  masked_name        text,                           -- e.g. 'J** D**' — UI only, no full name
  first_verified_at  timestamptz,
  status_updated_at  timestamptz not null default now(),
  created_at         timestamptz not null default now()
);

-- One identity cannot verify many wallets (sybil resistance) — only where a
-- hash exists, so multiple unverified rows are fine.
create unique index if not exists kyc_profile_gov_id_hash_uq
  on kyc_profile (gov_id_hash) where gov_id_hash is not null;
create index if not exists kyc_profile_status_idx on kyc_profile (status);
-- Webhook results arrive keyed by the provider's reference, not the wallet.
create index if not exists kyc_profile_provider_ref_idx
  on kyc_profile (provider_ref) where provider_ref is not null;

-- ---------------------------------------------------------------------------
-- kyc_challenge — single-use, short-lived wallet-ownership nonces.
-- ---------------------------------------------------------------------------
create table if not exists kyc_challenge (
  id             uuid primary key default gen_random_uuid(),
  wallet_address text not null,
  nonce          text not null unique,               -- random 32 bytes, base64
  challenge      text not null,                       -- the exact string the user signs
  expires_at     timestamptz not null,
  used_at        timestamptz,                         -- null until atomically consumed
  created_at     timestamptz not null default now()
);
create index if not exists kyc_challenge_addr_idx on kyc_challenge (wallet_address);
create index if not exists kyc_challenge_exp_idx on kyc_challenge (expires_at);

-- ---------------------------------------------------------------------------
-- kyc_consent — versioned, timestamped consent (PH Data Privacy Act 2012).
-- ---------------------------------------------------------------------------
create table if not exists kyc_consent (
  id                 uuid primary key default gen_random_uuid(),
  wallet_address     text not null references kyc_profile(wallet_address) on delete cascade,
  policy_version     text not null,                   -- e.g. 'dpa-2026-01'
  consent_text_hash  text not null,                   -- hex hash of the exact text shown
  accepted_at        timestamptz not null default now(),
  ip_prefix          text,                            -- minimized (e.g. /24 or /48) — optional
  user_agent_hash    text                             -- hex hash — optional
);
create index if not exists kyc_consent_addr_idx on kyc_consent (wallet_address);

-- ---------------------------------------------------------------------------
-- kyc_event — append-only audit trail. Never contains PII.
-- ---------------------------------------------------------------------------
create table if not exists kyc_event (
  id             bigint generated always as identity primary key,
  wallet_address text not null,
  event_type     text not null,   -- nonce_issued | wallet_verified | consent_recorded |
                                   -- verification_started | media_submitted | provider_result |
                                   -- status_changed | erasure_requested | erased
  detail         jsonb,           -- non-PII only: { from, to, providerRef, outcome, reason_code }
  created_at     timestamptz not null default now()
);
create index if not exists kyc_event_addr_idx on kyc_event (wallet_address);
create index if not exists kyc_event_type_idx on kyc_event (event_type);

-- ---------------------------------------------------------------------------
-- Deny-by-default RLS: enable on all, add NO policies. Service-role bypasses
-- RLS; everything legitimate flows through the Node api/ functions.
-- ---------------------------------------------------------------------------
alter table kyc_profile   enable row level security;
alter table kyc_challenge enable row level security;
alter table kyc_consent   enable row level security;
alter table kyc_event     enable row level security;
