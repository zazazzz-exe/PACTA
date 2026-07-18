# PACTA — Presentation Brief (for generating a slide deck)

> **How to use this file:** Upload it to Claude on the web and ask it to
> "Create a polished PowerPoint/slide deck from this brief." A ready-to-use
> slide-by-slide outline is at the end (see "Suggested Deck Outline"). Design
> direction: clean, modern fintech; brand color is **emerald green** (#0B7A63)
> on a warm off-white (#F4F2EC), with a single dark "proof" surface
> (near-black #0B0F0E with mint-green #34E3B0 accents). Money and data shown in a
> monospaced font. Keep it confident and human, not jargon-heavy.

---

## One-liner
**PACTA is a non-custodial money wallet on Stellar that lets anyone hold, send,
receive, and convert crypto — and protect a payment when it matters, with money
held by a smart contract and released only as work is delivered. It even works
when the signal drops.**

## Taglines (pick one)
- "Simplify every payment. Protect the ones that matter."
- "Your money is yours to move."
- "A wallet that works, even when the signal doesn't."
- "Trust, written in code."

## Hackathon track
**Payment & Consumer Applications.**

---

## The problem
- **Sending money to people you don't fully trust is scary.** Freelancers,
  online sellers, and provincial suppliers often demand payment up front — and
  buyers get burned when the work never comes.
- **Remittance and everyday money in emerging markets is fragile.** For Overseas
  Filipino Workers (OFWs) sending money home, fees are high, custody is opaque,
  and **connectivity is unreliable** in rural areas — a dropped signal can mean a
  failed or delayed payment.
- **Crypto wallets are powerful but unfriendly.** They speak in jargon, assume
  constant connectivity, and give no protection when a deal goes wrong.

## Who it's for
- OFWs and their families sending and receiving money across borders.
- Everyday people paying freelancers, online sellers, and small providers.
- Anyone who wants self-custody (their keys, their funds) without the complexity.

---

## What PACTA is
Two layers, kept deliberately distinct:

### 1. The wallet layer (the front door)
A **non-custodial** money hub. PACTA never holds your keys or your funds — it
connects wallets you already own (Freighter, xBull, Hana) and lets you:
- **Hold** a multi-asset portfolio with live peso (₱) values.
- **Send** money to anyone on Stellar in seconds.
- **Receive** via your address or a QR code.
- **Convert** one asset to another (e.g., XLM ↔ USDC) on the Stellar DEX at the
  best on-chain rate.

### 2. The protection layer (a feature inside Send) — a "Pact"
When a payment needs to be safe, choose **Send protected** instead of Send now.
That creates a **Pact**: an escrow enforced by a smart contract, not a person.
- **Locked in code** — funds sit in a Soroban smart contract, not with PACTA.
- **Backed by a bond** — the recipient posts a security bond; if they walk away,
  the bond is yours.
- **Released in milestones** — you approve each stage as the work lands.
- **Refundable** — reclaim everything if the deadline passes and work never comes.

**Key idea:** there is no backend holding your money. The Soroban smart contract
*is* the backend for protection, and the wallet takes no custody.

---

## The differentiators

### AI Risk Lens
Before you commit to a Pact, PACTA reads your counterparty from their **real
on-chain history** — completed vs. refunded deals, volume, and track record —
and turns it into a plain-language risk read with suggested milestones. Powered
by Google Gemini; all the numbers are computed deterministically in code, and the
AI only translates correct numbers into human language.

### One identity, many wallets (Linked Identity)
Verify your identity **once**, then link your other wallets by signing with them.
Any linked wallet counts as the same verified you — so you can transact from any
of them without re-doing KYC. Linking is never silent: a new wallet must prove it
belongs to you, so no stranger can ever inherit your verified status. The identity
layer is off-chain, minimizes personal data, and never holds funds.

### Works offline — the low-connectivity story (NEW)
PACTA is built for places where the signal drops. Two capabilities:

**1. Offline outbox.** If you're offline when you send, PACTA **queues** the
payment instead of failing. A banner shows what's waiting, and the moment your
connection returns, PACTA **auto-delivers** every queued payment and drops it into
your Activity. *"Queue money to family in a dead zone; it sends itself when the
signal comes back."*

**2. Demo mode.** A one-tap mode that runs the entire app on seeded data with
simulated transactions and **no network at all** — so the experience is reliable
even with zero connectivity (perfect for demos in venues with bad wifi, and a
proof-of-concept for a fully offline-first experience).

> Honest framing: real settlement always happens on the Stellar network. The
> offline outbox defers the send and completes it on reconnect; demo mode is a
> presentation layer. The narrative — a wallet that keeps working in
> low-connectivity areas — is the real value.

---

## How it works (happy path)
1. **Connect** a Stellar wallet (your wallet is your login — no passwords).
2. **Home** shows your portfolio in ₱ and XLM, with Send / Receive / Convert.
3. **Send now** for a normal payment, or **Send protected** to create a Pact.
4. For a Pact: set the amount, the recipient's bond, the milestones, and a
   deadline. The Risk Lens reads the counterparty. Funds lock in the contract.
5. Release milestones as work lands; complete to return the bond — or refund
   after the deadline if it goes wrong.
6. **Convert** assets, view your **Activity** history, and manage your identity
   and linked wallets in **Profile**.

---

## Architecture & tech
- **Chain:** Stellar (testnet), smart contracts via **Soroban** (Rust/WASM). The
  escrow contract is deployed and frozen.
- **Non-custodial:** balances are read from the user's own wallet; sends and swaps
  are standard signed Stellar operations. PACTA holds no keys and no funds.
- **Frontend:** React + TypeScript + Vite + Tailwind CSS; mobile-first web app
  (works in any browser, no app store).
- **The one seam — `ChainAdapter`:** every wallet screen depends only on a single
  interface (getBalances / send / getQuote / swap / getActivity), never on the
  Stellar SDK directly. Today there's one implementation (Stellar); a future EVM
  adapter would light up multi-chain **without changing any screen**. This same
  seam is what made **Demo mode** clean — a MockAdapter simply swaps in.
- **Off-chain services (never hold funds):** a stateless AI Risk Lens endpoint
  (Google Gemini) and an off-chain KYC/identity layer (Supabase), both accessed
  same-origin; the browser never holds server credentials.
- **Settlement:** native XLM on testnet (the contract is token-agnostic; USDC's
  contract swaps in with a one-line change for production).

## Security & trust
- **Your keys, your funds** — non-custodial by design; the wallet is the login.
- **Provable on-chain** — every send, swap, and Pact is permanent and verifiable
  on Stellar.
- **Skin in the game** — the recipient's bond aligns incentives.
- **Deadline refunds** — you can always reclaim unreleased funds after the deadline.
- **Identity you control** — verify once, link many wallets, erase on request;
  minimal personal data stored.
- **Gating done right** — verification only gates commitment actions (creating a
  Pact, posting a bond, depositing, releasing); everyday wallet use and
  fund-returning actions (refund, cancel) are never gated.

---

## What's built (status)
A working, end-to-end app on Stellar testnet:
- Wallet Hub (connect, multi-asset portfolio, Receive).
- Send fork: Send now vs. Send protected (a Pact), with Risk Lens and KYC gate.
- Convert (Stellar DEX path payments).
- Activity feed, Profile with on-chain reputation.
- Linked identity across wallets (multi-wallet KYC).
- Offline outbox + Demo mode (the new low-connectivity feature).
- Modern, animated landing page; polished, plain-language UX throughout.

## Roadmap (beyond the hackathon)
- **Fiat on/off-ramp** (Stellar anchors, SEP-24): real cash-in/out to PHP.
- **Cross-chain** (an EVM adapter behind the same seam) — the payoff of the
  architecture.
- **Full offline-first** (installable PWA, cached state, real deferred signing).
- **Reputation deepening** + a discoverable recipient directory.
- **Dispute/arbitration**, then **mainnet + security audit**.

## Why it wins (for a Payment & Consumer Applications track)
- **Consumer-first:** plain language, peso values, one-tap flows, mobile web.
- **Real payments:** non-custodial, instant Stellar settlement, on-chain proof.
- **A trust primitive:** the Pact turns "pay and pray" into "pay and verify."
- **Built for the real world:** works in low-connectivity areas — where remittance
  actually happens.
- **Architected to scale:** one clean seam to multi-chain, already proven by the
  demo/mock swap.

---

## Key facts / stats to put on slides
- Non-custodial wallet on **Stellar** + **Soroban** smart contracts.
- Settlement in **~3–5 seconds** on Stellar.
- **Zero** platform fees on testnet; the wallet never takes custody.
- Supports **Freighter, xBull, Hana** wallets.
- **Verify once, use any linked wallet.**
- **Send offline; it delivers when you reconnect.**
- Hackathon track: **Payment & Consumer Applications.**

---

## Suggested Deck Outline (slide by slide)

1. **Title** — "PACTA — Simplify every payment. Protect the ones that matter."
   Subtitle: A non-custodial money wallet on Stellar. Track: Payment & Consumer
   Applications.
2. **The problem** — Paying people you don't fully trust; fragile remittance;
   unfriendly crypto; unreliable connectivity. (Use the OFW angle.)
3. **Who it's for** — OFWs and families; everyday payers; self-custody seekers.
4. **Meet PACTA** — the one-liner + a phone mockup of the wallet home (₱42,580
   balance, Send/Receive/Convert).
5. **The wallet layer** — Hold, Send, Receive, Convert (4 tiles/icons).
6. **The protection layer — a Pact** — Locked in code, Backed by a bond, Released
   in milestones, Refundable. (Diagram: wallet → contract → recipient, bond below.)
7. **AI Risk Lens** — read your counterparty from real on-chain history before you
   commit.
8. **One identity, many wallets** — verify once, link the rest, prove ownership to
   link. (Security highlight.)
9. **Works offline (NEW)** — the outbox: send in a dead zone → queued →
   auto-delivers on reconnect. Emphasize the OFW low-connectivity story. Include
   the "offline → queued → delivered" flow as 3 states.
10. **Demo mode** — one tap, zero network, seeded data — reliable anywhere.
11. **How it works** — the 6-step happy path.
12. **Architecture** — non-custodial; the `ChainAdapter` seam; Soroman contract as
    the backend for protection; off-chain Risk Lens + KYC that never hold funds.
13. **Security & trust** — keys/funds, on-chain proof, bond, deadline refunds,
    identity control.
14. **What's built** — the status list (a checklist slide).
15. **Roadmap** — fiat ramp, cross-chain, full offline-first, mainnet + audit.
16. **Why it wins** — consumer-first, real payments, a trust primitive, built for
    the real world, architected to scale.
17. **Closing / call to action** — "Your money is yours to move." Live on Stellar
    testnet. (Optional: repo / demo link.)

## Speaker notes (30–60 seconds)
"Sending money to someone you don't fully trust is stressful — especially across
borders, on a spotty connection. PACTA is a non-custodial wallet on Stellar: hold,
send, receive, and convert your money, with your keys never leaving your hands.
When a payment needs to be safe, you send it as a Pact — the money is locked in a
smart contract and released in steps as the work is delivered, backed by the
recipient's bond, refundable if they don't come through. An AI Risk Lens reads
your counterparty's real on-chain history before you commit. You verify your
identity once and use any of your linked wallets. And because real remittance
happens where the signal drops, PACTA works offline — queue a payment in a dead
zone and it sends itself the moment you reconnect. Your money, your keys, one
wallet — that works even when the signal doesn't."
