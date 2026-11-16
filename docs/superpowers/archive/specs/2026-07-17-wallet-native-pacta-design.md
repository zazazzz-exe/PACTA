# PACTA wallet-native reframe — design spec

**Date:** 2026-07-17
**Status:** Phase 0 (docs) in review. Canonical spec is `PRD.md`; this file records the decisions and points to it.

## Problem / goal
Evolve PACTA from an escrow dApp into a **wallet-native money app** on Stellar, without throwing away the escrow, Risk Lens, or KYC already built, and on an architecture that extends to multi-chain later without rework.

## Decisions locked during brainstorming
1. **Wallet model:** Hub on top of existing wallets (Approach A). PACTA never holds keys or funds; it connects Freighter/xBull/Albedo/Lobstr/WalletConnect. No custodial or smart-account wallet this cycle.
2. **UI reframe:** Wallet-first. The app opens on **Wallet Home** (portfolio + Send/Receive/Convert). Escrow is repositioned as **"Send protected"** (a **Pact**) inside the Send flow, not the front door. Navigation is a mobile-first bottom tab bar: Home · Convert · Pacts · Activity · Profile.
3. **Escrow placement:** Woven into the Send flow as a "Send now" vs "Send protected" fork (chosen over a separate deliberate tab).
4. **Chain scope:** Multi-chain (Stellar + EVM) is the vision, but this cycle is **Stellar-only**. Cross-chain is a later sub-project behind the `ChainAdapter` seam. The Soroban escrow is Stellar-only permanently.
5. **Convert scope:** Crypto/stablecoin assets on Stellar (DEX / path payments) this cycle. **Fiat on/off-ramp (SEP-24) is a later sub-project** (needs a licensed anchor; KYC is the on-ramp).
6. **Target:** Demo now, product later — build Phase 1 for real on an architecture that extends.
7. **Contract:** Frozen and unchanged. All new work is presentation + client plumbing on wallets the user already controls.

## Architecture
- **`ChainAdapter` interface** (`getBalances`, `send`, `getQuote`, `swap`, `signAndSubmit`) with one `StellarAdapter` implementation. Every wallet surface depends only on this interface. The protected-send path is the one exception: it calls the frozen escrow bindings. Full contract in `docs/architecture/chain-adapter.md` and `PRD.md` §7.2.
- Risk Lens (`/api/risk-lens`, **Gemini `gemini-2.5-flash`**) rides inside Send-protected. KYC (`/api/kyc-*`, Supabase) gates commitment actions only.

## Phases (each a gate on testnet; see `PRD.md` §5)
- **Phase 0:** docs reframe (this) + `chain-adapter.md`. Gate: docs approved.
- **Phase 1:** `ChainAdapter` + `StellarAdapter` + Wallet Home + Receive + tab shell. Gate: connect → real balances → Receive.
- **Phase 2:** Send fork (Send now vs Send protected) with Risk Lens + KYC in the protected path. Gate: both paths work; protected creates a real agreement.
- **Phase 3:** Convert (Stellar DEX). Gate: real XLM↔USDC swap.
- **Phase 4:** Activity + Profile/KYC + proof-panel receipts + polish. Gate: full click-path.

## Later sub-projects (not this cycle)
Fiat on/off-ramp (SEP-24); cross-chain (`EvmAdapter` + EVM wallets + bridge); reputation deepening + recipient directory; dispute/arbitration; mainnet + audit.

## Naming / house rules
Product "PACTA"; protected payment "Pact"; UI roles sender/recipient; on-chain investor/trader unchanged; never "Katiwala" or "PactAI"; no em-dashes in UI copy; Risk Lens is Gemini not Claude.

## Doc set reframed in Phase 0
`PRD.md` (canonical, §8 frozen), `README.md`, `DESIGN.md`, `FEATURE_RISK_LENS.md`, `docs/kyc.md`, `LANDING_HERO.md`, `CLAUDE.md`, and new `docs/architecture/chain-adapter.md`.

## Next step
After the user approves the reframed docs (Phase 0 gate), invoke the writing-plans skill to produce the Phase 1 implementation plan against `PRD.md` §5.1, §7.2, §9.4 and `docs/architecture/chain-adapter.md`.
