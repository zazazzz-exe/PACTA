# Phase 4b — Linked identity across wallets (multi-wallet KYC) design spec

**Date:** 2026-07-18
**Status:** Design approved by user; implementing. Canonical product doc: `docs/kyc.md` (roadmap section) + `PRD.md` §5.3a.

## Problem / goal
Today one verified identity is bound to exactly one wallet (`kyc_profile.wallet_address` is the PK, and a UNIQUE index on `gov_id_hash` deliberately blocks a person from verifying a second wallet — "sybil resistance"). Users want the opposite in a controlled way: **verify once, then link additional wallets so any of them counts as the same verified identity**, without redoing KYC, and manageable/unlinkable from Profile.

## Decisions locked during brainstorming
1. **Linking trigger:** deliberate **"Link a wallet"** action in Profile. While verified on wallet A, the user connects/selects wallet B, signs one ownership nonce with B, and B becomes verified. No re-KYC.
2. **Security:** linking requires **two proofs** — an already-verified authenticated session (A's cookie) AND a fresh ownership signature from B. A stranger's wallet can never inherit someone's KYC.
3. **Unlink/manage:** Profile lists linked wallets; a linked wallet can be removed. Removing the wallet that holds the verification (or your only wallet) erases the identity's verified data and requires explicit confirmation, so you never strand a verified identity.
4. **One identity per government ID preserved** (anti-sybil stays at the ID level): the existing `gov_id_hash` UNIQUE index is untouched because linking never writes a new `gov_id_hash`.
5. **Erasure is identity-wide:** erasing wipes the verified data so every linked wallet loses verified together.
6. **Contract untouched;** still off-chain, no funds, gates only the app UI.

## Architecture (the "grouping" model)
Add a nullable-free `identity_id uuid` column to `kyc_profile` (default `gen_random_uuid()` so every existing/first-contact wallet starts as its own singleton identity). Wallets sharing an `identity_id` are one identity. **Verified state stays physically on the verifier's `kyc_profile` row** — it is not duplicated. A wallet's effective status is resolved across its group: verified if any group member is verified.

This leaves the verification write path (`apply.ts`, `kyc-start-verification`, `kyc-submit-media`, `kyc-webhook`, `kyc-refresh`) **unchanged** — they keep writing to the acting wallet's row. Only status *resolution*, erase, and two new link/unlink endpoints are affected.

### Schema (`supabase/migrations/0002_linked_identity.sql`)
- `alter table kyc_profile add column identity_id uuid not null default gen_random_uuid();`
- `create index kyc_profile_identity_idx on kyc_profile (identity_id);`
- No change to the `gov_id_hash` unique index (linking writes no new hash). Existing rows each get a distinct `identity_id` from the default (each is its own identity — correct).

### Shared helper (`api/_lib/kyc/identity.ts`)
- `identityIdOf(supa, wallet): Promise<string | null>` — the wallet's `identity_id` (null if no row).
- `resolveGroupStatus(supa, wallet): Promise<{ kycStatus, maskedName, docType, docCountry, docExpiry, updatedAt }>` — look up the wallet's group; if any member is `verified`, return that member's verified fields; else return the wallet's own row (or `unverified` default). This is the single source of truth for "is this wallet verified".
- `linkedWallets(supa, wallet): Promise<{ address, isVerifier, isCurrent }[]>` — every wallet in the group, marking which holds the verification and which is the passed-in one.

### Endpoints
- **`kyc-status`** (changed): resolve via `resolveGroupStatus(session)` instead of a direct row read. Add `linkedWallets` to the response (so Profile can render them without a second call).
- **`kyc-verify-wallet`** (changed): the `kycStatus` it returns on connect uses `resolveGroupStatus(address)`, so a linked wallet shows verified immediately on connect.
- **`kyc-link-wallet`** (new, POST, session-authed as A):
  - Require `resolveGroupStatus(A).kycStatus === 'verified'` (else 403 `not_verified`).
  - Body `{ address: B, nonce, signedMessage }`; validate B, reject B === A.
  - Rate-limit, atomic single-use nonce consume for B, verify B's signature (identical mechanics to `kyc-verify-wallet`).
  - Upsert B's `kyc_profile` row if absent (ignoreDuplicates).
  - Guard: if B is already verified in a *different* group → 409 `already_verified_elsewhere` (no silent merge). If B is already in A's group → idempotent success.
  - `update kyc_profile set identity_id = <A.identity_id> where wallet_address = B`.
  - Log `wallet_linked` events (for A and B). Return `{ linked: true, wallets: linkedWallets(A) }`.
- **`kyc-unlink-wallet`** (new, POST, session-authed):
  - Body `{ address: target }`. Resolve session's group; target must be in it (else 400 `not_in_identity`).
  - If target is a **non-verifier** member: detach it (`identity_id = gen_random_uuid()`), it reverts to its own unverified identity. Return updated `wallets`.
  - If target **is the verifier** (its own `status = verified`) or the group has only one wallet: this erases the identity's verified data (all members lose verified) and requires `confirm === true` (else 400 `confirm_required`); reuse the erase columns-nulling on the verifier row. Return `{ erased: true }`.
- **`kyc-erase`** (adjusted): unchanged in spirit but documented as identity-wide — it nulls the verifier row's PII; because status is group-resolved, every linked wallet immediately reads unverified.

### Session
No change: the JWT stays `{ sub: <single wallet> }`. Only one wallet is "connected" at a time; the acting identity is derived from that wallet's group at read time. Linking authenticates via the connected wallet's cookie and proves the *other* wallet by signature — the session is never swapped mid-link.

### Frontend
- `frontend/src/lib/kycClient.ts`:
  - Extend `KycStatusRead` (or a new `LinkedWallet` type + `linkedWallets` field on the status response).
  - `linkWallet(): Promise<...>` — read the currently-active wallet address B from the kit (`getWalletAddress`), request a nonce for B, `signMessage` (kit signs with the active account), POST `kyc-link-wallet`. A's session cookie authenticates the identity.
  - `unlinkWallet(address, confirm?): Promise<...>` — POST `kyc-unlink-wallet`.
- `frontend/src/pages/Profile.tsx`: a **Linked wallets** card (only shown when verified) listing the group's wallets (short/masked, "this device"/verifier markers), a **Link a wallet** button that guides the user ("switch your wallet extension to the account you want to link, then continue") and calls `linkWallet()`, and a remove control per wallet with the erase-confirmation on the verifier/last wallet. Refresh the list + `refreshKyc()` after link/unlink.

## Security properties (invariants)
- A wallet joins an identity only with proof of control of itself (signature) AND authorization from an already-verified session. No unilateral inheritance.
- One identity per government ID preserved (unique `gov_id_hash` untouched).
- Linking requires no re-verification; erase is identity-wide.
- Session carries no status; gating always re-reads the DB via `resolveGroupStatus`.
- Contract frozen; off-chain; no funds.

## Known limitation (documented, acceptable for this cycle)
Verified state lives on the original verifier's row. You cannot move the verification onto a different linked wallet, so if the verifier wallet is lost you erase and re-verify on another wallet. A future "promote another wallet to verifier" or full identity-table refactor can remove this. Also: money-action gating and reputation remain per on-chain wallet address (linking identities does not merge on-chain reputation, which is by design — reputation is per Stellar account).

## Testing / verification note
The KYC backend is DB-heavy and there is no test database in CI, so these endpoints are verified by TypeScript typecheck, the existing Vitest suite (signature/session/hash/rls unit + integration tests must still pass), code review, and a **manual Supabase apply + click-through** by the user (documented at hand-off). Pure/near-pure additions (e.g. `resolveGroupStatus` shape, any helper with branch logic) get unit tests where a Supabase mock is practical, following the existing `session.test.ts`/`hash.test.ts` patterns.

## House rules
Product "PACTA"; protected payment "Pact"; roles sender/recipient; no em-dashes in UI copy; minimal PII; Risk Lens is Gemini. Contract frozen.
