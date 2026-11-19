-- PACTA API security hardening (tracker tasks #5 to #9).
--
-- 1. kyc_challenge.ip_hash: keyed HMAC (KYC_HASH_SECRET) of the client IP that
--    requested a nonce, so /api/kyc-request-nonce can also rate-limit per IP.
--    The raw IP is never stored. Null for rows created before this migration.
-- 2. kyc_webhook_seen: one row per processed provider webhook, keyed by a hash
--    of the signed body. A repeat delivery (replay) hits the primary key and is
--    rejected. Holds no PII: only the provider id, a digest, and a timestamp.
-- 3. risk_lens_call: one row per Risk Lens call, used only to rate-limit
--    /api/risk-lens per session wallet and per hashed IP. No request content.
--
-- Same posture as 0001: RLS enabled with no policies (deny by default); only the
-- server-side service role key reads or writes these tables.

alter table kyc_challenge add column if not exists ip_hash text;
create index if not exists kyc_challenge_ip_idx on kyc_challenge (ip_hash, created_at);

create table if not exists kyc_webhook_seen (
  body_hash   text primary key,                    -- sha256 hex of the signed raw body
  provider    text not null,                       -- e.g. 'didit'
  created_at  timestamptz not null default now()
);
create index if not exists kyc_webhook_seen_created_idx on kyc_webhook_seen (created_at);

create table if not exists risk_lens_call (
  id              uuid primary key default gen_random_uuid(),
  wallet_address  text not null,
  ip_hash         text,
  created_at      timestamptz not null default now()
);
create index if not exists risk_lens_call_addr_idx on risk_lens_call (wallet_address, created_at);
create index if not exists risk_lens_call_ip_idx on risk_lens_call (ip_hash, created_at);

alter table kyc_webhook_seen enable row level security;
alter table risk_lens_call   enable row level security;
