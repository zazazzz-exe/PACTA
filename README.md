# PactAI

> **Trust, written in code.**

<p align="center">
  <img alt="PactAI app" src="assets/pacta.png" width="200"/>
</p>

PactAI is a non-custodial escrow protocol on **Stellar** and **Soroban** that turns any informal money agreement between two people into a secure, staged, bond-protected on-chain contract. Whatever the deal is, funds are released in milestone tranches, protected by a Provider-posted security bond, refundable if the Provider fails to deliver, and provable on-chain. An AI Risk Lens reads a Provider's on-chain history and tells a first-time user, in plain language, how trustworthy they look.

It fits any two-party deal: freelance and milestone project payments, service contracts (design, development, consulting), custom or made-to-order goods, peer-to-peer marketplace deals, and cross-border entrusted funds (remittances) as just one example among many. (The name PactAI = "Pact" for the agreement, "AI" for the built-in risk lens.)

<p>
  <a href="https://github.com/zazazzz-exe/PACTA/actions/workflows/ci.yml"><img alt="CI" src="https://github.com/zazazzz-exe/PACTA/actions/workflows/ci.yml/badge.svg" /></a>
  <img alt="Network" src="https://img.shields.io/badge/network-Stellar%20testnet-0B7A63" />
  <img alt="Contracts" src="https://img.shields.io/badge/contracts-Soroban-0B7A63" />
  <img alt="License" src="https://img.shields.io/badge/license-MIT-555" />
</p>

<p align="center">
  <img alt="PactAI app" src="assets/dashboard.png" width="900" />
</p>

---

## 🔗 Links

| | |
|---|---|
| **Live app** | [PactAI](https://pacta-zarrah.vercel.app) |
| **Demo video** | [Google Drive](https://drive.google.com/drive/folders/1BQ8HlM4eimoUGTmbB2HzL5LoTOqFO4pD?usp=sharing )|
| **Smart contract (testnet)** | [View on Stellar Expert](https://stellar.expert/explorer/testnet/contract/CBLSIW2L5BV2KOM73EGXPZBO7DCVVW5TF2ROMYJZSZUTMSMGIFFEL3HL) |
| **GitHub** | [Repository](https://github.com/zazazzz-exe/PACTA.git) |

---

## Table of contents

- [The problem](#the-problem)
- [The solution](#the-solution)
- [Contract Addresses and Transactions](#Contract-addresses-and-transactions)
- [How PactAI works](#how-pactai-works)
- [Features](#features)
- [The AI Risk Lens](#the-ai-risk-lens)
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
- [User onboarding and feedback](#user-onboarding-and-feedback)
- [Roadmap](#roadmap)
- [License](#license)
- [Submission checklist](#submission-checklist)
- [Developer](#Developer)

---

## The problem

Every day, people put money behind agreements with someone they do not fully trust: hiring a freelancer for a milestone project, commissioning a designer, developer, or consultant, ordering custom or made-to-order goods, closing a peer-to-peer marketplace deal, or sending entrusted funds across borders. These arrangements run entirely on trust: money sent over GCash, bank transfer, or crypto with no contract, no transparency, and no protection. When the other side disappears or misuses the funds, the payer usually loses everything and has no recourse. There is no accessible, low-cost tool that lets two ordinary people safely put money behind an agreement online.

## The solution

PactAI fixes this not by asking people to trust harder, but by making trust enforceable. Instead of sending money directly to a Provider, the Client locks it in a Soroban escrow contract that:

- **Releases funds in milestone tranches** so only a portion is ever exposed at a time.
- **Requires a security bond** the Provider posts as skin in the game.
- **Refunds automatically** if the Provider fails to deliver by the deadline: the Client reclaims the unreleased funds plus the Provider's bond.
- **Records every agreement on-chain**, building a portable reputation that turns anonymous Providers into accountable ones.

PactAI does not give advice, take custody of anyone's profits, or guarantee outcomes. It is **trust infrastructure**.

## Contract Addresses and Transactions

- **PactAI Soroban contract (Stellar Testnet):**
  `CBLSIW2L5BV2KOM73EGXPZBO7DCVVW5TF2ROMYJZSZUTMSMGIFFEL3HL`
  · [view on Stellar Expert ↗](https://stellar.expert/explorer/testnet/contract/CBLSIW2L5BV2KOM73EGXPZBO7DCVVW5TF2ROMYJZSZUTMSMGIFFEL3HL)
<p align="center">
  <img alt="PactAI app" src="assets/contract.png" width="700" />
</p>

## How PactAI works

```
            create agreement
                  │
                  ▼
            ┌───────────┐   cancel
            │  Pending  │────────────▶ Cancelled   (deposits returned)
            └───────────┘
        post bond  +  deposit capital   (both required)
                  │
                  ▼
            ┌───────────┐
            │  Active   │
            └───────────┘
        release milestone × N           deadline passes, trader fails
                  │                                │
                  ▼                                ▼
            ┌───────────┐                    ┌───────────┐
            │ Completed │  bond → trader     │ Refunded  │  unreleased + bond → investor
            └───────────┘  reputation ✓      └───────────┘  reputation ⚠
```

**The protection model, honestly stated:** a naive "lock all the money and trust the Provider" escrow is not actually safer, because once funds reach the Provider, code cannot claw them back. PactAI's protection comes from two mechanics that *are* enforceable on-chain: **staged release** (limiting exposure over time) and the **security bond** (collateralizing the released portion). The emergency refund returns the unreleased funds and seizes the bond, the concrete on-chain penalty for a Provider who walks away.

> On-chain, the two parties are stored as the legacy `investor` (the Client, who deposits funds and approves releases) and `trader` (the Provider, who posts the bond and delivers) fields, kept for compatibility with the deployed contract. The UI presents them as Client and Provider, and `profit_share_bps` is a legacy, informational field that is hidden in the UI.

## Features

- **Non-custodial escrow** on Stellar/Soroban, with milestone-based fund release.
- **Security bonds** and **deadline-gated emergency refunds**.
- **On-chain reputation** per Provider (completed, refunded, total volume).
- **AI Risk Lens** that interprets a Provider's on-chain history in plain language and suggests safer agreement terms.
- **Wallet-native auth** (Freighter and others via Stellar Wallets Kit) — no signup, no passwords.
- **Mobile-responsive UI** built mobile-first for the real user base.
- **Proper loading and error handling**: skeleton loaders, transaction-pending states, friendly contract-error messages, and graceful degradation when the AI endpoint is unavailable.

## The AI Risk Lens

When a Client is about to work with a Provider, PactAI reads that Provider's on-chain track record and shows a short, plain-language risk read plus a defensive milestone suggestion they can apply with one tap.

- All statistics (completed/refunded counts, volume, recency, deal-vs-history ratio) are computed deterministically in code, so the numbers are always correct.
- An LLM (**Claude**, via a serverless function that keeps the API key server-side) only *interprets* those correct numbers into language a first-time user can act on.
- It assesses **counterparty trustworthiness from on-chain history only** — never investment advice, never return predictions.

A brand-new address with no history is flagged as unproven rather than green-lit, which doubles as a lightweight anti-Sybil signal.

## Screenshots

> <!-- TODO: add real screenshots to docs/screenshots/ and update these -->

| Product UI | Mobile responsive | Analytics / monitoring |
|---|---|---|
| ![UI](assets/dashboard.png) | ![Mobile](assets/mobile.jpg) | ![Analytics](assets/analytics.png) |

## Architecture

```
┌───────────────────────────── Browser (SPA) ─────────────────────────────┐
│  React + Vite + TypeScript + Tailwind                                    │
│                                                                          │
│   UI screens ──▶ generated TS contract bindings ──▶ Stellar Wallets Kit  │
│        │                     │                              │ sign        │
│        │ risk read           │ read / write                ▼             │
│        ▼                     ▼                       Freighter / xBull    │
│  /api/risk-lens        Soroban RPC (testnet) ──▶ PactaEscrow contract     │
│  (serverless, Claude)                            + SAC token (XLM/USDC)   │
└──────────────────────────────────────────────────────────────────────────┘
```

**There is no traditional backend.** The Soroban contract is the source of truth and holds all state and funds. The only server-side code is one small serverless function (`/api/risk-lens`) that exists solely to keep the AI provider key off the client. Reads are free RPC simulations; writes are wallet-signed transactions.

- **Smart contract** (`contracts/pacta-escrow`): the escrow logic, bonds, staged release, refunds, and reputation. See the [reference](#smart-contract-reference) below.
- **Frontend** (`frontend/`): a Vite SPA. Wallet connection via Stellar Wallets Kit; contract calls via type-safe bindings generated by the Stellar CLI.
- **Design system** (`DESIGN.md`): a "Calm Trust" core (warm neutrals, a single emerald accent, monospace for all on-chain data) with one dark "proof panel" as the signature element.

## Tech stack

| Layer | Tech |
|---|---|
| Smart contract | Rust, `soroban-sdk`, Stellar CLI, deployed to Stellar **testnet** |
| Settlement asset | Stellar Asset Contract (native XLM SAC in demo; USDC SAC in production) |
| Frontend | Vite, React, TypeScript, Tailwind CSS |
| Wallet | `@creit.tech/stellar-wallets-kit` (**Freighter**, xBull, Albedo, WalletConnect) |
| Contract client | Generated TypeScript bindings (`stellar contract bindings typescript`) |
| AI Risk Lens | Gemini via a serverless function |
| Hosting | Vercel |
| Monitoring | Vercel Analytics + Speed Insights, Sentry (error tracking) |

## Smart contract reference

- **Network:** Stellar testnet · RPC `https://soroban-testnet.stellar.org` · passphrase `Test SDF Network ; September 2015`
- **Contract ID:** `CBLSIW2L5BV2KOM73EGXPZBO7DCVVW5TF2ROMYJZSZUTMSMGIFFEL3HL`
- **Explorer:** [Stellar Expert (testnet)](https://stellar.expert/explorer/testnet/contract/CBLSIW2L5BV2KOM73EGXPZBO7DCVVW5TF2ROMYJZSZUTMSMGIFFEL3HL)

**Public interface:**

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

Authorization is enforced on-chain with `require_auth` (the Client, stored as `investor`, for create/deposit/release/complete/refund/cancel; the Provider, stored as `trader`, for `post_bond`). Amounts are in the token's base units (7 decimals).

## Getting started

### Prerequisites

- [Rust](https://rustup.rs/) ≥ 1.91 (`rustup update`) and the `wasm32v1-none` target
- [Stellar CLI](https://developers.stellar.org/docs/tools/cli) v26+
- Node.js ≥ 18 and npm
- A wallet extension such as [Freighter](https://www.freighter.app/)

### 1. Clone and install

```bash
git clone [TODO: repo URL]
cd pacta
```

### 2. Deploy the contract and generate bindings

A one-command script builds, tests, deploys to testnet, resolves the token, and generates the TypeScript bindings:

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
# Risk Lens serverless function (server-side only — never exposed to the client)
GEMINI_API_KEY=your_key_here

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
│   └── pacta-escrow/        # Soroban smart contract (Rust) + tests
├── packages/
│   └── pacta/               # generated TypeScript contract bindings
├── frontend/
│   ├── src/
│   │   ├── components/      # UI components, incl. ProofPanel, HeroFlow, RiskLens
│   │   ├── pages/           # Landing, Dashboard, CreateAgreement, AgreementDetail
│   │   ├── hooks/           # useWallet, useAgreements, useRiskLens
│   │   └── lib/             # wallet, contract client, config, formatting
│   └── api/
│       └── risk-lens.ts     # serverless function for the AI Risk Lens
└── scripts/
    └── deploy.sh            # one-command testnet deploy + bindings
```

## Testing

Soroban unit tests cover the happy path, the emergency-refund path, and cancellation:

```bash
cd contracts/pacta-escrow
cargo test
```

All contract tests must pass before deployment (the deploy script gates on this).

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

- **Vercel Analytics + Speed Insights** for traffic and Core Web Vitals:

  ```ts
  import { Analytics } from '@vercel/analytics/react';
  import { SpeedInsights } from '@vercel/speed-insights/react';
  // rendered once near the app root
  ```

- **Sentry** for frontend error monitoring (initialized with `VITE_SENTRY_DSN`).
- **Key product events** are tracked (wallet connected, agreement created, milestone released, refund issued) to understand real usage.

> <!-- TODO: add a screenshot of your analytics/monitoring dashboard to docs/screenshots/analytics.png -->

## Production deployment

The app is deployed to production on Vercel: **[https://pacta-zarrah.vercel.app](https://pacta-zarrah.vercel.app)**. The smart contract is live on Stellar testnet at `[TODO: CONTRACT_ID]`. Pushes to `main` trigger automatic redeploys.

## User onboarding and feedback

### Wallet interactions (proof)

Real users onboarded and interacting on testnet:

> <!-- TODO: replace these example rows with your real interactions. Link each tx to Stellar Expert. -->

| # | Wallet address | Action | Transaction |
|---|---|---|---|
| 1 | `G…` | Created agreement | [tx](https://stellar.expert/explorer/testnet/tx/[hash]) |
| 2 | `G…` | Posted bond | [tx](https://stellar.expert/explorer/testnet/tx/[hash]) |
| 3 | `G…` | Deposited capital | [tx](https://stellar.expert/explorer/testnet/tx/[hash]) |
| … | … | … | … |
| 10 | `G…` | Emergency refund | [tx](https://stellar.expert/explorer/testnet/tx/[hash]) |

### Feedback summary

> <!-- TODO: fill in. Keep it short and concrete. -->

- **How feedback was collected:** [e.g., short in-person interviews + a Google Form after testnet sessions]
- **What we heard:** [2–4 sentences of themes — what resonated, what confused users, what they asked for]
- **What we changed:** [1–2 concrete changes you made in response]

## Roadmap

- Provider-initiated completion with a grace timer (fairness for both sides)
- Dispute resolution / arbitration path (the contract reserves an admin role)
- Identity-bound reputation (passkeys, proof-of-personhood) to harden against Sybil attacks
- Passkey onboarding and voice input for non-crypto users
- USDC settlement and a discoverable, reputation-ranked Provider directory
- Shareable on-chain proof certificates for completed deals
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
| Mobile-responsive UI | Mobile-first build; see mobile screenshot |
| Loading states + error handling | [Features](#features) — skeletons, tx-pending, contract-error messages, graceful AI fallback |
| Production deployment | [Live app](https://pacta-zarrah.vercel.app) |
| Monitoring + analytics | [Monitoring and analytics](#monitoring-and-analytics) + screenshot |
| Optimized UX | "Calm Trust" design system (`DESIGN.md`), mobile-first |
| Project structure + documentation | [Project structure](#project-structure) + this README |
| Contract on Stellar testnet | `[CBLSIW2L5BV2KOM73EGXPZBO7DCVVW5TF2ROMYJZSZUTMSMGIFFEL3HL]` |
| 15+ meaningful commits | See the repository commit history |
| Public GitHub repository | _[https://github.com/zazazzz-exe/PACTA.git]_ |
| Live demo video | _[https://drive.google.com/drive/folders/1BQ8HlM4eimoUGTmbB2HzL5LoTOqFO4pD?usp=drive_link]_ |
| Contract deployment address | _[https://stellar.expert/explorer/testnet/contract/CBLSIW2L5BV2KOM73EGXPZBO7DCVVW5TF2ROMYJZSZUTMSMGIFFEL3HL]_ in [links](#-links) and [reference](#smart-contract-reference) |

## Developer

- **Zarrah Exekiel Valles** 

Built for the Build on Stellar. Country: Philippines.
