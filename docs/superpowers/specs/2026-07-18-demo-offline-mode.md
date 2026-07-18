# Demo mode + simulated offline outbox — design spec

**Date:** 2026-07-18
**Status:** Approved by user; building. Hackathon-only presentation feature.

## Goal
Two things, both deliberately faked (no network), so a live pitch works with wifi off:
1. **Demo mode** — a toggle that runs the whole app on seeded data with simulated transactions.
2. **Offline outbox** — the "send while offline, delivers when reconnected" moment, simulated.

Real settlement still needs the network; this is a presentation layer, framed honestly.

## Architecture

### Demo flag
`frontend/src/lib/demo/index.ts`: `isDemo()`, `setDemo(on)` (localStorage key `pacta_demo`), and `DEMO_ADDRESS` (a valid G-address). Toggling demo **reloads** the app so every module re-initializes against the flag (no mid-session reactivity needed).

### Seeded, mutable store
`frontend/src/lib/demo/store.ts`: in-memory demo state (balances, activity, pacts) seeded on load, with mutators used by the mock layer (a send debits a balance and prepends an activity item, etc.). Resets on reload — each demo run is fresh and predictable.

### Switching (the ChainAdapter seam earns its keep)
- `frontend/src/lib/demo/MockAdapter.ts` implements `ChainAdapter` over the store (getBalances / send / getQuote / swap / getActivity), with small delays and fake tx hashes. No SDK import (keeps the seam invariant).
- `StellarAdapter.ts` exports `adapter = isDemo() ? new MockAdapter() : new StellarAdapter()`. Pages are unchanged (they import `adapter`).

### Shims for parts not behind the adapter
- **Contract (Pacts):** `contract.ts` read/write functions branch to a `demo/demoContract.ts` when `isDemo()` — seeded Pacts, simulated post-bond/deposit/release/complete/refund/cancel.
- **KYC:** `kycClient.ts` branches to demo state (verified identity, seeded linked wallets); `main.tsx` connect sets `DEMO_ADDRESS` instantly (no wallet kit) and marks verified.
- **Risk Lens:** `useRiskLens` returns a canned read in demo.

### Seeded world
Portfolio ~₱42,580 (1,935 XLM + 120 USDC), 4–5 activity items, 2–3 Pacts (active / pending / completed), verified identity with 2 linked wallets, canned Risk Lens.

## Offline outbox (simulated)
- `frontend/src/lib/outbox.ts`: a queue in localStorage — `enqueue`, `list`, `flush`, subscribe. Pure-ish; unit-tested.
- **Offline state:** real `navigator.onLine` + an in-demo "Offline" override toggle.
- **Send:** when offline, `Send` enqueues instead of submitting and shows "Queued — will send when you are back online."
- **Activity:** queued items appear with a "Queued" badge above real history.
- **Reconnect:** going online (real event or the toggle) auto-flushes — each item animates Sending → Sent with a tx hash, then moves to normal activity. A toast confirms.
- Faked: in demo the flush simulates success; in real mode it would call `adapter.send`.

## UI controls
- A small **Demo** pill in the header (toggles demo + reloads).
- An **Offline / Online** toggle (visible in demo) to drive the outbox moment.
- A **queued-count banner** when the outbox is non-empty.

## Runbook
`docs/DEMO_RUNBOOK.md`: the 60-second pitch tap-by-tap (Demo on → portfolio → Offline → send ₱5,000 → Queued → Online → auto-delivers → open a Pact).

## Guardrails
- Demo layer must NOT change real behavior when the flag is off (every branch is `if (isDemo())`).
- MockAdapter imports no SDK (seam invariant intact).
- Contract stays frozen; demo only simulates client-side.
- Honest framing in copy where visible ("Demo").
