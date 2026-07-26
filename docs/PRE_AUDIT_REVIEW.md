# PACTA Escrow — Pre-Audit Internal Review

**Scope:** `contracts/pacta-escrow/src/lib.rs` (the frozen escrow contract, `PRD.md` §8),
reviewed against the mainnet go-live decision. Release profile confirmed:
`overflow-checks = true` (root `Cargo.toml`).

**This is NOT an independent audit.** It is an internal read-through to catch cheap issues
before a paid audit and to inform the mainnet go/no-go. The contract is FROZEN and already
deployed; several findings below are design-level and cannot be fixed without reopening the
freeze (`PRD.md` §8 → rebuild → regenerate bindings → redeploy → re-audit).

Severity: **HIGH** = can cause loss/theft of user funds; **MEDIUM** = fund lock or economic
griefing under plausible conditions; **LOW** = robustness / correctness / operational.

---

## HIGH-1 — A completed job's bond can be seized by the investor via `emergency_refund`

**Where:** `release_milestone` (never sets `Completed`) + `emergency_refund` (lines 245-271).

**What:** Releasing the final milestone does not change status; it stays `Active`. Only
`complete` (investor-auth) returns the bond to the trader. After the deadline, the investor
can call `emergency_refund` on a fully-released agreement: `unreleased = capital - released_amount = 0`,
so `payout = 0 + bond` — the investor pockets the trader's entire bond and the trader takes a
`refunded` reputation hit, despite having performed all the work.

**Why it matters:** A rational malicious investor never calls `complete`; they release every
milestone (accepting the work and paying out the capital), wait for the deadline, then
`emergency_refund` to keep the bond for free. The bond incentive is broken and the trader
loses funds they should have recovered. The trader has no defense: they cannot call `complete`
(investor-auth) and cannot block `emergency_refund`.

**Note:** This is not exercised by any test. Contract is frozen — resolution is an owner
decision: accept the risk, mitigate off-chain (e.g. UX warnings, only surface `complete`),
or reopen the freeze to auto-return the bond on final release.

## MEDIUM-1 — A trader's bond can be locked indefinitely in `Pending`

**Where:** state machine — exits from `Pending` are `maybe_activate` (needs investor to
`deposit_capital`) or `cancel` (investor-auth only). No deadline applies in `Pending`.

**What:** Flow is create → trader `post_bond` → investor `deposit_capital` → active. If the
trader posts the bond but the investor never deposits and never cancels, the trader's bond sits
in the contract with **no unilateral exit for the trader**. There is no timeout in `Pending`.

**Why it matters:** An absent or malicious investor can strand a counterparty's bond forever.

## MEDIUM-2 — Short-duration griefing seizes the bond before work can be done

**Where:** `maybe_activate` sets `deadline = now + duration`; `emergency_refund` gated only by
`deadline`.

**What:** The investor picks `duration`. With a tiny value (e.g. 60s), the deadline arrives
almost immediately after activation, letting the investor `emergency_refund` and seize the bond
(HIGH-1) before the trader can deliver. The trader must inspect the deadline before posting bond;
nothing on-chain protects them.

**Mitigation already applied (frontend):** the 1-minute preset is testnet-only and mainnet
defaults to 1 week. This does not bind direct contract callers.

## MEDIUM-3 — Interaction-before-effects (reentrancy shape)

**Where:** `release_milestone`, `complete`, `emergency_refund`, `cancel` — the outbound
`token::transfer` runs **before** `Self::save`, so a reentrant call would `load` stale
persisted state.

**What:** Violates checks-effects-interactions. A malicious token contract passed at
`create_agreement` could reenter and act on pre-save state (e.g. release again).

**Mitigation:** Standard Stellar Asset Contracts (native XLM, Circle USDC — the only tokens
PACTA offers) do not call back into arbitrary code on transfer, so this is not exploitable with
the intended assets. It becomes exploitable only if an agreement is created against a hostile
token, which the frontend never does but a direct caller could. Worth the auditor confirming.

## LOW-1 — `profit_share_bps` is validated and stored but never used

**Where:** validated at `create_agreement` (line 105), stored, but no payout path reads it.
Milestone releases pay `capital / milestones`; completion returns the bond. No profit split is
ever applied. Set expectations accordingly (or the auditor may flag it as unmet functionality).

## LOW-2 — Instance storage TTL is never extended

**Where:** `Admin` and `Counter` live in instance storage; `extend_ttl` is only ever called on
persistent entries (`save`, `bump_reputation`). Instance TTL is never bumped.

**What:** After prolonged inactivity the instance entry can be archived. Invocation semantics
generally force a restore before use, so this is a liveness/operational concern rather than fund
loss — but it should be confirmed, and periodic activity or an explicit instance bump considered.

## LOW-3 — Thin test coverage for a money contract

**Where:** `contracts/pacta-escrow/src/test.rs` — 3 tests (happy path, partial-release refund,
cancel-while-pending). No coverage of: auth-failure/unauthorized callers, double `post_bond` /
`deposit_capital`, invalid inputs (`capital<=0`, `milestones==0`, `profit_share_bps>10000`),
the HIGH-1 seize-after-full-release scenario, or MEDIUM-1 bond lock. Expand before/with the audit.

## Informational

- **No admin powers.** `admin` is stored ("reserved for future dispute resolution") but has zero
  capabilities — no pause, no dispute resolution, no recovery. If a bug or a stuck state locks
  funds, there is no on-chain rescue path. Significant for a mainnet money contract.
- **Arbitrary token at create.** `create_agreement` accepts any `token` address. The frontend
  constrains this to XLM/USDC SACs, but a direct caller could use a deceptive token. Ties to
  MEDIUM-3.
- **Positive:** `overflow-checks = true` means arithmetic overflow (e.g. `now + duration`)
  panics/reverts rather than wrapping — the "deadline wraps to the past" class of attack does not
  apply. Auth is present on every state-changing entry point. Last-milestone remainder sweep
  avoids stranded dust.

---

## Resolution (2026-07-27)

The owner chose to reopen the contract and fix the findings. Implemented on branch
`escrow-security-hardening` (design: `docs/superpowers/specs/2026-07-27-escrow-security-hardening-design.md`;
plan: `docs/superpowers/plans/2026-07-27-escrow-security-hardening.md`):

- **HIGH-1 — Resolved.** The final `release_milestone` auto-returns the bond and sets `Completed`;
  `emergency_refund` (Active-only) can no longer reach a fully-performed Pact. `complete` is now
  idempotent. Test: `emergency_refund_cannot_seize_bond_after_full_release`.
- **MEDIUM-1 — Resolved.** New `reclaim_bond` lets the recipient exit `Pending` and recover the
  bond. Tests: `trader_reclaims_bond_when_investor_never_funds`, `reclaim_bond_rejected_*`.
- **MEDIUM-2 — Accepted (no code).** No on-chain minimum duration, to preserve the 60s testnet
  demo; mitigated in the frontend (mainnet default 1 week, 1-minute preset testnet-only) and by
  recipient inspection. With HIGH-1 fixed, a completed Pact's bond is safe regardless of duration.
- **MEDIUM-3 — Resolved.** All outbound-transfer functions persist state before transferring
  (checks-effects-interactions).
- **LOW-1 — Accepted (no code).** `profit_share_bps` stays informational/legacy per `PRD.md`.
- **LOW-2 — Resolved.** Instance TTL bumped in the constructor and `create_agreement`.
- **LOW-3 — Resolved.** Added input-validation and double-action guard tests (10 tests total).
- **Informational (no admin powers, arbitrary token at create) — unchanged**, noted for the audit.

Still required before mainnet: an **independent audit of the new WASM**, then the owner-run
mainnet deploy. Do not enable `VITE_MAINNET_PACTS_ENABLED` until both are done.

## Recommendation (original, pre-fix)

The contract is functionally coherent and its arithmetic is safe under the confirmed build
profile. The blocker for mainnet is **HIGH-1** plus the bond-lifecycle economics (MEDIUM-1/2):
the bond, which is the core of the "protection" value proposition, is not reliably returned to a
performing trader and can be stranded or seized. Because the contract is frozen, the owner must
consciously decide before go-live: accept these as known limitations (with off-chain/UX
mitigations and clear user disclosure), or reopen the freeze to fix the bond lifecycle and
re-audit. Do not enable `VITE_MAINNET_PACTS_ENABLED` until that decision is made and the
independent audit is complete.
