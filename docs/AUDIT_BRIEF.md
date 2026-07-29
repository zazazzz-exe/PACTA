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
| Testnet contract | `CAY6BQEORTLX5F2PDPQAUTQGJ46JUN3JP7U22Q2U3DLVFNOVNXIDCTBM` |
| Testnet admin / deployer | `GCO474RPUM4AOF5T4JA55YIFJKP5B3743F6AXD5M65WBB4SNLFTL43PS` |

Release profile (root `Cargo.toml`) sets `overflow-checks = true`, `panic = "abort"`,
`lto = true`. Arithmetic overflow therefore traps (reverts) rather than wrapping.

## 3. Build and test reproduction

```bash
# from repo root
rustup target add wasm32v1-none
stellar contract build                      # -> target/wasm32v1-none/release/pacta_escrow.wasm
( cd contracts/pacta-escrow && cargo test ) # 10 tests, must pass
sha256sum target/wasm32v1-none/release/pacta_escrow.wasm   # compare to §2
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
| `create_agreement` | `investor` | — (creates) |
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

## 9. Known and accepted risks (owner-accepted; please still assess)

- **MEDIUM-2 — no minimum duration.** The sender chooses `duration`; a very short value
  shortens the recipient's window before a post-deadline refund. Accepted to preserve a
  60-second testnet demo; mitigated in the frontend (mainnet default 1 week, 1-minute preset
  testnet-only) and by recipient inspection before posting bond. With HIGH-1 fixed, a
  *completed* Pact's bond is safe regardless of duration. **Question: is caveat-emptor
  acceptable here, or do you recommend an on-chain floor?**
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
