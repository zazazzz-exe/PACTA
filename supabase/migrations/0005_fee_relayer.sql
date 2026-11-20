-- PACTA fee relayer (docs/fee-relayer.md, tracker task #20).
--
-- relay_tx: one row per transaction the relayer agreed to sponsor. Written as
-- 'pending' with fee_max BEFORE submission and settled afterwards with the fee
-- actually charged, so the per-wallet and daily caps count in-flight spending.
-- It is also the relay log. Holds no PII: wallet addresses and hashes are
-- public chain data, and only a keyed hash of the client IP is stored.
--
-- (0004 is reserved for the paused zk reputation work.)
--
-- Same posture as earlier migrations: RLS on with no policies (deny by
-- default); only the server-side service role reads or writes it.

create table if not exists relay_tx (
  id              bigint generated always as identity primary key,
  wallet_address  text not null,                  -- inner transaction source (or the sponsor, for restores)
  ip_hash         text,                           -- keyed HMAC of the client IP
  kind            text not null check (kind in ('classic', 'soroban', 'activation', 'restore')),
  contract_id     text,
  fn              text,
  ops             jsonb not null default '[]',
  fee_max         bigint not null,                -- most the fee can be (stroops), reserved against the caps
  fee_charged     bigint,                         -- fee actually charged (stroops), once settled
  reserves        bigint not null default 0,      -- XLM the sponsor locked as account / trustline reserves (stroops)
  inner_hash      text not null,
  hash            text,                           -- submitted (fee-bump) transaction hash
  status          text not null check (status in ('pending', 'success', 'failed', 'rejected', 'refused')),
  error           text,
  created_at      timestamptz not null default now(),
  settled_at      timestamptz
);
create index if not exists relay_tx_wallet_idx on relay_tx (wallet_address, created_at);
create index if not exists relay_tx_ip_idx on relay_tx (ip_hash, created_at);
create index if not exists relay_tx_created_idx on relay_tx (created_at);
create index if not exists relay_tx_kind_idx on relay_tx (kind, created_at);

alter table relay_tx enable row level security;
