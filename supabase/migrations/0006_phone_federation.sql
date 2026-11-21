-- PACTA pay by phone (docs/pay-by-phone.md, tracker tasks #21 and #42).
--
-- Phone numbers are never stored. phone_hash is HMAC-SHA256 keyed with
-- PHONE_PEPPER, which lives in the server environment, not in the database.
--
-- 1. phone_link: one verified number per wallet and one wallet per number.
--    public_federation is the user's opt-in to the public SEP-2 endpoint
--    (in-app lookups by signed-in users work without it).
--    verified_via 'console' rows (development SMS) never count in production.
-- 2. phone_otp: one-time SMS codes, stored only as keyed hashes, short-lived,
--    with an attempt counter.
-- 3. phone_event: PII-free audit trail that also drives the rate limits
--    (codes sent, failed codes, lookups, misses).
--
-- RLS on with no policies (deny by default); only the service role reads or writes.

create table if not exists phone_link (
  phone_hash         text primary key,
  wallet_address     text not null unique,
  verified_via       text not null check (verified_via in ('sms', 'console')),
  public_federation  boolean not null default false,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create table if not exists phone_otp (
  id              bigint generated always as identity primary key,
  wallet_address  text not null,
  phone_hash      text not null,
  code_hash       text not null,
  sender          text not null,
  attempts        integer not null default 0,
  expires_at      timestamptz not null,
  consumed_at     timestamptz,
  created_at      timestamptz not null default now()
);
create index if not exists phone_otp_wallet_idx on phone_otp (wallet_address, created_at desc);
create index if not exists phone_otp_phone_idx on phone_otp (phone_hash, created_at);

create table if not exists phone_event (
  id              bigint generated always as identity primary key,
  wallet_address  text,                 -- null for public federation lookups
  phone_hash      text,                 -- keyed hash only, for per-number limits
  ip_hash         text,                 -- keyed hash of the client IP
  kind            text not null,        -- otp_sent | otp_failed | linked | unlinked | lookup | lookup_miss | federation | federation_miss
  created_at      timestamptz not null default now()
);
create index if not exists phone_event_wallet_idx on phone_event (wallet_address, kind, created_at);
create index if not exists phone_event_phone_idx on phone_event (phone_hash, kind, created_at);
create index if not exists phone_event_ip_idx on phone_event (ip_hash, kind, created_at);

alter table phone_link  enable row level security;
alter table phone_otp   enable row level security;
alter table phone_event enable row level security;
