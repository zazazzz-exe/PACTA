# PACTA — Product Requirements Document (PRD)

> **Tagline:** PACTA — Trust, written in code.
> **One-liner:** PACTA is a non-custodial escrow protocol on Stellar and Soroban that turns any informal money agreement between two people into a secure, staged, bond-protected on-chain contract.

**Document status:** Build-ready. This PRD is written so it can be handed directly to Claude Code as the source of truth for an end-to-end build (smart contracts + frontend + deploy).

**Naming note:** The product is named **PACTA** everywhere in human-readable copy (headings, prose, taglines, UI). Code identifiers stay on the legacy name for ABI and package compatibility: the contract crate `pacta-escrow`, the struct `PactaEscrow`, the package dir `packages/pacta`, the deploy alias `pacta_escrow`, and the wasm `pacta_escrow.wasm` are unchanged. There is no "Katiwala." If any artifact, comment, or variable says Katiwala, rename it to PACTA (or, for code identifiers, keep the legacy `pacta` form).

---

## 1. Vision & problem

### 1.1 Problem
Every day people hand money to someone they met online for a deal or a deliverable: a freelance project, a service contract, a custom or made-to-order item, a peer-to-peer marketplace purchase, or funds entrusted across borders. These arrangements are informal and run entirely on trust. Money is sent directly via bank transfer, GCash, or crypto with no enforceable agreement, no transparency, and no protection.

When the other party disappears, misuses the funds, or fails to deliver, the person who paid usually loses everything with little recourse. There is no accessible, low-cost tool that gives ordinary people a safe, transparent way to entrust money to someone else online.

Existing solutions fail because trust is platform-owned, not user-owned. On Fiverr or Upwork, your reputation and dispute history belong to the platform; leave and it vanishes. On GCash or bank transfer, there is no protection layer at all. PayPal Buyer Protection is unavailable for most service transactions in the Philippines, and centralized escrow services require custody (trusting yet another party). None of these give the user sovereign, portable, verifiable trust that travels with them.

### 1.2 Solution
PACTA is a non-custodial escrow protocol built on Stellar and powered by Soroban smart contracts. Instead of sending money directly to the other party, the Client locks funds in a programmable escrow agreement that enforces:

- **Staged fund release:** funds are released to the Provider in milestone tranches, not all at once, so exposure is limited and trust is earned progressively.
- **Security bonds:** the Provider posts a refundable bond as skin-in-the-game. If they disappear, the bond compensates the Client.
- **Deadline-protected emergency refunds:** if the Provider fails to deliver within the agreed window, the Client reclaims all unreleased funds plus the Provider's bond.
- **On-chain reputation:** every completed and refunded agreement is recorded per Provider, so Clients can evaluate counterparties from verifiable history.

PACTA does **not** give investment advice, take custody of profits, or guarantee outcomes. It is **trust infrastructure**: it makes private agreements safer, transparent, and enforceable.

### 1.3 Why this design is safe and honest (important for judges)
A naive "lock all the money and trust the other party" escrow is not actually safer: the moment funds reach the Provider, code can't claw them back. PACTA's protection comes from two mechanics that *are* enforceable on-chain:
- **Limiting exposure over time** (staged release), and
- **Collateralizing the released portion** (the bond).

The emergency-refund path returns the unreleased funds **and** seizes the bond, which is the concrete on-chain penalty for a Provider who walks away.

### 1.4 Why wallet-native

PACTA is **wallet-native** by design. The wallet is not merely a login method; it is the entire identity, trust, and authority layer. This is a deliberate architectural choice that shapes every decision in the product:

- **Wallet is login.** Connect and you're in. No accounts, no emails, no passwords, no platform profile to maintain.
- **Wallet is identity.** Your Stellar address IS your profile. KYC verification (§18) binds to the wallet once and never needs re-doing.
- **Wallet is reputation.** On-chain history (completed deals, refunds, volume) is permanently attached to your address. It is portable: any future dApp that reads on-chain data can see a Provider's PACTA track record without asking permission.
- **Wallet is authority.** Only your cryptographic signature can move funds, approve releases, or post bonds. No admin, no intermediary, no platform can override this.
- **No platform lock-in.** Unlike Fiverr/Upwork where your reviews die if you leave, PACTA reputation belongs to the wallet holder forever and travels across any ecosystem that reads the contract.

This positioning means PACTA is not "a platform with crypto payments." It is a **trust protocol that lives in the wallet** — composable, portable, and owned by the user.

---

## 2. Hackathon context

- **Event:** Build on Stellar — APAC track.
- **Primary track:** **Payment & Consumer Applications.** PACTA is a consumer-facing financial-protection app that helps everyday users safely coordinate money for any two-party deal or deliverable.
- **Why it fits the track:** consumer protection for any informal money agreement; financial accessibility (anyone with a Stellar wallet); real-world SEA impact; an easy-to-use financial tool (connect wallet → create agreement → deposit → approve releases → refund).
- **Team:**
  - Zarrah Exekiel Valles
  - Jecyn Vallirie Turbanos
- **Country:** Philippines.

### 2.1 Track statement (for submission)
> PACTA is a Payment & Consumer Application built on Stellar and powered by Soroban that protects everyday users by turning any informal money agreement between two people into a secure, programmable, transparent financial contract.

---

## 3. Users & personas

**Primary users (Clients):**
- People paying or hiring someone online for a deliverable, with limited financial or legal protection.
- First-time buyers of freelance work, services, or made-to-order goods.
- People with limited financial knowledge who currently rely on pure trust.

**Secondary users (Providers):**
- Freelancers, service providers (design, dev, consulting), makers of custom goods, and marketplace sellers.
- They benefit because a posted bond plus a transparent track record lets them **signal credibility** and win clients who would otherwise be too scared to engage.

**Persona A — "Tita Maria" (Client):** OFW in Dubai who is paying someone online for a deliverable (a custom order, or a piece of freelance work). She has been scammed before, so she needs proof she can get her money back if things go wrong.

**Persona B — "Jay" (Provider):** Skilled and honest, but with no formal credentials, so online he is indistinguishable from scammers. He posts a bond and builds an on-chain track record to stand out.

**Wallet-native implications for users:**
- The only prerequisite to use PACTA is a Stellar wallet. No signup, no email, no form to fill. Connect and you're protected.
- Tita Maria doesn't "register" — she connects her wallet and has access to the full protection layer immediately.
- Jay's reputation **travels with his wallet**. If he moves to a different marketplace or app that reads on-chain PACTA data, his track record follows. He is never hostage to one platform.
- Both users own their trust data. Deleting the app, clearing the browser, switching devices — none of this erases their on-chain history. The wallet is the account.

### 3.1 Beachhead segment

PACTA's initial target is specific: **Filipino freelancers, OFWs, and informal online deal-makers** who already use digital wallets (GCash, Maya) for payments but have zero protection when money is entrusted to a stranger.

| Segment | Example use case | Why them |
|---|---|---|
| Filipino freelance clients | Hire a designer on FB Marketplace or Telegram; lock payment in escrow until deliverable is done | ~1.5M Filipino freelancers active online; countless more deal off-platform with no protection |
| OFW → PH service providers | OFW in Dubai pays a contractor in Cavite to build a fence or finish a renovation; staged release per phase | 10M+ OFWs, majority transact informally with providers back home |
| FB Marketplace / Carousell buyers | Custom-made or pre-order items where buyer pays upfront and seller ghosts | Scam reports in PH buy-and-sell FB groups number in thousands weekly |
| Micro-outsourcing (Fiverr gap) | Small deals (₱1,000–₱10,000) too small for Fiverr/Upwork fees but still risky without protection | Unserved by platforms that take 20% — PACTA takes 0% at MVP |

**Why this segment first:**
- Already digital-wallet literate (GCash has 90M+ registered users in PH)
- High scam exposure and real financial pain from trust failure
- Philippines ranks among the highest in SEA for crypto awareness (16%+ adoption)
- The team is Filipino — credibility, context, and community access

**Expansion path:** PH freelance/OFW → broader SEA informal commerce → cross-border P2P → regulated mainnet with fiat on/off-ramp

---

## 4. Core user flows

**Client flow:** Connect wallet → Create agreement (set Provider, funds, bond, milestones, duration) → Deposit funds → Approve milestone releases as trust builds → Either Complete (returns bond to the Provider) or Emergency Refund (reclaim unreleased funds + bond if the deadline passes).

**Provider flow:** Connect wallet → Review agreement → Post security bond → Receive milestone tranches as the Client approves them → Get the bond back on completion.

**Reputation flow:** Anyone can read a Provider's on-chain reputation (completed count, refunded count, total volume) before agreeing to work with them.

---

## 5. Scope

### 5.1 MVP — must work live on testnet (this is the demo)
- Wallet connect (Freighter via Stellar Wallets Kit).
- `create_agreement`, `post_bond`, `deposit_capital`, `release_milestone`, `complete`, `emergency_refund`, `cancel`.
- On-chain reputation read/write.
- Frontend: connect, create agreement, agreement list, agreement detail with all actions, reputation badge.
- Everything runs against a real deployed Soroban contract on Stellar testnet.

### 5.2 Stretch (if time remains)
- Optional settlement on completion (legacy profit-share path via a `settle` call; the `profit_share_bps` field is informational and hidden in the UI).
- Events feed / activity timeline read from contract events.
- Mobile wallet support via WalletConnect (Stellar Wallets Kit handles this).
- Polished multi-agreement dashboard.

### 5.3 Roadmap (slide only — do NOT build for the hackathon)
- Dispute resolution / arbitration path (admin or multi-sig arbiter).
- Weighted reputation scoring algorithm.
- Multi-asset support, fiat on/off-ramp, KYC/identity attestations.
- Mainnet deployment + professional security audit.

> **Scope discipline:** The protection story is fully told by create → bond → deposit → staged release → emergency refund + reputation. Resist adding anything that is not on the demo click-path until that path is solid.

### 5.4 Success metrics

How we know PACTA is working (post-launch, not hackathon):

| Metric | What it measures | Target (first 90 days) |
|---|---|---|
| Agreements created | Adoption / product-market fit | 100+ on testnet; 20+ on mainnet |
| Completion rate | `completed / (completed + refunded)` — healthy ecosystem signal | > 70% |
| Repeat usage | Same wallet creating 2+ agreements | > 30% of active wallets |
| Emergency refund rate | Lower = healthier; measures Provider reliability | < 20% |
| Average time to completion | Efficiency of the milestone flow | Declining over time |
| Provider bond-post rate | Providers willing to put skin in the game | > 80% of agreements reach Active |
| Risk Lens apply rate | Users acting on AI recommendations | > 40% of create flows with lens visible |

These metrics are readable directly from on-chain data (contract state + events), consistent with the wallet-native model: no analytics backend needed.

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

**The escrow has no backend server.** The Soroban contract is the backend for the escrow: it holds the funds and enforces the agreement between the two parties. All escrow state lives on-chain. Reads are free RPC simulations; writes are wallet-signed transactions. (The optional AI Risk Lens in §17 adds one stateless serverless endpoint that only reads public on-chain stats; it is not part of the escrow and never holds funds.) A separate, optional **off-chain KYC identity layer** (Supabase behind `api/kyc-*.ts`) verifies wallet-holder identity and gates the app UI only; it never holds funds, is not part of the escrow, and does not change the contract. See `CLAUDE.md` "Identity / KYC layer" and `supabase/migrations/`.

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

> **Role mapping (product to on-chain):** in the UI the two parties are the **Client** (deposits funds, approves releases) and the **Provider** (posts the bond, delivers). On-chain the Client is stored in the `investor` field and the Provider in the `trader` field. These legacy field and parameter names are kept for ABI compatibility with the already-deployed contract, so all code below keeps `investor`/`trader`. `profit_share_bps` is legacy and informational: it is hidden in the UI and does not affect settlement in the MVP.

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
- **Wallet-native by design (see §1.4):**
  - Wallet is login — connect and you're in
  - Wallet is identity — your address IS your profile
  - Wallet is reputation — on-chain history is your track record, portable to any app
  - Wallet is authority — only your signature moves funds
  - Nothing stored in browser, nothing stored on a server (for escrow)
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
2. **Dashboard** — list of agreements (iterate `get_count()` then `get_agreement(i)` for `i in 1..=count`). Each card: counterparty, funds, bond, status pill, milestone progress bar. Filter by "As client" / "As provider" using the connected address.
3. **Create Agreement** — form: Provider address, funds, bond, milestones, duration. Validation (funds > 0, milestones ≥ 1). Submit → `create_agreement`. (`profit_share_bps` is legacy and hidden from the form; the call passes a default value.)
4. **Agreement Detail** — full terms, status, milestone progress, and the action buttons valid for the connected role/state:
   - Provider + Pending + not bonded → **Post Bond**
   - Client + Pending + not deposited → **Deposit Funds**
   - Client + Active + milestones remaining → **Release Milestone**
   - Client + Active + all milestones released → **Complete**
   - Client + Active + `now ≥ deadline` → **Emergency Refund**
   - Client + Pending → **Cancel**
5. **Reputation badge** — wherever a Provider address appears, show `✓ {completed}  ⚠ {refunded}  Σ {volume}` from `get_reputation`.

### 9.5 State & UX details
- After any write, poll/refetch the affected agreement (RPC may take a few seconds to reflect new state).
- Disable action buttons while a tx is pending; show a spinner + the tx hash on success.
- Surface contract errors by code (map `Error` enum numbers → friendly messages, e.g. `10 → "The agreement deadline hasn't passed yet."`).
- Countdown to `deadline` on Active agreements so the Emergency Refund availability is obvious.

### 9.6 Security UX (wallet-as-login, hardened)

PACTA stays non-custodial: the wallet is the only login. There are **no accounts, no passwords, no backend, and no browser storage of secrets** (a password layer would add an attack surface and false security without protecting funds, which are gated by the wallet signature on-chain). The following additions harden the experience without changing that model or any contract call:

- **Network guard.** On connect, read the wallet's network (best effort). If it is not the Stellar test network, show a persistent warning banner so the user does not sign against the wrong network. If the network cannot be determined, do not block.
- **Confirm before signing.** Every fund-moving action (post bond, deposit, release, complete, emergency refund, cancel) opens a plain-language confirmation dialog stating the amount, the counterparty, and the effect before the wallet signature is requested. Nothing is signed blindly. Copy follows §12/DESIGN voice (sentence case, no jargon, names the effect the user controls).
- **Inactivity auto-lock.** After 15 minutes of no interaction the wallet is disconnected automatically (relevant on shared or mobile devices), with a dismissible notice explaining why. Any interaction resets the timer.
- **Trust cues retained.** Persistent `testnet` badge, contract ID linked to Stellar Expert, and tx hashes linked on success.

These are functional-UX additions; the contract interface in §8.5 and the flows in §9.1–9.4 are unchanged.

### 9.7 Responsive layout (website + mobile)

The app is **mobile-first** (many primary users are on phones) and also a comfortable desktop website. One implementation, fluid across breakpoints:

- **Shell.** Header, content, and footer share a centered container that grows to a wide max width on desktop; screen padding stays comfortable from 360px up.
- **Landing.** Single column on mobile; two-column hero (copy beside the proof panel) on desktop. "How it works" stacks on mobile, three across on wider screens.
- **Dashboard.** Agreement cards are a one-column list on mobile, two columns at the small breakpoint, three at large.
- **Agreement detail.** Single stacked column on mobile (amount, parties, milestones, deadline, actions, proof). On desktop it splits into a main column plus a sticky aside holding the actions and the proof panel.
- **Create / provider profile.** Stay in a comfortably narrow centered column on all sizes (forms and profiles read better narrow).
- **Quality floor (DESIGN §10).** Tap targets stay at least 44px, every interactive element shows a visible focus ring, motion respects `prefers-reduced-motion`, and amounts use tabular mono with thousands separators.

> Visual tokens, components, and exact styling live in **DESIGN.md** (which supersedes §12). This section captures only the behavioral/layout contract.

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

PACTA protects people's money in real agreements, so it must look **trustworthy, precise, and calm**, not like a hype crypto app. Target sensibility: technical credibility meets clean fintech (think mission-control instrument panel rendered as polished SaaS).

- **Palette:** deep near-black/navy base (`#0B0F14`), high-contrast off-white text, a single confident accent (a trust-green or electric-teal) for primary actions and "protected" states; amber for warnings (deadline approaching / refund available); restrained red only for destructive/refund.
- **Type:** a clean grotesque/sans for UI (Inter or similar); a monospace for addresses, amounts, IDs, and status codes — it reads as "verifiable / on-chain."
- **Components:** generous spacing, hairline borders, subtle elevation, status pills, a clear milestone progress bar, and a live deadline countdown. No gradients-for-the-sake-of-it, no clutter.
- **Trust cues everywhere:** show the contract ID (linked to Stellar Expert), tx hashes (linked), and reputation counts prominently. Make "your money is in a contract, here's the proof" the emotional core of the UI.
- **Microcopy:** plain and reassuring. "Your funds are locked in the contract. Release them step by step. Get them back if the deadline passes." No jargon in the primary flow.
- **No em-dashes in UI copy.**

---

## 13. Demo script (the click-path judges will see)

Set up beforehand: two browser profiles (or two wallets in Freighter) — **Client** and **Provider** — both funded on testnet. Use the native XLM SAC as the token. The contract is already deployed; bindings generated; app running.

**Act 1 — The problem (15s, spoken):** "Every day people pay someone online for work or a deliverable with zero protection. When the other party vanishes, the money is gone. PACTA fixes that with code."

**Act 2 — Create (Client):**
1. Connect Client wallet.
2. Create Agreement: Provider = Provider's address, funds = 100 XLM, bond = 20 XLM, **milestones = 4**, **duration = 60 seconds**.
3. Sign. Show the new agreement on the dashboard in `Pending`.

**Act 3 — Fund it (both):**
4. Switch to Provider → **Post Bond** (20 XLM). Sign.
5. Switch to Client → **Deposit Funds** (100 XLM). Sign.
6. Agreement flips to `Active`. Point out: "120 XLM is now held by the contract, not by either person. Here's the contract on Stellar Expert." Show the deadline countdown starting.

**Act 4 — Staged release (Client):**
7. **Release Milestone** once → 25 XLM goes to the Provider. Progress bar 1/4. "The client only exposes a quarter at a time. Trust is earned, not assumed."

**Act 5 — The save (Client):**
8. Wait for the 60-second deadline to elapse (it will during the narration above). The **Emergency Refund** button activates.
9. Click **Emergency Refund**. Sign. The Client receives 75 XLM unreleased funds **plus** the 20 XLM bond = 95 XLM back. Status → `Refunded`.
10. Open the Provider's **reputation**: refunded count is now 1. "The bad actor is recorded forever. The next client will see this."

**Act 6 — The happy ending (optional, fresh agreement):** run a short agreement, release all milestones, **Complete** → bond returns to the Provider, reputation `completed` increments. "When the Provider delivers, they get their bond back and a verifiable track record that wins them future clients."

**Close (10s):** "PACTA: informal trust, made enforceable. Built entirely on Stellar and Soroban. Trust, written in code."

---

## 14. Submission checklist (RiseIn / hackathon form)

- **Project name:** PACTA. Short and easy to pronounce across SEA, professional.
- **Tagline:** PACTA — Trust, written in code. (alt: "Your wallet is your protection." / "The trust layer that lives in your wallet.")
- **Problem statement:** §1.1.
- **Proposed solution:** §1.2 + §8.2 mechanics.
- **Target users:** §3 + §3.1 (beachhead: Filipino freelancers, OFWs, informal online deal-makers).
- **Positioning:** Wallet-native trust protocol — no platform, no lock-in, portable reputation (§1.4).
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

### 15.1 Competitive landscape

| Alternative | Model | PACTA wallet-native advantage |
|---|---|---|
| Direct bank/GCash transfer | Trust-based, zero protection | Wallet-signed escrow with staged release + bond + refund |
| Fiverr / Upwork | Platform-owned reputation, 20% fee, lock-in | 0% fee, reputation lives in the wallet and is portable, no lock-in |
| PayPal Buyer Protection | Platform-controlled disputes, unavailable for PH services | Permissionless, any wallet can use it, no geography restriction |
| Escrow.com | Centralized custodial (trust the company) | Non-custodial, code holds funds, no single point of failure |
| Other crypto escrow | Often custodial or single-release | Staged milestones + security bond + on-chain reputation + AI risk lens |
| "Trust me, bro" | The problem itself | Code-enforced, transparent, verifiable |

**Key differentiator:** PACTA is the only solution where both the protection (escrow) and the trust signal (reputation) are **wallet-native and portable** — owned by the user, not hostage to any platform.

---

## 16. Claude Code execution guide (copy this into CLAUDE.md)

**Goal:** Build PACTA, a Soroban escrow dApp on Stellar testnet, per this PRD. No backend; the contract is the backend. The product name is "PACTA" everywhere in human-readable copy; code identifiers stay on the legacy `pacta` form (crate `pacta-escrow`, struct `PactaEscrow`, package `packages/pacta`, alias `pacta_escrow`, on-chain fields `investor`/`trader`). Never "Katiwala".

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

## 17. AI Risk Lens (add-on feature — implemented)

An add-on that reads a Provider's on-chain track record and gives the Client a plain-language counterparty reputation read plus a defensive milestone suggestion. It changes nothing in the core protocol or flows; it is a read-only interpretation layer on top of the existing contract data and design tokens. The complete spec is in **`FEATURE_RISK_LENS.md`** (authoritative); this section records that the feature exists and how it is wired.

**What it does.** When a Client enters a Provider address (create flow) or views a Provider profile, PACTA computes that Provider's stats from chain data (completed/refunded counts, completion rate, volume, recency, and how the contemplated deal compares to history) and shows: a risk level, the specific signals behind it, and a concrete suggestion for structuring *this* agreement more safely. "Apply suggested protection" sets the milestone count in the create form (more milestones = smaller equal tranches = less first-release exposure).

**Code does the arithmetic; the model only interprets.** All counts are computed deterministically in `frontend/src/lib/riskStats.ts` (`computeTraderStats`). The model never recomputes numbers — it turns correct stats into plain language and a recommendation. This keeps figures un-hallucinated.

**Responsible-AI boundary (non-negotiable, enforced in the system prompt).** The lens assesses behavioral / counterparty trustworthiness from on-chain history only. It never gives investment advice, predicts future performance, or estimates profit. Its only recommendations are within PACTA's own mechanics (milestone count, bond size, duration). Consistent with PACTA's stated position that it does not provide investment advice.

**Architecture.**
- The client app fetches the Provider's agreements (reuses the existing read path), computes `TraderStats`, and POSTs them to a serverless endpoint.
- **Serverless endpoint `/api/risk-lens`** (Vercel Edge, file at repo root `api/risk-lens.ts`) calls the Anthropic API (Claude Haiku) and returns a `RiskRead` JSON. The endpoint is the only place the model is called.
- **The `ANTHROPIC_API_KEY` is server-side only** (host env var; see `.env.example`). It never appears in client code, the repo, or the browser. Only public on-chain stats are sent to the API — nothing the user could not already read on a block explorer.

**Placement.** (1) Create agreement: lens renders above the summary card once a valid Provider address is entered; `onApply` sets the milestone field. (2) Provider profile: lens renders as the counterparty read before reaching out. Both are styled only with DESIGN.md tokens.

**Graceful degradation (required).** If the endpoint is unreachable or the key is unset, the lens shows a neutral "risk read unavailable" note and the raw reputation/history remains visible. The core create / fund / release / refund flow is never blocked by the lens.

**Files.** `frontend/src/lib/riskStats.ts`, `riskTypes.ts`, `agreements.ts`; `frontend/src/hooks/useRiskLens.ts`, `useDebounce.ts`; `frontend/src/components/RiskLens.tsx`; `api/risk-lens.ts`. New frontend dependency: none beyond the existing stack (lucide-react already present).

**Wallet-native composability.** The Risk Lens reads reputation FROM the wallet's on-chain history. This is inherently cross-app: any dApp that uses PACTA's contract can surface the same Provider trust score. The reputation signal is not locked in one UI — it is a public good attached to the wallet address, readable by anyone.

---

## 18. Identity & KYC verification (add-on feature — implemented)

A wallet-linked identity layer. A user verifies their real-world identity **once** — a government ID document check plus a liveness/face match through an external identity provider — and that verified identity is then permanently associated with their wallet. On every later connect the app re-establishes that the wallet is verified and shows an identity badge. Verification gates the money and commitment actions in the app, so both sides of an agreement can trust that the counterparty is a **verified person**, not just an anonymous address. Like the AI Risk Lens (§17), it changes nothing in the core protocol: the frozen escrow contract (§8.5) is untouched. Operator/reference detail lives in **`docs/kyc.md`**; this section records what the feature is and how it is wired.

### 18.1 Why it matters (product + pitch framing)
PACTA already makes the *money* safe (staged release, bonds, refunds). KYC makes the *counterparty* accountable. Anonymous escrow still lets a bad actor spin up a fresh wallet after every scam; binding a wallet to a verified government identity adds real-world consequences and Sybil resistance without sacrificing the non-custodial, wallet-first model. It also puts PACTA on a credible path to regulatory acceptance (a KYC'd P2P financial-protection app is deployable where an anonymous one is not), while keeping funds fully non-custodial and on-chain.

### 18.2 What it does (user flow)
1. **Connect wallet → prove ownership.** On connect, the user signs a one-time server-issued challenge (a message, not a transaction — it moves no funds). This proves they control the wallet before any identity is bound to it.
2. **Verify once.** The user gives consent, then completes a government-ID check and a liveness selfie. On success the wallet's status becomes **verified** and an identity badge appears.
3. **Gated actions.** Verification is required only for **money/commitment actions** — create an agreement, post a bond, deposit capital, release a milestone. Browsing the dashboard, viewing a Provider profile, and the Risk Lens stay open. Fund-**returning** actions (emergency refund, cancel, complete) are deliberately **never** gated, so a user can always reclaim their own funds.
4. **Every login is authoritative.** Re-connecting re-runs the ownership signature and re-reads status, so the badge always reflects the current verification state.

### 18.3 Design principles
- **A deliberate, documented exception to "no backend."** The escrow has no backend; this identity layer is the one sanctioned stateful server component (Supabase behind `api/kyc-*`). It is **off-chain, never holds funds, and is not part of the escrow.** (See CLAUDE.md "Identity / KYC layer.")
- **Minimal PII by construction.** Raw ID images and selfies are **streamed to the verification provider and never stored by PACTA.** We persist only: verification status, a provider reference, document type/country/expiry, keyed HMAC hashes (for dedup / Sybil resistance), a masked display name, a versioned consent record, and a PII-free audit log.
- **Honest scope.** KYC gates the **app UI**, not the on-chain protocol. The frozen contract has no KYC hook, so a determined user could still call the contract directly. This is stated plainly in code, UI, and docs — consistent with PACTA's "safe and honest" positioning (§1.3).

### 18.4 Architecture
- **Server-mediated; the browser holds no database credentials.** All DB access goes through repo-root **`api/kyc-*.ts` Node functions** using the Supabase service-role key. The browser only calls same-origin `/api/*` (the same pattern as the Risk Lens) and holds a short-lived signed session cookie.
- **Wallet-ownership → session.** `POST /api/kyc-request-nonce` issues a single-use, 5-minute, address-bound nonce → the wallet signs it (`signMessage`) → `POST /api/kyc-verify-wallet` verifies the ed25519 signature against the Stellar address, consumes the nonce atomically (replay-proof), and sets an `HttpOnly; Secure; SameSite=Strict` JWT cookie. Money-action gating always re-checks DB status server-side; the cookie never asserts "verified."
- **Endpoints:** `kyc-request-nonce`, `kyc-verify-wallet`, `kyc-status`, `kyc-start-verification`, `kyc-submit-media`, `kyc-webhook`, `kyc-refresh`, `kyc-erase`.
- **Supabase schema (deny-by-default RLS on every table):** `kyc_profile` (status + provider ref + doc metadata + hashes + masked name), `kyc_challenge` (single-use nonces), `kyc_consent` (versioned consent), `kyc_event` (PII-free audit). Migration: `supabase/migrations/0001_kyc_identity.sql`.
- **Pluggable provider interface (`KycProvider`).** Swapping vendors is a one-file add + one env var (`KYC_PROVIDER`); no endpoint, schema, or frontend change. Providers declare `capture`: capture-in-app vs hosted redirect.

### 18.5 Verification providers
- **`mock` (built-in sandbox).** The app captures the document + selfie and streams them to a mock that drains and discards the media, returning a forced outcome (`approve` / `review` / `reject`) — used for local development and demos of all outcome paths.
- **`didit` (Didit — production).** A **hosted** flow: `kyc-start-verification` creates a Didit session (`POST /v3/session/`) and returns a hosted `url`; the app redirects the user to Didit, where the ID + selfie are captured **directly by Didit (never touching our server)**; the result arrives via an HMAC-signed webhook (`kyc-webhook`) and/or a decision fetch (`kyc-refresh` → `GET /v3/session/{id}/decision/`). Didit provides document verification + passive liveness + face match on a free tier.

### 18.6 Security & compliance
- **Wallet control** proven by signed nonce (single-use, expiring, address-bound, replay-proof); ed25519 verified server-side.
- **Data-privacy posture (PH Data Privacy Act 2012 as baseline):** explicit **versioned consent** captured before any media; **data minimization** (no raw media persisted); **right to erasure** (`kyc-erase` nulls PII columns, deletes consent, writes a tombstone); **PII-free logs and audit trail**.
- **Platform hardening:** deny-by-default RLS (a leaked anon key reads nothing); service-role key server-only; per-address rate limits on nonce/verify; webhook HMAC + timestamp replay check; short-lived `HttpOnly`/`Secure`/`SameSite=Strict` session cookie.
- **Verified locally:** unit tests cover ed25519 verification, nonce lifecycle, session/JWT/cookies, the provider mock, and Didit webhook signatures + status mapping (31 passing).

### 18.7 Files & environment
- **Backend:** `api/kyc-*.ts`; `api/_lib/{http,db,session,ratelimit}.ts`; `api/_lib/kyc/{types,mock,didit,index,apply,consent,hash,verifySignature}.ts`.
- **Frontend:** `frontend/src/lib/{kycClient,consent}.ts`; `frontend/src/hooks/useWallet.ts` (adds `kycStatus`); `frontend/src/pages/Verify.tsx`; `frontend/src/components/kyc/{KycGate,IdentityBadge,ConsentStep,DocumentCapture,LivenessCapture}.tsx`; gating wired into `CreateAgreement.tsx` and `AgreementDetail.tsx`.
- **Data/config:** `supabase/migrations/0001_kyc_identity.sql`; env in `.env.example` (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SESSION_JWT_SECRET`, `KYC_HASH_SECRET`, `KYC_PROVIDER`, `KYC_WEBHOOK_SECRET`, `DIDIT_API_KEY`, `DIDIT_WORKFLOW_ID`, `DIDIT_WEBHOOK_SECRET`). Reference: `docs/kyc.md`. New deps: `@supabase/supabase-js`, `@stellar/stellar-sdk`, `jsonwebtoken` (server only).

### 18.8 Pitch talking points
- **"Safe money *and* accountable people."** Escrow protects the funds; KYC binds each wallet to a real, verified identity — Sybil-resistant and consequence-bearing, without custody.
- **"Privacy by construction."** We verify identity but never store ID images or selfies; only a status, hashes, and a masked name — with one-tap erasure.
- **"Non-custodial, still compliant."** Wallet stays the login and funds stay on-chain; the identity layer is off-chain, holds no money, and gates only the app.
- **"Vendor-agnostic."** A clean provider interface (mock today, Didit in production) means the identity provider is a swap, not a rebuild.

---

## 19. Business model

**Hackathon phase:** free, no fees. The protocol takes nothing.

**Production model (post-mainnet):**
- **Protocol fee:** 0.5–1% of capital, taken on-chain at `complete()`. The fee is deducted from the final milestone tranche before transfer to the Provider, so it is transparent, predictable, and wallet-native (no invoicing, no billing system, no payment method).
- **Fee waiver:** first N deals per wallet are free to drive adoption.
- **Zero fee on refunds:** the protocol never profits from failure. Emergency refunds and cancellations are always free.

**Revenue expansion (roadmap):**
- Premium features: priority arbitration, enhanced analytics dashboard, verified Provider badges
- Marketplace integrations: API licensing for platforms that embed PACTA escrow
- Enterprise: white-label escrow for B2B marketplaces in SEA

**Why this model works wallet-native:** the fee is taken programmatically by the contract at settlement. No payment processor, no subscription, no credit card. The wallet is the billing method — consistent with the entire architecture.

---

## 20. Why blockchain (for judges and skeptics)

"Why not just a database with a payment gateway?"

| # | Reason | What it means for users |
|---|---|---|
| 1 | **Non-custodial** | No company holds the funds. No company can run off with them. The code holds the funds. |
| 2 | **Censorship-resistant** | No one can freeze, redirect, or block an escrow. The rules are immutable once deployed. |
| 3 | **Verifiable** | Anyone can audit the contract source, check balances, verify that the rules match what the UI claims. No "trust us." |
| 4 | **Cross-border by default** | No bank routing, no SWIFT fees, no 3-day delays, no geography restriction. A wallet in Dubai and a wallet in Cavite settle in 5 seconds. |
| 5 | **Portable reputation** | On-chain track record follows the wallet, not locked in one platform. Leave PACTA's UI and your reputation still exists for anyone to read. |

**The honest framing:** the payment rails already exist (Stellar is fast, cheap, global). What didn't exist was a **trust layer** on top of those rails. PACTA is that layer.

---

## 21. Go-to-market

### Phase 1 — Community seeding (hackathon → 3 months post)
- Launch in Filipino freelance and buy-sell Facebook groups (500k+ member groups exist for design, dev, services)
- Partner with OFW community organizations (e.g., OFW-focused Telegram and Viber groups)
- Demo at PH crypto meetups and Stellar community events
- Content: "How I stopped getting scammed on FB Marketplace" explainer videos showing the actual flow

### Phase 2 — Wallet integration (3–6 months)
- Partner with Stellar ecosystem wallets (Lobstr, Freighter, xBull) as an embedded protection feature: "Send with PACTA protection" button inside the wallet
- Integrate with Stellar anchors for fiat on/off-ramp (PHP → XLM → escrow → XLM → PHP)
- List on Stellar dApp directories and ecosystem pages

### Phase 3 — Marketplace API (6–12 months)
- Offer a PACTA SDK / API for existing marketplaces to embed escrow into their own flows
- White-label for PH e-commerce platforms that want buyer protection without building it
- Cross-chain bridge exploration (EVM, other L1s) for broader reach

### Long-term vision
PACTA becomes the **trust protocol that wallets integrate natively** — like how wallets integrated token swap, they integrate escrow. Every wallet has a "protected send" option powered by PACTA. The reputation layer becomes infrastructure, not just one app's feature.

---

### Appendix A — Glossary
- **Escrow:** funds held by a neutral party (here, the contract) until conditions are met.
- **Security bond:** refundable collateral posted by the Provider; seized by the Client on emergency refund.
- **Milestone tranche:** one staged portion of the funds (`capital / milestones`) released to the Provider.
- **SAC (Stellar Asset Contract):** the Soroban contract wrapper that lets a classic Stellar asset (XLM, USDC) be used by smart contracts via a standard token interface.
- **Reputation:** on-chain per-Provider tally of completed vs refunded agreements and total volume.
- **KYC (Know Your Customer):** verifying a user's real-world identity (government ID + liveness) and binding it to their wallet; off-chain, gates the app UI only (§18).
- **Liveness check:** a face/selfie check confirming a live person (not a photo) is present, matched against the ID document.
- **Wallet-ownership proof:** signing a one-time server nonce (a message, not a transaction) to prove control of a wallet before identity is bound to it.
- **Identity provider:** the external KYC vendor that performs document + liveness verification (mock for demo, Didit in production); pluggable behind the `KycProvider` interface.

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
