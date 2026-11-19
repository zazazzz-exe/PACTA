# PACTA — Product Requirements Document (PRD)

> **Tagline:** PACTA — Trust, written in code.
> **One-liner:** PACTA is a stablecoin wallet for Filipinos on Stellar and Soroban. You hold **USDC**, pay anyone **by phone number**, and see your balance **in pesos**, with no XLM, no seed phrase, and no fees to think about. When a payment needs protection you send it as a **Pact**: a staged, bond-protected on-chain escrow with an AI counterparty read and identity verification built in.

**Document status:** Source of truth for the **2026-11 restructure (phases R1 to R5)**. The wallet-first rebuild (Phases 0 to 4: adapter + Wallet Home, Send fork, Convert, Activity + Profile/KYC + polish) is the shipped baseline and is described in §5.1 to §5.3a. The restructure turns that baseline into a MiniPay-style stablecoin wallet while keeping Pacts, tiered KYC, and adding zero-knowledge privacy. Feature-level requirements for the new pieces are in §22. The on-chain escrow (§8) is unchanged by this restructure.

**Product framing (read first).** PACTA has two layers that must not be confused:
> - **The wallet layer (the app the user opens).** A non-custodial money hub. PACTA never holds the user's keys or funds. By default the user gets a **passkey smart wallet** (a Soroban contract account signed with a WebAuthn passkey that never leaves their device), so there is no seed phrase and no extension to install. External wallets (Freighter, xBull, Albedo, Lobstr, WalletConnect) remain an optional "connect wallet" path. The wallet shows a USDC balance in PHP and lets the user **Send** (to a phone number or an address), **Receive**, and **Convert**. Network fees are sponsored by a self-hosted fee relayer. This is the front door and the default screen.
> - **The protection layer (a feature inside Send).** The original PACTA escrow, unchanged. In the Send flow the user chooses **Send now** (a plain payment) or **Send protected** (a Pact: create → bond → staged release → refund, with the Risk Lens and the KYC gate). Escrow is not the front door; it is the strongest thing the wallet can do.
>
> Around these two layers sit **mini apps** (sandboxed apps that reach the wallet only through the PACTA SDK) and **Savings** (Blend / DeFindex, variable earnings, not guaranteed). None of them take custody.
>
> The on-chain escrow contract is **frozen** for this restructure (§8). New on-chain code (smart wallet, Paluwagan, zk verifier) lives in its own crates and never changes the escrow. See §7 for the architecture, §5 for the phased scope, and §22 for the restructure feature specs.

**Naming note:** The product is named **PACTA** everywhere in human-readable copy (headings, prose, taglines, UI). A protected payment is a **Pact** in UI copy. Product roles are **sender** (a.k.a. Client) and **recipient** (a.k.a. Provider). Code identifiers stay on the legacy name for ABI and package compatibility: the contract crate `pacta-escrow`, the struct `PactaEscrow`, the package dir `packages/pacta`, the deploy alias `pacta_escrow`, and the wasm `pacta_escrow.wasm` are unchanged. On-chain the two parties remain `investor` (the sender/Client) and `trader` (the recipient/Provider). There is no "Katiwala" and no "PactAI". If any artifact, comment, or variable says either, rename it to PACTA (or, for code identifiers, keep the legacy `pacta` form).

---

## 1. Vision & problem

### 1.1 Problem
People in SEA already move money digitally every day (GCash, Maya, bank transfer, crypto), but the tools split into two camps and neither is enough on its own:

- **Wallets move money but offer zero protection.** They send funds instantly and irreversibly. The moment you pay a stranger for a deliverable (a freelance project, a service contract, a custom or made-to-order item, a peer-to-peer marketplace purchase, or funds entrusted across borders), you are back to pure trust. When the other party disappears, misuses the funds, or fails to deliver, you usually lose everything with little recourse.
- **Platforms offer protection but own your trust.** On Fiverr or Upwork your reputation and dispute history belong to the platform; leave and it vanishes, and they take ~20%. PayPal Buyer Protection is unavailable for most PH service transactions. Centralized escrow requires custody (trusting yet another party).
- **Crypto wallets are too hard for everyday users.** Seed phrases, gas tokens (XLM), trustlines, and raw addresses are a wall for the average Filipino. Stablecoins could be a cheap, dollar-stable way to save and send, but only if using them feels like GCash, not like a developer tool.

So the everyday user has no single place that lets them **hold and move a stable digital peso-equivalent as easily as a mobile wallet** *and* **protect a payment when it matters**, with a trust record they actually own.

### 1.2 Solution
PACTA is a **MiniPay-style stablecoin wallet** on Stellar, powered by Soroban. It unifies the two camps into one non-custodial app the user opens like any mobile wallet:

**The wallet layer (everyday money).**
- **Hold USDC, see pesos:** the user holds only USDC. The balance is shown in PHP as a clearly labeled estimate, computed in code from live rates. Other Stellar assets remain readable for users who bring them, but the default view is USDC.
- **No seed phrase, no XLM:** onboarding is a phone number plus a passkey on the user's own device. A self-hosted fee relayer sponsors network fees, so the user never needs XLM.
- **Pay by phone:** send USDC to a Philippine mobile number. If the number is registered, it resolves to a wallet through PACTA's own SEP-2 federation server; if not, the funds wait as claimable funds and return to the sender if unclaimed before a timeout.
- **Send / Receive / Convert:** send to a phone number or an address, receive via QR or phone number, and convert between assets via Stellar's native DEX and path payments.
- **Savings:** put USDC to work in Blend / DeFindex vaults. Earnings are variable and not guaranteed.
- **Mini apps:** sandboxed first-party and partner apps (Pacts, Savings, Paluwagan, Split bill, Invoices, Remittance, Load) that ask the wallet for confirmed, simulated transactions within per-app spending limits.

**The protection layer (a Pact, inside Send).** When a payment needs protection, the user picks **Send protected** instead of **Send now**. That routes into the original PACTA escrow, unchanged, which enforces:
- **Staged fund release:** funds are released to the recipient in milestone tranches, not all at once, so exposure is limited and trust is earned progressively.
- **Security bonds:** the recipient posts a refundable bond as skin-in-the-game. If they disappear, the bond compensates the sender.
- **Deadline-protected emergency refunds:** if the recipient fails to deliver within the agreed window, the sender reclaims all unreleased funds plus the recipient's bond.
- **On-chain reputation + AI Risk Lens:** every completed and refunded Pact is recorded per recipient, and a plain-language AI read interprets that history before you commit. From R3 the Risk Lens can consume a **zk reputation proof** instead of raw history.
- **Identity (tiered KYC):** commitment actions require a verified identity (Tier 1). From R3 a user can prove "verified", "18+", or "not sanctioned" with a **zk-KYC credential** without revealing who they are.

PACTA does **not** give investment advice, take custody of funds, or guarantee outcomes or earnings. The wallet layer is convenience; the protection layer is **trust infrastructure**: it makes private agreements safer, transparent, and enforceable.

### 1.3 Why this design is safe and honest (important for judges)
A naive "lock all the money and trust the other party" escrow is not actually safer: the moment funds reach the Provider, code can't claw them back. PACTA's protection comes from two mechanics that *are* enforceable on-chain:
- **Limiting exposure over time** (staged release), and
- **Collateralizing the released portion** (the bond).

The emergency-refund path returns the unreleased funds **and** seizes the bond, which is the concrete on-chain penalty for a Provider who walks away.

The restructure keeps the same honesty on the wallet side: the fee relayer only pays fees and can never move a user's funds; the federation server only maps a phone hash to an address; savings earnings are variable; PHP figures are estimates. Every server component is described in §7 with what it may and may not do.

### 1.4 Why wallet-native

PACTA is **wallet-native** by design. The wallet is not merely a login method; it is the entire identity, trust, and authority layer. The restructure changes *which* wallet most users hold (a passkey smart wallet instead of a browser extension), not the principle:

- **Wallet is login.** Open the app, confirm with your passkey (fingerprint or face unlock), and you're in. No passwords, no seed phrase. The phone number is a lookup handle and a Tier 0 identity, never a password and never a key.
- **Wallet is identity.** Your Stellar address (the smart-wallet contract address, or your external wallet) IS your profile. KYC (§18) binds to the identity once; linked wallets share it.
- **Wallet is reputation.** On-chain history (completed deals, refunds, volume) is permanently attached to your address. It is portable: any future dApp that reads on-chain data can see a Provider's PACTA track record without asking permission. From R3, zk reputation lets a user prove that history without revealing it.
- **Wallet is authority.** Only a signature from the user's own passkey (or external wallet) can move funds, approve releases, or post bonds. No admin, relayer, mini app, or platform can override this.
- **No platform lock-in.** Unlike Fiverr/Upwork where your reviews die if you leave, PACTA reputation belongs to the wallet holder forever and travels across any ecosystem that reads the contract.

This positioning means PACTA is not "a platform with crypto payments." It is a **trust protocol that lives in the wallet**, composable, portable, and owned by the user, wrapped in a wallet simple enough for everyday Filipinos.

---

## 2. Hackathon context

> **Historical.** This section records the original hackathon submission. The product has since moved past the hackathon scope (see §5 and §22); keep this section for pitch and submission reference only.

- **Event:** Build on Stellar — APAC track.
- **Primary track:** **Payment & Consumer Applications.** PACTA is a consumer-facing, wallet-native money app: hold, send, receive, and convert your assets, with one-tap protection (a Pact) when a payment needs it.
- **Why it fits the track:** a real payments app anyone with a Stellar wallet can use; everyday money actions (send / receive / convert) plus consumer protection built into the send flow; financial accessibility and real-world SEA impact; an easy-to-use consumer tool (connect wallet → see balances → send now or send protected → convert).
- **Team:**
  - Zarrah Exekiel Valles
  - Jecyn Vallirie Turbanos
- **Country:** Philippines.

### 2.1 Track statement (for submission)
> PACTA is a Payment & Consumer Application built on Stellar and powered by Soroban: a wallet-native money app where everyday users hold, send, receive, and convert their assets, and protect any payment with one tap by sending it as a Pact, a staged, bond-protected on-chain escrow with an AI counterparty read and verified identity.

---

## 3. Users & personas

Everyone who opens PACTA is a **wallet holder** first. Most users create a passkey smart wallet with their phone number; crypto-native users can connect an existing Stellar wallet instead. The two roles below describe who each side becomes **when a payment is protected** (a Pact). On-chain these map to `investor` (the sender/Client) and `trader` (the recipient/Provider).

**Everyday users (the default):**
- Filipinos who already use GCash or Maya and want a dollar-stable way to hold and send money, with no crypto knowledge.
- Families sending and receiving remittances, groups running a paluwagan, friends splitting a bill.

**Primary users of Pacts (Clients / senders):**
- People paying or hiring someone online for a deliverable, with limited financial or legal protection.
- First-time buyers of freelance work, services, or made-to-order goods.
- People with limited financial knowledge who currently rely on pure trust.

**Secondary users of Pacts (Providers):**
- Freelancers, service providers (design, dev, consulting), makers of custom goods, and marketplace sellers.
- They benefit because a posted bond plus a transparent track record lets them **signal credibility** and win clients who would otherwise be too scared to engage.

**Persona A — "Tita Maria" (Client):** OFW in Dubai who is paying someone online for a deliverable (a custom order, or a piece of freelance work) and sends money home every month. She has been scammed before, so she needs proof she can get her money back if things go wrong. She will not write down a seed phrase.

**Persona B — "Jay" (Provider):** Skilled and honest, but with no formal credentials, so online he is indistinguishable from scammers. He posts a bond and builds an on-chain track record to stand out. His clients pay him to his phone number.

**Wallet-native implications for users:**
- The only prerequisite is a phone and a device that supports passkeys. No seed phrase, no XLM, no extension. Connecting an external Stellar wallet stays available.
- Tita Maria signs up with her number, creates a passkey, and can receive and send immediately at Tier 0. Creating a Pact asks her to complete Tier 1 KYC once.
- Jay's reputation **travels with his wallet**. If he moves to a different marketplace or app that reads on-chain PACTA data, his track record follows. From R3 he can prove it privately with zk reputation.
- Both users own their trust data and their keys. Deleting the app or clearing the browser does not erase their on-chain history; recovering the wallet depends on the passkey recovery method (§22.1).

### 3.1 Beachhead segment

PACTA's initial target is specific: **Filipino mobile-wallet users, freelancers, OFWs, and informal online deal-makers** who already use digital wallets (GCash, Maya) for payments but have zero protection when money is entrusted to a stranger.

| Segment | Example use case | Why them |
|---|---|---|
| Filipino freelance clients | Hire a designer on FB Marketplace or Telegram; lock payment in escrow until deliverable is done | ~1.5M Filipino freelancers active online; countless more deal off-platform with no protection |
| OFW → PH service providers | OFW in Dubai pays a contractor in Cavite to build a fence or finish a renovation; staged release per phase | 10M+ OFWs, majority transact informally with providers back home |
| OFW families (remittance) | Send USDC to a family member's phone number; they see pesos | Large, recurring flows; phone-number payments match how families already send |
| Paluwagan / bill-split groups | Rotating savings circle or a shared bill among friends | Familiar social money habits that need a trusted, transparent ledger |
| FB Marketplace / Carousell buyers | Custom-made or pre-order items where buyer pays upfront and seller ghosts | Scam reports in PH buy-and-sell FB groups number in thousands weekly |
| Micro-outsourcing (Fiverr gap) | Small deals (₱1,000–₱10,000) too small for Fiverr/Upwork fees but still risky without protection | Unserved by platforms that take 20% — PACTA takes 0% at MVP |

**Why this segment first:**
- Already digital-wallet literate (GCash has 90M+ registered users in PH)
- High scam exposure and real financial pain from trust failure
- Philippines ranks among the highest in SEA for crypto awareness (16%+ adoption)
- The team is Filipino — credibility, context, and community access

**Expansion path:** PH stablecoin wallet + Pacts → OFW corridors → broader SEA informal commerce → regulated mainnet with fiat on/off-ramp (R5)

---

## 4. Core user flows

The wallet is the front door. Everything below starts from **onboarding (or connect wallet) → Wallet Home** (USDC balance in PHP + Send / Receive / Convert).

**Onboarding (wallet layer):**
- **Create wallet (default):** enter phone number → SMS OTP → create a passkey on the device → PACTA deploys the user's smart-wallet contract account (fees sponsored) → the phone hash is registered with the federation server → USDC trustline/authorization is set up → Tier 0 → Wallet Home.
- **Connect wallet (optional):** connect Freighter / xBull / Albedo / Lobstr / WalletConnect → sign a server nonce to prove ownership → Wallet Home. The user can optionally attach a phone number.

**Everyday flows (wallet layer):**
- **Receive:** Wallet Home → Receive → show phone number, address + QR (and an amount request, optionally).
- **Send now:** Wallet Home → Send → enter a phone number or address, amount (USDC, with the PHP estimate) → choose **Send now** → confirm → passkey → done (a plain payment, fee sponsored).
- **Pay an unregistered number:** same as Send now; PACTA shows that the number is not on PACTA yet, creates claimable funds that the recipient can claim after onboarding with that number, and returns them to the sender automatically if unclaimed before the timeout. The recipient is notified by SMS without revealing the sender's balance.
- **Convert:** Wallet Home → Convert → choose from-asset and to-asset → see a live quote (Stellar DEX / path payment) → confirm → sign → balances update.
- **Savings (R4):** Wallet Home → Savings → choose a vault → see "variable earnings, not guaranteed" and the current variable rate as information only → deposit → withdraw any time the vault allows.
- **Mini apps (R4):** Wallet Home → Apps → open a mini app → any transaction it requests is simulated and shown in a PACTA confirmation sheet → the user confirms with their passkey, within the app's spending limit.

**Protected flow (the Pact, a fork inside Send):**
- **Send protected (sender / Client):** Wallet Home → Send → pick recipient (phone or address), amount → choose **Send protected** → the **Risk Lens** shows the recipient's on-chain trust read → set terms (bond, milestones, duration) → **KYC gate (Tier 1)** if not yet verified → create the Pact and deposit funds → later, approve milestone releases as trust builds → either **Complete** (returns the bond to the recipient) or **Emergency Refund** (reclaim unreleased funds + bond once the deadline passes). A Pact recipient must be a registered wallet (a Pact cannot be sent to claimable funds).
- **Recipient / Provider:** sees the incoming Pact in Activity → reviews terms → posts the security bond (Tier 1 required) → receives milestone tranches as the sender approves them → gets the bond back on completion, or reclaims it with `reclaim_bond` while the Pact is still Pending (this cancels the Pact and returns any deposit to the sender).

**Reputation flow:** Anywhere a recipient appears (Risk Lens, Activity, profile), anyone can read that address's on-chain reputation (completed count, refunded count, total volume) before committing. From R3 the recipient can instead present a zk reputation proof.

---

## 5. Scope

The product is built as a sequence of shippable phases, each ending at a gate that must pass on testnet before the next begins. Phases 0 to 4 (§5.1 to §5.3a) are the **shipped baseline**. The **2026-11 restructure** runs as phases **R1 to R5** (§5.3b). The frozen escrow contract does not change in any phase unless a task explicitly reopens it (§8, CLAUDE.md).

> **Owner confirmation pending:** that Phases 0 to 4 are all complete.

### 5.1 Phase 1 — Wallet Hub + chain-adapter layer (Stellar) — baseline
- **Chain-adapter layer:** a `ChainAdapter` interface (`getBalances`, `send`, `getQuote`, `swap`, `signAndSubmit`) with one real `StellarAdapter` implementation over the existing wallet + bindings. All wallet screens talk to the adapter, never to the Stellar SDK directly. The passkey wallet and fee relayer (R1) plug in behind this same interface.
- **Wallet Home:** total balance in a display currency, multi-asset list (XLM, USDC, EURC, other trustlines), primary actions Send / Receive / Convert.
- **Receive:** address + QR.
- **Navigation shell:** mobile-first bottom tabs (Home · Convert · Pacts · Activity · Profile).
- **Gate:** connect any Stellar wallet → see real testnet balances → Receive works.

### 5.2 Phase 2 — Send flow with the "Send protected" fork — baseline
- Unified **Send** flow: recipient + asset + amount.
- **Send now:** a plain payment via the adapter.
- **Send protected (a Pact):** routes into the existing Soroban escrow (`create_agreement` → `post_bond` → `deposit_capital` → `release_milestone` → `complete` / `emergency_refund` / `cancel` / `reclaim_bond`). The **Risk Lens** rides inside this path; the **KYC gate** triggers on the commitment action.
- On-chain reputation read/write (unchanged contract behavior).
- **Gate:** both send paths work on testnet; "Send protected" creates a real on-chain agreement.

### 5.3 Phase 3 — Convert (Stellar DEX) — baseline
- **Convert** screen: from-asset → to-asset, live quote via path payments, execute the swap through the adapter.
- **Gate:** a real on-chain XLM↔USDC swap completes on testnet.

### 5.3a Phase 4 — Activity, Profile/KYC, polish — baseline
- **Activity** feed (payments, swaps, Pacts) from on-chain data/events.
- **Profile** tab: KYC status + on-chain reputation.
- **Linked identity across wallets** (multi-wallet KYC): one verified identity can own several wallet addresses, so a user who verifies once and then connects another wallet keeps their verified status, and logging in with any linked wallet resolves to the same identity. Linking a new wallet is never silent: the new wallet must sign a server nonce while the session is already authenticated as the verified identity (proof of control of both wallets), so a stranger's wallet can never inherit someone's KYC. Schema moves from verification-per-wallet to one identity → many linked wallets; adds a "Link wallet" action in Profile and an unlink flow. Stays inside the documented off-chain KYC exception (no funds, minimal PII). See `docs/kyc.md`.
- Re-skin the existing escrow detail screens under the wallet shell; the dark proof panel becomes the receipt view.
- **Gate:** the full wallet-first demo click-path runs end to end on testnet.

### 5.3b 2026-11 restructure roadmap (R1 to R5)

Each phase is a **GATE**. Each listed piece is its own task; build only the one a task asks for. Feature specs are in §22.

**R1 — Security, design system, core wallet.**
- **Security fixes:** contract hardening follow-ups (only via an explicit contract reopen), backend fixes (session, rate limits, input validation on every `api/*` endpoint, including the Risk Lens), and dependency updates.
- **New UI design system:** the "electric glow" system (§12) applied across all surfaces.
- **Passkey smart wallet** (§22.1): Soroban contract account with a WebAuthn signer, in its own crate. External wallets stay as the optional "connect wallet" path.
- **Self-hosted fee relayer** (§22.2): fee-bump sponsorship with rate limits, caps, and a call allowlist.
- **Pay by phone** (§22.3): self-hosted SEP-2 federation, keyed phone hashes, SMS OTP, anti-enumeration rate limits, claimable funds with timeout refund for unregistered numbers.
- **USDC-first Wallet Home** with PHP estimate.
- **Gate:** on testnet, a new user onboards with phone + passkey and no XLM, receives USDC, pays a registered number and an unregistered number (claim and timeout refund both work), and creates a Pact, with all fees sponsored and every relayer limit enforced.

**R2 — Tier 1 in-house KYC** (§18.9).
- `inhouse` KYC provider: encrypted media in MinIO via signed URLs, `kyc_job` queue, Python worker (no public endpoint), liveness + face match + sanctions screening, human review console, tier limits.
- **Gate:** a Tier 1 application runs end to end (capture → worker → rules → reviewer decision → status) with media encrypted, access-logged, and deleted on schedule; production refuses to start with `KYC_PROVIDER` unset or `mock`.

**R3 — Zero-knowledge features** (§22.4).
- **zk-KYC credential:** prove verified / 18+ / not sanctioned with a per-app nullifier.
- **zk reputation:** prove Pact history without revealing it; the Risk Lens consumes these proofs.
- **Gate:** a verifier (off-chain at the app, or a separate verifier contract) accepts valid proofs, rejects replays across apps, and the escrow is unchanged.

**R4 — Savings, mini apps platform, Paluwagan** (§22.5, §22.6).
- **Savings** via Blend / DeFindex (variable earnings).
- **Mini apps platform:** sandboxed iframes + PACTA SDK + confirmation sheet + per-app spending limits.
- **First-party mini apps:** Pacts, Savings, Paluwagan (own contract crate), Split bill, Invoices, Remittance, Load.
- **Gate:** a deposit and withdrawal round-trip into a savings vault on testnet; a mini app cannot reach keys or the adapter and every request goes through the confirmation sheet; a Paluwagan cycle completes on testnet.

**R5 — Native app, ramps, launch.**
- Native app (passkeys on iOS/Android).
- SEP-24 anchors / fiat ramps (Tier 2 KYC done by ramp partners).
- Independent audit of every contract that changed or was added, then owner-run mainnet launch prep (`docs/MAINNET_RUNBOOK.md`).
- **Gate:** audits closed, mainnet gates documented, owner sign-off.

**Self-hosted backend** (§22.7) is migrated incrementally across R1 to R5: Node server + Postgres + MinIO + OpenBao replace Vercel functions + Supabase over time.

**Out of scope (not planned in R1 to R5):**
- **Cross-chain / EVM** (`EvmAdapter`, EVM wallets, bridges). The `ChainAdapter` seam keeps it possible; the Soroban escrow stays Stellar-only regardless.
- **Dispute resolution / arbitration** design (the contract reserves an admin role; any design requires an explicit contract reopen).
- **Reputation deepening** (weighted scoring) and a public reputation-ranked directory.

> **Scope discipline:** build only the piece a task names. Do not pull a later R-phase item forward until the current gate passes. "Convert" means crypto/stablecoin assets on Stellar; real fiat rails arrive only with R5 ramp partners.

### 5.4 Success metrics

How we know PACTA is working (post-launch, not hackathon):

| Metric | What it measures | Target (first 90 days) |
|---|---|---|
| Activated wallets | Users who onboarded with phone + passkey and made one transaction | Owner to set |
| Phone payments | Successful pay-by-phone sends; share that went to unregistered numbers and were claimed | Owner to set |
| Claim rate | Claimable funds claimed before timeout | Owner to set |
| Sponsored fee cost per active user | Relayer spend efficiency | Owner to set |
| Agreements created | Adoption / product-market fit of Pacts | 100+ on testnet; 20+ on mainnet |
| Completion rate | `completed / (completed + refunded)` — healthy ecosystem signal | > 70% |
| Repeat usage | Same wallet creating 2+ agreements | > 30% of active wallets |
| Emergency refund rate | Lower = healthier; measures Provider reliability | < 20% |
| Average time to completion | Efficiency of the milestone flow | Declining over time |
| Provider bond-post rate | Providers willing to put skin in the game | > 80% of agreements reach Active |
| Risk Lens apply rate | Users acting on AI recommendations | > 40% of create flows with lens visible |
| Tier 1 pass time | Time from KYC submit to decision | Owner to set |

Pact metrics are readable directly from on-chain data (contract state + events). Wallet metrics come from on-chain data plus aggregate, PII-free counters on the self-hosted backend; no third-party analytics.

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
| New crates (restructure) | `contracts/smart-wallet`, `contracts/paluwagan`, `contracts/zk-verifier` (planned) | Each in its own crate; never changes `pacta-escrow`. Each needs its own tests and an independent audit before mainnet. |

> **SDK version directive for Claude Code:** Initialize with the latest `soroban-sdk` that compiles on the installed toolchain. Prefer v26. The reference implementation in §8 uses only stable APIs (`env.register`, `token::Client`, `require_auth`, persistent storage, events) that are present across v22–v26. If a v26 API differs, adapt minimally and keep behavior identical.

### 6.2 Frontend
| Component | Choice | Notes |
|---|---|---|
| Build tool | **Vite + React + TypeScript** | SPA. Fast, no SSR/HTTPS-on-localhost headaches. A native app is R5. |
| Styling | **Tailwind CSS** | See §12 design direction ("electric glow"). |
| Wallet (optional path) | **`@creit.tech/stellar-wallets-kit`** | Multi-wallet (Freighter, xBull, Albedo) + WalletConnect for mobile. The "connect wallet" path. |
| Wallet (default) | **Passkey (WebAuthn) signer** | Signs for the user's smart-wallet contract account. Passkeys stay on the device. See §22.1. |
| Contract calls | **Generated TypeScript bindings** via `stellar contract bindings typescript` | Type-safe; avoids manual XDR/ScVal handling. |
| Stellar SDK | `@stellar/stellar-sdk` (v13+) | Pulled in transitively by the bindings; used directly only inside `StellarAdapter` and `lib/contract.ts`. |
| Data fetching | TanStack Query (optional) or plain hooks | Plain `useState`/`useEffect` is fine for MVP. |
| Numbers | `bigint` | `i128`/`u64` contract types map to `bigint` in bindings. Pass `1n`, `BigInt(amount)`, etc. |

### 6.3 Wallet layer
| Component | Choice | Notes |
|---|---|---|
| Chain abstraction | **`ChainAdapter` interface** (custom, thin) | `getBalances`, `send`, `getQuote`, `swap`, `signAndSubmit`. UI depends only on this. `StellarAdapter` is the implementation. See §7.2 and `docs/architecture/chain-adapter.md`. |
| Account | **Passkey smart wallet** (default) or external wallet | Soroban contract account with a WebAuthn (secp256r1) signer. External G-accounts via Stellar Wallets Kit stay supported. |
| Fees | **Self-hosted fee relayer** | Fee-bump / sponsorship so users never hold XLM. Rate limits, per-user and global caps, call allowlist. Plugs in behind `signAndSubmit`. See §22.2. |
| Recipient lookup | **Self-hosted SEP-2 federation** | Phone number → address, phone stored only as a keyed hash. See §22.3. |
| Unregistered recipients | **Claimable funds with timeout refund** | Funds wait for the recipient and return to the sender after a timeout. See §22.3. |
| Balances | Horizon / RPC account read | Read balances via `@stellar/stellar-sdk` behind `StellarAdapter.getBalances`. USDC is the default view. |
| Display value | Deterministic in code | USDC shown in PHP as a labeled estimate from live rates; never invented by the model. |
| Send (plain) | Payment / path-payment or SAC transfer | Signed by the user's passkey or external wallet; fee sponsored. |
| Convert (swap) | **Stellar DEX / path payments** | `getQuote` uses strict-send/strict-receive path finding; `swap` submits a path-payment. On-chain, atomic, no custody. |
| Send protected | The frozen escrow (§8) | The Pact path calls the existing contract through `lib/contract.ts`; no escrow change. |
| Savings | **Blend / DeFindex** | Variable earnings, not guaranteed. See §22.5. |
| Mini apps | **Sandboxed iframes + PACTA SDK** | No keys, no adapter access; every request is simulated and confirmed. See §22.6. |

> **Multi-chain note.** Stellar-only. Multi-chain (EVM) is out of scope for R1 to R5; the `ChainAdapter` seam keeps it possible later. The Soroban escrow is Stellar-only permanently.

### 6.4 Self-hosted backend (restructure)
| Component | Choice | Notes |
|---|---|---|
| API server | **Node** | Replaces Vercel functions over time. Hosts KYC, Risk Lens, federation, OTP, relayer, and mini app registry endpoints. |
| Database | **Postgres** | Replaces Supabase over time. Deny-by-default access; PII minimized (§18). |
| Object storage | **MinIO** | Encrypted KYC media for the `inhouse` provider only, via short-lived signed URLs, access-logged. |
| Secrets / keys | **OpenBao** | Holds the relayer's fee-paying key, HMAC keys, session secrets, and media encryption keys. No secret in env files on disk in production. |
| KYC worker | **Python** | Pulls `kyc_job` items; no public endpoint. |
| Third parties (only where unavoidable) | Fiat ramps / anchors, the USDC issuer, SMS delivery, app stores | Plus Google Gemini for the Risk Lens text, Didit as the hosted KYC provider until `inhouse` lands, and Blend / DeFindex protocols for Savings. Never send PII to a third party that does not need it. |

---

## 7. System architecture

```
┌──────────────────────────────────────────────────────────────┐
│                         Browser (SPA)                          │
│  React + Vite + Tailwind                                       │
│                                                                │
│  ┌───────────────┐   ┌──────────────────┐   ┌──────────────┐   │
│  │  UI Screens   │──▶│ Generated TS     │──▶│ Passkey or   │   │
│  │  (§9.4)       │   │ contract bindings│   │ Wallets Kit  │   │
│  └───────────────┘   └──────────────────┘   └──────┬───────┘   │
│         │                     │                     │ sign      │
└─────────┼─────────────────────┼─────────────────────┼──────────┘
          │ read (simulate)     │ write (relayer or    │
          ▼                     ▼  direct submit)      ▼
   ┌─────────────────────────────────────────┐   ┌─────────────┐
   │     Soroban RPC (testnet)               │   │  Device     │
   │  https://soroban-testnet.stellar.org    │   │  passkey /  │
   └────────────────────┬────────────────────┘   │  Freighter  │
                        ▼                        └─────────────┘
            ┌───────────────────────────┐
            │  PactaEscrow contract      │
            │  (Soroban, on Stellar)     │
            │  + SAC token (XLM/USDC)    │
            └───────────────────────────┘
```

**The escrow has no backend server.** The Soroban contract is the backend for the escrow: it holds the funds and enforces the agreement between the two parties. All escrow state lives on-chain. Reads are free RPC simulations; writes are user-signed transactions (submitted directly or through the fee relayer, which can only pay the fee). The Risk Lens (§17), the KYC identity layer (§18), and the restructure services (§6.4, §22) are server components that **never hold a user's funds or keys**, are not part of the escrow, and do not change the contract. Today KYC runs on Supabase behind `api/kyc-*.ts`; the self-hosted backend replaces it over time. See `CLAUDE.md` "Identity / KYC layer" and `supabase/migrations/`.

### 7.1 Wallet-layer architecture (the app the user opens)

The wallet layer is a presentation + client-plumbing layer on top of accounts the user controls. It adds **no custody**: balances are read from the chain, sends/converts are standard user-signed Stellar operations, and "Send protected" calls the frozen escrow.

```
┌──────────────────────── Browser (SPA, mobile-first) ────────────────────────┐
│  React + Vite + Tailwind                                                     │
│                                                                              │
│  Wallet surfaces:  Home (USDC in PHP) · Send (phone/address) · Receive ·     │
│                    Convert · Activity · Profile/KYC · Pacts · Savings · Apps │
│        │                                         ▲                           │
│        │                       Mini apps (sandboxed iframes) ── PACTA SDK ──┘ │
│        ▼                       (confirmation sheet + per-app limits)          │
│  ┌───────────────────────── ChainAdapter (interface) ─────────────────────┐ │
│  │  getBalances · send · getQuote · swap · signAndSubmit                   │ │
│  │  implemented by StellarAdapter                                          │ │
│  │  signAndSubmit → passkey signer (default) or Wallets Kit (optional)     │ │
│  │                → fee relayer (sponsored) or direct submit               │ │
│  └───────────┬───────────────┬───────────────────────┬────────────────────┘ │
│              │ read          │ pay / swap            │ send protected        │
│              ▼               ▼                       ▼                        │
│      Horizon / RPC     Stellar DEX / SAC      PactaEscrow contract (§8)       │
│      (balances)        transfers / claims     via lib/contract.ts bindings    │
│                                                                              │
│  Same-origin /api/*:  Risk Lens · KYC · federation · OTP · relayer · apps    │
└──────────────────────────────────────────────────────────────────────────────┘
```

**Trust boundaries (what each server component may and may not do):**
- **Fee relayer:** may pay network fees for transactions the user already signed, if the call is on the allowlist and within rate limits and caps. May not sign for a user, change a transaction, or move user funds.
- **Federation server:** may map a keyed phone hash to an address. May not store raw phone numbers after OTP verification, or answer bulk or enumerating lookups.
- **OTP service:** may send and verify SMS codes. May not log phone numbers in plain text.
- **KYC (today Supabase, later self-hosted):** may store status, provider reference, document metadata, keyed hashes, masked name, consent, and a PII-free audit log; for `inhouse` only, encrypted media under a retention policy. Gates the app UI only; never holds funds.
- **KYC worker:** pulls jobs, has no public endpoint, and cannot make a final decision alone (rules plus human review decide).
- **Risk Lens:** requires a session, is rate-limited, validates its input, and sends only public on-chain stats (or, from R3, proofs) to the model.
- **Mini app host:** serves sandboxed apps. Mini apps never see keys or call the adapter directly; the wallet simulates and asks the user to confirm every request.

### 7.2 The chain-adapter layer (`ChainAdapter`)

Every wallet surface depends only on the `ChainAdapter` interface, never on `@stellar/stellar-sdk`, Horizon, or the generated bindings directly. This is the single seam that lets the passkey wallet and fee relayer slot in without touching the UI.

- **`getBalances(address)` → `AssetBalance[]`** — the account's holdings, with human amounts and display value.
- **`send({ to, asset, amount })` → `TxResult`** — a plain payment (the "Send now" path). `to` is an address; phone numbers are resolved through federation before `send`, and unregistered numbers use the claimable-funds path.
- **`getQuote({ from, to, amount })` → `Quote`** — a convert quote via path finding.
- **`swap(quote)` → `TxResult`** — execute a convert (path payment).
- **`signAndSubmit(tx)` → `TxResult`** — user-signed submission, shared by all write paths. The passkey signer and fee relayer plug in here (signing and submission), not around the interface.

The **protected send** path does not go through `send`/`swap`; it calls the frozen escrow through the existing bindings (`lib/contract.ts`), so the Pact logic is untouched. Mini apps reach the wallet only through the PACTA SDK, never the adapter. `StellarAdapter` is the only implementation. The interface contract and rationale live in **`docs/architecture/chain-adapter.md`**.

---

## 8. Smart contract specification

Contract crate name: `pacta-escrow`. Contract struct: `PactaEscrow`.

> **Security reopen (2026-07-27).** This section was previously frozen. It was reopened to fix the fund-loss / fund-lock / griefing findings in `docs/PRE_AUDIT_REVIEW.md` (design: `docs/superpowers/specs/2026-07-27-escrow-security-hardening-design.md`; plan: `docs/superpowers/plans/2026-07-27-escrow-security-hardening.md`). Changes are ABI backward compatible: no changed signatures/structs, one additive method (`reclaim_bond`). Key behavior changes: the final `release_milestone` now auto-returns the bond and completes; `complete` is idempotent; the recipient can `reclaim_bond` from Pending; outbound transfers follow checks-effects-interactions. The rebuilt WASM is redeployed to testnet and must be re-audited before any mainnet deploy (`docs/MAINNET_RUNBOOK.md`). §8.6/§8.7 below mirror `contracts/pacta-escrow/src/{lib,test}.rs`, which are authoritative.

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
   │ final milestone released                     │ deadline passed, trader failed
   │ (auto-returns bond + completes)              │
   ▼                                               ▼
┌───────────┐                              ┌───────────┐
│ Completed │  bond → trader               │ Refunded  │  unreleased capital + bond → investor
└───────────┘  reputation.completed++      └───────────┘  reputation.refunded++
```

`complete` remains callable as an idempotent no-op on an already-Completed Pact (kept for ABI/UI compatibility). A recipient stuck in `Pending` (sender never funds) can call `reclaim_bond` to recover their bond, which cancels the Pact.

### 8.2 Money rules (exact semantics)
- On `deposit_capital`: investor transfers `capital` into the contract.
- On `post_bond`: trader transfers `bond` into the contract.
- On `release_milestone`: contract transfers one tranche (`capital / milestones`, last milestone gets the remainder to avoid rounding dust) to the trader. Tracks `released_amount`. On the **final** milestone it also returns `bond` to the trader and sets `Completed` (so a fully-performed Pact's bond can never be seized by `emergency_refund`).
- On `complete`: idempotent. On an already-`Completed` Pact it is a no-op; otherwise (all milestones released) it returns `bond` to the trader and sets `Completed`. (Profit settlement is roadmap.)
- On `emergency_refund` (only after `deadline`, only while `Active`): contract transfers `(capital − released_amount) + bond` to the investor. The trader forfeits the bond.
- On `cancel` (only while `Pending`, investor-authorized): refund any posted capital to investor and any posted bond to trader.
- On `reclaim_bond` (only while `Pending`, trader-authorized, bond posted): return the bond to the trader and any deposited capital to the investor, then set `Cancelled`. Lets the recipient exit if the sender never funds the Pact.

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
complete(agreement_id: u64)              // idempotent; no-op if already Completed
emergency_refund(agreement_id: u64)
cancel(agreement_id: u64)
reclaim_bond(agreement_id: u64)          // trader exit from Pending; returns bond
get_agreement(agreement_id: u64) -> Agreement
get_reputation(trader: Address) -> Reputation
get_count() -> u64
```

Authorization:
- `create_agreement`, `deposit_capital`, `release_milestone`, `complete`, `emergency_refund`, `cancel` → `require_auth(investor)`.
- `post_bond`, `reclaim_bond` → `require_auth(trader)`.

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
        Self::bump_instance(&env);
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
        Self::bump_instance(&env);

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
        // Effects persisted before any token transfer (checks-effects-interactions).
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

    pub fn cancel(env: Env, agreement_id: u64) -> Result<(), Error> {
        let mut a = Self::load(&env, agreement_id)?;
        a.investor.require_auth();
        if a.status != Status::Pending {
            return Err(Error::InvalidState);
        }
        a.status = Status::Cancelled;
        // Effects persisted before any token transfer (checks-effects-interactions).
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

    /// Lets the recipient (the `trader` field) exit a Pending agreement and
    /// recover their bond if the sender never funds it. There is no deadline in
    /// Pending, so without this the bond could be stranded by an absent sender.
    /// Returns the bond to the recipient and any already-deposited capital to the
    /// sender, then cancels.
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
        // Effects persisted before any token transfer (checks-effects-interactions).
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

    // Keep the instance entry (Admin, Counter) alive so it is not archived during
    // quiet periods; persistent entries bump their own TTL in save/bump_reputation.
    fn bump_instance(env: &Env) {
        env.storage()
            .instance()
            .extend_ttl(LIFETIME_THRESHOLD, BUMP_AMOUNT);
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
fn reclaim_bond_rejected_once_active() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let investor = Address::generate(&env);
    let trader = Address::generate(&env);

    let (token_addr, token_admin) = setup_token(&env, &admin);

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
    client.deposit_capital(&id); // both in -> Active
    // Once Active, the bond is committed; reclaim is rejected.
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
    // Second bond post is rejected once bonded / Active.
    assert!(client.try_post_bond(&id).is_err());

    client.deposit_capital(&id);
    // Second deposit is rejected (now Active).
    assert!(client.try_deposit_capital(&id).is_err());
}
```

Run with `stellar contract build` then `cargo test` (or just `cargo test` from the contract dir).

> If `register_stellar_asset_contract_v2` or `register` signatures differ in the installed SDK version, adjust the test helpers only — the contract logic is version-stable.

---

## 9. Frontend specification

### 9.1 Principles
- **Wallet-native by design (see §1.4):**
  - Wallet is login — confirm with your passkey (or connect a wallet) and you're in
  - Wallet is identity — your address IS your profile
  - Wallet is reputation — on-chain history is your track record, portable to any app
  - Wallet is authority — only your signature moves funds
  - No secrets in browser storage; no server ever holds funds or keys
- **The wallet is the front door.** Wallet Home (USDC balance in PHP + Send / Receive / Convert) is the default screen after onboarding or connect. Escrow is reached through Send ("Send protected") and lives under the Pacts surface, never as the landing surface.
- **USDC first.** The default view shows only USDC. Other assets the user already holds stay visible in a secondary list; the user is never asked to buy or hold XLM.
- **Pesos are estimates.** Every PHP figure is computed in code from a live rate and labeled as an estimate (for example "≈ ₱5,820.00 est."). Amounts are entered and settled in USDC.
- **Phone numbers are first-class recipients.** The recipient field accepts a PH mobile number or a Stellar address; phone numbers are resolved through federation (§22.3).
- Keep each action to one screen. The only intentional branch is **Send** (choose Send now vs Send protected); avoid other multi-step wizards (onboarding and KYC capture are the exceptions).
- The wallet **is** the login. No passwords, no seed phrase, no backend for money; keys stay on the user's device or in their own wallet (no custody).
- **Display value is computed, never invented.** Balances, PHP estimates, and quotes come from live on-chain reads and rates in code; the AI touches only the Risk Lens text, never the numbers.
- Optimistic but honest: show pending state while a tx is in flight; refetch balances / the affected Pact after confirmation.
- Amounts shown to users are human (e.g. `1.50 USDC`); convert to/from base units (×/÷ 10,000,000) at the boundary.

### 9.2 Wallet integration

> **Restructure note.** The default signer is the user's **passkey** for their smart-wallet contract account (§22.1), wired behind `ChainAdapter.signAndSubmit`. The Stellar Wallets Kit integration below stays as the optional "connect wallet" path and as the signer for external G-accounts.

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

The app is a **wallet first**. The default screen after onboarding is Wallet Home, not an escrow dashboard. Navigation is a floating pill bottom nav (§12). The baseline tab set is **Home · Convert · Pacts · Activity · Profile**; the R1 design may regroup it (for example Home · Apps · Activity · Profile, with Pacts and Savings as mini apps). Escrow is reached through the Send flow ("Send protected") and through the Pacts surface; it is never the front door.

1. **Landing / Onboarding** — short value prop ("Dollars in your pocket, pesos on your screen, protection when it matters"), "Get started" (phone + OTP + create passkey) and a secondary "Connect a wallet" link. After onboarding, route to Wallet Home.
2. **Wallet Home (default)** — the hero card shows the USDC balance with the PHP estimate, the user's phone number or truncated address, and a `testnet` badge when not on mainnet. Below: the primary actions **Send · Receive · Convert**, then a compact asset list (USDC first; other held assets in a secondary list) read via `ChainAdapter.getBalances`. A compact "recent activity" strip links to Activity. From R4: Savings balance and an Apps row.
3. **Receive** — the user's phone number and address as text + QR, copy buttons, optional amount request. No signing.
4. **Send (the fork)** — step 1: recipient (phone number or address), amount in USDC with the PHP estimate (validate amount > 0, ≤ balance). The recipient row shows whether a phone number is on PACTA, without revealing anything else about the account. Step 2: choose **Send now** or **Send protected**.
   - **Send now** → confirmation sheet (amount, PHP estimate, recipient, effect, "network fee: covered by PACTA") → `ChainAdapter.send` (or claimable funds for an unregistered number, with the claim deadline stated) → passkey → success with tx hash.
   - **Send protected (a Pact)** → only for a registered recipient → the **Risk Lens** renders the recipient's trust read (§17) → set terms (bond, milestones, duration; "Apply suggested protection" sets milestones) → **KYC gate (Tier 1)** (§18) if not verified → `create_agreement` then `deposit_capital` → the new Pact appears under Pacts. (`profit_share_bps` is legacy, hidden, passed as a default.)
5. **Convert** — from-asset → to-asset selectors + amount; a live quote from `ChainAdapter.getQuote` (rate, minimum received, path); confirm → `ChainAdapter.swap` → sign → balances refetch. Graceful "no route" and slippage handling. Secondary in the USDC-first experience.
6. **Pacts (protected payments)** — list of the connected wallet's Pacts (iterate `get_count()` then `get_agreement(i)`), filterable "As sender" / "As recipient". Each card: counterparty, funds, bond, status pill, milestone progress bar. Tapping opens **Pact Detail**.
7. **Pact Detail** — full terms, status, milestone progress, deadline countdown, and the action buttons valid for the connected role/state (unchanged escrow semantics):
   - Recipient + Pending + not bonded → **Post Bond**
   - Recipient + Pending + bonded → **Reclaim Bond** (cancels the Pact; any deposit returns to the sender)
   - Sender + Pending + not deposited → **Deposit Funds**
   - Sender + Active + milestones remaining → **Release Milestone** (the final release auto-completes and returns the bond)
   - Sender + Active + all milestones released → **Complete**
   - Sender + Active + `now ≥ deadline` → **Emergency Refund**
   - Sender + Pending → **Cancel**
   The dark proof panel shows the on-chain receipt (contract ID, tx hashes, event log) for this Pact.
8. **Activity** — a unified feed across payments, phone payments (including pending claims and timeout refunds), swaps, savings moves, mini app transactions, and Pact events, newest first, each row linking to Stellar Expert.
9. **Profile / Verify** — phone number (masked), address, **KYC tier + identity badge** (§18), linked wallets, passkey and recovery settings, and the wallet's own on-chain **reputation** (`✓ {completed}  ⚠ {refunded}  Σ {volume}`). The verify flow lives here.
10. **Savings (R4)** — vaults with their current variable rate shown as information, the words "variable earnings, not guaranteed", deposit and withdraw. Never "interest", never a fixed rate.
11. **Apps (R4)** — the mini app list; opening one loads it in a sandboxed iframe; every transaction request opens the PACTA confirmation sheet.
12. **Reputation badge (component)** — wherever a recipient appears (Risk Lens, Pacts, Activity, Profile), show `✓ {completed}  ⚠ {refunded}  Σ {volume}` from `get_reputation`.

### 9.5 State & UX details
- After any write, poll/refetch the affected balances / agreement (RPC may take a few seconds to reflect new state).
- Disable action buttons while a tx is pending; show a spinner + the tx hash on success.
- Surface contract errors by code (map `Error` enum numbers → friendly messages, e.g. `10 → "The deadline hasn't passed yet."`).
- Countdown to `deadline` on Active agreements so the Emergency Refund availability is obvious.
- Countdown to the claim timeout on pending phone payments so the sender knows when an unclaimed payment returns.
- Relayer refusals (rate limit, cap, not allowlisted) show a plain message and never fall back to asking the user for XLM silently.

### 9.6 Security UX (wallet-as-login, hardened)

PACTA stays non-custodial: the wallet is the only login. There are **no passwords, no seed phrase, no backend for money, and no browser storage of secrets**. Passkeys stay on the user's device. The following rules harden the experience without changing that model or any contract call:

- **Network guard.** For external wallets, read the wallet's network (best effort). If it does not match the app's network, show a persistent warning banner so the user does not sign against the wrong network. If the network cannot be determined, do not block. The passkey wallet always uses the app's configured network.
- **Confirm before signing.** Every fund-moving action (send now, pay by phone, convert, savings deposit/withdraw, post bond, deposit, release, complete, emergency refund, cancel, reclaim bond, and every mini app request) opens a plain-language confirmation sheet stating the amount, the PHP estimate, the counterparty or the from/to assets, and the effect before the signature is requested. Nothing is signed blindly. Copy follows §12/DESIGN voice (sentence case, no jargon, names the effect the user controls).
- **Mini app limits.** Mini apps never see keys. Every transaction they request is simulated, shown in the PACTA confirmation sheet, and capped by a per-app spending limit the user controls.
- **Inactivity auto-lock.** After 15 minutes of no interaction the app locks and requires the passkey again (external wallets are disconnected), with a dismissible notice explaining why. Any interaction resets the timer.
- **Trust cues retained.** Persistent `testnet` badge off mainnet, contract ID linked to Stellar Expert, and tx hashes linked on success.

These are functional-UX additions; the contract interface in §8.5 is unchanged.

### 9.7 Responsive layout (website + mobile)

The app is **mobile-first** (most users are on phones) and also a comfortable desktop website. One implementation, fluid across breakpoints; a native app follows in R5.

- **Shell.** Floating pill bottom nav on mobile that becomes a side rail or top nav on desktop. Content shares a centered container that grows to a wide max width on desktop; screen padding stays comfortable from 360px up.
- **Landing.** Single column on mobile; two-column hero (copy beside the proof panel) on desktop. "How it works" stacks on mobile, three across on wider screens.
- **Wallet Home.** Hero card + action buttons full-width on mobile; the asset list is a one-column list on mobile, two columns at large. On desktop the recent-activity strip can sit beside the asset list.
- **Send / Convert.** Comfortably narrow centered column on all sizes (money forms read better narrow); the Send fork (Send now vs Send protected) is a clear two-option choice, not a hidden toggle.
- **Pacts list.** Pact cards are a one-column list on mobile, two columns at the small breakpoint, three at large.
- **Pact detail.** Single stacked column on mobile (amount, parties, milestones, deadline, actions, proof). On desktop it splits into a main column plus a sticky aside holding the actions and the proof panel.
- **Profile / Verify / Onboarding.** Stay in a comfortably narrow centered column on all sizes.
- **Quality floor (DESIGN §10).** Tap targets stay at least 44px, WCAG AA contrast in both themes, every interactive element shows a visible focus ring, motion respects `prefers-reduced-motion`, and amounts use tabular mono with thousands separators.

> Visual tokens, components, and exact styling live in **`docs/product/DESIGN.md`** (which supersedes §12). This section captures only the behavioral/layout contract.

---

## 10. Repository structure

```
pacta/
├── README.md
├── CLAUDE.md                       # build notes / context for Claude Code (§16)
├── contracts/
│   ├── pacta-escrow/               # FROZEN (§8)
│   │   ├── Cargo.toml
│   │   └── src/
│   │       ├── lib.rs              # §8.6
│   │       └── test.rs             # §8.7
│   ├── smart-wallet/               # planned (R1): passkey contract account (§22.1)
│   ├── paluwagan/                  # planned (R4): rotating savings circle
│   └── zk-verifier/                # planned (R3, if verification is on-chain)
├── Cargo.toml                      # workspace
├── packages/
│   ├── pacta/                      # generated TS bindings (do not edit by hand)
│   └── sdk/                        # planned (R4): PACTA SDK for mini apps
├── api/                            # current Vercel functions (Risk Lens, KYC); migrated to server/ over time
├── server/                         # planned: self-hosted Node backend (§6.4, §22.7)
├── kyc-worker/                     # planned (R2): Python KYC worker, no public endpoint
├── supabase/migrations/            # current KYC schema; Postgres migrations move with server/
└── frontend/
    ├── index.html
    ├── package.json
    ├── vite.config.ts
    ├── tailwind.config.js
    ├── postcss.config.js
    ├── tsconfig.json
    └── src/
        ├── main.tsx
        ├── App.tsx                 # tab-shell routing
        ├── lib/
        │   ├── wallet.ts           # §9.2 (Stellar Wallets Kit, optional path)
        │   ├── contract.ts         # §9.3 (frozen escrow bindings)
        │   ├── adapters/
        │   │   ├── ChainAdapter.ts # §7.2 interface (getBalances/send/getQuote/swap/signAndSubmit)
        │   │   └── StellarAdapter.ts # the only impl; passkey signer + relayer plug in here
        │   ├── prices.ts           # display-value / PHP estimate lookup (deterministic)
        │   └── format.ts
        ├── hooks/
        │   ├── useWallet.ts        # also exposes kycStatus (§18)
        │   ├── useBalances.ts      # portfolio via ChainAdapter.getBalances
        │   ├── useConvert.ts       # quote + swap
        │   ├── usePacts.ts         # (was useAgreements) protected payments
        │   └── useRiskLens.ts      # §17 (existing)
        ├── components/
        │   ├── ConnectButton.tsx
        │   ├── BalanceHeader.tsx   # hero card: USDC + PHP estimate + address/phone + testnet badge
        │   ├── AssetRow.tsx        # one holding
        │   ├── SendFork.tsx        # Send now vs Send protected choice
        │   ├── ConvertCard.tsx     # from/to + quote
        │   ├── PactCard.tsx        # (was AgreementCard)
        │   ├── ReputationBadge.tsx
        │   ├── RiskLens.tsx        # §17 (existing)
        │   ├── kyc/                # §18 (existing): KycGate, IdentityBadge, ConsentStep, …
        │   ├── StatusPill.tsx
        │   ├── ProofPanel.tsx      # on-chain receipt / signature element
        │   └── MilestoneBar.tsx
        └── pages/
            ├── Landing.tsx
            ├── Home.tsx            # Wallet Home (default)
            ├── Send.tsx            # the fork
            ├── Receive.tsx
            ├── Convert.tsx
            ├── Pacts.tsx           # (was Dashboard) list of protected payments
            ├── PactDetail.tsx      # (was AgreementDetail)
            ├── Activity.tsx
            └── Profile.tsx         # profile + Verify (KYC) + reputation
```
> Directories marked "planned" do not exist yet; each is created by its own R-phase task. Onboarding, Savings, and Apps screens are added by their tasks. Files marked "(was …)" are renames of earlier escrow screens. Risk Lens (§17) and KYC (§18) files keep their roles; the Risk Lens rides inside `Send.tsx` and KYC gates the Send-protected commitment.

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

**New crates (restructure):** the smart wallet, Paluwagan, and zk verifier crates follow the same build / test / deploy steps, deploy to **testnet only** from this tooling, and never change `pacta-escrow`. Mainnet deploys stay owner-run, key-signed, and gated OFF by default via env (`VITE_MAINNET_PACTS_ENABLED` + mainnet contract id + settlement SAC), and every new or changed contract needs an independent audit first (`docs/MAINNET_RUNBOOK.md`).

---

## 12. Design direction

PACTA protects people's money, so it must look **trustworthy, precise, and calm**, with an energetic, modern feel that fits a consumer wallet. The design system is **"electric glow"**; mockups are on the PACTA Electric Blue Mockup canvas. Exact tokens and components live in **`docs/product/DESIGN.md`**, which must be updated to match this section in the R1 design-system task.

- **Themes:** dark mode is the default, with a light mode.
  - **Dark:** background `#05060B` with a top radial glow `rgba(43,92,255,0.38)`; text `#F5F4EF`; muted `#9AA0B4`; blue text `#7C9BFF`.
  - **Light:** background `#F5F4EF` with glow `rgba(43,92,255,0.2)`; text `#0A0A0B`; muted `#5A5E70`; blue text `#1F4FE0`; cards `#FFFFFF` with border `rgba(43,92,255,0.14)`.
- **Accent:** `#2B5CFF`. **Primary button:** gradient `#5B86FF → #2B5CFF`, pill shape, glow shadow, off-white text.
- **Hero card:** radial gradient `#5B86FF → #2B4BE8 → #14208A → #0B0F33`, holding the USDC balance and PHP estimate.
- **Components:** glass cards, ring avatars, a floating pill bottom nav, status pills, a clear milestone progress bar, and a live deadline countdown. Generous spacing; no clutter.
- **Type:** **Plus Jakarta Sans** for UI; **JetBrains Mono** for numbers, amounts, addresses, IDs, and status codes (it reads as "verifiable / on-chain").
- **Trust cues everywhere:** show the contract ID (linked to Stellar Expert), tx hashes (linked), reputation counts, and "fee covered by PACTA" where the relayer sponsored a transaction. Make "your money is in a contract, here's the proof" the emotional core of the Pact UI. The dark **proof panel** is reused as the receipt surface for sends, swaps, and Pacts.
- **Wallet surfaces.** Wallet Home leads with the hero card (USDC balance in mono, PHP estimate labeled "est.", phone or truncated address, `testnet` badge off mainnet) and three obvious actions: Send, Receive, Convert. The **Send fork** presents "Send now" and "Send protected" as two clearly labelled choices with a one-line explanation each, never a buried toggle. Protection is visually elevated (the accent + a small shield cue) so the wallet's differentiator stays visible without shouting.
- **Accessibility:** tap targets at least 44px; WCAG AA contrast in both themes; visible focus rings; respects `prefers-reduced-motion`.
- **Microcopy:** plain, warm, and reassuring, written for everyday Filipino users. "Send it now, or send it protected and release step by step." "Your funds stay in the contract until you release them." "Variable earnings, not guaranteed." No jargon in the primary flow (no "gas", "trustline", or "seed phrase"). A protected payment is a **Pact**.
- **No em-dashes in UI copy.**

---

## 13. Demo script (the click-path judges will see)

Set up beforehand: two browser profiles (or two wallets in Freighter) — **sender (Client)** and **recipient (Provider)** — both funded on testnet. Use the native XLM SAC as the settlement token. The contract is already deployed; bindings generated; app running.

**Act 1 — It's a wallet (15s):** Connect the sender's wallet. Land on **Wallet Home**: portfolio total, XLM/USDC balances, and the three actions Send · Receive · Convert. "PACTA is a wallet you already know how to use: hold your money, send it, receive it, convert it."

**Act 2 — Convert (20s):** Open **Convert**, quote XLM → USDC, show the live rate and minimum received, sign, watch balances update. "Native Stellar swap, no custody, a few seconds." (Optional; skip if time is tight.)

**Act 3 — The twist: Send protected:** Open **Send**, enter the recipient, asset, and amount = 100 XLM. At the fork, choose **Send protected**. "Any wallet can send now. PACTA can also send *protected*."

**Act 4 — The Risk Lens (15s):** The **Risk Lens** reads the recipient's on-chain history and shows a plain-language trust read. "Before I commit, PACTA tells me how trustworthy this counterparty looks, from chain data only." Set terms: bond = 20 XLM, **milestones = 4**, **duration = 60 seconds**. (If the wallet is unverified, the **KYC gate** appears here.)

**Act 5 — Create + fund the Pact:**
1. Confirm → sign to create the Pact and deposit 100 XLM. It appears under **Pacts** in `Pending`.
2. Switch to the recipient → open the incoming Pact → **Post Bond** (20 XLM). Sign.
3. The Pact flips to `Active`. "120 XLM is now held by the contract, not by either person. Here's the proof panel and the contract on Stellar Expert." The deadline countdown starts.

**Act 6 — Staged release (sender):** **Release Milestone** once → 25 XLM goes to the recipient. Progress bar 1/4. "The sender only exposes a quarter at a time. Trust is earned, not assumed."

**Act 7 — The save (sender):** When the 60-second deadline elapses (it will during the narration above), **Emergency Refund** activates. Click it, sign. The sender receives 75 XLM unreleased **plus** the 20 XLM bond = 95 XLM back. Status → `Refunded`. Open the recipient's **reputation**: refunded count is now 1. "The bad actor is recorded forever. The next sender will see this."

**Act 8 — The happy ending (optional, fresh Pact):** run a short Pact, release all milestones, **Complete** → bond returns to the recipient, reputation `completed` increments. "When the recipient delivers, they get their bond back and a verifiable track record that wins them future work."

**Close (10s):** "PACTA: a wallet where your money is yours to move, and protected the moment it matters. Built entirely on Stellar and Soroban. Trust, written in code."

### 13.1 R1 demo outline (restructure)

Once R1 lands, the demo opens with the new wallet before the Pact story above:
1. **Onboard (20s):** enter a phone number, enter the SMS code, create a passkey with fingerprint or face unlock. No seed phrase, no XLM. Land on Wallet Home with the hero card.
2. **Pesos on screen (10s):** receive testnet USDC; the hero card shows the USDC balance with the PHP estimate.
3. **Pay by phone (20s):** send to a registered number (instant) and to an unregistered number (claimable funds with a visible claim deadline). Point out "network fee: covered by PACTA".
4. **Send protected:** continue with Acts 3 to 8 above, using the passkey wallet as the sender.

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
| Scope creep | Build only the piece a task names; each R-phase is a gate (§5.3b). Freeze the contract interface (§8.5). |
| Multi-chain temptation pulls focus | Stellar-only. EVM stays behind the `ChainAdapter` seam and is out of scope for R1 to R5. |
| Convert has no path / thin liquidity on testnet | Use strict-send/strict-receive path finding; show "no route" and slippage honestly; fall back to XLM↔USDC which has reliable testnet paths for the demo. |
| Wallet layer mistaken for custody | State plainly in UI and docs: PACTA never holds keys or funds; the passkey lives on the user's device; every move is user-signed. |
| "Convert to currencies" misread as fiat | Convert is crypto/stablecoin only; fiat on/off-ramp (SEP-24) arrives in R5 with licensed partners. |
| Relayer abuse or drain | Call allowlist (only known contracts and methods), per-user and global rate limits, per-transaction and daily caps, fee ceiling, fee-paying key in OpenBao, monitoring and a kill switch. The relayer never signs user operations. |
| Phone number enumeration | Keyed-hash lookups only, anti-enumeration rate limits per session, device, and IP, uniform responses, no bulk lookup endpoint, OTP before registration. |
| SMS cost and OTP fraud (SMS pumping) | Per-number and per-IP OTP limits, PH-only number validation, short code expiry, provider fraud controls, spend alerts. |
| Passkey loss or device loss | Documented recovery method (§22.1, owner decision) set up during onboarding; clear warnings before removing the last signer. |
| Unclaimed phone payments | Claimable funds return to the sender after the timeout; the sender sees the deadline. |
| KYC media breach (`inhouse`) | Encrypted at rest with keys in OpenBao, short-lived signed URLs, access logging, fixed retention with scheduled deletion, worker has no public endpoint, least-privilege review console. |
| Single model decides KYC wrongly | Rules plus human review make every final decision; models only produce signals. |
| ZK circuit or verifier bugs | Use audited, widely used proving systems; independent review of circuits and any verifier contract; per-app nullifiers; ZK never gates fund-returning actions. |
| Savings protocol risk (Blend / DeFindex) | "Variable earnings, not guaranteed" copy; show the protocol name and risk note; never present a fixed rate; allow withdrawal whenever the vault allows. |
| Malicious or buggy mini app | Sandboxed iframes, no key or adapter access, every request simulated and confirmed in the PACTA sheet, per-app spending limits, review before listing, revocation. |
| Regulatory (AML covered entity, e-money, remittance) | Tiered KYC with tier limits, sanctions screening at Tier 1, ramps handled by licensed partners at Tier 2, configurable AML retention, legal review before mainnet. |
| Backend migration regressions (Vercel/Supabase → self-hosted) | Migrate one service at a time behind the same `/api/*` contract; keep security checks identical or stronger; never weaken a check to migrate. |

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

> **Phase B: Mainnet Pacts (code-ready, gated off).** The wallet layer runs on mainnet or testnet (Phase A). Protected payments (Pacts) are wired for mainnet USDC settlement but held behind a three-part env gate (`VITE_MAINNET_PACTS_ENABLED` + `VITE_MAINNET_ESCROW_CONTRACT_ID` + `VITE_MAINNET_SETTLEMENT_SAC`) and stay OFF until the escrow contract is security-audited and the owner deploys the same (frozen, §8) WASM to mainnet. Design: `docs/superpowers/archive/specs/2026-07-25-mainnet-pacts-phase-b-design.md`. §8 remains byte-for-byte frozen; Phase B changes no contract code.

**Goal:** Reshape PACTA into a **MiniPay-style stablecoin wallet** for Filipino users on Stellar, per this PRD: USDC only, pay by phone number, balances in PHP, no XLM or seed phrase, with Pacts, tiered KYC, and zero-knowledge privacy. The Soroban escrow contract is **built, deployed, and frozen** (§8): do not modify, rename, or redeploy it unless a task explicitly reopens it. New on-chain code lives in its own crates. No backend for money; the contract is the backend for protection and server components never hold funds. The product name is "PACTA" everywhere in human-readable copy; a protected payment is a "Pact". Code identifiers stay on the legacy `pacta` form (crate `pacta-escrow`, struct `PactaEscrow`, package `packages/pacta`, alias `pacta_escrow`, on-chain fields `investor`/`trader`). Never "Katiwala" or "PactAI".

**Baseline:** Phases 0 to 4 (§5.1 to §5.3a) are shipped (owner to confirm).

**Ordered phases (each is a GATE; see §5.3b; each listed piece is its own task):**
1. **R1:** security fixes (contract hardening via explicit reopen only, backend fixes, dependency updates) + "electric glow" design system (§12) + passkey smart wallet (§22.1) + fee relayer (§22.2) + pay by phone (§22.3).
2. **R2:** Tier 1 in-house KYC: worker, liveness, review console (§18.9).
3. **R3:** zk-KYC credential and zk reputation (§22.4).
4. **R4:** Savings (§22.5) + mini apps platform and Paluwagan (§22.6).
5. **R5:** native app, SEP-24 anchors / fiat ramps, audit and launch prep.

**Guardrails:**
- **Do not touch the escrow contract** unless the task explicitly reopens it; then follow the reopen procedure in CLAUDE.md (update §8 first, keep the ABI compatible, tests, testnet only, regenerate bindings, update `CONTRACT_ID`, record in `docs/AUDIT_BRIEF.md`, re-audit before mainnet).
- All wallet surfaces depend only on the `ChainAdapter` interface, never on `@stellar/stellar-sdk`, Horizon, or the bindings directly (§7.2). The protected-send path is the one exception. The passkey signer and relayer plug in behind `signAndSubmit`. Mini apps reach the wallet only through the PACTA SDK.
- Multi-chain / EVM is out of scope.
- Map contract `Error` codes (§8.4) to friendly UI messages.
- Convert human amounts to/from base units (×/÷ 1e7) at the UI boundary; pass `bigint` for `i128`/`u64`, `number` for `u32`, `string` for `Address`.
- After every write, refetch the affected balances / Pact before updating UI.
- Display values (balances, PHP estimates, quotes) are computed in code from live reads; the AI touches only Risk Lens text. PHP figures are always labeled estimates.
- No passwords, no key custody, no secrets in browser storage. Passkeys stay on the device.
- Savings copy says "variable earnings, not guaranteed". Never "interest", never a fixed rate.
- Prefer self-hosted components; third parties only where unavoidable (§6.4).
- Never commit secrets. Never weaken an existing security check to make a task easier.

---

## 17. AI Risk Lens (add-on feature — implemented)

An add-on that reads a Provider's on-chain track record and gives the Client a plain-language counterparty reputation read plus a defensive milestone suggestion. It changes nothing in the core protocol or flows; it is a read-only interpretation layer on top of the existing contract data and design tokens. The complete spec is in **`docs/product/FEATURE_RISK_LENS.md`** (authoritative); this section records that the feature exists and how it is wired.

**What it does.** When a sender chooses **Send protected** and enters the recipient (or views a recipient's profile), PACTA computes that recipient's stats from chain data (completed/refunded counts, completion rate, volume, recency, and how the contemplated payment compares to history) and shows: a risk level, the specific signals behind it, and a concrete suggestion for structuring *this* Pact more safely. "Apply suggested protection" sets the milestone count in the Send-protected terms (more milestones = smaller equal tranches = less first-release exposure).

**Code does the arithmetic; the model only interprets.** All counts are computed deterministically in `frontend/src/lib/riskStats.ts` (`computeTraderStats`). The model never recomputes numbers — it turns correct stats into plain language and a recommendation. This keeps figures un-hallucinated.

**Responsible-AI boundary (non-negotiable, enforced in the system prompt).** The lens assesses behavioral / counterparty trustworthiness from on-chain history only. It never gives investment advice, predicts future performance, or estimates profit. Its only recommendations are within PACTA's own mechanics (milestone count, bond size, duration). Consistent with PACTA's stated position that it does not provide investment advice.

**Architecture.**
- The client app fetches the Provider's agreements (reuses the existing read path), computes `TraderStats`, and POSTs them to a serverless endpoint.
- **Serverless endpoint `/api/risk-lens`** (Vercel Edge, file at repo root `api/risk-lens.ts`) calls the Gemini API (`gemini-2.5-flash`) and returns a `RiskRead` JSON. The endpoint is the only place the model is called.
- **The `GEMINI_API_KEY` is server-side only** (host env var; see `.env.example`). It never appears in client code, the repo, or the browser. Only public on-chain stats are sent to the API, nothing the user could not already read on a block explorer.

**Placement (wallet-first).** (1) Send protected: the lens renders inside the Send flow once the sender picks "Send protected" and a valid recipient address is present, above the terms summary; `onApply` sets the milestone field. (2) Profile / recipient view: the lens renders as the counterparty read before reaching out. Both are styled only with DESIGN.md tokens. (Component file `RiskLens.tsx` is unchanged; only its mount point moves from the old create page into `Send.tsx`.)

**Graceful degradation (required).** If the endpoint is unreachable or the key is unset, the lens shows a neutral "risk read unavailable" note and the raw reputation/history remains visible. The core create / fund / release / refund flow is never blocked by the lens.

**Files.** `frontend/src/lib/riskStats.ts`, `riskTypes.ts`, `agreements.ts`; `frontend/src/hooks/useRiskLens.ts`, `useDebounce.ts`; `frontend/src/components/RiskLens.tsx`; `api/risk-lens.ts`. New frontend dependency: none beyond the existing stack (lucide-react already present).

**Wallet-native composability.** The Risk Lens reads reputation FROM the wallet's on-chain history. This is inherently cross-app: any dApp that uses PACTA's contract can surface the same Provider trust score. The reputation signal is not locked in one UI — it is a public good attached to the wallet address, readable by anyone.

**Endpoint requirements (R1 hardening).** `/api/risk-lens` must require a valid session (the same wallet-ownership session as KYC), be rate-limited per session and per IP, and validate its input against a strict schema (bounded numbers, known fields only) before calling the model. It returns the neutral "risk read unavailable" response on any validation or upstream failure. When the self-hosted backend lands (§22.7) the endpoint moves to the Node server with the same contract.

**R3: zk reputation input.** In R3 the lens accepts a **zk reputation proof** (§22.4) in place of raw address history: the client proves statements such as "at least N completed Pacts" or "refund rate below X" and the lens interprets the verified statements. Raw-history mode remains available for recipients who have not generated a proof. Code still does all arithmetic and verification; the model only writes the text.

---

## 18. Identity & KYC verification (add-on feature — implemented)

A wallet-linked identity layer. A user verifies their real-world identity **once** — a government ID document check plus a liveness/face match through an external identity provider — and that verified identity is then permanently associated with their wallet. On every later connect the app re-establishes that the wallet is verified and shows an identity badge. Verification gates the **commitment actions** in the wallet (creating a Pact via Send protected, posting a bond, depositing capital, releasing a milestone), so both sides of a Pact can trust that the counterparty is a **verified person**, not just an anonymous address. Everyday wallet use (viewing the portfolio, Receive, and reading the Risk Lens) stays open; **Send now** and **Convert** are ordinary self-custodial moves of the user's own funds and are not gated. Like the AI Risk Lens (§17), it changes nothing in the core protocol: the frozen escrow contract (§8.5) is untouched. Operator/reference detail lives in **`docs/kyc.md`**; this section records what the feature is and how it is wired.

### 18.1 Why it matters (product + pitch framing)
PACTA already makes the *money* safe (staged release, bonds, refunds). KYC makes the *counterparty* accountable. Anonymous escrow still lets a bad actor spin up a fresh wallet after every scam; binding a wallet to a verified government identity adds real-world consequences and Sybil resistance without sacrificing the non-custodial, wallet-first model. It also puts PACTA on a credible path to regulatory acceptance (a KYC'd P2P financial-protection app is deployable where an anonymous one is not), while keeping funds fully non-custodial and on-chain.

### 18.2 What it does (user flow)
1. **Connect wallet → prove ownership.** On connect, the user signs a one-time server-issued challenge (a message, not a transaction — it moves no funds). This proves they control the wallet before any identity is bound to it.
2. **Verify once.** The user gives consent, then completes a government-ID check and a liveness selfie. On success the wallet's status becomes **verified** and an identity badge appears.
3. **Gated actions.** Verification is required only for **money/commitment actions** — create an agreement, post a bond, deposit capital, release a milestone. Browsing the dashboard, viewing a Provider profile, and the Risk Lens stay open. Fund-**returning** actions (emergency refund, cancel, complete) are deliberately **never** gated, so a user can always reclaim their own funds.
4. **Every login is authoritative.** Re-connecting re-runs the ownership signature and re-reads status, so the badge always reflects the current verification state.

### 18.3 Design principles
- **A deliberate, documented exception to "no backend."** The escrow has no backend; this identity layer is the one sanctioned stateful server component (Supabase behind `api/kyc-*`). It is **off-chain, never holds funds, and is not part of the escrow.** (See CLAUDE.md "Identity / KYC layer.")
- **Minimal PII by construction.** For the hosted and mock providers (`didit`, `mock`), raw ID images and selfies are **streamed to the verification provider and never stored by PACTA.** We persist only: verification status, a provider reference, document type/country/expiry, keyed HMAC hashes (for dedup / Sybil resistance), a masked display name, a versioned consent record, and a PII-free audit log. The R2 `inhouse` provider is the one exception: it stores raw media **encrypted, access-logged, and under a fixed retention policy** (§18.9).
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

### 18.9 Tiered KYC (2026-11 restructure)

The restructure replaces "verified or not" with **tiers**. Gating rules are unchanged: tiers gate **commitment actions** (create a Pact, post bond, deposit, release); Portfolio, Receive, Risk Lens, Send now, and Convert are not gated, though tier limits may cap amounts. Fund-returning actions (refund, cancel, complete, reclaim bond) are **never** gated.

| Tier | How it is reached | What it unlocks |
|---|---|---|
| **Tier 0** | Phone number verified by SMS OTP, plus a passkey wallet (or a connected wallet that signed the server nonce) | Hold, Receive, Send now, pay by phone, Convert, up to Tier 0 limits |
| **Tier 1** | In-house ID document check + liveness + face match + sanctions screening, decided by rules plus human review | Pacts (all commitment actions), Savings and higher limits |
| **Tier 2** | Done by ramp / anchor partners under their own licenses (R5) | Fiat cash-in and cash-out, partner limits |

**Tier limits** (amounts per transaction, per day, and per month, in USDC with PHP shown as an estimate) are configuration, not code, and are set by the owner (open decision, §22.8).

**Tier 1 `inhouse` provider (R2).** A new `KycProvider` beside `mock` and `didit`:
- **Capture:** the app uploads ID and selfie media directly to **MinIO** using short-lived, single-object **signed URLs**; media is **encrypted** at rest with keys held in **OpenBao**. The API never logs media or PII.
- **Queue:** submission creates a `kyc_job` row. A **Python worker** pulls jobs; it has **no public endpoint** and only outbound access to the queue, storage, and screening data.
- **Checks:** document authenticity and data extraction, liveness, face match against the document, and sanctions / watchlist screening.
- **Decision:** **no single model makes the final decision.** The worker produces signals; deterministic rules auto-approve only clear passes, and everything else goes to the **human review console**, where a reviewer approves or rejects with a reason. Every console access is logged without PII.
- **Persistence:** status, provider reference, document metadata, keyed HMAC hashes, masked name, consent, and a PII-free audit log, as today. Raw media is kept only for this provider, encrypted, access-logged, and deleted on a fixed retention schedule.

**Fail closed.** In production the server refuses to run KYC when `KYC_PROVIDER` is unset or `mock`.

**Erasure vs AML retention.** If PACTA is an AML covered entity, erasure becomes "restrict now, delete after the retention period" (configurable). Until a task explicitly changes it, the current `kyc-erase` behavior stays as specified in §18.6.

**R3 zk-KYC.** A Tier 1 user can later obtain a **zk-KYC credential** (§22.4) and prove "verified", "18+", or "not sanctioned" to an app with a per-app nullifier, without revealing identity data. Gating stays at the app (or a separate verifier contract); the escrow has no KYC hook.

---

## 19. Business model

**Hackathon phase:** free, no fees. The protocol takes nothing.

**Production model (post-mainnet, candidates for owner decision):**
- **Protocol fee on Pacts:** 0.5–1% of capital at settlement. **Note:** the frozen escrow (§8) has no fee logic; an on-chain fee needs an explicit contract reopen, tests, and re-audit. Until then this is a roadmap item only.
- **Fee waiver:** first N Pacts per wallet are free to drive adoption.
- **Zero fee on refunds:** the protocol never profits from failure. Emergency refunds, cancellations, and bond reclaims are always free.
- **Ramp revenue share (R5):** a share of partner fees on cash-in / cash-out.
- **Mini app partners (R4):** listing or revenue-share arrangements with partner mini apps (for example Load and bill payments).
- **Savings:** a possible performance fee on variable earnings, disclosed in the vault screen; never presented as a fixed return.

**Costs to cover:** sponsored network fees (relayer), SMS delivery, KYC operations (reviewers, screening data), and self-hosted infrastructure.

**Revenue expansion (roadmap):**
- Premium features: priority arbitration, enhanced analytics dashboard, verified Provider badges
- Marketplace integrations: API licensing for platforms that embed PACTA escrow
- Enterprise: white-label escrow for B2B marketplaces in SEA

**Why this model works wallet-native:** fees are either taken programmatically at settlement or come from partners, never from a card on file. The wallet is the billing method, consistent with the entire architecture.

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
| 6 | **Dollar-stable, programmable money** | USDC on Stellar settles in seconds for a fraction of a cent, and smart wallets make it usable with a passkey instead of a seed phrase. |

**The honest framing:** the payment rails already exist (Stellar is fast, cheap, global). What didn't exist was a **trust layer** on top of those rails, inside a wallet simple enough for everyday users. PACTA is that layer.

---

## 21. Go-to-market

### Phase 1 — PH stablecoin wallet launch (R1 to R2)
- Launch the phone-number wallet to Filipino freelance, OFW, and buy-sell communities (FB groups, Telegram, Viber)
- Lead with "pay by phone in dollars, see pesos" for remittances and everyday sends; introduce Pacts as the protected option
- Partner with OFW community organizations
- Demo at PH crypto meetups and Stellar community events
- Content: "How I stopped getting scammed on FB Marketplace" explainer videos showing the actual flow

### Phase 2 — Everyday money and mini apps (R3 to R4)
- Savings, Paluwagan, Split bill, Invoices, Remittance, and Load mini apps to drive daily use
- Partner mini apps through the PACTA SDK
- Partner with Stellar ecosystem wallets as an embedded protection feature: "Send with PACTA protection"
- List on Stellar dApp directories and ecosystem pages

### Phase 3 — Ramps, native app, mainnet (R5)
- SEP-24 anchors / fiat ramp partners for PHP cash-in and cash-out
- Native app in the app stores
- Offer a PACTA SDK / API for existing marketplaces to embed escrow into their own flows
- White-label for PH e-commerce platforms that want buyer protection without building it

### Long-term vision
PACTA ships first as **its own stablecoin wallet**: hold USDC, pay by phone, see pesos, send protected. From that beachhead it becomes the **trust protocol that other wallets integrate natively** too, like how wallets integrated token swap, they integrate protected send. Every wallet gets a "protected send" option powered by PACTA, and the reputation layer (public or zero-knowledge) becomes shared infrastructure, not just one app's feature.

---

## 22. 2026-11 restructure: feature specs

Requirement-level specs for the restructure pieces. Each piece is its own task; the task writes a design doc under `docs/` before code. Nothing here changes §8.

### 22.1 Passkey smart wallet (R1)
- **Purpose:** a wallet with no seed phrase and no extension. The user's account is a **Soroban contract account** whose signer is a **WebAuthn passkey** (secp256r1) on their device.
- **Requirements:** own crate under `contracts/` with tests; account creation sponsored by the relayer; supports more than one signer (to enable recovery and new devices); signs every write path through `ChainAdapter.signAndSubmit`; works with the escrow as an ordinary `Address` (sender or recipient) with no escrow change.
- **Security:** passkeys never leave the device; PACTA never holds a key that can move user funds; removing the last signer is blocked or strongly warned; signer changes require the existing signer.
- **Recovery:** method is an open decision (§22.8).
- **Out of scope:** custodial recovery by PACTA staff.

### 22.2 Self-hosted fee relayer (R1)
- **Purpose:** users never need XLM. The relayer wraps user-signed transactions in a fee bump (or equivalent sponsorship) and submits them.
- **Requirements:** a **call allowlist** (known contracts and methods only: USDC transfers and claims, the escrow, the smart-wallet factory, approved savings and mini app contracts); **rate limits** per user, device, and IP; **caps** per transaction, per user per day, and global per day; a maximum fee; idempotent submission; clear refusal reasons surfaced to the UI.
- **Security:** the fee-paying key lives in OpenBao; the relayer can never alter or sign a user's operation; monitoring, alerting, and a kill switch; balance top-ups are owner-run.
- **Out of scope:** paying anything other than network fees.

### 22.3 Pay by phone (R1)
- **Purpose:** send USDC to a Philippine mobile number.
- **Federation:** a self-hosted **SEP-2** federation server maps a phone number to the user's address. Phone numbers are stored only as **keyed hashes** (HMAC with a key in OpenBao); raw numbers are not retained after OTP verification, except where SMS delivery needs them in transit.
- **Registration:** SMS **OTP** proves control of the number; one active wallet per number; re-binding a number to a new wallet requires OTP plus the existing signer or the recovery flow.
- **Anti-enumeration:** rate limits per session, device, and IP; lookups only from authenticated sessions; uniform responses; no bulk endpoint; lookup results reveal only "on PACTA or not" and the address needed to pay.
- **Unregistered numbers:** the sender's funds become **claimable funds** that only the wallet later registered with that number can claim, with a **timeout refund** to the sender. The recipient receives an SMS invite that reveals no balances. Mechanism (Stellar claimable balance vs a dedicated contract) is decided in the task design.
- **Out of scope:** non-PH numbers (until decided), sending Pacts to unregistered numbers.

### 22.4 Zero-knowledge features (R3)
- **zk-KYC credential:** after Tier 1, the user receives a credential they hold on their device. They can prove **verified**, **18+**, or **not sanctioned** to an app with a **per-app nullifier** (unlinkable across apps, one identity per app). PACTA's KYC server issues the credential and never sees where it is used.
- **zk reputation:** prove statements about Pact history (for example completed count, refund rate, volume range) without revealing the addresses or Pacts involved. Consumed by the Risk Lens (§17).
- **Verification:** at the app (off-chain) or in a separate verifier contract (`contracts/zk-verifier`). The escrow has no KYC or ZK hook.
- **Security:** audited proving system and libraries; independent review of circuits and verifier; credentials revocable on KYC revocation; ZK never gates fund-returning actions.

### 22.5 Savings (R4)
- **Purpose:** let users put USDC to work through **Blend** / **DeFindex** vaults.
- **Requirements:** deposit and withdraw through the confirmation sheet; show the protocol, the current variable rate as information, and a risk note; Tier 1 required to deposit (open decision on limits).
- **Copy rules:** "variable earnings, not guaranteed". Never "interest", never a fixed rate, never a promise.
- **Security:** only allowlisted vault contracts; withdrawals are never gated by KYC.

### 22.6 Mini apps platform (R4)
- **Platform:** mini apps run in **sandboxed iframes** and talk to the wallet only through the **PACTA SDK** (`packages/sdk`, planned). They never see keys, the `ChainAdapter`, or storage of the host.
- **Transactions:** every request is **simulated**, shown in a PACTA **confirmation sheet**, and confirmed by the user, within **per-app spending limits** the user can change or revoke.
- **First-party mini apps:** Pacts, Savings, Paluwagan (own contract crate `contracts/paluwagan`), Split bill, Invoices, Remittance, Load.
- **Listing:** partner apps are reviewed before listing and can be delisted; each app declares the contracts it calls (fed to the relayer allowlist).

### 22.7 Self-hosted backend (R1 to R5, incremental)
- **Stack:** Node server + Postgres + MinIO + OpenBao, plus the Python KYC worker (§6.4).
- **Migration:** move one service at a time from Vercel functions + Supabase, keeping the same same-origin `/api/*` contract; security checks stay identical or stronger.
- **Rules:** no service ever holds user funds or keys; deny-by-default data access; PII minimized and never logged; secrets only in OpenBao; backups encrypted.

### 22.8 Open decisions (owner)
- Passkey recovery method (second passkey, guardian signer, or phone + Tier 1 re-bind).
- Tier limits (per transaction / day / month) and who can change them.
- AML covered-entity status and the retention period.
- Claimable-funds timeout length and mechanism.
- Whether the multi-asset list and Convert stay visible or move behind an "advanced" setting.
- Testnet Pact settlement token (native XLM SAC today) vs testnet USDC to match the USDC-only product.
- Protocol fee: keep (needs a contract reopen), defer, or replace with ramp / partner revenue.
- Final tab set for the new bottom nav.
- SMS provider and supported number ranges.

---

### Appendix A — Glossary
- **Escrow:** funds held by a neutral party (here, the contract) until conditions are met.
- **Security bond:** refundable collateral posted by the Provider; seized by the Client on emergency refund.
- **Milestone tranche:** one staged portion of the funds (`capital / milestones`) released to the Provider.
- **SAC (Stellar Asset Contract):** the Soroban contract wrapper that lets a classic Stellar asset (XLM, USDC) be used by smart contracts via a standard token interface.
- **Reputation:** on-chain per-Provider tally of completed vs refunded agreements and total volume.
- **KYC (Know Your Customer):** verifying a user's real-world identity (government ID + liveness) and binding it to their wallet; off-chain, gates the app UI only (§18). Tiered from the restructure (§18.9).
- **Liveness check:** a face/selfie check confirming a live person (not a photo) is present, matched against the ID document.
- **Wallet-ownership proof:** signing a one-time server nonce (a message, not a transaction) to prove control of a wallet before identity is bound to it.
- **Identity provider:** the KYC component that performs document + liveness verification (`mock` for development, `didit` hosted, `inhouse` from R2); pluggable behind the `KycProvider` interface.
- **Passkey:** a WebAuthn credential stored on the user's device and unlocked with fingerprint, face, or device PIN; replaces seed phrases and passwords.
- **Smart wallet (contract account):** a Soroban contract that acts as the user's account and checks the passkey signature.
- **Fee bump / sponsorship:** a Stellar mechanism that lets another account pay a transaction's network fee without being able to change it.
- **Federation (SEP-2):** a Stellar standard for resolving a human-friendly name (here, a phone number) to an address.
- **Claimable funds:** funds set aside for a recipient who can claim them later, returned to the sender after a timeout if unclaimed.
- **Zero-knowledge proof:** a proof that a statement is true without revealing the data behind it.
- **Nullifier:** a per-app value derived from a credential that prevents reuse within one app without linking the user across apps.
- **Paluwagan:** a Filipino rotating savings circle where members contribute regularly and take turns receiving the pool.

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
- SEP-2 (Federation protocol) — github.com/stellar/stellar-protocol (ecosystem/sep-0002.md)
- SEP-24 (Hosted deposit and withdrawal) — github.com/stellar/stellar-protocol (ecosystem/sep-0024.md)
- Smart wallets and passkeys on Stellar — developers.stellar.org (smart wallets guide)
- WebAuthn Level 3 — w3.org/TR/webauthn-3
- Blend protocol docs — docs.blend.capital
- DeFindex docs — docs.defindex.io
