# Disputes: options and trade-offs

> **Status:** decision document, tracker task #4. **Nothing here is implemented.** The owner picks an option (or a combination) first; that pick becomes its own task, which reopens the escrow explicitly, updates `PRD.md` §8 first, adds tests, deploys to testnet only, and needs an independent re-audit before mainnet.

## 1. The problem

Today a Pact can only end in these ways (`PRD.md` §8.2):

| Exit | Who acts | When |
|---|---|---|
| `release_milestone` (final release auto-completes) | sender | while Active |
| `complete` | sender | Active, all milestones released |
| `emergency_refund` | sender | Active, `now ≥ deadline` |
| `cancel` | sender | Pending |
| `reclaim_bond` | recipient | Pending, bond posted |

Once a Pact is **Active, every outcome is in the sender's hands.** That protects the sender well, and is the design in §1.3, but it leaves two real gaps:

1. **Sender stalls or acts in bad faith after delivery.** The recipient delivers, the sender never releases, the deadline passes, and the sender calls `emergency_refund`: they get back every unreleased tranche **and** the recipient's bond. The recipient has no on-chain way to object, and their reputation records a refund.
2. **Honest disagreement.** Partial delivery, late delivery, or "not what we agreed". The only tools are all-or-nothing per tranche (release) or everything back to the sender (refund). There is no way to settle at, say, 60/40.

The minimum duration (tracker task #2) narrows gap 1 a little, since the deadline can no longer be seconds away, but does not close it.

## 2. Options

### Option A — Mutual release (both parties sign a split)

**How it works.** Either party proposes a settlement for an Active Pact: an amount of the unreleased funds to the recipient, the rest to the sender, and what happens to the bond. The other party accepts by signing. On acceptance the contract pays out and closes the Pact (a new `Settled` status, or `Completed` / `Refunded` depending on the split).

**Contract changes.** New `propose_settlement(id, to_recipient, bond_to_recipient)` and `accept_settlement(id)` (or a single call needing both `require_auth`s), a stored pending proposal per Pact, a new status or event, reputation rules for a settled Pact. Additive to the ABI.

| | |
|---|---|
| Trust | None beyond the two parties. Fully decentralized. |
| Solves gap 1 (stalling sender) | **No.** A sender who refuses to sign can still wait and use `emergency_refund`. |
| Solves gap 2 (honest disagreement) | **Yes**, whenever both are willing to settle. |
| Griefing | Low. A proposal binds nobody until accepted. Proposals must expire or be replaceable, and must not block `emergency_refund`. |
| Interaction with `emergency_refund` | Must define what happens to an open proposal after the deadline (simplest: refund still works; it clears the proposal). |
| UX | "Propose a split" sheet, plus a notification to the other side. Simple to explain. |
| Compliance / KYC | None new. Settlement is a commitment action, so it should be Tier 1 gated in the app, but the fund-returning side must not be blocked. |
| Audit cost | Small to medium: two methods, one state, new money paths. |

### Option B — Timeout to the recipient after the deadline

**How it works.** Flip the default when the sender goes silent. After the deadline plus a **grace period**, if the sender has neither released nor refunded, the **recipient** may claim the remaining funds and their bond. To stay fair, the sender gets an exclusive window to refund first (for example deadline → deadline + grace: only the sender may `emergency_refund`; after deadline + grace: whoever calls first wins, or only the recipient may claim).

Variants:
- **B1, claim after silence:** the recipient can claim only if the sender has not acted at all by deadline + grace.
- **B2, delivery mark + challenge window:** the recipient marks "delivered"; the sender has N days to refund or dispute; silence means the recipient may claim.

**Contract changes.** A grace period (constant or per Pact), a `claim_after_timeout(id)` for the recipient, and changed `emergency_refund` timing rules. For B2, a `mark_delivered` timestamp and the challenge window. Changing `emergency_refund`'s conditions is a **behavior change to an existing method**: the ABI shape stays the same, but the semantics of today's Pacts change.

| | |
|---|---|
| Trust | None beyond the two parties. Decentralized. |
| Solves gap 1 (stalling sender) | **Partly.** It fixes a sender who goes silent. It does not stop a sender who actively refunds inside their window after real delivery. |
| Solves gap 2 (honest disagreement) | **No.** It is still all-or-nothing. |
| Griefing | Medium. It moves risk from the recipient to the sender: a recipient who delivers nothing can wait out a sender who misses the window (lost phone, travel). That weakens the core promise of §1.3 ("the sender can always get unreleased funds back"). |
| Interaction with `emergency_refund` | Central. Needs very precise, well-tested timing rules. |
| UX | Needs clear countdowns on both sides ("Refund window closes in 2 days"). Easy to misunderstand. |
| Compliance / KYC | None new. |
| Audit cost | Medium: new time-based money path plus changed semantics of an existing method. |

### Option C — Arbiter

**How it works.** Either party raises a dispute on an Active Pact, which freezes it (no release, no refund). A designated **arbiter** reviews evidence off-chain and calls `resolve(id, to_recipient, bond_to_recipient)` to split funds and bond. If the arbiter does not rule within a timeout, a fallback applies (for example the pre-dispute default: the sender may refund).

Who is the arbiter:
- **C1, PACTA admin:** the contract already stores `Admin` ("reserved for future dispute resolution").
- **C2, per-Pact arbiter:** both parties choose an arbiter address when the Pact is created (a trusted third party, community member, or marketplace).
- **C3, arbiter panel / multisig:** several arbiters, majority decides (could later be a staked juror set).

**Contract changes.** `raise_dispute(id)`, `resolve(id, ...)`, a `Disputed` status, a dispute timeout and fallback, arbiter storage (C2 adds a field to `Agreement` or a parallel storage key, which is a struct change unless stored separately), events, and reputation rules for resolved Pacts. Possibly an arbitration fee.

| | |
|---|---|
| Trust | **The arbiter.** C1 makes PACTA a party that can direct funds: a centralization and regulatory step (closer to a custodial or escrow-agent role) that cuts against "no admin can override this" (§1.4). C2/C3 spread that trust. |
| Solves gap 1 (stalling sender) | **Yes.** The recipient raises a dispute before the deadline and the refund is frozen. |
| Solves gap 2 (honest disagreement) | **Yes**, with any split. |
| Griefing | Medium. Frivolous disputes freeze funds, so it needs a dispute deposit or fee, a ruling timeout, and a fallback. A compromised arbiter key can redirect every disputed Pact (C1: key in OpenBao or a multisig, rate limits, monitoring). |
| Interaction with `emergency_refund` | `emergency_refund` must be blocked while Disputed, which is a new condition on an existing method. The fallback must guarantee funds can never be locked forever. |
| UX | "Raise a dispute", evidence upload (off-chain, PII-minimized), status tracking. Highest product and operations cost (people to rule, SLAs, appeals). |
| Compliance / KYC | Evidence may contain PII and would need the same handling as KYC data. An admin arbiter may make PACTA a regulated escrow or dispute-resolution provider. Needs legal review. |
| Audit cost | High: new state, a privileged role, freeze logic, fallback timing, key management. |

## 3. Comparison

| Criterion | A. Mutual release | B. Timeout to recipient | C. Arbiter |
|---|---|---|---|
| Fixes a stalling or bad-faith sender | No | Partly (silence only) | Yes |
| Handles partial delivery (splits) | Yes (if both agree) | No | Yes |
| New trusted party | None | None | Arbiter |
| Keeps "sender can always recover unreleased funds" | Yes | **No** | Mostly (via fallback) |
| Changes existing method semantics | No | Yes (`emergency_refund`) | Yes (`emergency_refund` blocked while Disputed) |
| Lock-up risk | None | None | Needs a fallback |
| Ops cost | None | None | High (reviewers, SLAs) |
| Regulatory exposure | Low | Low | Higher (C1 especially) |
| Audit size | Small to medium | Medium | High |

## 4. Combinations worth considering

- **A + C (mutual release first, arbiter as the fallback).** The common pattern in escrow products: most disputes settle by agreement, and the arbiter is only needed when talks fail. Highest coverage, highest cost.
- **A + B2 (mutual release + delivery mark with a challenge window).** Fully decentralized; covers honest splits and silent senders, but not an actively hostile sender.
- **A alone, now; C later.** Ship the cheap, trustless piece first, gather data on how often talks fail, then decide whether an arbiter is worth the trust and ops cost.

## 5. Non-binding recommendation

Start with **Option A (mutual release)**. It is additive, keeps the sender protection at the heart of PACTA's pitch, adds no trusted party, and is the smallest audit. Design the storage and events so an **arbiter fallback (C2 or C3, not a PACTA admin)** can be added later without migrating Pacts. Avoid B unless the product deliberately wants to shift default risk toward recipients.

This is a recommendation only. The owner decides.

## 6. Open questions for the owner

1. Which option or combination?
2. Should a settled Pact count toward the recipient's `completed`, `refunded`, or a new `settled` reputation counter?
3. If an arbiter: PACTA, a per-Pact choice, or a panel? Who pays for arbitration, and how?
4. Dispute deposits or fees to deter frivolous disputes?
5. Grace and timeout lengths (and do they differ between the testnet feature build and mainnet, like `MIN_DURATION`)?
6. How does dispute evidence get stored under the PII rules in CLAUDE.md, if at all?
7. Must new dispute actions be KYC-gated (they commit funds), while making sure no fund-returning path is ever gated?
