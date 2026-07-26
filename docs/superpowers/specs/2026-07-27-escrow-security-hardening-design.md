# Escrow Security Hardening — Design

**Date:** 2026-07-27
**Status:** proposed (awaiting approval)
**Supersedes freeze:** reopens `PRD.md` §8 (previously frozen). The contract will be
rebuilt and redeployed to **testnet** (new contract id; the current testnet contract
`CBLSIW2L…` and its agreements/reputation are orphaned). Mainnet deploy remains a
separate, audit-gated owner action — see `docs/MAINNET_RUNBOOK.md`.

## Goal

Close the fund-loss / fund-lock / griefing findings in `docs/PRE_AUDIT_REVIEW.md` so the
escrow contract is worthy of an independent audit and, after it clears, mainnet. The same
compiled WASM serves testnet and mainnet.

## Constraint

**No UI/frontend behavior changes without explicit owner approval.** The design is
engineered so that all fixes are backend-only at the protocol level, with the ABI kept
backward compatible (no changed signatures, no changed structs — only one *additive*
method). Frontend consequences are enumerated in "Frontend impact" and gated on approval.

## Findings and fixes

### HIGH-1 — bond seizure after full performance → auto-complete on final release
`release_milestone`: when the milestone being released is the last one
(`released_milestones == milestones`), the contract additionally, within the same call:
returns the bond to the trader (if `bond > 0`), sets `status = Completed`, bumps the
trader's reputation as completed, and emits the `completed` event. Effect: once the trader
has performed all milestones, the bond is theirs atomically — `emergency_refund` can no
longer reach an all-released agreement (its `status == Active` guard fails).

`complete` is made **idempotent**: if `status == Completed`, it returns `Ok(())` (no-op, no
transfer). Otherwise its existing logic (require Active, require all milestones released,
return bond, set Completed, bump reputation) is unchanged. This keeps the existing ABI
method valid and harmless if the frontend still calls it. Signature unchanged.

### MEDIUM-1 — bond locked in Pending → additive `reclaim_bond` for the trader
New public method `reclaim_bond(env, agreement_id)`:
- `a.trader.require_auth()`
- requires `status == Pending` and `bond_posted == true`
- returns the bond to the trader; if capital was already deposited, returns it to the
  investor; sets `status = Cancelled`; emits `cancelled`.

This gives the trader a unilateral exit from Pending so their bond can never be stranded by
an absent investor. It is purely **additive** to the ABI (existing methods unchanged), so
the current frontend still compiles and behaves identically; the trader can only *use* it
once a UI button is added (a flagged, optional follow-up).

`cancel` (investor-only) is left as-is — no signature change (adding a caller param would
break the ABI). The trader path is the new method instead.

### MEDIUM-2 — short-duration griefing → no on-chain change (per decision)
No minimum duration is enforced on-chain (keeps the 60s testnet demo working). Mitigations
already live in the frontend (mainnet default 1 week; 1-minute preset testnet-only) and via
trader inspection of the deadline before posting bond. With HIGH-1 fixed, a completed job's
bond is safe regardless of duration; the residual risk is only mid-work non-delivery, which
is the legitimate purpose of `emergency_refund`. Documented, not code.

### MEDIUM-3 — reentrancy / CEI ordering → save before transfer
Reorder every function that transfers tokens out so state is persisted **before** the
outbound `token::transfer` (checks-effects-interactions): `release_milestone`, `complete`,
`emergency_refund`, `cancel`, and the new `reclaim_bond`. No behavior change for the honest
XLM/USDC SAC path; removes the reentrancy shape for any non-standard token. Signatures and
return values unchanged.

### LOW-2 — instance TTL never extended → bump on writes
Extend the instance storage TTL (holds `Admin`, `Counter`) using the same
`LIFETIME_THRESHOLD` / `BUMP_AMOUNT` constants, on `create_agreement` (and constructor).
Prevents archival of the counter/admin. Internal only.

### LOW-1 — profit_share_bps unused → intentionally left
`PRD.md` documents it as "informational in MVP / legacy / roadmap." Kept as-is; no change.

### LOW-3 — thin tests → expanded coverage
Add tests (see Testing) covering the new behaviors and the previously untested attack paths.

## ABI / bindings impact

No changed signatures, no changed structs, no changed enums. One **additive** method
(`reclaim_bond`). Regenerated `pacta` bindings therefore differ only by the new method;
every symbol the current frontend imports is unchanged. The frontend keeps compiling and
behaving identically without edits.

## Frontend impact (all gated on owner approval)

**Mandatory for the fixes to take effect in the app:**
1. `frontend/src/lib/config.ts` — `CONTRACT_ID` must point to the new testnet contract id.
   Without this the app keeps using the old (unfixed, orphaned) contract. This is the only
   unavoidable frontend edit. It is a config constant, not UI.

**Optional follow-ups (flagged, NOT done now):**
2. The "Complete and return bond" button (`AgreementDetail.tsx`) becomes vestigial — after
   HIGH-1 the final release auto-completes, so `status == Active && allReleased` is never
   true and the button no longer appears. It does not error (and `complete` is idempotent).
   Could be removed / the release-confirmation copy updated to note the bond returns.
3. A trader-facing "Reclaim bond" button to surface `reclaim_bond` (MEDIUM-1). Without it
   the protocol hole is closed but traders cannot trigger the exit from the UI.

## Testing (Rust, `contracts/pacta-escrow/src/test.rs`)

Keep the 3 existing tests green, add:
- HIGH-1: releasing the final milestone returns the bond and sets Completed; a subsequent
  `emergency_refund` after the deadline fails (`InvalidState`) instead of seizing the bond.
- `complete` idempotency: calling it on a Completed agreement is a no-op `Ok(())`, no double
  bond transfer.
- MEDIUM-1: `reclaim_bond` returns the trader's bond (and any deposited capital to the
  investor) from Pending and sets Cancelled; non-trader auth fails; wrong-state fails.
- MEDIUM-3: ordering does not regress the happy path or refund math (balances asserted).
- Guards: unauthorized callers rejected; double `post_bond`/`deposit_capital` rejected;
  invalid inputs (`capital<=0`, `milestones==0`, `profit_share_bps>10_000`) rejected.

## Deployment / cascade (testnet, by Claude)

1. Update `PRD.md` §8 (impl/tests/interface) to the new source; note the reopen.
2. `stellar contract build` → `cargo test` (gate).
3. Deploy to testnet (friendbot-funded identity), capture the new contract id.
4. Regenerate the `pacta` bindings against the new contract; verify only the additive diff.
5. Update `CLAUDE.md` (contract id + "frozen" language) and `docs/PRE_AUDIT_REVIEW.md`
   (mark findings resolved).
6. Present the new contract id and request approval for the single `config.ts` edit.

## Risks

- Reopening the freeze invalidates the prior audit basis; the new contract needs the
  independent audit before mainnet (unchanged from before, and expected).
- Orphaning the current testnet contract loses existing testnet demo agreements/reputation.
  Acceptable on testnet.
- Auto-complete changes the happy-path UX (no explicit Complete step). Functionally safe;
  UI cleanup is a flagged optional follow-up.
