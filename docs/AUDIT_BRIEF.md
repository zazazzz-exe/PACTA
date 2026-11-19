# PACTA Escrow — Security Audit Brief

Prepared for an independent security review of the `pacta-escrow` Soroban smart contract
ahead of a Stellar **mainnet** deployment. This document orients the auditor: what the
contract is, what must hold, what changed and why, what we already accept, and where we
want the sharpest scrutiny.

---

## 1. Scope

**In scope (the only thing that custodies funds):**
- `contracts/pacta-escrow/src/lib.rs` — the contract implementation.
- `contracts/pacta-escrow/src/test.rs` — the contract test suite.
- The compiled `pacta_escrow.wasm` and its on-chain behavior.

**Explicitly out of scope (no custody; separate trust stories):**
- The frontend (`frontend/`) — presentation only; takes no custody. It calls the contract
  through generated bindings (`packages/pacta`).
- The AI Risk Lens (`api/risk-lens.ts`) — stateless advisory text; never moves funds.
- The KYC layer (`api/kyc-*.ts`, Supabase) — off-chain, gates only the app UI, holds no
  funds, and the contract has no KYC hook.
- Wallet key management — non-custodial; users sign with their own wallets.

## 2. Artifact identity

| Item | Value |
|------|-------|
| Repo commit | `c077ba0870cda61c6954d58226e0b13687b02a1a` |
| Crate | `pacta-escrow` v0.1.0, edition 2021 |
| SDK | `soroban-sdk = "26"` |
| Toolchain | `rustc 1.95.0`, `cargo 1.95.0`, `stellar` CLI `26.0.0`, target `wasm32v1-none` |
| WASM sha256 | `acd75d10567e7e4fcb3ed58b603d976c772a058b1ab1422ad142ac2b3c0696e4` |
| WASM size | 14,639 bytes |
| Testnet contract | `CAY6BQEORTLX5F2PDPQAUTQGJ46JUN3JP7U22Q2U3DLVFNOVNXIDCTBM` (superseded 2026-11-19 by the reopened build below) |
| Testnet admin / deployer | `GCO474RPUM4AOF5T4JA55YIFJKP5B3743F6AXD5M65WBB4SNLFTL43PS` |

> **2026-11-19 reopen (min duration + same party), not yet audited.** The table above
> describes the previously reviewed build. The reopened source (branch `escrow-min-duration`)
> builds two artifacts that differ only in `MIN_DURATION`:
>
> | Build | Command | MIN_DURATION | WASM sha256 | Size |
> |---|---|---|---|---|
> | **Mainnet (default, the one to audit)** | `stellar contract build` | 86,400 s | `c88a21535350bb0fb9542d4fe7dbb21d65053214eb6ac3e146049f82332e66a7` | 14,748 bytes |
> | Testnet only | `stellar contract build --features testnet` | 60 s | `3c24a3763bc454581ff1c422b9ec7e981e05b1c5e685f2177cdf960d55ff105e` | 14,746 bytes |
>
> **Deployed to testnet 2026-11-19** from commit `44469df` (testnet-feature build; on-chain
> wasm sha256 verified equal to the testnet row): contract `CDES4GTFPX3QLQYGNK3MEE2HKXSNS23KR5UDDURSBE4TJKAZYJP4BPI5`,
> admin / deployer unchanged. Smoke tests on-chain: `duration = 30` → `Error(Contract, #12)`;
> `investor == trader` → `Error(Contract, #13)`; a valid 60 s Pact → id 1. Hashes were produced with the toolchain in this table;
> re-verify after any toolchain change. **Only the default build may ever go to mainnet.**

Release profile (root `Cargo.toml`) sets `overflow-checks = true`, `panic = "abort"`,
`lto = true`. Arithmetic overflow therefore traps (reverts) rather than wrapping.

## 3. Build and test reproduction

```bash
# from repo root
rustup target add wasm32v1-none
stellar contract build                      # mainnet/default build -> target/wasm32v1-none/release/pacta_escrow.wasm
sha256sum target/wasm32v1-none/release/pacta_escrow.wasm   # compare to §2
( cd contracts/pacta-escrow && cargo test && cargo test --features testnet ) # 13 tests each, must pass
# Testnet-only artifact (60 s MIN_DURATION), never for mainnet:
stellar contract build --features testnet
```

The full, canonical contract source is also mirrored in `PRD.md` §8.6/§8.7; the crate is
authoritative if they ever differ.

## 4. System overview

PACTA is a non-custodial wallet app. One feature, a **Pact**, is a protected payment that
routes through this escrow. Product roles map to on-chain fields (legacy names kept for ABI
compatibility, do not read anything into them):

- **Sender** (a.k.a. Client) = on-chain field `investor`. Pays the capital.
- **Recipient** (a.k.a. Provider) = on-chain field `trader`. Does the work; posts a security
  **bond**.

The contract escrows capital and bond, releases capital to the recipient milestone by
milestone as the sender approves, returns the bond on full performance, and gives the sender
a deadline-gated refund if the recipient fails.

`admin` is stored at construction but currently has **no powers** (see §9, accepted risk).

## 5. State machine

```
create_agreement ─▶ Pending ──(cancel | reclaim_bond)──▶ Cancelled   (funds returned)
                       │
        post_bond + deposit_capital  (either order; both required)
                       │
                       ▼
                     Active
                   │        │
   release_milestone×N      emergency_refund (only after deadline)
   (final release           │
    auto-returns bond,       ▼
    sets Completed)      Refunded  (unreleased capital + bond → sender)
       │
       ▼
   Completed  (all capital released to recipient; bond returned to recipient)
```

- `complete` is retained as an **idempotent** no-op on an already-`Completed` Pact (final
  `release_milestone` performs the completion). It still works from `Active` + all-released as
  a defensive path.

## 6. Authorization matrix

| Function | Auth required | State precondition |
|----------|---------------|--------------------|
| `create_agreement` | `investor` | — (creates); `investor != trader`, `duration >= MIN_DURATION` |
| `post_bond` | `trader` | Pending, not yet bonded |
| `deposit_capital` | `investor` | Pending, not yet deposited |
| `release_milestone` | `investor` | Active, milestones remain |
| `complete` | `investor` | Active + all released (no-op if Completed) |
| `emergency_refund` | `investor` | Active, `now >= deadline` |
| `cancel` | `investor` | Pending |
| `reclaim_bond` | `trader` | Pending + bond posted |
| `get_*` views | none | — |

## 7. Money invariants the auditor should try to break

1. **Conservation.** For a single Pact and token, funds out never exceed funds in
   (capital + bond). No path pays the same bond or tranche twice.
2. **Bond safety on performance.** Once all milestones are released, the bond belongs to the
   recipient and cannot be taken by the sender (this was HIGH-1; see §8).
3. **Bond liveness.** A posted bond is always recoverable: returned on completion, seized by
   the sender only via a post-deadline refund of an *unfinished* Pact, or returned to the
   recipient via `cancel`/`reclaim_bond` while Pending.
4. **Tranche sum.** Sum of released tranches equals `capital` exactly (final milestone sweeps
   the remainder; no dust stranded, no over-release).
5. **State monotonicity.** `released_milestones` and `released_amount` only increase, never
   exceed `milestones` / `capital`; terminal states (Completed/Refunded/Cancelled) are final.
6. **Reputation integrity.** Exactly one reputation update per terminal transition (completed
   once, refunded once); no double counting across the auto-complete + idempotent-complete
   paths.

## 8. Change history — findings fixed since the prior freeze (2026-07-27)

Full internal review: `docs/PRE_AUDIT_REVIEW.md`. Design/plan:
`docs/superpowers/specs/2026-07-27-escrow-security-hardening-design.md`,
`docs/superpowers/plans/2026-07-27-escrow-security-hardening.md`. Changes are ABI backward
compatible: no changed signatures/structs; one additive method (`reclaim_bond`).

- **HIGH-1 (fixed) — bond seizure after full performance.** Previously the final release left
  the Pact `Active`, so the sender could `emergency_refund` after the deadline and take the
  recipient's bond despite full delivery. Now the final `release_milestone` returns the bond,
  sets `Completed`, and bumps reputation atomically; `emergency_refund` (Active-only) can no
  longer reach it. *On-chain proof (testnet): after final release, contract balance = 0 and
  `emergency_refund` returns `Error(Contract, #4)` InvalidState.*
- **MEDIUM-1 (fixed) — bond stranded in Pending.** Added `reclaim_bond` so the recipient can
  exit a Pending Pact the sender never funds. *On-chain proof: post_bond then reclaim_bond ⇒
  status Cancelled, contract balance = 0.*
- **MEDIUM-3 (fixed) — interaction before effects.** All outbound-transfer functions now
  persist state before transferring (checks-effects-interactions).
- **LOW-2 (fixed) — instance TTL.** Instance storage (Admin, Counter) TTL is bumped in the
  constructor and `create_agreement`.
- **LOW-3 (fixed) — test coverage.** Added tests for auto-complete, idempotent complete,
  post-completion refund rejection, `reclaim_bond` paths, input validation, and double-action
  guards (10 tests total).

## 8a. Change history — 2026-11-19 reopen (tracker tasks #2, #3)

ABI backward compatible: no changed signatures, structs, storage keys, or constructor; two
additive error codes. `PRD.md` §8 updated first.

- **MEDIUM-2 (fixed) — no minimum duration.** `create_agreement` now rejects
  `duration < MIN_DURATION` with `DurationTooShort = 12`. `MIN_DURATION` is a compiled
  constant: 86,400 s (1 day) in the default build, 60 s only with the `testnet` cargo feature
  so demo Pacts still reach Emergency Refund. The deadline is still recomputed at activation,
  so the floor applies from activation.
- **New — self-Pacts blocked.** `create_agreement` rejects `investor == trader` with
  `SameParty = 13`, so one address cannot farm its own reputation. (Two addresses controlled by
  one person are not detectable on-chain; that is an app-level / KYC concern.)
- **Tests:** 3 new tests (min-duration bounds, floor holds from activation, same-party
  rejection); existing tests use `MIN_DURATION` and advance the ledger clock instead of
  `duration = 0`, with unchanged assertions. 13 tests pass under both builds.
- **Auditor focus:** confirm the feature flag cannot leak into the default build, that the
  mainnet artifact hash in §2 is the one reviewed, and that error precedence in
  `create_agreement` is unchanged for codes 5 and 6.

## 9. Known and accepted risks (owner-accepted; please still assess)

- **Build variants (new).** The testnet and mainnet WASM differ by one compiled constant. The
  audited artifact is the default build; `scripts/deploy-mainnet.sh` builds without features
  and can pin `EXPECTED_WASM_SHA256`. Please confirm this is sufficient.
- **No dispute path.** Once Active, every outcome is in the sender's hands; a sender can still
  refund after the deadline even if the recipient delivered. Options are compared in
  `docs/DISPUTES.md`; none is implemented yet.
- **LOW-1 — `profit_share_bps` unused.** Validated (`<= 10_000`) and stored but never applied
  to any payout; documented as informational/roadmap in `PRD.md`.
- **No admin powers / no recovery.** `admin` has no pause, upgrade, or dispute-resolution
  capability. A stuck state or bug has no on-chain rescue. Deliberately trust-minimized;
  **we want your view on whether a pause/upgrade path is warranted for mainnet.**
- **Arbitrary token at `create_agreement`.** Any token address is accepted. The frontend
  constrains this to the native XLM SAC and Circle USDC SAC, but a direct caller could pass a
  hostile token (relevant to reentrancy — see §10).
- **Possibly-unused error variants.** `AlreadyInitialized` and `Unauthorized` are defined but
  auth is enforced by `require_auth` (host-level trap), and the constructor runs once by the
  platform. Please confirm no path should return these instead of trapping.

## 10. Threat model and focus areas

- **Assets at risk:** escrowed capital and bond per Pact; recipient reputation.
- **Actors:** sender and recipient (each may be adversarial toward the other); an arbitrary
  external caller (the contract is permissionless); a hostile token contract if one is ever
  supplied at create.
- **Trust assumptions:** the settlement token is a well-behaved SAC (native XLM / Circle
  USDC) that does not re-enter on `transfer`. The frontend enforces this, but the contract
  does not.

Please concentrate on:
1. **Reentrancy** via a hostile token at `create_agreement`, despite the CEI reordering —
   confirm no cross-function reentrancy (e.g. token callback into `release_milestone` /
   `reclaim_bond` / `cancel`) can double-spend.
2. **The auto-complete path** in `release_milestone` — two outbound transfers (final tranche
   + bond) and a reputation write in one call; verify atomicity and invariant preservation.
3. **State-machine completeness** — any (state, function, caller) combination that lets funds
   leave incorrectly, or a Pact reach a stuck non-terminal state.
4. **Arithmetic** — even with `overflow-checks = true`, confirm no logic error in
   `capital / milestones`, remainder sweep, or `deadline = now + duration`.
5. **`reclaim_bond` interplay with `maybe_activate`** — confirm a bond can never be both
   reclaimed and committed to an Active Pact.

## 11. References

- Contract: `contracts/pacta-escrow/src/{lib,test}.rs` (mirrored in `PRD.md` §8)
- Internal pre-audit review: `docs/PRE_AUDIT_REVIEW.md`
- Fix design & plan: `docs/superpowers/specs|plans/2026-07-27-escrow-security-hardening*`
- Mainnet deploy runbook (post-audit): `docs/MAINNET_RUNBOOK.md`
- Error codes and money semantics: `PRD.md` §8.2–§8.4
