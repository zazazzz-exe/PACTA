# Escrow Security Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the HIGH/MEDIUM/LOW findings in `docs/PRE_AUDIT_REVIEW.md` in the escrow contract so a performing trader's bond is always safe, a trader can always exit Pending, and outbound transfers follow checks-effects-interactions.

**Architecture:** All changes are in the single Soroban contract crate `contracts/pacta-escrow` (`src/lib.rs` implementation, `src/test.rs` tests). The ABI stays backward compatible: no changed function signatures, no changed structs/enums; exactly one *additive* method (`reclaim_bond`). Design: `docs/superpowers/specs/2026-07-27-escrow-security-hardening-design.md`.

**Tech Stack:** Rust (no_std), `soroban-sdk` v26, `cargo test` (native test harness via `soroban_sdk::testutils`).

## Global Constraints

- Reopens the previously frozen `PRD.md` §8. The contract is rebuilt and redeployed to **testnet only** in a later step (owner-approved); mainnet stays audit-gated (`docs/MAINNET_RUNBOOK.md`).
- **No UI/frontend edits in this plan.** The only eventual frontend change (updating `CONTRACT_ID` in `frontend/src/lib/config.ts` after redeploy) is handled separately, after owner confirmation. Do not touch `frontend/` here.
- ABI backward compatible: do not change any existing function signature, struct field, or enum. Only `reclaim_bond` is added.
- Release profile already sets `overflow-checks = true` (root `Cargo.toml`) — arithmetic overflow reverts; do not add manual overflow guards.
- Contract error assertion pattern in tests: `assert_eq!(client.try_method(&args), Err(Ok(Error::Variant)));`.
- Amounts are `i128` base units; the contract is token-agnostic.
- Run all contract commands from `contracts/pacta-escrow` unless noted.

---

### Task 1: HIGH-1 — auto-complete on final milestone release; idempotent `complete`

**Files:**
- Modify: `contracts/pacta-escrow/src/lib.rs` (`release_milestone`, `complete`)
- Test: `contracts/pacta-escrow/src/test.rs`

**Interfaces:**
- Consumes: existing `Agreement`, `Status`, `Error`, `Self::load`, `Self::save`, `Self::bump_reputation`.
- Produces: `release_milestone` that, on the final milestone, returns the bond, sets `Status::Completed`, bumps reputation, emits `completed`; `complete` that is a no-op when already `Completed`.

- [ ] **Step 1: Write/replace the failing tests in `contracts/pacta-escrow/src/test.rs`**

Replace the existing `happy_path_completes_and_returns_bond` test with the two tests below (the old assertion `balance(&trader) == capital` after the last release is now wrong — the bond returns automatically):

```rust
#[test]
fn final_release_auto_completes_and_returns_bond() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let investor = Address::generate(&env);
    let trader = Address::generate(&env);

    let (token_addr, token_admin) = setup_token(&env, &admin);
    let token_client = token::Client::new(&env, &token_addr);

    let capital: i128 = 1_000;
    let bond: i128 = 200;
    token_admin.mint(&investor, &capital);
    token_admin.mint(&trader, &bond);

    let pacta = deploy_pacta(&env, &admin);
    let client = PactaEscrowClient::new(&env, &pacta);

    let id = client.create_agreement(
        &investor, &trader, &token_addr, &capital, &bond, &2u32, &1_000u32, &3600u64,
    );
    client.post_bond(&id);
    client.deposit_capital(&id);

    // First release: not final, still Active, no bond yet.
    client.release_milestone(&id);
    let a = client.get_agreement(&id);
    assert_eq!(a.status, Status::Active);
    assert_eq!(token_client.balance(&trader), 500);

    // Final release: remaining capital + bond returned, status Completed.
    client.release_milestone(&id);
    let a = client.get_agreement(&id);
    assert_eq!(a.status, Status::Completed);
    assert_eq!(token_client.balance(&trader), capital + bond);
    assert_eq!(token_client.balance(&pacta), 0);

    let rep = client.get_reputation(&trader);
    assert_eq!(rep.completed, 1);
    assert_eq!(rep.refunded, 0);
    assert_eq!(rep.total_volume, capital);
}

#[test]
fn complete_is_idempotent_after_auto_complete() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let investor = Address::generate(&env);
    let trader = Address::generate(&env);

    let (token_addr, token_admin) = setup_token(&env, &admin);
    let token_client = token::Client::new(&env, &token_addr);

    let capital: i128 = 1_000;
    let bond: i128 = 200;
    token_admin.mint(&investor, &capital);
    token_admin.mint(&trader, &bond);

    let pacta = deploy_pacta(&env, &admin);
    let client = PactaEscrowClient::new(&env, &pacta);

    let id = client.create_agreement(
        &investor, &trader, &token_addr, &capital, &bond, &1u32, &1_000u32, &3600u64,
    );
    client.post_bond(&id);
    client.deposit_capital(&id);
    client.release_milestone(&id); // single milestone -> auto-completes

    // complete() on an already-Completed agreement is a harmless no-op.
    client.complete(&id);
    assert_eq!(token_client.balance(&trader), capital + bond);
    assert_eq!(token_client.balance(&pacta), 0);
    let rep = client.get_reputation(&trader);
    assert_eq!(rep.completed, 1); // not double-counted
}

#[test]
fn emergency_refund_cannot_seize_bond_after_full_release() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let investor = Address::generate(&env);
    let trader = Address::generate(&env);

    let (token_addr, token_admin) = setup_token(&env, &admin);
    let token_client = token::Client::new(&env, &token_addr);

    let capital: i128 = 1_000;
    let bond: i128 = 200;
    token_admin.mint(&investor, &capital);
    token_admin.mint(&trader, &bond);

    let pacta = deploy_pacta(&env, &admin);
    let client = PactaEscrowClient::new(&env, &pacta);

    // duration 0 => deadline reached immediately, but all milestones get released.
    let id = client.create_agreement(
        &investor, &trader, &token_addr, &capital, &bond, &2u32, &1_000u32, &0u64,
    );
    client.post_bond(&id);
    client.deposit_capital(&id);
    client.release_milestone(&id);
    client.release_milestone(&id); // auto-completes

    // The investor tries to seize the bond after the deadline. It must fail.
    assert_eq!(
        client.try_emergency_refund(&id),
        Err(Ok(Error::InvalidState))
    );
    assert_eq!(token_client.balance(&trader), capital + bond); // trader keeps bond
    assert_eq!(token_client.balance(&investor), 0);
}
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cargo test --package pacta-escrow`
Expected: FAIL — `final_release_auto_completes_and_returns_bond` fails (bond not yet returned after last release / status still Active) and `emergency_refund_cannot_seize_bond_after_full_release` fails (refund currently succeeds).

- [ ] **Step 3: Rewrite `release_milestone` in `contracts/pacta-escrow/src/lib.rs`**

Replace the whole `release_milestone` function with:
```rust
    pub fn release_milestone(env: Env, agreement_id: u64) -> Result<i128, Error> {
        let mut a = Self::load(&env, agreement_id)?;
        a.investor.require_auth();
        if a.status != Status::Active {
            return Err(Error::InvalidState);
        }
        if a.released_milestones >= a.milestones {
            return Err(Error::NoMilestonesLeft);
        }

        a.released_milestones += 1;
        // Last milestone sweeps the remainder so rounding never strands dust.
        let tranche = if a.released_milestones == a.milestones {
            a.capital - a.released_amount
        } else {
            a.capital / (a.milestones as i128)
        };
        a.released_amount += tranche;

        // Final milestone == full performance: return the bond and complete in the
        // same call so emergency_refund can never seize a completed job's bond.
        let is_final = a.released_milestones == a.milestones;
        if is_final {
            a.status = Status::Completed;
        }

        // Effects persisted before any token transfer (checks-effects-interactions).
        Self::save(&env, &a);
        if is_final {
            Self::bump_reputation(&env, &a.trader, true, a.capital);
        }

        let client = token::Client::new(&env, &a.token);
        client.transfer(&env.current_contract_address(), &a.trader, &tranche);
        if is_final && a.bond > 0 {
            client.transfer(&env.current_contract_address(), &a.trader, &a.bond);
        }

        env.events().publish(
            (symbol_short!("released"), agreement_id),
            (a.released_milestones, tranche),
        );
        if is_final {
            env.events()
                .publish((symbol_short!("completed"), agreement_id), a.trader.clone());
        }
        Ok(tranche)
    }
```

- [ ] **Step 4: Make `complete` idempotent in `contracts/pacta-escrow/src/lib.rs`**

Replace the whole `complete` function with:
```rust
    pub fn complete(env: Env, agreement_id: u64) -> Result<(), Error> {
        let mut a = Self::load(&env, agreement_id)?;
        a.investor.require_auth();
        // The final milestone release now auto-completes and returns the bond, so a
        // Completed agreement is a no-op here (keeps the existing ABI/UI call safe).
        if a.status == Status::Completed {
            return Ok(());
        }
        if a.status != Status::Active {
            return Err(Error::InvalidState);
        }
        if a.released_milestones < a.milestones {
            return Err(Error::MilestonesIncomplete);
        }
        // Normally unreachable given auto-complete; kept for safety.
        a.status = Status::Completed;
        Self::save(&env, &a);
        Self::bump_reputation(&env, &a.trader, true, a.capital);
        if a.bond > 0 {
            token::Client::new(&env, &a.token).transfer(
                &env.current_contract_address(),
                &a.trader,
                &a.bond,
            );
        }
        env.events()
            .publish((symbol_short!("completed"), agreement_id), a.trader.clone());
        Ok(())
    }
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cargo test --package pacta-escrow`
Expected: PASS — the three Task 1 tests pass; `emergency_refund_returns_unreleased_plus_bond` (partial release) and `cancel_while_pending_refunds_deposits` still pass.

- [ ] **Step 6: Commit**

```bash
git add contracts/pacta-escrow/src/lib.rs contracts/pacta-escrow/src/test.rs
git commit -m "fix(escrow): auto-return bond on final milestone; idempotent complete (HIGH-1)"
```

---

### Task 2: MEDIUM-1 — additive `reclaim_bond` so a trader can exit Pending

**Files:**
- Modify: `contracts/pacta-escrow/src/lib.rs` (add `reclaim_bond`)
- Test: `contracts/pacta-escrow/src/test.rs`

**Interfaces:**
- Consumes: `Agreement`, `Status`, `Error`, `Self::load`, `Self::save`.
- Produces: `pub fn reclaim_bond(env: Env, agreement_id: u64) -> Result<(), Error>` — trader-authorized; requires `Pending` and `bond_posted`; returns bond to trader, any deposited capital to investor; sets `Cancelled`.

- [ ] **Step 1: Write the failing tests in `contracts/pacta-escrow/src/test.rs`**

```rust
#[test]
fn trader_reclaims_bond_when_investor_never_funds() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let investor = Address::generate(&env);
    let trader = Address::generate(&env);

    let (token_addr, token_admin) = setup_token(&env, &admin);
    let token_client = token::Client::new(&env, &token_addr);

    let capital: i128 = 1_000;
    let bond: i128 = 200;
    token_admin.mint(&trader, &bond);

    let pacta = deploy_pacta(&env, &admin);
    let client = PactaEscrowClient::new(&env, &pacta);

    let id = client.create_agreement(
        &investor, &trader, &token_addr, &capital, &bond, &2u32, &0u32, &3600u64,
    );
    client.post_bond(&id); // trader bonds; investor never deposits.
    assert_eq!(client.get_agreement(&id).status, Status::Pending);

    client.reclaim_bond(&id);
    assert_eq!(token_client.balance(&trader), bond); // bond back
    assert_eq!(token_client.balance(&pacta), 0);
    assert_eq!(client.get_agreement(&id).status, Status::Cancelled);
}

#[test]
fn reclaim_bond_also_returns_deposited_capital() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let investor = Address::generate(&env);
    let trader = Address::generate(&env);

    let (token_addr, token_admin) = setup_token(&env, &admin);
    let token_client = token::Client::new(&env, &token_addr);

    let capital: i128 = 1_000;
    let bond: i128 = 200;
    token_admin.mint(&investor, &capital);
    token_admin.mint(&trader, &bond);

    let pacta = deploy_pacta(&env, &admin);
    let client = PactaEscrowClient::new(&env, &pacta);

    let id = client.create_agreement(
        &investor, &trader, &token_addr, &capital, &bond, &2u32, &0u32, &3600u64,
    );
    client.post_bond(&id);
    client.deposit_capital(&id); // still Pending until both true? both true -> Active
    // Both posted -> agreement is Active, so reclaim must be rejected.
    assert_eq!(client.try_reclaim_bond(&id), Err(Ok(Error::InvalidState)));
}

#[test]
fn reclaim_bond_rejected_without_bond() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let investor = Address::generate(&env);
    let trader = Address::generate(&env);

    let (token_addr, _token_admin) = setup_token(&env, &admin);

    let pacta = deploy_pacta(&env, &admin);
    let client = PactaEscrowClient::new(&env, &pacta);

    let id = client.create_agreement(
        &investor, &trader, &token_addr, &1_000i128, &200i128, &2u32, &0u32, &3600u64,
    );
    // No bond posted yet -> nothing to reclaim.
    assert_eq!(client.try_reclaim_bond(&id), Err(Ok(Error::InvalidState)));
}
```

Note: `reclaim_bond_also_returns_deposited_capital` documents that once both bond and capital are in, the agreement is `Active` (via `maybe_activate`), so `reclaim_bond` (Pending-only) is correctly rejected — the capital-return branch in the implementation only applies if capital was deposited while still Pending, which cannot co-occur with a posted bond. The branch is retained as defense in depth.

- [ ] **Step 2: Run tests to verify they fail**

Run: `cargo test --package pacta-escrow`
Expected: FAIL — `reclaim_bond` / `try_reclaim_bond` do not exist (compile error).

- [ ] **Step 3: Add `reclaim_bond` in `contracts/pacta-escrow/src/lib.rs`**

Add this function immediately after `cancel` (before the `// ----------------- views -----------------` section):
```rust
    /// Lets the trader exit a Pending agreement and recover their bond if the
    /// investor never funds it (there is no deadline in Pending, so without this
    /// the bond could be stranded). Returns the bond to the trader and any
    /// already-deposited capital to the investor, then cancels.
    pub fn reclaim_bond(env: Env, agreement_id: u64) -> Result<(), Error> {
        let mut a = Self::load(&env, agreement_id)?;
        a.trader.require_auth();
        if a.status != Status::Pending {
            return Err(Error::InvalidState);
        }
        if !a.bond_posted {
            return Err(Error::InvalidState);
        }
        a.status = Status::Cancelled;
        Self::save(&env, &a);
        let client = token::Client::new(&env, &a.token);
        if a.bond > 0 {
            client.transfer(&env.current_contract_address(), &a.trader, &a.bond);
        }
        if a.capital_deposited {
            client.transfer(&env.current_contract_address(), &a.investor, &a.capital);
        }
        env.events()
            .publish((symbol_short!("cancelled"), agreement_id), a.trader.clone());
        Ok(())
    }
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cargo test --package pacta-escrow`
Expected: PASS — all three Task 2 tests pass; earlier tests still pass.

- [ ] **Step 5: Commit**

```bash
git add contracts/pacta-escrow/src/lib.rs contracts/pacta-escrow/src/test.rs
git commit -m "feat(escrow): add trader reclaim_bond exit from Pending (MEDIUM-1)"
```

---

### Task 3: MEDIUM-3 — checks-effects-interactions for `emergency_refund` and `cancel`

**Files:**
- Modify: `contracts/pacta-escrow/src/lib.rs` (`emergency_refund`, `cancel`)
- Test: `contracts/pacta-escrow/src/test.rs` (regression only — behavior unchanged)

**Interfaces:** none new. Reorders state persistence before outbound transfers. (`release_milestone`, `complete`, `reclaim_bond` were already written CEI-correct in Tasks 1-2.)

- [ ] **Step 1: Confirm the existing regression tests cover these paths**

`emergency_refund_returns_unreleased_plus_bond` and `cancel_while_pending_refunds_deposits` assert final balances and status for both functions. No new test is needed — the reorder must keep them green. (Reentrancy with a hostile token is out of scope: the only tokens offered are standard XLM/USDC SACs, which do not re-enter.)

- [ ] **Step 2: Reorder `emergency_refund` in `contracts/pacta-escrow/src/lib.rs`**

Replace the whole `emergency_refund` function with (save + reputation before the transfer):
```rust
    pub fn emergency_refund(env: Env, agreement_id: u64) -> Result<(), Error> {
        let mut a = Self::load(&env, agreement_id)?;
        a.investor.require_auth();
        if a.status != Status::Active {
            return Err(Error::InvalidState);
        }
        if env.ledger().timestamp() < a.deadline {
            return Err(Error::DeadlineNotReached);
        }
        let unreleased = a.capital - a.released_amount;
        let payout = unreleased + a.bond; // reclaim unreleased capital + seize bond
        a.status = Status::Refunded;
        Self::save(&env, &a);
        Self::bump_reputation(&env, &a.trader, false, a.capital);
        if payout > 0 {
            token::Client::new(&env, &a.token).transfer(
                &env.current_contract_address(),
                &a.investor,
                &payout,
            );
        }
        env.events().publish(
            (symbol_short!("refunded"), agreement_id),
            (a.investor.clone(), payout),
        );
        Ok(())
    }
```

- [ ] **Step 3: Reorder `cancel` in `contracts/pacta-escrow/src/lib.rs`**

Replace the whole `cancel` function with (save before the transfers):
```rust
    pub fn cancel(env: Env, agreement_id: u64) -> Result<(), Error> {
        let mut a = Self::load(&env, agreement_id)?;
        a.investor.require_auth();
        if a.status != Status::Pending {
            return Err(Error::InvalidState);
        }
        a.status = Status::Cancelled;
        Self::save(&env, &a);
        let client = token::Client::new(&env, &a.token);
        if a.capital_deposited {
            client.transfer(&env.current_contract_address(), &a.investor, &a.capital);
        }
        if a.bond_posted && a.bond > 0 {
            client.transfer(&env.current_contract_address(), &a.trader, &a.bond);
        }
        env.events()
            .publish((symbol_short!("cancelled"), agreement_id), a.investor.clone());
        Ok(())
    }
```

- [ ] **Step 4: Run tests to verify they still pass**

Run: `cargo test --package pacta-escrow`
Expected: PASS — all tests green (behavior identical, ordering changed).

- [ ] **Step 5: Commit**

```bash
git add contracts/pacta-escrow/src/lib.rs
git commit -m "refactor(escrow): persist state before outbound transfers (MEDIUM-3)"
```

---

### Task 4: LOW-2 — extend instance storage TTL

**Files:**
- Modify: `contracts/pacta-escrow/src/lib.rs` (`__constructor`, `create_agreement`, add `bump_instance`)

**Interfaces:**
- Produces: `fn bump_instance(env: &Env)` (internal helper).

- [ ] **Step 1: Add the `bump_instance` helper in `contracts/pacta-escrow/src/lib.rs`**

Add next to the other internal helpers (near `save`):
```rust
    fn bump_instance(env: &Env) {
        env.storage()
            .instance()
            .extend_ttl(LIFETIME_THRESHOLD, BUMP_AMOUNT);
    }
```

- [ ] **Step 2: Call it from `__constructor` and `create_agreement`**

In `__constructor`, after the two `set` calls, add:
```rust
        Self::bump_instance(&env);
```
In `create_agreement`, immediately after `env.storage().instance().set(&DataKey::Counter, &counter);`, add:
```rust
        Self::bump_instance(&env);
```

- [ ] **Step 3: Run tests to verify nothing regressed**

Run: `cargo test --package pacta-escrow`
Expected: PASS — all tests green (TTL bump has no effect on test assertions).

- [ ] **Step 4: Commit**

```bash
git add contracts/pacta-escrow/src/lib.rs
git commit -m "fix(escrow): extend instance storage TTL on writes (LOW-2)"
```

---

### Task 5: LOW-3 — guard/regression tests for existing validation

**Files:**
- Test: `contracts/pacta-escrow/src/test.rs`

**Interfaces:** none (tests only; assert existing guards).

- [ ] **Step 1: Add the guard tests in `contracts/pacta-escrow/src/test.rs`**

```rust
#[test]
fn create_agreement_rejects_invalid_inputs() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let investor = Address::generate(&env);
    let trader = Address::generate(&env);
    let (token_addr, _t) = setup_token(&env, &admin);

    let pacta = deploy_pacta(&env, &admin);
    let client = PactaEscrowClient::new(&env, &pacta);

    // capital <= 0
    assert_eq!(
        client.try_create_agreement(&investor, &trader, &token_addr, &0i128, &10i128, &1u32, &0u32, &60u64),
        Err(Ok(Error::InvalidAmount))
    );
    // milestones == 0
    assert_eq!(
        client.try_create_agreement(&investor, &trader, &token_addr, &100i128, &10i128, &0u32, &0u32, &60u64),
        Err(Ok(Error::InvalidMilestones))
    );
    // profit_share_bps > 10_000
    assert_eq!(
        client.try_create_agreement(&investor, &trader, &token_addr, &100i128, &10i128, &1u32, &10_001u32, &60u64),
        Err(Ok(Error::InvalidAmount))
    );
}

#[test]
fn double_post_bond_and_double_deposit_are_rejected() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let investor = Address::generate(&env);
    let trader = Address::generate(&env);
    let (token_addr, token_admin) = setup_token(&env, &admin);

    let capital: i128 = 1_000;
    let bond: i128 = 200;
    token_admin.mint(&investor, &(capital * 2));
    token_admin.mint(&trader, &(bond * 2));

    let pacta = deploy_pacta(&env, &admin);
    let client = PactaEscrowClient::new(&env, &pacta);

    let id = client.create_agreement(
        &investor, &trader, &token_addr, &capital, &bond, &2u32, &0u32, &3600u64,
    );
    client.post_bond(&id);
    // Second bond post is rejected once the agreement is Active or already bonded.
    assert!(client.try_post_bond(&id).is_err());

    client.deposit_capital(&id);
    // Second deposit is rejected (now Active).
    assert!(client.try_deposit_capital(&id).is_err());
}
```

- [ ] **Step 2: Run tests to verify they pass**

Run: `cargo test --package pacta-escrow`
Expected: PASS — the guards already exist, so these are green immediately (regression lock-in).

- [ ] **Step 3: Commit**

```bash
git add contracts/pacta-escrow/src/test.rs
git commit -m "test(escrow): lock in input-validation and double-action guards (LOW-3)"
```

---

### Task 6: Contract build gate + governance docs

**Files:**
- Modify: `PRD.md` (§8 implementation, tests, and interface — add `reclaim_bond`; note the reopen)
- Modify: `CLAUDE.md` (contract "frozen" language; contract id updated later at deploy)
- Modify: `docs/PRE_AUDIT_REVIEW.md` (mark HIGH-1, MEDIUM-1, MEDIUM-3, LOW-2, LOW-3 resolved)

**Interfaces:** none (docs + build verification).

- [ ] **Step 1: Full contract build and test gate**

Run:
```bash
cd contracts/pacta-escrow && cargo test
stellar contract build
```
Expected: tests PASS; `stellar contract build` produces `pacta_escrow.wasm` with no errors.

- [ ] **Step 2: Update `PRD.md` §8**

Replace the §8.6 implementation, §8.7 tests, and §8.5 interface listings with the new source (the updated `lib.rs` and `test.rs`), and add `reclaim_bond(env, agreement_id) -> Result<(), Error>` to the interface. Add a dated note at the top of §8 that the previously frozen contract was reopened on 2026-07-27 to fix the `docs/PRE_AUDIT_REVIEW.md` findings, and that the new WASM must be re-audited before mainnet.

- [ ] **Step 3: Update `CLAUDE.md`**

Change the "contract is already built, deployed, and FROZEN" language to note the 2026-07-27 security reopen: the contract was re-hardened and redeployed to testnet; it is frozen again pending the independent audit before mainnet. Leave the mainnet guardrail intact. (The new testnet contract id is filled in during the deploy step, not here.)

- [ ] **Step 4: Update `docs/PRE_AUDIT_REVIEW.md`**

Under each of HIGH-1, MEDIUM-1, MEDIUM-3, LOW-2, LOW-3, append a short "Resolved 2026-07-27 (see `docs/superpowers/plans/2026-07-27-escrow-security-hardening.md`)" note. Leave MEDIUM-2 and LOW-1 as documented/accepted.

- [ ] **Step 5: Commit**

```bash
git add PRD.md CLAUDE.md docs/PRE_AUDIT_REVIEW.md
git commit -m "docs(escrow): reopen frozen contract for security hardening (2026-07-27)"
```

---

### Post-plan (operational, not part of TDD — performed by Claude after plan completion, with the owner gate noted)

These steps are run after all tasks pass; they are recorded here for completeness.

1. Deploy the rebuilt WASM to **testnet** with a friendbot-funded identity; capture the new contract id and settlement SAC.
2. Regenerate the `pacta` bindings against the new contract; verify the diff is only the additive `reclaim_bond` method.
3. Update `CLAUDE.md` / `PRD.md` with the new testnet contract id.
4. **Owner gate:** present the new testnet contract id and update `frontend/src/lib/config.ts` `CONTRACT_ID` only after the owner confirms (the single frontend edit).
5. Verify end to end on testnet: create -> post_bond -> deposit -> release (final release auto-completes and returns bond) -> confirm `emergency_refund` on a completed Pact is rejected; and a `reclaim_bond` from Pending.

---

## Self-Review

**Spec coverage:** HIGH-1 -> Task 1 (auto-complete + idempotent complete). MEDIUM-1 -> Task 2 (`reclaim_bond`). MEDIUM-2 -> no code (design decision; noted in Global Constraints). MEDIUM-3 -> Task 3 (CEI for emergency_refund/cancel; release_milestone/complete/reclaim_bond written CEI-correct in Tasks 1-2). LOW-1 -> intentionally unchanged (design). LOW-2 -> Task 4 (instance TTL). LOW-3 -> Task 5 (guard tests). ABI/bindings note, deploy cascade, and the single gated frontend edit -> Task 6 + Post-plan.

**Placeholder scan:** No TBD/TODO. Every code step has full function bodies; every test step has complete test code; every command has an expected result. The only deferred values (new testnet contract id) are explicitly deferred to the deploy step and gated on the owner.

**Type consistency:** `reclaim_bond(env: Env, agreement_id: u64) -> Result<(), Error>` defined in Task 2 and referenced by the same name/signature (`client.reclaim_bond` / `client.try_reclaim_bond`) in its tests. `bump_instance(env: &Env)` defined and called in Task 4. Error variants used in tests (`InvalidState`, `InvalidAmount`, `InvalidMilestones`) all exist in the current `Error` enum. `Status::Completed`/`Cancelled`/`Active`/`Pending` all exist. Test helpers `setup_token`, `deploy_pacta`, `PactaEscrowClient` match the existing `test.rs`.
