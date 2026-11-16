# Real-time updates + wallet-truthful data — design spec

**Date:** 2026-07-25
**Status:** Draft (design approved; proceed to plan)
**Scope:** Make the app update in real time (balances, activity, Pact state, in-app alerts)
without a new backend, and ensure everything the app shows is derived only from the connected
wallet's real on-chain data. Remove all fabricated/mock numbers from the landing marketing
components, replacing them with a short "how it works" note.

## 1. Goal

- Balances and Activity update **automatically** as funds move / transactions confirm, without
  the manual refresh button.
- A **Pact** updates live for both parties as it moves through bond → deposit → milestone
  release → complete/refund.
- **In-app alerts** fire on key events (payment received, bond posted, milestone released,
  deadline approaching).
- **Nothing fabricated** is shown anywhere: the connected app is 100% wallet-derived, and the
  landing page shows no fake balances/transactions.

## 2. Non-goals / guardrails

- **No new backend.** Real time is achieved with Horizon streaming (SSE) + client-side polling.
  The Soroban contract and the existing stateless Risk Lens / KYC functions are the only servers;
  none is added.
- **Non-custodial unchanged.** No server holds funds or keys; data flow is read-only from the
  user's own wallet/chain.
- **Cross-session / background push notifications are OUT of scope** — they require a backend
  (push service + stored subscriptions). Alerts are **in-session** (and local notifications while
  the installed PWA is open). Documented as a deferred follow-up.
- All wallet surfaces still depend only on the `ChainAdapter` seam (except the sanctioned escrow
  path). No em-dashes in UI copy. Amount conversions unchanged (×/÷ 1e7).

## 3. Decisions (locked)

- Real-time only, no new backend.
- Live surfaces: balances, activity, Pact state, in-app alerts.
- Landing marketing mockups: **remove all mock/fake numbers**, replace with a concise "how it
  works" note (option b). No fabricated data remains on the landing.

## 4. Architecture

### 4.1 Streaming seam on the adapter
Extend `ChainAdapter` (`frontend/src/lib/adapters/ChainAdapter.ts`) with a change-signal
subscription (not a data stream, to reuse the existing parse logic):
```
subscribeAccount(address: string, onChange: () => void): () => void
```
- Returns an unsubscribe function. `onChange` fires whenever the account's balances or payments
  change. Consumers respond by re-fetching via the existing `getBalances` / `getActivity`.
- This keeps all parsing in one place (`getBalances`/`getActivity`) and uses the stream purely as
  a "something changed, refetch" signal.

### 4.2 `StellarAdapter` implementation
- Implement `subscribeAccount` with a Horizon **`EventSource`** on the account's payments stream
  (`server.payments().forAccount(address).cursor('now').stream({ onmessage })`), calling
  `onChange` on each message.
- **Polling fallback:** if the stream errors/closes (or `EventSource` is unavailable), fall back
  to a `setInterval` re-signal (e.g. every 12s). Reconnect the stream with backoff.
- **Visibility-aware:** pause the stream/poll when `document.hidden`, resume + immediately signal
  on `visibilitychange` to `visible`. Clean up fully on unsubscribe.

### 4.3 Live balances + activity hooks
- `useBalances` / `useActivity`: after the initial load, call `adapter.subscribeAccount(address,
  refetch)` in an effect and unsubscribe on cleanup / address / network change. On `onChange`,
  re-run the existing load. Keep the manual `refetch` as an override. No visual flicker: keep the
  previous data while a refetch is in flight (the hooks already keep state across loads).

### 4.4 Live Pact state
- Soroban RPC has no push, so poll. Add a `usePactLive(id)` (or extend the existing agreement
  hook) that re-reads `getAgreement(id)` on an interval (e.g. every 6s, `duration=60` demo Pacts
  need snappy updates) while a Pact detail is mounted, and refreshes the Dashboard list on an
  interval while mounted. Visibility-aware and gated on `supportsPacts` (never polls the contract
  off testnet, per Phase A). Diff the previous vs new agreement to drive alerts (§4.5).

### 4.5 In-app notifications
- A small event bus + toast system (`frontend/src/lib/notify.ts` + a `Toaster` component):
  - From the account stream: "Received N XLM/USDC" when a new inbound payment appears.
  - From Pact polling diffs: "Bond posted", "Capital deposited", "Milestone released",
    "Deadline approaching" (when `now` nears the Pact deadline).
  - Toasts are transient, dismissible, accessible (`role="status"`). While the installed PWA is
    open, optionally raise a local `Notification` (permission-gated, best-effort). No background
    push.

### 4.6 Wallet-truthful data
- **Connected app audit:** confirm Home/Activity/Dashboard/Pact detail render only wallet/chain
  data (post-demo-removal they already do; verify and fix any leftover static value).
- **Landing:** remove all fabricated numbers from `HeroShowcase.tsx`, `AppPreview.tsx`,
  `WalletPreview.tsx`, `PhoneMockup.tsx`, and any inline sample data in `Landing.tsx`. Replace the
  removed data displays with a short **"how it works"** explanatory note (plain copy: connect a
  wallet, hold/send/receive/convert, and Send protected creates a Pact). Keep the landing visually
  coherent but data-free — nothing that could read as a real transaction the wallet did not make.

### 4.7 Resource safety
- One subscription per mounted surface; deduped by address. Pause on hidden tab, resume on focus.
- Reconnect with capped backoff; swallow benign stream errors (no scary UI).
- Full cleanup on unmount / address change / network change / disconnect. Respect the existing
  15-minute idle auto-lock (streams stop when the session locks).

## 5. Data flow

```
connect → initial getBalances/getActivity (existing)
  → subscribeAccount(address, refetch)  [Horizon SSE, polling fallback]
      → inbound payment on chain → stream onmessage → refetch → UI updates + "Received" toast
  → open a Pact → usePactLive(id) polls getAgreement every 6s (testnet only)
      → state change (bond/deposit/release/complete) → UI updates + event toast (from diff)
  → tab hidden → streams/polls pause;  tab visible → resume + immediate refetch
  → disconnect / idle-lock → unsubscribe, stop polling
```

## 6. Edge cases

- **Stream unsupported / blocked:** polling fallback keeps it live (just less instant).
- **Rapid events:** coalesce refetches (a short debounce) so a burst of stream messages triggers
  one refetch, not many.
- **Off-testnet Pact polling:** never happens — gated on `supportsPacts` (Phase A).
- **Notification permission denied / unavailable:** in-app toasts still work; local `Notification`
  is best-effort only.
- **Idle auto-lock during a stream:** lock tears down subscriptions (no orphaned EventSource).

## 7. Files

New:
- `frontend/src/lib/notify.ts` (+ `notify.test.ts`) — event bus + toast state + pure
  event→message derivation.
- `frontend/src/components/Toaster.tsx` — renders active toasts.
- `frontend/src/hooks/usePactLive.ts` — polls a Pact while mounted (or extend the existing hook).

Modified:
- `frontend/src/lib/adapters/ChainAdapter.ts` (add `subscribeAccount`)
- `frontend/src/lib/adapters/StellarAdapter.ts` (implement stream + fallback + visibility)
- `frontend/src/hooks/useBalances.ts`, `frontend/src/hooks/useActivity.ts` (subscribe)
- `frontend/src/pages/AgreementDetail.tsx`, `frontend/src/pages/Dashboard.tsx` (live poll + alerts)
- `frontend/src/App.tsx` (mount `<Toaster />`)
- Landing components: `HeroShowcase.tsx`, `AppPreview.tsx`, `WalletPreview.tsx`, `PhoneMockup.tsx`,
  `Landing.tsx` (remove mock numbers; add "how it works" note)

## 8. Testing

- Unit (pure, node env): `notify.ts` event→message derivation (inbound-payment message, each Pact
  transition, deadline-approaching), and any diffing helper (previous vs new agreement → event).
- Manual live drill: connect a testnet wallet in two browsers acting as the two Pact parties;
  send a payment and watch balances/activity update live and a toast fire; move a Pact through
  bond/deposit/release and watch both sides update without reload; hide/show the tab to confirm
  pause/resume; confirm the landing shows zero fabricated numbers.
- Existing suite stays green.

## 9. Guardrails recap

- No backend, no custody, non-custodial unchanged.
- Streaming/polling is read-only; writes stay wallet-signed as today.
- Cross-session push deferred (needs a backend).
- Adapter seam preserved; escrow path still the one sanctioned exception; Pact polling gated on
  `supportsPacts`. No em-dashes; ×/÷ 1e7 unchanged.
