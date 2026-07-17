# PACTA

> **Trust, written in code.**

<p align="center">
  <img alt="PACTA app" src="assets/pacta.png" width="200"/>
</p>

PACTA is a **wallet-native money app** on **Stellar** and **Soroban**. You connect a wallet you already own, hold a multi-asset portfolio, and **send**, **receive**, and **convert** your money like any wallet. The difference: when a payment needs protection, you send it as a **Pact**, a staged, bond-protected on-chain escrow that releases in milestones, refunds if the recipient fails to deliver, and is provable on-chain. An AI Risk Lens reads the recipient's on-chain history and tells a first-time user, in plain language, how trustworthy they look, and a wallet-linked identity layer (KYC) binds each Pact to a verified person.

PACTA is **non-custodial**: it never holds your keys or your funds. Balances are read from your own wallet, and every move is signed by you.

<p>
  <a href="https://github.com/zazazzz-exe/PACTA/actions/workflows/ci.yml"><img alt="CI" src="https://github.com/zazazzz-exe/PACTA/actions/workflows/ci.yml/badge.svg" /></a>
  <img alt="Network" src="https://img.shields.io/badge/network-Stellar%20testnet-0B7A63" />
  <img alt="Contracts" src="https://img.shields.io/badge/contracts-Soroban-0B7A63" />
  <img alt="License" src="https://img.shields.io/badge/license-MIT-555" />
</p>

<p align="center">
  <img alt="PACTA app" src="assets/dashboard.png" width="900" />
</p>

---

## 🔗 Links

| | |
|---|---|
| **Live app** | [PACTA](https://pacta-zarrah.vercel.app) |
| **Demo video** | [Google Drive](https://drive.google.com/drive/folders/1BQ8HlM4eimoUGTmbB2HzL5LoTOqFO4pD?usp=sharing )|
| **Smart contract (testnet)** | [View on Stellar Expert](https://stellar.expert/explorer/testnet/contract/CBLSIW2L5BV2KOM73EGXPZBO7DCVVW5TF2ROMYJZSZUTMSMGIFFEL3HL) |
| **GitHub** | [Repository](https://github.com/zazazzz-exe/PACTA.git) |

---

## Table of contents

- [What PACTA is](#what-pacta-is)
- [The problem](#the-problem)
- [The solution](#the-solution)
- [Contract Addresses and Transactions](#Contract-addresses-and-transactions)
- [How PACTA works](#how-pacta-works)
- [Features](#features)
- [The AI Risk Lens](#the-ai-risk-lens)
- [Identity and KYC](#identity-and-kyc)
- [Screenshots](#screenshots)
- [Architecture](#architecture)
- [Tech stack](#tech-stack)
- [Smart contract reference](#smart-contract-reference)
- [Getting started](#getting-started)
- [Project structure](#project-structure)
- [Testing](#testing)
- [CI/CD](#cicd)
- [Monitoring and analytics](#monitoring-and-analytics)
- [Production deployment](#production-deployment)
- [Roadmap](#roadmap)
- [License](#license)
- [Submission checklist](#submission-checklist)
- [Developer](#Developer)

---

## What PACTA is

PACTA has two layers, and it helps to keep them straight:

- **The wallet layer (the app you open).** A non-custodial money hub. It connects existing wallets (Freighter, xBull, Albedo, Lobstr, WalletConnect), shows your multi-asset portfolio, and lets you **Send**, **Receive**, and **Convert**. This is the front door.
- **The protection layer (a feature inside Send).** When a payment needs protecting, you choose **Send protected** instead of **Send now**. That creates a **Pact**: the original PACTA escrow, with staged release, a security bond, deadline-gated refunds, on-chain reputation, the Risk Lens, and the KYC gate.

The on-chain escrow contract is unchanged. Everything in the wallet layer is client-side plumbing on top of wallets you already control, with no new custody.

---

## The problem

People in SEA already move money digitally every day, but the tools split into two camps and neither is enough on its own. **Wallets move money but offer zero protection**: the moment you pay a stranger for a deliverable (a freelance project, a service contract, a custom or made-to-order item, a peer-to-peer marketplace purchase, or funds entrusted across borders), you are back to pure trust, and if they disappear you usually lose everything. **Platforms offer protection but own your trust**: Fiverr and Upwork keep your reputation and take ~20%, PayPal Buyer Protection is unavailable for most PH service deals, and centralized escrow requires custody. There is no single place to **hold and move your money freely** and **protect a payment when it matters**, with a trust record you actually own.

## The solution

PACTA unifies both camps into one non-custodial app. It fixes the trust gap not by asking people to trust harder, but by making trust enforceable. You hold and move your assets like any wallet, and when it counts you send **protected**: instead of paying a recipient directly, the funds go into a Soroban escrow that

- **releases in milestone tranches** so only a portion is ever exposed at a time,
- **requires a security bond** the recipient posts as skin in the game,
- **refunds automatically** if the recipient fails to deliver by the deadline (you reclaim the unreleased funds plus their bond), and
- **records every Pact on-chain**, building a portable reputation that turns anonymous recipients into accountable ones.

PACTA does not give advice, take custody of anyone's funds, or guarantee outcomes. The wallet layer is convenience; the protection layer is **trust infrastructure**.

## Contract Addresses and Transactions

- **PACTA Soroban contract (Stellar Testnet):**
  `CBLSIW2L5BV2KOM73EGXPZBO7DCVVW5TF2ROMYJZSZUTMSMGIFFEL3HL`
  · [view on Stellar Expert ↗](https://stellar.expert/explorer/testnet/contract/CBLSIW2L5BV2KOM73EGXPZBO7DCVVW5TF2ROMYJZSZUTMSMGIFFEL3HL)
<p align="center">
  <img alt="PACTA app" src="assets/contract.png" width="700" />
</p>

## How PACTA works

You open PACTA on **Wallet Home**: your portfolio total, your assets, and three actions.

```
        Connect wallet  →  Wallet Home (portfolio)
                               │
          ┌────────────────────┼────────────────────┐
          ▼                    ▼                    ▼
       Receive              Convert                Send
     address + QR        Stellar DEX /          ┌───────────────┐
                         path payment           │  the fork     │
                                                └───────┬───────┘
                                          ┌─────────────┴─────────────┐
                                          ▼                           ▼
                                     Send now                    Send protected
                                   plain payment                   = a Pact
                                                                     │
                                                                     ▼
                                              Risk Lens read → set terms → KYC gate
                                                                     │
                                                                     ▼
                                        create → bond → deposit → staged release
                                                                     │
                                             ┌───────────────────────┴───────────┐
                                             ▼                                   ▼
                                        Completed                            Refunded
                                     bond → recipient                unreleased + bond → sender
                                     reputation ✓                        reputation ⚠
```

**The protection model, honestly stated:** a naive "lock all the money and trust the recipient" escrow is not actually safer, because once funds reach the recipient, code cannot claw them back. PACTA's protection comes from two mechanics that *are* enforceable on-chain: **staged release** (limiting exposure over time) and the **security bond** (collateralizing the released portion). The emergency refund returns the unreleased funds and seizes the bond, the concrete on-chain penalty for a recipient who walks away.

> On-chain, the two parties are stored as the legacy `investor` (the sender / Client, who deposits funds and approves releases) and `trader` (the recipient / Provider, who posts the bond and delivers) fields, kept for compatibility with the deployed contract. The UI presents them as sender and recipient, and `profit_share_bps` is a legacy, informational field hidden in the UI.

## Features

**Wallet layer**
- **Non-custodial multi-asset portfolio** read live from your connected wallet (XLM, USDC, EURC, other Stellar assets).
- **Send / Receive** any Stellar asset to or from any address.
- **Convert** between assets using Stellar's native DEX and path payments, on-chain and atomic.
- **Wallet-native auth** (Freighter and others via Stellar Wallets Kit), no signup, no passwords, no key custody.

**Protection layer (a Pact, inside Send)**
- **Non-custodial escrow** on Soroban, with milestone-based fund release.
- **Security bonds** and **deadline-gated emergency refunds**.
- **On-chain reputation** per recipient (completed, refunded, total volume).
- **AI Risk Lens** that interprets a recipient's on-chain history in plain language and suggests safer terms.
- **Wallet-linked identity (KYC)** gating the commitment actions.

**Throughout**
- **Mobile-first UI** with a bottom tab shell (Home · Convert · Pacts · Activity · Profile).
- **Proper loading and error handling**: skeleton loaders, transaction-pending states, friendly contract-error messages, and graceful degradation when the AI endpoint is unavailable.

## The AI Risk Lens

When you are about to **send protected** to a recipient, PACTA reads that recipient's on-chain track record and shows a short, plain-language risk read plus a defensive milestone suggestion you can apply with one tap.

- All statistics (completed/refunded counts, volume, recency, deal-vs-history ratio) are computed deterministically in code, so the numbers are always correct.
- An LLM (**Gemini `gemini-2.5-flash`**, via a serverless function that keeps the API key server-side) only *interprets* those correct numbers into language a first-time user can act on.
- It assesses **counterparty trustworthiness from on-chain history only**, never investment advice, never return predictions.

A brand-new address with no history is flagged as unproven rather than green-lit, which doubles as a lightweight anti-Sybil signal. The Risk Lens lives inside the Send-protected flow.

## Identity and KYC

A wallet-linked identity layer lets a user verify their real-world identity **once** (a government-ID check plus a liveness selfie through an external provider) and binds that verified identity to the wallet. Verification gates the **commitment actions** (creating a Pact, posting a bond, depositing, releasing), so both sides of a Pact can trust the counterparty is a verified person. Everyday wallet use (portfolio, Receive, Risk Lens) and self-custodial moves of your own funds (Send now, Convert) are not gated, and fund-returning actions (refund, cancel, complete) are never gated.

It is a deliberate, documented exception to "no backend": off-chain, holds no funds, is not part of the escrow, and is server-mediated (Supabase behind `api/kyc-*.ts`). PII is minimized: raw ID images and selfies are streamed to the provider and never stored. Full detail in [`docs/kyc.md`](docs/kyc.md).

## Screenshots

> <!-- TODO: add real wallet-first screenshots (Wallet Home, Send fork, Convert, Pact detail) to assets/ and update these -->

| Wallet Home | Send fork / Pact | Mobile |
|---|---|---|
| ![UI](assets/dashboard.png) | ![Pact](assets/analytics.png) | ![Mobile](assets/mobile.jpg) |

## Architecture

```
┌───────────────────────── Browser (SPA, mobile-first) ─────────────────────────┐
│  React + Vite + TypeScript + Tailwind                                          │
│                                                                                │
│  Wallet surfaces:  Home · Send · Receive · Convert · Activity · Profile/KYC     │
│                    Pacts (protected payments)                                   │
│        │                                                                        │
│        ▼                                                                        │
│  ┌────────────────────────── ChainAdapter (interface) ───────────────────────┐ │
│  │  getBalances · send · getQuote · swap · signAndSubmit                      │ │
│  │  StellarAdapter (only impl this cycle;  EvmAdapter = later sub-project)    │ │
│  └──────────┬────────────────┬──────────────────────────┬────────────────────┘ │
│             │ read           │ pay / swap               │ send protected        │
│             ▼                ▼                          ▼                        │
│      Horizon / RPC     Stellar DEX /            PactaEscrow contract (Soroban)   │
│      (balances)        path payments            via generated bindings          │
│                                                                                │
│  Signing → Stellar Wallets Kit → Freighter / xBull / …                          │
│  Risk Lens → /api/risk-lens (Gemini)   ·   KYC → /api/kyc-* (Supabase)           │
└──────────────────────────────────────────────────────────────────────────────┘
```

**There is no traditional backend for money.** The Soroban contract holds all escrow state and funds; the wallet layer never takes custody (balances are read from your own wallet, sends and swaps are standard signed Stellar operations). The only server-side code is two stateless concerns: the AI Risk Lens (`/api/risk-lens`, keeps the model key off the client) and the off-chain KYC identity layer (`/api/kyc-*`), neither of which holds funds.

- **Chain-adapter layer** (`frontend/src/lib/adapters/`): every wallet surface depends only on the `ChainAdapter` interface, never on the Stellar SDK directly. `StellarAdapter` is the only implementation this cycle; the seam is what keeps the multi-chain vision cheap later.
- **Smart contract** (`contracts/pacta-escrow`): the escrow logic, bonds, staged release, refunds, and reputation. Frozen and unchanged by the wallet reframe. See the [reference](#smart-contract-reference).
- **Frontend** (`frontend/`): a Vite SPA. Wallet connection via Stellar Wallets Kit; contract calls via type-safe generated bindings.
- **Design system** (`DESIGN.md`): a "Calm Trust" core (warm neutrals, a single emerald accent, monospace for all on-chain data) with a dark "proof panel" reused as the on-chain receipt.

## Tech stack

| Layer | Tech |
|---|---|
| Smart contract | Rust, `soroban-sdk`, Stellar CLI, deployed to Stellar **testnet** (unchanged) |
| Settlement asset | Stellar Asset Contract (native XLM SAC in demo; USDC SAC in production) |
| Wallet layer | `ChainAdapter` interface + `StellarAdapter` (balances, send, convert) |
| Convert | Stellar DEX / path payments (strict-send/strict-receive path finding) |
| Frontend | Vite, React, TypeScript, Tailwind CSS |
| Wallet | `@creit.tech/stellar-wallets-kit` (**Freighter**, xBull, Albedo, WalletConnect) |
| Contract client | Generated TypeScript bindings (`stellar contract bindings typescript`) |
| AI Risk Lens | Gemini (`gemini-2.5-flash`) via a serverless function |
| Identity / KYC | Supabase (Postgres) behind `api/kyc-*.ts`; pluggable provider (mock / Didit) |
| Hosting | Vercel |
| Monitoring | Vercel Analytics + Speed Insights, Sentry (error tracking) |

## Smart contract reference

- **Network:** Stellar testnet · RPC `https://soroban-testnet.stellar.org` · passphrase `Test SDF Network ; September 2015`
- **Contract ID:** `CBLSIW2L5BV2KOM73EGXPZBO7DCVVW5TF2ROMYJZSZUTMSMGIFFEL3HL`
- **Explorer:** [Stellar Expert (testnet)](https://stellar.expert/explorer/testnet/contract/CBLSIW2L5BV2KOM73EGXPZBO7DCVVW5TF2ROMYJZSZUTMSMGIFFEL3HL)

**Public interface (frozen):**

```
create_agreement(investor, trader, token, capital, bond, milestones, profit_share_bps, duration) -> u64
post_bond(agreement_id)
deposit_capital(agreement_id)
release_milestone(agreement_id) -> i128
complete(agreement_id)
emergency_refund(agreement_id)
cancel(agreement_id)
get_agreement(agreement_id) -> Agreement
get_reputation(trader) -> Reputation
get_count() -> u64
```

Authorization is enforced on-chain with `require_auth` (the sender, stored as `investor`, for create/deposit/release/complete/refund/cancel; the recipient, stored as `trader`, for `post_bond`). Amounts are in the token's base units (7 decimals). The Send-protected flow calls this interface directly; the plain Send and Convert flows do not touch the contract.

## Getting started

### Prerequisites

- [Rust](https://rustup.rs/) ≥ 1.91 (`rustup update`) and the `wasm32v1-none` target
- [Stellar CLI](https://developers.stellar.org/docs/tools/cli) v26+
- Node.js ≥ 18 and npm
- A wallet extension such as [Freighter](https://www.freighter.app/)

### 1. Clone and install

```bash
git clone https://github.com/zazazzz-exe/PACTA.git
cd PACTA
```

### 2. Deploy the contract and generate bindings

The contract is already deployed to testnet (see [reference](#smart-contract-reference)); you only need this to run your own instance. A one-command script builds, tests, deploys to testnet, resolves the token, and generates the TypeScript bindings:

```bash
bash scripts/deploy.sh
```

It prints the `CONTRACT_ID` and `TOKEN_ADDRESS`. Put them in the frontend config (below).

### 3. Run the frontend

```bash
cd frontend
npm install
npm install @fontsource/plus-jakarta-sans @fontsource/jetbrains-mono
npm run dev
```

### Environment variables

Create `frontend/.env` (and set the same in your hosting provider):

```bash
# Risk Lens serverless function (server-side only, never exposed to the client)
GEMINI_API_KEY=your_key_here

# KYC identity layer (server-side only; see docs/kyc.md and .env.example)
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
SESSION_JWT_SECRET=...
KYC_PROVIDER=mock

# Optional monitoring
VITE_SENTRY_DSN=your_sentry_dsn
```

Contract and network constants live in `frontend/src/lib/config.ts`:

```ts
export const CONTRACT_ID = 'CBLSIW2L5BV2KOM73EGXPZBO7DCVVW5TF2ROMYJZSZUTMSMGIFFEL3HL';
export const TOKEN_ADDRESS = 'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC';
export const RPC_URL = 'https://soroban-testnet.stellar.org';
export const NETWORK_PASSPHRASE = 'Test SDF Network ; September 2015';
```

## Project structure

```
pacta/
├── README.md
├── contracts/
│   └── pacta-escrow/        # Soroban smart contract (Rust) + tests (frozen)
├── packages/
│   └── pacta/               # generated TypeScript contract bindings
├── api/                     # serverless: risk-lens.ts (Gemini) + kyc-*.ts (Supabase)
├── frontend/
│   └── src/
│       ├── lib/
│       │   └── adapters/    # ChainAdapter interface + StellarAdapter
│       ├── components/      # BalanceHeader, SendFork, ConvertCard, PactCard, RiskLens, ProofPanel, kyc/
│       ├── pages/           # Home, Send, Receive, Convert, Pacts, PactDetail, Activity, Profile
│       └── hooks/           # useWallet, useBalances, useConvert, usePacts, useRiskLens
├── docs/
│   ├── kyc.md
│   └── architecture/chain-adapter.md
└── scripts/
    └── deploy.sh            # one-command testnet deploy + bindings regen
```

## Testing

Soroban unit tests cover the happy path, the emergency-refund path, and cancellation:

```bash
cd contracts/pacta-escrow
cargo test
```

All contract tests must pass before deployment (the deploy script gates on this). The frontend is type-checked and built in CI.

## CI/CD

Every push and pull request to `main` runs an automated pipeline on GitHub Actions
([`.github/workflows/ci.yml`](.github/workflows/ci.yml)):

- **Contract** installs Rust, runs the full `cargo test` suite, and compiles the
  escrow contract to `wasm32v1-none`.
- **Frontend** installs dependencies with `npm ci`, type-checks, and builds the
  Vite production bundle.

Continuous deployment is handled by Vercel: a successful push to `main` is
auto-deployed to production at
[pacta-zarrah.vercel.app](https://pacta-zarrah.vercel.app). The live build status
is shown by the CI badge at the top of this README.

[![CI](https://github.com/zazazzz-exe/PACTA/actions/workflows/ci.yml/badge.svg)](https://github.com/zazazzz-exe/PACTA/actions/workflows/ci.yml)

## Monitoring and analytics

Production telemetry is integrated through Vercel and Sentry:

- **Vercel Analytics + Speed Insights** for traffic and Core Web Vitals.
- **Sentry** for frontend error monitoring (initialized with `VITE_SENTRY_DSN`).
- **Key product events** are tracked (wallet connected, sent, converted, Pact created, milestone released, refund issued) to understand real usage.

## Production deployment

The app is deployed to production on Vercel: **[https://pacta-zarrah.vercel.app](https://pacta-zarrah.vercel.app)**. The smart contract is live on Stellar testnet at `CBLSIW2L5BV2KOM73EGXPZBO7DCVVW5TF2ROMYJZSZUTMSMGIFFEL3HL`. Pushes to `main` trigger automatic redeploys.

## Roadmap

**This cycle (wallet-first, Stellar):**
- Phase 1: chain-adapter layer + Wallet Home + Receive
- Phase 2: the Send fork (Send now vs Send protected) with Risk Lens and KYC inside the protected path
- Phase 3: Convert (Stellar DEX / path payments)
- Phase 4: Activity feed, Profile/KYC, proof-panel receipts, polish

**Later sub-projects:**
- Fiat on/off-ramp via Stellar anchors (SEP-24): real cash-in/out to PHP and other currencies (needs a licensed anchor partner; the KYC layer is the on-ramp)
- Cross-chain (`EvmAdapter` + EVM wallet connect + a bridge/swap provider), the payoff of the adapter layer; the Soroban escrow stays Stellar-only
- Reputation deepening (weighted scoring) and a discoverable, reputation-ranked recipient directory
- Dispute resolution / arbitration (the contract reserves an admin role)
- Mainnet deployment and a professional security audit

## License

Released under the [MIT License](LICENSE).

---

## Submission checklist

How this project meets the Level 4 requirements:

| Requirement | Where it's met |
|---|---|
| Production-ready MVP | Live app (Vercel) + deployed contract (testnet) |
| Stable frontend + contract architecture | [Architecture](#architecture), [contract reference](#smart-contract-reference) |
| Mobile-responsive UI | Mobile-first build with a bottom tab shell |
| Loading states + error handling | [Features](#features): skeletons, tx-pending, contract-error messages, graceful AI fallback |
| Production deployment | [Live app](https://pacta-zarrah.vercel.app) |
| Monitoring + analytics | [Monitoring and analytics](#monitoring-and-analytics) |
| Optimized UX | "Calm Trust" design system (`DESIGN.md`), wallet-first, mobile-first |
| Project structure + documentation | [Project structure](#project-structure) + this README + `PRD.md` |
| Contract on Stellar testnet | `CBLSIW2L5BV2KOM73EGXPZBO7DCVVW5TF2ROMYJZSZUTMSMGIFFEL3HL` |
| 15+ meaningful commits | See the repository commit history |
| Public GitHub repository | https://github.com/zazazzz-exe/PACTA.git |
| Live demo video | https://drive.google.com/drive/folders/1BQ8HlM4eimoUGTmbB2HzL5LoTOqFO4pD?usp=drive_link |
| Contract deployment address | in [links](#-links) and [reference](#smart-contract-reference) |

## Developer

- **Zarrah Exekiel Valles**
- **Jecyn Vallirie Turbanos**

Built for Build on Stellar. Country: Philippines.
