# Pacta — Product Requirements Document (PRD)

> **Tagline:** Pacta — Trust, written in code.
> **One-liner:** A decentralized escrow protocol on Stellar/Soroban that turns informal fund-management agreements between investors and independent traders into secure, staged, bond-protected on-chain contracts.

**Document status:** Build-ready. This PRD is written so it can be handed directly to Claude Code as the source of truth for an end-to-end build (smart contracts + frontend + deploy).

**Naming note:** The original concept doc used two names interchangeably ("Pacta" and "Katiwala"). This project is named **Pacta** everywhere. There is no "Katiwala." If any artifact, comment, or variable says Katiwala, rename it to Pacta.

---

## 0. How Claude Code should use this document

Build in this order. Do not skip ahead — each phase unblocks the next.

1. Read **§6 Tech Stack** and **§10 Repo Structure**, then scaffold the repo.
2. Build the contract from **§8** (the full reference implementation is provided — use it).
3. Write and pass the tests in **§8.6** before touching the frontend.
4. Deploy to testnet using the runbook in **§11**, capturing the contract ID.
5. Generate TypeScript bindings (§11 step 7).
6. Build the frontend from **§9** against the deployed contract.
7. Validate the full **§13 Demo Script** click-path on testnet.

A condensed, copy-pasteable task list for Claude Code is in **§16**.

---

## 1. Vision & problem

### 1.1 Problem
Every day thousands of people — especially Overseas Filipino Workers (OFWs), seafarers, first-time investors, and people with modest savings — hand money to independent traders and "fund managers" they meet in Facebook groups, Telegram channels, Discord servers, or through referrals. These arrangements are informal and run entirely on trust. Money is sent directly via bank transfer, GCash, or crypto with no enforceable agreement, no transparency, and no protection.

When a trader disappears, misuses funds, or fails to deliver, the investor usually loses everything with little recourse. There is no accessible, low-cost tool that gives ordinary people a safe, transparent way to entrust money to someone else online.

### 1.2 Solution
Pacta is a non-custodial escrow protocol built on Stellar and powered by Soroban smart contracts. Instead of sending money directly to a trader, the investor locks capital in a programmable escrow agreement that enforces:

- **Staged capital release** — capital is released to the trader in milestone tranches, not all at once, so exposure is limited and earns trust progressively.
- **Security bonds** — the trader posts a refundable bond as skin-in-the-game. If they disappear, the bond compensates the investor.
- **Deadline-protected emergency refunds** — if the trader fails to deliver within the agreed window, the investor reclaims all unreleased capital plus the trader's bond.
- **On-chain reputation** — every completed and refunded agreement is recorded per trader, so investors can evaluate counterparties from verifiable history.

Pacta does **not** give investment advice, take custody of trading profits, or guarantee returns. It is **trust infrastructure**: it makes private agreements safer, transparent, and enforceable.

### 1.3 Why this design is safe and honest (important for judges)
A naive "lock all the money and trust the trader" escrow is not actually safer — the moment capital reaches the trader, code can't claw it back. Pacta's protection comes from two mechanics that *are* enforceable on-chain:
- **Limiting exposure over time** (staged release), and
- **Collateralizing the released portion** (the bond).

The emergency-refund path returns the unreleased capital **and** seizes the bond, which is the concrete on-chain penalty for a trader who walks away.

---

## 2. Hackathon context

- **Event:** Build on Stellar — APAC track.
- **Primary track:** **Payment & Consumer Applications.** Pacta is a consumer-facing financial-protection app that helps everyday users safely coordinate money with independent traders.
- **Why it fits the track:** consumer protection against trading scams; financial accessibility (anyone with a Stellar wallet); real-world SEA impact; an easy-to-use financial tool (connect wallet → create agreement → deposit → approve releases → refund).
- **Team:**
  - Zarrah Exekiel Valles
  - Jecyn Vallirie Turbanos
- **Country:** Philippines.

### 2.1 Track statement (for submission)
> Pacta is a Payment & Consumer Application built on Stellar and powered by Soroban that protects everyday investors by turning informal fund-management agreements into secure, programmable, transparent financial contracts.

---

## 3. Users & personas

**Primary users (investors):**
- OFWs and seafarers with disposable income but limited financial/legal protection.
- First-time investors and employees seeking managed trading services.
- People with limited financial knowledge who currently rely on pure trust.

**Secondary users (traders / fund managers):**
- Independent forex and crypto traders, copy traders, trading mentors offering account management.
- They benefit because a posted bond + transparent track record lets them **signal credibility** and win clients who would otherwise be too scared to engage.

**Persona A — "Tita Maria" (investor):** OFW in Dubai, sends remittances home, wants to grow ₱100k with a trader she met in a Facebook group but has been scammed before. She needs proof she can get her money back if things go wrong.

**Persona B — "Jay" (trader):** Skilled retail trader with no formal credentials. Honest, but indistinguishable from scammers online. He posts a bond and builds an on-chain track record to stand out.

---

## 4. Core user flows

**Investor flow:** Connect wallet → Create agreement (set trader, capital, bond, milestones, duration, profit share) → Deposit capital → Approve milestone releases as trust builds → Either Complete (returns bond to trader) or Emergency Refund (reclaim unreleased capital + bond if deadline passes).

**Trader flow:** Connect wallet → Review agreement → Post security bond → Receive milestone tranches as the investor approves them → Get bond back on completion.

**Reputation flow:** Anyone can read a trader's on-chain reputation (completed count, refunded count, total volume) before agreeing to work with them.

---

## 5. Scope

### 5.1 MVP — must work live on testnet (this is the demo)
- Wallet connect (Freighter via Stellar Wallets Kit).
- `create_agreement`, `post_bond`, `deposit_capital`, `release_milestone`, `complete`, `emergency_refund`, `cancel`.
- On-chain reputation read/write.
- Frontend: connect, create agreement, agreement list, agreement detail with all actions, reputation badge.
- Everything runs against a real deployed Soroban contract on Stellar testnet.

### 5.2 Stretch (if time remains)
- Profit-share settlement on completion (trader returns capital + profit via a `settle` call).
- Events feed / activity timeline read from contract events.
- Mobile wallet support via WalletConnect (Stellar Wallets Kit handles this).
- Polished multi-agreement dashboard.

### 5.3 Roadmap (slide only — do NOT build for the hackathon)
- Dispute resolution / arbitration path (admin or multi-sig arbiter).
- Weighted reputation scoring algorithm.
- Multi-asset support, fiat on/off-ramp, KYC/identity attestations.
- Mainnet deployment + professional security audit.

> **Scope discipline:** The protection story is fully told by create → bond → deposit → staged release → emergency refund + reputation. Resist adding anything that isn't on the demo click-path until that path is solid.

---

## 6. Tech stack (verified current as of June 2026)

### 6.1 Smart contract
| Component | Choice | Notes |
|---|---|---|
| Language | Rust | Only supported Soroban contract language. |
| SDK | `soroban-sdk = "22"` *(see note)* | Latest major is **v26** (needs Rust ≥ 1.91). Pin to the latest you can compile; v26 is current. If toolchain issues arise, the contract code here is compatible with v22+ with trivial adjustments. |
| Rust toolchain | **≥ 1.91.0** | Required by soroban-sdk v26 and the `wasm32v1-none` target. Run `rustup update`. |
| Wasm target | `wasm32v1-none` | New target (replaces `wasm32-unknown-unknown`). `rustup target add wasm32v1-none`. |
| CLI | **Stellar CLI v26.1+** | Installed as `stellar` (formerly `soroban`). |
| Network | Stellar **testnet** | RPC `https://soroban-testnet.stellar.org`, passphrase `Test SDF Network ; September 2015`. |
| Settlement asset | A SAC token (`Address`) | Contract is token-agnostic. **For the demo use the native XLM SAC** (frictionless — Friendbot pre-funds accounts). In production this is USDC's SAC. See §11.5. |

> **SDK version directive for Claude Code:** Initialize with the latest `soroban-sdk` that compiles on the installed toolchain. Prefer v26. The reference implementation in §8 uses only stable APIs (`env.register`, `token::Client`, `require_auth`, persistent storage, events) that are present across v22–v26. If a v26 API differs, adapt minimally and keep behavior identical.

### 6.2 Frontend
| Component | Choice | Notes |
|---|---|---|
| Build tool | **Vite + React + TypeScript** | SPA. Fast, no SSR/HTTPS-on-localhost headaches. |
| Styling | **Tailwind CSS** | See §12 design direction. |
| Wallet | **`@creit.tech/stellar-wallets-kit`** | Multi-wallet (Freighter, xBull, Albedo) + WalletConnect for mobile. Handles signing. |
| Contract calls | **Generated TypeScript bindings** via `stellar contract bindings typescript` | Type-safe; avoids manual XDR/ScVal handling. |
| Stellar SDK | `@stellar/stellar-sdk` (v13+) | Pulled in transitively by the bindings; used directly only if needed. |
| Data fetching | TanStack Query (optional) or plain hooks | Plain `useState`/`useEffect` is fine for MVP. |
| Numbers | `bigint` | `i128`/`u64` contract types map to `bigint` in bindings. Pass `1n`, `BigInt(amount)`, etc. |

---

## 7. System architecture

```
┌──────────────────────────────────────────────────────────────┐
│                         Browser (SPA)                          │
│  React + Vite + Tailwind                                       │
│                                                                │
│  ┌───────────────┐   ┌──────────────────┐   ┌──────────────┐   │
│  │  UI Screens   │──▶│ Generated TS     │──▶│ Stellar      │   │
│  │  (§9.3)       │   │ contract bindings│   │ Wallets Kit  │   │
│  └───────────────┘   └──────────────────┘   └──────┬───────┘   │
│         │                     │                     │ sign      │
└─────────┼─────────────────────┼─────────────────────┼──────────┘
          │ read (simulate)     │ write (signAndSend)  │
          ▼                     ▼                     ▼
   ┌─────────────────────────────────────────┐   ┌─────────────┐
   │     Soroban RPC (testnet)               │   │  Freighter  │
   │  https://soroban-testnet.stellar.org    │   │  / xBull    │
   └────────────────────┬────────────────────┘   └─────────────┘
                        ▼
            ┌───────────────────────────┐
            │  PactaEscrow contract      │
            │  (Soroban, on Stellar)     │
            │  + SAC token (XLM/USDC)    │
            └───────────────────────────┘
```

**There is no backend server.** The Soroban contract is the backend. All state lives on-chain. Reads are free RPC simulations; writes are wallet-signed transactions.

---

## 8. Smart contract specification

Contract crate name: `pacta-escrow`. Contract struct: `PactaEscrow`.

### 8.1 State machine

```
            create_agreement
                  │
                  ▼
            ┌───────────┐   cancel
            │  Pending  │──────────────▶  Cancelled  (refund whatever was posted)
            └───────────┘
              │       │
       post_bond   deposit_capital   (order-independent; both required)
              │       │
              ▼       ▼
        (when bond_posted AND capital_deposited)
                  │
                  ▼
            ┌───────────┐
            │  Active   │
            └───────────┘
              │       │
   release_milestone  │  (repeat until released_milestones == milestones)
              │       │
   ┌──────────┘       └──────────────────────────┐
   │ all milestones released                      │ deadline passed, trader failed
   ▼                                               ▼
complete                                   emergency_refund
   │                                               │
   ▼                                               ▼
┌───────────┐                              ┌───────────┐
│ Completed │  bond → trader               │ Refunded  │  unreleased capital + bond → investor
└───────────┘  reputation.completed++      └───────────┘  reputation.refunded++
```

### 8.2 Money rules (exact semantics)
- On `deposit_capital`: investor transfers `capital` into the contract.
- On `post_bond`: trader transfers `bond` into the contract.
- On `release_milestone`: contract transfers one tranche (`capital / milestones`, last milestone gets the remainder to avoid rounding dust) to the trader. Tracks `released_amount`.
- On `complete`: contract returns `bond` to the trader. (Investor confirms work is done. Profit settlement is roadmap.)
- On `emergency_refund` (only after `deadline`): contract transfers `(capital − released_amount) + bond` to the investor. The trader forfeits the bond.
- On `cancel` (only while `Pending`): refund any posted capital to investor and any posted bond to trader.

All amounts are `i128` in the token's base units. **SAC/USDC use 7 decimals**, so `10_000_000` = 1.0 token.

### 8.3 Data types

```rust
#[contracttype]
#[derive(Clone, Copy, PartialEq, Eq, Debug)]
pub enum Status {
    Pending = 0,
    Active = 1,
    Completed = 2,
    Refunded = 3,
    Cancelled = 4,
}

#[contracttype]
#[derive(Clone)]
pub struct Agreement {
    pub id: u64,
    pub investor: Address,
    pub trader: Address,
    pub token: Address,
    pub capital: i128,             // total capital from investor
    pub bond: i128,                // security bond from trader
    pub milestones: u32,           // total milestone count
    pub released_milestones: u32,  // milestones released so far
    pub released_amount: i128,     // capital released to trader so far
    pub profit_share_bps: u32,     // trader profit share, basis points (informational in MVP)
    pub created_at: u64,           // ledger timestamp at creation
    pub start_time: u64,           // ledger timestamp at activation
    pub deadline: u64,             // start_time + duration (provisional until active)
    pub status: Status,
    pub bond_posted: bool,
    pub capital_deposited: bool,
}

#[contracttype]
#[derive(Clone)]
pub struct Reputation {
    pub completed: u32,
    pub refunded: u32,
    pub total_volume: i128,
}

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    Admin,
    Counter,
    Agreement(u64),
    Reputation(Address),
}
```

### 8.4 Errors

```rust
#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
#[repr(u32)]
pub enum Error {
    AlreadyInitialized = 1,
    NotFound = 2,
    Unauthorized = 3,
    InvalidState = 4,
    InvalidAmount = 5,
    InvalidMilestones = 6,
    BondAlreadyPosted = 7,
    CapitalAlreadyDeposited = 8,
    NoMilestonesLeft = 9,
    DeadlineNotReached = 10,
    MilestonesIncomplete = 11,
}
```

### 8.5 Public interface (function signatures)

```
__constructor(admin: Address)
create_agreement(investor, trader, token, capital: i128, bond: i128,
                 milestones: u32, profit_share_bps: u32, duration: u64) -> u64
post_bond(agreement_id: u64)
deposit_capital(agreement_id: u64)
release_milestone(agreement_id: u64) -> i128   // returns tranche released
complete(agreement_id: u64)
emergency_refund(agreement_id: u64)
cancel(agreement_id: u64)
get_agreement(agreement_id: u64) -> Agreement
get_reputation(trader: Address) -> Reputation
get_count() -> u64
```

Authorization:
- `create_agreement`, `deposit_capital`, `release_milestone`, `complete`, `emergency_refund`, `cancel` → `require_auth(investor)`.
- `post_bond` → `require_auth(trader)`.

### 8.6 Full reference implementation

Create `contracts/pacta-escrow/src/lib.rs`:

```rust
#![no_std]
use soroban_sdk::{
    contract, contracterror, contractimpl, contracttype, symbol_short, token, Address, Env,
};

// ---------- TTL constants (≈ ledger cadence) ----------
const DAY_IN_LEDGERS: u32 = 17_280;
const BUMP_AMOUNT: u32 = 30 * DAY_IN_LEDGERS;
const LIFETIME_THRESHOLD: u32 = BUMP_AMOUNT - DAY_IN_LEDGERS;

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
#[repr(u32)]
pub enum Error {
    AlreadyInitialized = 1,
    NotFound = 2,
    Unauthorized = 3,
    InvalidState = 4,
    InvalidAmount = 5,
    InvalidMilestones = 6,
    BondAlreadyPosted = 7,
    CapitalAlreadyDeposited = 8,
    NoMilestonesLeft = 9,
    DeadlineNotReached = 10,
    MilestonesIncomplete = 11,
}

#[contracttype]
#[derive(Clone, Copy, PartialEq, Eq, Debug)]
pub enum Status {
    Pending = 0,
    Active = 1,
    Completed = 2,
    Refunded = 3,
    Cancelled = 4,
}

#[contracttype]
#[derive(Clone)]
pub struct Agreement {
    pub id: u64,
    pub investor: Address,
    pub trader: Address,
    pub token: Address,
    pub capital: i128,
    pub bond: i128,
    pub milestones: u32,
    pub released_milestones: u32,
    pub released_amount: i128,
    pub profit_share_bps: u32,
    pub created_at: u64,
    pub start_time: u64,
    pub deadline: u64,
    pub status: Status,
    pub bond_posted: bool,
    pub capital_deposited: bool,
}

#[contracttype]
#[derive(Clone)]
pub struct Reputation {
    pub completed: u32,
    pub refunded: u32,
    pub total_volume: i128,
}

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    Admin,
    Counter,
    Agreement(u64),
    Reputation(Address),
}

#[contract]
pub struct PactaEscrow;

#[contractimpl]
impl PactaEscrow {
    /// Runs once at deploy. `admin` is reserved for future dispute resolution.
    pub fn __constructor(env: Env, admin: Address) {
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::Counter, &0u64);
    }

    pub fn create_agreement(
        env: Env,
        investor: Address,
        trader: Address,
        token: Address,
        capital: i128,
        bond: i128,
        milestones: u32,
        profit_share_bps: u32,
        duration: u64,
    ) -> Result<u64, Error> {
        investor.require_auth();
        if capital <= 0 || bond < 0 {
            return Err(Error::InvalidAmount);
        }
        if milestones == 0 {
            return Err(Error::InvalidMilestones);
        }
        if profit_share_bps > 10_000 {
            return Err(Error::InvalidAmount);
        }

        let mut counter: u64 = env.storage().instance().get(&DataKey::Counter).unwrap_or(0);
        counter += 1;

        let now = env.ledger().timestamp();
        let agreement = Agreement {
            id: counter,
            investor: investor.clone(),
            trader: trader.clone(),
            token,
            capital,
            bond,
            milestones,
            released_milestones: 0,
            released_amount: 0,
            profit_share_bps,
            created_at: now,
            start_time: 0,
            deadline: now + duration, // provisional; recomputed at activation
            status: Status::Pending,
            bond_posted: false,
            capital_deposited: false,
        };

        Self::save(&env, &agreement);
        env.storage().instance().set(&DataKey::Counter, &counter);

        env.events().publish(
            (symbol_short!("created"), counter),
            (investor, trader, capital, bond),
        );
        Ok(counter)
    }

    pub fn post_bond(env: Env, agreement_id: u64) -> Result<(), Error> {
        let mut a = Self::load(&env, agreement_id)?;
        a.trader.require_auth();
        if a.status != Status::Pending {
            return Err(Error::InvalidState);
        }
        if a.bond_posted {
            return Err(Error::BondAlreadyPosted);
        }
        if a.bond > 0 {
            token::Client::new(&env, &a.token).transfer(
                &a.trader,
                &env.current_contract_address(),
                &a.bond,
            );
        }
        a.bond_posted = true;
        Self::maybe_activate(&env, &mut a);
        Self::save(&env, &a);
        env.events()
            .publish((symbol_short!("bonded"), agreement_id), a.bond);
        Ok(())
    }

    pub fn deposit_capital(env: Env, agreement_id: u64) -> Result<(), Error> {
        let mut a = Self::load(&env, agreement_id)?;
        a.investor.require_auth();
        if a.status != Status::Pending {
            return Err(Error::InvalidState);
        }
        if a.capital_deposited {
            return Err(Error::CapitalAlreadyDeposited);
        }
        token::Client::new(&env, &a.token).transfer(
            &a.investor,
            &env.current_contract_address(),
            &a.capital,
        );
        a.capital_deposited = true;
        Self::maybe_activate(&env, &mut a);
        Self::save(&env, &a);
        env.events()
            .publish((symbol_short!("deposited"), agreement_id), a.capital);
        Ok(())
    }

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

        token::Client::new(&env, &a.token).transfer(
            &env.current_contract_address(),
            &a.trader,
            &tranche,
        );

        Self::save(&env, &a);
        env.events().publish(
            (symbol_short!("released"), agreement_id),
            (a.released_milestones, tranche),
        );
        Ok(tranche)
    }

    pub fn complete(env: Env, agreement_id: u64) -> Result<(), Error> {
        let mut a = Self::load(&env, agreement_id)?;
        a.investor.require_auth();
        if a.status != Status::Active {
            return Err(Error::InvalidState);
        }
        if a.released_milestones < a.milestones {
            return Err(Error::MilestonesIncomplete);
        }
        if a.bond > 0 {
            token::Client::new(&env, &a.token).transfer(
                &env.current_contract_address(),
                &a.trader,
                &a.bond,
            );
        }
        a.status = Status::Completed;
        Self::save(&env, &a);
        Self::bump_reputation(&env, &a.trader, true, a.capital);
        env.events()
            .publish((symbol_short!("completed"), agreement_id), a.trader.clone());
        Ok(())
    }

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
        if payout > 0 {
            token::Client::new(&env, &a.token).transfer(
                &env.current_contract_address(),
                &a.investor,
                &payout,
            );
        }
        a.status = Status::Refunded;
        Self::save(&env, &a);
        Self::bump_reputation(&env, &a.trader, false, a.capital);
        env.events().publish(
            (symbol_short!("refunded"), agreement_id),
            (a.investor.clone(), payout),
        );
        Ok(())
    }

    pub fn cancel(env: Env, agreement_id: u64) -> Result<(), Error> {
        let mut a = Self::load(&env, agreement_id)?;
        a.investor.require_auth();
        if a.status != Status::Pending {
            return Err(Error::InvalidState);
        }
        let client = token::Client::new(&env, &a.token);
        if a.capital_deposited {
            client.transfer(&env.current_contract_address(), &a.investor, &a.capital);
        }
        if a.bond_posted && a.bond > 0 {
            client.transfer(&env.current_contract_address(), &a.trader, &a.bond);
        }
        a.status = Status::Cancelled;
        Self::save(&env, &a);
        env.events()
            .publish((symbol_short!("cancelled"), agreement_id), a.investor.clone());
        Ok(())
    }

    // ----------------- views -----------------
    pub fn get_agreement(env: Env, agreement_id: u64) -> Result<Agreement, Error> {
        Self::load(&env, agreement_id)
    }

    pub fn get_reputation(env: Env, trader: Address) -> Reputation {
        env.storage()
            .persistent()
            .get(&DataKey::Reputation(trader))
            .unwrap_or(Reputation {
                completed: 0,
                refunded: 0,
                total_volume: 0,
            })
    }

    pub fn get_count(env: Env) -> u64 {
        env.storage().instance().get(&DataKey::Counter).unwrap_or(0)
    }

    // ----------------- internal -----------------
    fn load(env: &Env, id: u64) -> Result<Agreement, Error> {
        env.storage()
            .persistent()
            .get(&DataKey::Agreement(id))
            .ok_or(Error::NotFound)
    }

    fn save(env: &Env, a: &Agreement) {
        let key = DataKey::Agreement(a.id);
        env.storage().persistent().set(&key, a);
        env.storage()
            .persistent()
            .extend_ttl(&key, LIFETIME_THRESHOLD, BUMP_AMOUNT);
    }

    fn maybe_activate(env: &Env, a: &mut Agreement) {
        if a.bond_posted && a.capital_deposited && a.status == Status::Pending {
            let now = env.ledger().timestamp();
            let duration = a.deadline - a.created_at; // recover original duration
            a.start_time = now;
            a.deadline = now + duration;
            a.status = Status::Active;
            env.events().publish((symbol_short!("active"), a.id), now);
        }
    }

    fn bump_reputation(env: &Env, trader: &Address, completed: bool, volume: i128) {
        let key = DataKey::Reputation(trader.clone());
        let mut rep: Reputation =
            env.storage()
                .persistent()
                .get(&key)
                .unwrap_or(Reputation {
                    completed: 0,
                    refunded: 0,
                    total_volume: 0,
                });
        if completed {
            rep.completed += 1;
        } else {
            rep.refunded += 1;
        }
        rep.total_volume += volume;
        env.storage().persistent().set(&key, &rep);
        env.storage()
            .persistent()
            .extend_ttl(&key, LIFETIME_THRESHOLD, BUMP_AMOUNT);
    }
}

mod test;
```

`contracts/pacta-escrow/Cargo.toml`:

```toml
[package]
name = "pacta-escrow"
version = "0.1.0"
edition = "2021"

[lib]
crate-type = ["cdylib"]
doctest = false

[dependencies]
soroban-sdk = "22"

[dev-dependencies]
soroban-sdk = { version = "22", features = ["testutils"] }

[profile.release]
opt-level = "z"
overflow-checks = true
debug = 0
strip = "symbols"
debug-assertions = false
panic = "abort"
codegen-units = 1
lto = true
```

> Bump `soroban-sdk` to `"26"` if the installed Rust toolchain is ≥ 1.91 (recommended). The code above is compatible.

### 8.7 Tests

Create `contracts/pacta-escrow/src/test.rs`. These tests cover the happy path and the refund path and must pass before frontend work.

```rust
#![cfg(test)]
use super::*;
use soroban_sdk::{testutils::Address as _, token, Address, Env};

fn setup_token<'a>(env: &Env, admin: &Address) -> (Address, token::StellarAssetClient<'a>) {
    let sac = env.register_stellar_asset_contract_v2(admin.clone());
    let addr = sac.address();
    let admin_client = token::StellarAssetClient::new(env, &addr);
    (addr, admin_client)
}

fn deploy_pacta(env: &Env, admin: &Address) -> Address {
    env.register(PactaEscrow, (admin.clone(),))
}

#[test]
fn happy_path_completes_and_returns_bond() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let investor = Address::generate(&env);
    let trader = Address::generate(&env);

    let (token_addr, token_admin) = setup_token(&env, &admin);
    let token_client = token::Client::new(&env, &token_addr);

    // 1000 capital, 200 bond, 2 milestones
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

    let a = client.get_agreement(&id);
    assert_eq!(a.status, Status::Active);
    assert_eq!(token_client.balance(&pacta), capital + bond);

    // release both milestones -> trader receives full capital
    client.release_milestone(&id);
    client.release_milestone(&id);
    assert_eq!(token_client.balance(&trader), capital); // 1000 released

    // complete -> bond returned to trader
    client.complete(&id);
    assert_eq!(token_client.balance(&trader), capital + bond);
    assert_eq!(token_client.balance(&pacta), 0);

    let rep = client.get_reputation(&trader);
    assert_eq!(rep.completed, 1);
    assert_eq!(rep.refunded, 0);
    assert_eq!(rep.total_volume, capital);
}

#[test]
fn emergency_refund_returns_unreleased_plus_bond() {
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

    // duration 0 => deadline == activation time => refund allowed immediately
    let id = client.create_agreement(
        &investor, &trader, &token_addr, &capital, &bond, &4u32, &1_000u32, &0u64,
    );
    client.post_bond(&id);
    client.deposit_capital(&id);

    // release 1 of 4 milestones (250), trader has 250
    let tranche = client.release_milestone(&id);
    assert_eq!(tranche, 250);
    assert_eq!(token_client.balance(&trader), 250);

    // trader "disappears" -> investor refunds: unreleased (750) + bond (200) = 950
    client.emergency_refund(&id);
    assert_eq!(token_client.balance(&investor), 950);
    assert_eq!(token_client.balance(&pacta), 0);

    let a = client.get_agreement(&id);
    assert_eq!(a.status, Status::Refunded);

    let rep = client.get_reputation(&trader);
    assert_eq!(rep.refunded, 1);
    assert_eq!(rep.completed, 0);
}

#[test]
fn cancel_while_pending_refunds_deposits() {
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
    client.deposit_capital(&id); // only investor deposits, still Pending
    client.cancel(&id);

    assert_eq!(token_client.balance(&investor), capital);
    let a = client.get_agreement(&id);
    assert_eq!(a.status, Status::Cancelled);
}
```

Run with `stellar contract build` then `cargo test` (or just `cargo test` from the contract dir).

> If `register_stellar_asset_contract_v2` or `register` signatures differ in the installed SDK version, adjust the test helpers only — the contract logic is version-stable.

---

## 9. Frontend specification

### 9.1 Principles
- One screen per action. No multi-step wizards.
- The wallet **is** the login. No accounts, no passwords, no backend.
- Optimistic but honest: show pending state while a tx is in flight; refetch agreement after confirmation.
- Amounts shown to users are human (e.g. `1.50 XLM`); convert to/from base units (×/÷ 10,000,000) at the boundary.

### 9.2 Wallet integration

`src/lib/wallet.ts`:

```ts
import {
  StellarWalletsKit,
  WalletNetwork,
  FREIGHTER_ID,
  FreighterModule,
  xBullModule,
  AlbedoModule,
  ISupportedWallet,
} from '@creit.tech/stellar-wallets-kit';

export const NETWORK_PASSPHRASE = 'Test SDF Network ; September 2015';
export const RPC_URL = 'https://soroban-testnet.stellar.org';

export const kit = new StellarWalletsKit({
  network: WalletNetwork.TESTNET,
  selectedWalletId: FREIGHTER_ID,
  modules: [new FreighterModule(), new xBullModule(), new AlbedoModule()],
});

export async function connectWallet(): Promise<string> {
  return new Promise((resolve, reject) => {
    kit.openModal({
      onWalletSelected: async (option: ISupportedWallet) => {
        try {
          kit.setWallet(option.id);
          const { address } = await kit.getAddress();
          resolve(address);
        } catch (e) {
          reject(e);
        }
      },
    });
  });
}

// Adapter consumed by the generated contract bindings' `signTransaction` option.
export async function signTransaction(
  xdr: string,
  opts?: { networkPassphrase?: string; address?: string },
) {
  const { signedTxXdr, signerAddress } = await kit.signTransaction(xdr, {
    networkPassphrase: opts?.networkPassphrase ?? NETWORK_PASSPHRASE,
    address: opts?.address,
  });
  return { signedTxXdr, signerAddress };
}
```

### 9.3 Contract client

After generating bindings into `packages/pacta` (§11 step 7), wrap them:

`src/lib/contract.ts`:

```ts
// The import path/name is whatever the bindings package.json declares.
// Check packages/pacta/README.md after generation for the exact client API.
import { Client, networks } from 'pacta-escrow-sdk';
import { RPC_URL, signTransaction } from './wallet';

export function getContract(publicKey?: string) {
  return new Client({
    ...networks.testnet,
    rpcUrl: RPC_URL,
    publicKey,
    signTransaction,
  });
}

// Helpers for the 7-decimal token
export const toBaseUnits = (human: number) => BigInt(Math.round(human * 1e7));
export const fromBaseUnits = (base: bigint) => Number(base) / 1e7;
```

Calling pattern (write vs read):

```ts
// WRITE: returns an AssembledTransaction; signAndSend() uses the wallet
const contract = getContract(address);
const tx = await contract.create_agreement({
  investor: address,
  trader: traderAddress,
  token: TOKEN_ADDRESS,           // native XLM SAC for demo (see §11.5)
  capital: toBaseUnits(100),      // 100.0
  bond: toBaseUnits(20),          // 20.0
  milestones: 4,
  profit_share_bps: 2000,         // 20%
  duration: 60n,                  // seconds (use 60 for the live demo)
});
const { result } = await tx.signAndSend();   // result = new agreement id (bigint)

// READ (free simulation): no signing
const { result: agreement } = await contract.get_agreement({ agreement_id: 1n });
const { result: rep } = await contract.get_reputation({ trader: traderAddress });
```

> Note: generated method argument names match the Rust parameter names exactly. `i128`/`u64` are `bigint`; `u32` is `number`; `Address` is a `string`. Confirm exact method/option names in the generated `packages/pacta/README.md`.

### 9.4 Screens
1. **Landing / Connect** — value prop, "Connect Wallet" button, short "how it works" (3 steps). After connect, show truncated address + network badge.
2. **Dashboard** — list of agreements (iterate `get_count()` then `get_agreement(i)` for `i in 1..=count`). Each card: counterparty, capital, bond, status pill, milestone progress bar. Filter by "As investor" / "As trader" using the connected address.
3. **Create Agreement** — form: trader address, capital, bond, milestones, profit share %, duration. Validation (capital > 0, milestones ≥ 1, share ≤ 100%). Submit → `create_agreement`.
4. **Agreement Detail** — full terms, status, milestone progress, and the action buttons valid for the connected role/state:
   - Trader + Pending + not bonded → **Post Bond**
   - Investor + Pending + not deposited → **Deposit Capital**
   - Investor + Active + milestones remaining → **Release Milestone**
   - Investor + Active + all milestones released → **Complete**
   - Investor + Active + `now ≥ deadline` → **Emergency Refund**
   - Investor + Pending → **Cancel**
5. **Reputation badge** — wherever a trader address appears, show `✓ {completed}  ⚠ {refunded}  Σ {volume}` from `get_reputation`.

### 9.5 State & UX details
- After any write, poll/refetch the affected agreement (RPC may take a few seconds to reflect new state).
- Disable action buttons while a tx is pending; show a spinner + the tx hash on success.
- Surface contract errors by code (map `Error` enum numbers → friendly messages, e.g. `10 → "The agreement deadline hasn't passed yet."`).
- Countdown to `deadline` on Active agreements so the Emergency Refund availability is obvious.

---

## 10. Repository structure

```
pacta/
├── README.md
├── CLAUDE.md                       # build notes / context for Claude Code (§16)
├── contracts/
│   └── pacta-escrow/
│       ├── Cargo.toml
│       └── src/
│           ├── lib.rs              # §8.6
│           └── test.rs             # §8.7
├── Cargo.toml                      # workspace
├── packages/
│   └── pacta/                      # generated TS bindings (do not edit by hand)
└── frontend/
    ├── index.html
    ├── package.json
    ├── vite.config.ts
    ├── tailwind.config.js
    ├── postcss.config.js
    ├── tsconfig.json
    └── src/
        ├── main.tsx
        ├── App.tsx
        ├── lib/
        │   ├── wallet.ts           # §9.2
        │   ├── contract.ts         # §9.3
        │   └── format.ts
        ├── hooks/
        │   ├── useWallet.ts
        │   └── useAgreements.ts
        ├── components/
        │   ├── ConnectButton.tsx
        │   ├── AgreementCard.tsx
        │   ├── ReputationBadge.tsx
        │   ├── StatusPill.tsx
        │   └── MilestoneBar.tsx
        └── pages/
            ├── Landing.tsx
            ├── Dashboard.tsx
            ├── CreateAgreement.tsx
            └── AgreementDetail.tsx
```

Workspace `Cargo.toml` (root):

```toml
[workspace]
resolver = "2"
members = ["contracts/*"]

[workspace.metadata]
# stellar contract build will compile members to wasm32v1-none
```

---

## 11. Build & deploy runbook (testnet)

> Prereqs: install Rust (`rustup`), then `rustup update` to ensure ≥ 1.91; install the Stellar CLI (`stellar`); have Node ≥ 18 and npm.

**1. Toolchain + target**
```bash
rustup update
rustup target add wasm32v1-none
stellar --version          # expect 26.x
```

**2. Configure testnet + a funded identity**
```bash
stellar network add testnet \
  --rpc-url https://soroban-testnet.stellar.org \
  --network-passphrase "Test SDF Network ; September 2015"

# Funded by Friendbot automatically:
stellar keys generate --fund deployer --network testnet
stellar keys address deployer
```

**3. Build the contract**
```bash
cd contracts/pacta-escrow
stellar contract build
# wasm at target/wasm32v1-none/release/pacta_escrow.wasm
cargo test                 # all §8.7 tests must pass
```

**4. Upload + deploy (constructor takes admin = deployer's address)**
```bash
ADMIN=$(stellar keys address deployer)

stellar contract deploy \
  --wasm target/wasm32v1-none/release/pacta_escrow.wasm \
  --source-account deployer \
  --network testnet \
  --alias pacta_escrow \
  -- \
  --admin "$ADMIN"
# prints the contract ID (starts with C...). Save it as PACTA_CONTRACT_ID.
```

**5. Pick the settlement token (demo = native XLM SAC)**
```bash
# Native XLM Stellar Asset Contract id (frictionless: Friendbot pre-funds test accounts)
stellar contract id asset --network testnet --asset native
# Save the returned C... as TOKEN_ADDRESS for the frontend.
```
> Production / "USDC" variant (optional): issue a test asset, deploy its SAC with
> `stellar contract asset deploy --source deployer --network testnet --asset USDC:$ADMIN`,
> then `stellar contract invoke --id <USDC_SAC> --source deployer --network testnet -- mint --to <ADDR> --amount <AMT>`.
> The contract is token-agnostic; only the `TOKEN_ADDRESS` you pass changes.

**6. Smoke-test from the CLI (optional but recommended)**
```bash
# create a second funded account to act as the trader
stellar keys generate --fund trader --network testnet
INV=$(stellar keys address deployer)
TRD=$(stellar keys address trader)

stellar contract invoke --id pacta_escrow --source-account deployer --network testnet -- \
  create_agreement --investor "$INV" --trader "$TRD" --token "$TOKEN_ADDRESS" \
  --capital 1000000000 --bond 200000000 --milestones 4 --profit_share_bps 2000 --duration 60
# -> 1
stellar contract invoke --id pacta_escrow --source-account trader  --network testnet -- post_bond --agreement_id 1
stellar contract invoke --id pacta_escrow --source-account deployer --network testnet -- deposit_capital --agreement_id 1
stellar contract invoke --id pacta_escrow --source-account deployer --network testnet -- get_agreement --agreement_id 1
```

**7. Generate TypeScript bindings**
```bash
cd ../..   # repo root
stellar contract bindings typescript \
  --network testnet \
  --contract-id pacta_escrow \
  --output-dir packages/pacta
# creates an npm package with a typed Client. Read packages/pacta/README.md.
```

**8. Frontend**
```bash
cd frontend
npm install
npm install @creit.tech/stellar-wallets-kit @stellar/stellar-sdk
npm install ../packages/pacta        # or wire via workspace / relative import
# put PACTA_CONTRACT_ID + TOKEN_ADDRESS into a config (src/lib/config.ts or .env)
npm run dev
```
> If Freighter refuses to connect on `http://localhost`, enable HTTPS dev:
> `npm i -D @vitejs/plugin-basic-ssl` and add it to `vite.config.ts`.

**Testnet hygiene:** testnet contracts can be archived after inactivity; if calls start failing, redeploy and regenerate bindings. Keep the deploy + bindings commands in a `scripts/deploy.sh` so it's one command to refresh.

---

## 12. Design direction

Pacta protects people's savings — it must look **trustworthy, precise, and calm**, not like a hype crypto app. Target sensibility: technical credibility meets clean fintech (think mission-control instrument panel rendered as polished SaaS).

- **Palette:** deep near-black/navy base (`#0B0F14`), high-contrast off-white text, a single confident accent (a trust-green or electric-teal) for primary actions and "protected" states; amber for warnings (deadline approaching / refund available); restrained red only for destructive/refund.
- **Type:** a clean grotesque/sans for UI (Inter or similar); a monospace for addresses, amounts, IDs, and status codes — it reads as "verifiable / on-chain."
- **Components:** generous spacing, hairline borders, subtle elevation, status pills, a clear milestone progress bar, and a live deadline countdown. No gradients-for-the-sake-of-it, no clutter.
- **Trust cues everywhere:** show the contract ID (linked to Stellar Expert), tx hashes (linked), and reputation counts prominently. Make "your money is in a contract, here's the proof" the emotional core of the UI.
- **Microcopy:** plain, reassuring, OFW-friendly. "Your capital is locked in the contract. Release it step by step. Get it back if the deadline passes." No jargon in the primary flow.
- **No em-dashes in UI copy.**

---

## 13. Demo script (the click-path judges will see)

Set up beforehand: two browser profiles (or two wallets in Freighter) — **Investor** and **Trader** — both funded on testnet. Use the native XLM SAC as the token. The contract is already deployed; bindings generated; app running.

**Act 1 — The problem (15s, spoken):** "Every day OFWs hand savings to traders they met online with zero protection. When the trader vanishes, the money is gone. Pacta fixes that with code."

**Act 2 — Create (Investor):**
1. Connect Investor wallet.
2. Create Agreement: trader = Trader's address, capital = 100 XLM, bond = 20 XLM, **milestones = 4**, profit share = 20%, **duration = 60 seconds**.
3. Sign. Show the new agreement on the dashboard in `Pending`.

**Act 3 — Fund it (both):**
4. Switch to Trader → **Post Bond** (20 XLM). Sign.
5. Switch to Investor → **Deposit Capital** (100 XLM). Sign.
6. Agreement flips to `Active`. Point out: "120 XLM is now held by the contract, not by either person. Here's the contract on Stellar Expert." Show the deadline countdown starting.

**Act 4 — Staged release (Investor):**
7. **Release Milestone** once → 25 XLM goes to the Trader. Progress bar 1/4. "The investor only exposes a quarter at a time. Trust is earned, not assumed."

**Act 5 — The save (Investor):**
8. Wait for the 60-second deadline to elapse (it will during the narration above). The **Emergency Refund** button activates.
9. Click **Emergency Refund**. Sign. The Investor receives 75 XLM unreleased capital **plus** the 20 XLM bond = 95 XLM back. Status → `Refunded`.
10. Open the Trader's **reputation**: refunded count is now 1. "The bad actor is recorded forever. The next investor will see this."

**Act 6 — The happy ending (optional, fresh agreement):** run a short agreement, release all milestones, **Complete** → bond returns to the trader, reputation `completed` increments. "When the trader delivers, they get their bond back and a verifiable track record that wins them future clients."

**Close (10s):** "Pacta: informal trust, made enforceable. Built entirely on Stellar and Soroban. Trust, written in code."

---

## 14. Submission checklist (RiseIn / hackathon form)

- **Project name:** Pacta (Latin *pactum*, "agreement"). 5 letters, easy to pronounce across SEA, professional.
- **Tagline:** Pacta — Trust, written in code. (alt: "Agreements you can trust.")
- **Problem statement:** §1.1.
- **Proposed solution:** §1.2 + §8.2 mechanics.
- **Target users:** §3.
- **Team:** Zarrah Exekiel Valles; Jecyn Vallirie Turbanos.
- **Country:** Philippines.
- **Stellar integration:** Soroban smart contract (escrow, bonds, staged release, refunds, reputation) deployed on testnet; Stellar Asset Contract token settlement (XLM SAC for demo, USDC SAC in production); Freighter / Stellar Wallets Kit for non-custodial signing; on-chain transparency for every create/bond/deposit/release/refund event.
- **Deliverables to attach:** deployed contract ID + Stellar Expert link, GitHub repo, demo video walking the §13 script, this PRD/architecture doc, screenshots.

---

## 15. Risks & mitigations

| Risk | Mitigation |
|---|---|
| SDK/CLI version drift breaks build | Code uses version-stable APIs; pin `soroban-sdk` to the latest that compiles; keep `scripts/deploy.sh`. |
| Testnet contract archived mid-event | One-command redeploy + bindings regen; deploy fresh the morning of judging. |
| Freighter won't connect on localhost | Enable HTTPS dev (`@vitejs/plugin-basic-ssl`). |
| Live demo timing for refund | `duration = 60s`; deadline elapses naturally during narration. |
| Rounding dust in milestone math | Last milestone sweeps the remainder (implemented). |
| Judges question "is escrow really safer?" | Lead with the honest framing in §1.3: protection = staged exposure + bond collateral + recorded reputation, all enforceable on-chain. |
| Scope creep | §5.3 items are slide-only. Freeze the contract interface (§8.5) before parallelizing. |

---

## 16. Claude Code execution guide (copy this into CLAUDE.md)

**Goal:** Build Pacta — a Soroban escrow dApp on Stellar testnet — per this PRD. No backend; the contract is the backend. Naming is "Pacta" everywhere (never "Katiwala").

**Ordered tasks:**
1. Scaffold the repo per §10 (workspace `Cargo.toml`, `contracts/pacta-escrow`, `frontend` Vite+React+TS+Tailwind).
2. Write `contracts/pacta-escrow/src/lib.rs` exactly as §8.6 and `Cargo.toml` as in §8.6. Use the latest `soroban-sdk` that compiles (prefer v26; ensure Rust ≥ 1.91).
3. Write `src/test.rs` per §8.7. Run `stellar contract build` then `cargo test`. **Do not proceed until all tests pass.**
4. Follow §11 steps 1–4 to deploy to testnet; capture the contract ID.
5. §11 step 5: get the native XLM SAC address (token).
6. §11 step 7: generate TS bindings into `packages/pacta`; read its README for the exact client API.
7. Build the frontend per §9 (wallet.ts, contract.ts, the four pages, components). Wire the deployed contract ID + token address via `src/lib/config.ts`.
8. Apply the §12 design direction with Tailwind.
9. Manually validate the entire §13 demo click-path on testnet.
10. Write `README.md` (setup, deploy, run) and `scripts/deploy.sh` (one-command redeploy + bindings regen).

**Guardrails:**
- Map contract `Error` codes (§8.4) to friendly UI messages.
- Convert human amounts to/from base units (×/÷ 1e7) at the UI boundary; pass `bigint` for `i128`/`u64`.
- After every write, refetch the affected agreement before updating UI.
- Keep the interface in §8.5 frozen; if you must change it, update this PRD first.

---

### Appendix A — Glossary
- **Escrow:** funds held by a neutral party (here, the contract) until conditions are met.
- **Security bond:** refundable collateral posted by the trader; seized by the investor on emergency refund.
- **Milestone tranche:** one staged portion of capital (`capital / milestones`) released to the trader.
- **SAC (Stellar Asset Contract):** the Soroban contract wrapper that lets a classic Stellar asset (XLM, USDC) be used by smart contracts via a standard token interface.
- **Reputation:** on-chain per-trader tally of completed vs refunded agreements and total volume.

### Appendix B — Network constants
- RPC: `https://soroban-testnet.stellar.org`
- Passphrase: `Test SDF Network ; September 2015`
- Friendbot: funds testnet accounts automatically via `stellar keys generate --fund`.
- Explorer: Stellar Expert (testnet) — link the contract ID and tx hashes in the UI.

### Appendix C — References (verify against latest before/at build time)
- Soroban smart contracts overview & getting started — developers.stellar.org/docs/build/smart-contracts
- Stellar CLI manual & deploy-to-testnet guides — developers.stellar.org/docs/tools/cli
- soroban-sdk crate docs — docs.rs/soroban-sdk
- Stellar Asset Contract deploy — developers.stellar.org/docs/tools/cli/cookbook/deploy-stellar-asset-contract
- Stellar Wallets Kit — `@creit.tech/stellar-wallets-kit`
- Freighter developer docs — github.com/stellar/freighter-developer-docs
- TypeScript bindings (`stellar contract bindings typescript`) — Stellar dapp frontend guides
