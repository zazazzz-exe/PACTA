# Real-time updates + wallet-truthful data Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make balances, activity, and Pact state update in real time (no manual refresh), fire in-app alerts on key events, and remove every fabricated number from the landing so all displayed data is wallet-derived.

**Architecture:** The `ChainAdapter` gains a change-signal subscription (`subscribeAccount`) that `StellarAdapter` implements via a Horizon `cursor('now')` payments stream with a polling fallback and tab-visibility awareness. The data hooks re-fetch on signal (reusing existing parse logic). Pact detail/Dashboard poll the contract (testnet-gated). A small toast store + pure event derivation drives in-app alerts. No new backend; non-custodial unchanged.

**Tech Stack:** Vite 6, React 18, TypeScript, `@stellar/stellar-sdk` (Horizon streaming), the `pacta` bindings, Vitest 2 (node env).

## Global Constraints

- No new backend; real time via Horizon SSE + client polling only. Non-custodial unchanged (read-only; writes stay wallet-signed).
- Cross-session/background push is OUT of scope (needs a backend). Alerts are in-session (+ local `Notification` while the PWA is open, best-effort).
- All wallet surfaces depend only on the `ChainAdapter` seam (escrow path is the one sanctioned exception). Pact polling is gated on `getActiveNetwork().supportsPacts` (never polls the contract off testnet).
- Streams/polls pause on a hidden tab, resume on focus, reconnect with backoff, and fully clean up on unmount / address change / network change / disconnect.
- Nothing fabricated is shown: connected app is 100% wallet-derived; the landing shows zero fake balances/transactions (replaced by a "how it works" note).
- No em-dashes in UI copy. Amount conversions unchanged (×/÷ 1e7). Tests live at `frontend/src/**/*.test.ts` (node env).

---

### Task 1: Adapter change-signal subscription (`subscribeAccount`)

**Files:**
- Modify: `frontend/src/lib/adapters/ChainAdapter.ts` (add method to interface)
- Modify: `frontend/src/lib/adapters/StellarAdapter.ts` (implement)

**Interfaces:**
- Produces: `ChainAdapter.subscribeAccount(address: string, onChange: () => void): () => void` — returns an unsubscribe function; `onChange` fires whenever the account's payments/balances change.

- [ ] **Step 1: Add the method to the `ChainAdapter` interface**

In `frontend/src/lib/adapters/ChainAdapter.ts`, add to the `ChainAdapter` interface (after `signAndSubmit`):
```ts
  // Fire onChange whenever the account's on-chain activity changes (new payment
  // in/out). Returns an unsubscribe function. Consumers re-fetch on the signal.
  subscribeAccount(address: string, onChange: () => void): () => void;
```

- [ ] **Step 2: Implement it in `StellarAdapter`**

In `frontend/src/lib/adapters/StellarAdapter.ts`, add this method to the `StellarAdapter` class (e.g. after `getActivity`):
```ts
  // Live account updates via a Horizon payments stream (cursor 'now'), with a
  // polling fallback if streaming is unavailable/errors, paused while the tab is
  // hidden. onChange is a signal ("something changed, refetch"), not data.
  subscribeAccount(address: string, onChange: () => void): () => void {
    let closed = false;
    let stopStream: (() => void) | undefined;
    let pollId: number | undefined;

    const signal = () => {
      if (!closed) onChange();
    };
    const startPolling = () => {
      if (pollId === undefined) pollId = window.setInterval(signal, 12000);
    };
    const stopPolling = () => {
      if (pollId !== undefined) {
        window.clearInterval(pollId);
        pollId = undefined;
      }
    };
    const startStream = () => {
      if (stopStream || closed) return;
      try {
        stopStream = this.server
          .payments()
          .forAccount(address)
          .cursor('now')
          .stream({
            onmessage: () => signal(),
            onerror: () => {
              // Stream dropped: fall back to polling until visibility restarts it.
              stopStream = undefined;
              startPolling();
            },
          });
      } catch {
        startPolling();
      }
    };
    const stopAll = () => {
      stopStream?.();
      stopStream = undefined;
      stopPolling();
    };
    const onVisibility = () => {
      if (document.hidden) {
        stopAll();
      } else {
        startStream();
        signal(); // immediate refresh on return to foreground
      }
    };

    document.addEventListener('visibilitychange', onVisibility);
    if (!document.hidden) startStream();

    return () => {
      closed = true;
      stopAll();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }
```

- [ ] **Step 3: Typecheck and build**

Run:
```bash
cd frontend && npx tsc -b && npm run build
```
Expected: exit 0 (the interface addition is satisfied by `StellarAdapter`; no other `ChainAdapter` implementation exists after demo removal).

- [ ] **Step 4: Confirm the test suite still passes**

Run: `cd frontend && npm test`
Expected: existing suite green (the adapter's pure-helper tests are unaffected).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/lib/adapters/ChainAdapter.ts frontend/src/lib/adapters/StellarAdapter.ts
git commit -m "feat(realtime): adapter subscribeAccount (Horizon stream + polling fallback)"
```

---

### Task 2: Live balances + activity hooks

**Files:**
- Modify: `frontend/src/hooks/useBalances.ts`
- Modify: `frontend/src/hooks/useActivity.ts`

**Interfaces:**
- Consumes: `adapter.subscribeAccount` (Task 1).

- [ ] **Step 1: Subscribe in `useBalances`**

In `frontend/src/hooks/useBalances.ts`, add a subscription effect after the existing load effect (which stays as the initial fetch). Insert this effect immediately after the existing `useEffect(...)` block:
```tsx
  // Live updates: refetch whenever the account changes on-chain.
  useEffect(() => {
    if (!address) return;
    const unsubscribe = adapter.subscribeAccount(address, () => void load());
    return unsubscribe;
  }, [address, net.key, load]);
```

- [ ] **Step 2: Subscribe in `useActivity`**

In `frontend/src/hooks/useActivity.ts`, add the same pattern after the existing load effect:
```tsx
  // Live updates: refetch history whenever the account changes on-chain.
  useEffect(() => {
    if (!address) return;
    const unsubscribe = adapter.subscribeAccount(address, () => void load());
    return unsubscribe;
  }, [address, net.key, load]);
```

- [ ] **Step 3: Typecheck, build, test**

Run:
```bash
cd frontend && npx tsc -b && npm run build && npm test
```
Expected: exit 0, suite green. (Both hooks keep prior data across refetches, so there is no flicker; the manual `refetch` remains as an override.)

- [ ] **Step 4: Commit**

```bash
git add frontend/src/hooks/useBalances.ts frontend/src/hooks/useActivity.ts
git commit -m "feat(realtime): live balances and activity via subscribeAccount"
```

---

### Task 3: In-app alerts (toast store + pure event derivation + Toaster)

**Files:**
- Create: `frontend/src/lib/notify.ts`
- Test: `frontend/src/lib/notify.test.ts`
- Create: `frontend/src/components/Toaster.tsx`
- Modify: `frontend/src/App.tsx` (mount `<Toaster />`)

**Interfaces:**
- Produces:
  - `type AppEvent = { kind: 'received'; assetCode: string; amount: string } | { kind: 'pact-bond' } | { kind: 'pact-deposit' } | { kind: 'pact-release' } | { kind: 'pact-complete' } | { kind: 'pact-refund' } | { kind: 'deadline-near' }`
  - `messageForEvent(e: AppEvent): { tone: 'info' | 'success' | 'warn'; message: string }`
  - `pushEvent(e: AppEvent): void`, `useToasts(): Toast[]`, `dismissToast(id: string): void`
  - `interface Toast { id: string; tone: 'info' | 'success' | 'warn'; message: string }`

- [ ] **Step 1: Write the failing test**

Create `frontend/src/lib/notify.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { messageForEvent } from './notify';

describe('messageForEvent', () => {
  it('describes an inbound payment as success', () => {
    expect(messageForEvent({ kind: 'received', assetCode: 'XLM', amount: '5' })).toEqual({
      tone: 'success',
      message: 'Received 5 XLM',
    });
  });
  it('describes each Pact transition', () => {
    expect(messageForEvent({ kind: 'pact-bond' }).message).toBe('Security bond posted');
    expect(messageForEvent({ kind: 'pact-deposit' }).message).toBe('Capital deposited');
    expect(messageForEvent({ kind: 'pact-release' }).message).toBe('Milestone released');
    expect(messageForEvent({ kind: 'pact-complete' }).tone).toBe('success');
    expect(messageForEvent({ kind: 'pact-refund' }).message).toBe('Pact refunded');
  });
  it('warns on an approaching deadline', () => {
    expect(messageForEvent({ kind: 'deadline-near' })).toEqual({
      tone: 'warn',
      message: 'A Pact deadline is approaching',
    });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd frontend && npx vitest run src/lib/notify.test.ts`
Expected: FAIL — cannot find module `./notify`.

- [ ] **Step 3: Implement `frontend/src/lib/notify.ts`**

```ts
import { useEffect, useState } from 'react';

export type ToastTone = 'info' | 'success' | 'warn';

export interface Toast {
  id: string;
  tone: ToastTone;
  message: string;
}

export type AppEvent =
  | { kind: 'received'; assetCode: string; amount: string }
  | { kind: 'pact-bond' }
  | { kind: 'pact-deposit' }
  | { kind: 'pact-release' }
  | { kind: 'pact-complete' }
  | { kind: 'pact-refund' }
  | { kind: 'deadline-near' };

// Pure: map a domain event to display copy. Unit-tested.
export function messageForEvent(e: AppEvent): { tone: ToastTone; message: string } {
  switch (e.kind) {
    case 'received':
      return { tone: 'success', message: `Received ${e.amount} ${e.assetCode}` };
    case 'pact-bond':
      return { tone: 'info', message: 'Security bond posted' };
    case 'pact-deposit':
      return { tone: 'info', message: 'Capital deposited' };
    case 'pact-release':
      return { tone: 'info', message: 'Milestone released' };
    case 'pact-complete':
      return { tone: 'success', message: 'Pact completed' };
    case 'pact-refund':
      return { tone: 'info', message: 'Pact refunded' };
    case 'deadline-near':
      return { tone: 'warn', message: 'A Pact deadline is approaching' };
  }
}

// Toast store (module-singleton + subscribers, same pattern as outbox.ts).
let toasts: Toast[] = [];
let seq = 0;
const subs = new Set<() => void>();
const emit = () => subs.forEach((f) => f());

export function pushEvent(e: AppEvent): void {
  const { tone, message } = messageForEvent(e);
  const id = `t${(seq += 1)}`;
  toasts = [...toasts, { id, tone, message }];
  emit();
  // auto-dismiss after 5s
  if (typeof window !== 'undefined') {
    window.setTimeout(() => dismissToast(id), 5000);
  }
}

export function dismissToast(id: string): void {
  toasts = toasts.filter((t) => t.id !== id);
  emit();
}

export function useToasts(): Toast[] {
  const [list, setList] = useState<Toast[]>(toasts);
  useEffect(() => {
    const update = () => setList(toasts);
    subs.add(update);
    update();
    return () => {
      subs.delete(update);
    };
  }, []);
  return list;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd frontend && npx vitest run src/lib/notify.test.ts`
Expected: PASS.

- [ ] **Step 5: Create the `Toaster` component**

Create `frontend/src/components/Toaster.tsx`:
```tsx
import { CheckCircle2, Info, AlertTriangle, X } from 'lucide-react';
import { useToasts, dismissToast, type ToastTone } from '../lib/notify';

const toneStyle: Record<ToastTone, string> = {
  success: 'border-accent/30 bg-accent-tint text-accent-deep',
  info: 'border-hairline bg-paper text-ink',
  warn: 'border-deadline/30 bg-deadline-tint text-deadline-deep',
};

function ToneIcon({ tone }: { tone: ToastTone }) {
  if (tone === 'success') return <CheckCircle2 size={15} aria-hidden />;
  if (tone === 'warn') return <AlertTriangle size={15} aria-hidden />;
  return <Info size={15} aria-hidden />;
}

export function Toaster() {
  const toasts = useToasts();
  if (toasts.length === 0) return null;
  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2" role="status" aria-live="polite">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`flex items-center gap-2 rounded-card border px-3.5 py-2.5 text-[13px] shadow-card ${toneStyle[t.tone]}`}
        >
          <ToneIcon tone={t.tone} />
          <span className="flex-1">{t.message}</span>
          <button
            onClick={() => dismissToast(t.id)}
            aria-label="Dismiss"
            className="grid h-6 w-6 place-items-center rounded-pill hover:bg-black/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
          >
            <X size={13} aria-hidden />
          </button>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 6: Mount `<Toaster />` in `frontend/src/App.tsx`**

Add the import after the other component imports:
```tsx
import { Toaster } from './components/Toaster';
```
Render it just before the closing `</div>` of the top-level app container (after `{showTabs && <BottomTabs current={route.name} />}`):
```tsx
      {showTabs && <BottomTabs current={route.name} />}
      <Toaster />
```

- [ ] **Step 7: Typecheck, build, full test**

Run:
```bash
cd frontend && npx tsc -b && npm run build && npm test
```
Expected: exit 0; new notify test passes; suite green.

- [ ] **Step 8: Commit**

```bash
git add frontend/src/lib/notify.ts frontend/src/lib/notify.test.ts frontend/src/components/Toaster.tsx frontend/src/App.tsx
git commit -m "feat(realtime): in-app alert toasts with pure event derivation"
```

---

### Task 4: Live Pact state + Pact-event alerts

**Files:**
- Create: `frontend/src/lib/pactEvents.ts`
- Test: `frontend/src/lib/pactEvents.test.ts`
- Create: `frontend/src/hooks/usePactLive.ts`
- Modify: `frontend/src/pages/AgreementDetail.tsx` (use live poll + push events)

**Interfaces:**
- Consumes: `getAgreement` (`contract.ts`), `Agreement`/`Status` types, `getActiveNetwork().supportsPacts`, `pushEvent` (Task 3).
- Produces:
  - `pactEvents(prev: Agreement | null, next: Agreement): AppEvent[]`
  - `usePactLive(id: bigint | null): { agreement: Agreement | null; loading: boolean; error: string | null; refetch: () => void }`

- [ ] **Step 1: Write the failing test for `pactEvents`**

Create `frontend/src/lib/pactEvents.test.ts`. First inspect the `Agreement`/`Status` shape (`frontend/src/lib/contract.ts` re-exports them from `pacta`) to use the correct field names; the test below assumes `status` (a `Status` enum), `bond_posted: boolean`, `capital_deposited: boolean`, and `milestones_released: number` — VERIFY these names against the binding types and adjust both the test and `pactEvents.ts` to match the real fields before running:
```ts
import { describe, it, expect } from 'vitest';
import { pactEvents } from './pactEvents';
import { Status, type Agreement } from './contract';

// Minimal Agreement factory for the fields pactEvents inspects.
const base = (over: Partial<Agreement>): Agreement =>
  ({
    status: Status.Active,
    bond_posted: false,
    capital_deposited: false,
    milestones_released: 0,
  } as unknown as Agreement & { bond_posted: boolean; capital_deposited: boolean; milestones_released: number });

describe('pactEvents', () => {
  it('emits nothing when prev is null (first load)', () => {
    expect(pactEvents(null, base({}))).toEqual([]);
  });
  it('emits pact-bond when bond becomes posted', () => {
    const prev = base({});
    const next = base({});
    (next as any).bond_posted = true;
    expect(pactEvents(prev, next)).toContainEqual({ kind: 'pact-bond' });
  });
  it('emits pact-release when a milestone is newly released', () => {
    const prev = base({});
    const next = base({});
    (next as any).milestones_released = 1;
    expect(pactEvents(prev, next)).toContainEqual({ kind: 'pact-release' });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd frontend && npx vitest run src/lib/pactEvents.test.ts`
Expected: FAIL — cannot find module `./pactEvents`.

- [ ] **Step 3: Implement `frontend/src/lib/pactEvents.ts`**

Read the real `Agreement` field names first, then implement (adjust field names to match). Reference implementation:
```ts
import { Status, type Agreement } from './contract';
import type { AppEvent } from './notify';

// Pure diff: what changed between two reads of the same Pact -> alert events.
export function pactEvents(prev: Agreement | null, next: Agreement): AppEvent[] {
  if (!prev) return []; // first load is not an event
  const events: AppEvent[] = [];
  const p = prev as unknown as { bond_posted: boolean; capital_deposited: boolean; milestones_released: number; status: Status };
  const n = next as unknown as { bond_posted: boolean; capital_deposited: boolean; milestones_released: number; status: Status };

  if (!p.bond_posted && n.bond_posted) events.push({ kind: 'pact-bond' });
  if (!p.capital_deposited && n.capital_deposited) events.push({ kind: 'pact-deposit' });
  if (n.milestones_released > p.milestones_released) events.push({ kind: 'pact-release' });
  if (p.status !== Status.Completed && n.status === Status.Completed) events.push({ kind: 'pact-complete' });
  if (p.status !== Status.Refunded && n.status === Status.Refunded) events.push({ kind: 'pact-refund' });
  return events;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd frontend && npx vitest run src/lib/pactEvents.test.ts`
Expected: PASS (fix field names if the binding differs; keep test + impl in sync).

- [ ] **Step 5: Implement `usePactLive`**

Create `frontend/src/hooks/usePactLive.ts`:
```ts
import { useCallback, useEffect, useRef, useState } from 'react';
import { getAgreement, type Agreement } from '../lib/contract';
import { getActiveNetwork } from '../lib/activeNetwork';
import { friendlyError } from '../lib/errors';
import { pactEvents } from '../lib/pactEvents';
import { pushEvent } from '../lib/notify';

// Polls one Pact while mounted (Soroban has no push). Gated on supportsPacts so
// the escrow contract is never read off testnet. Emits alert events on changes.
export function usePactLive(id: bigint | null) {
  const [agreement, setAgreement] = useState<Agreement | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const prev = useRef<Agreement | null>(null);

  const load = useCallback(async () => {
    if (id === null || !getActiveNetwork().supportsPacts) return;
    setLoading(true);
    try {
      const next = await getAgreement(id);
      for (const e of pactEvents(prev.current, next)) pushEvent(e);
      prev.current = next;
      setAgreement(next);
      setError(null);
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id === null || !getActiveNetwork().supportsPacts) return;
    void load();
    let timer: number | undefined;
    const tick = () => {
      if (!document.hidden) void load();
    };
    timer = window.setInterval(tick, 6000);
    const onVis = () => {
      if (!document.hidden) void load();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      if (timer !== undefined) window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [id, load]);

  return { agreement, loading, error, refetch: () => void load() };
}
```

- [ ] **Step 6: Wire `usePactLive` into `AgreementDetail`**

Read `frontend/src/pages/AgreementDetail.tsx`. It currently loads the agreement once (via a `useAgreement`-style hook or inline effect). Replace that read with `usePactLive(id)` so the detail view updates live and pushes event toasts. Keep the existing render, action buttons, and their post-action `refetch` behavior — point them at `usePactLive`'s `refetch`. If the current hook returns extra fields the page uses, preserve them by adapting the call site; if the structure makes a clean swap ambiguous, report DONE_WITH_CONCERNS describing the current hook shape.

- [ ] **Step 7: Typecheck, build, full test**

Run:
```bash
cd frontend && npx tsc -b && npm run build && npm test
```
Expected: exit 0; pactEvents test passes; suite green.

- [ ] **Step 8: Commit**

```bash
git add frontend/src/lib/pactEvents.ts frontend/src/lib/pactEvents.test.ts frontend/src/hooks/usePactLive.ts frontend/src/pages/AgreementDetail.tsx
git commit -m "feat(realtime): live Pact polling with change alerts (testnet-gated)"
```

---

### Task 5: Wallet-truthful landing (remove all fake numbers)

**Files:**
- Create: `frontend/src/components/HowItWorks.tsx`
- Modify: `frontend/src/pages/Landing.tsx`
- Modify/Delete: `frontend/src/components/HeroShowcase.tsx`, `AppPreview.tsx`, `WalletPreview.tsx`, `PhoneMockup.tsx`

**Interfaces:** none (presentational).

- [ ] **Step 1: Create the `HowItWorks` note component**

Create `frontend/src/components/HowItWorks.tsx`:
```tsx
import { Wallet, ArrowUpDown, ShieldCheck } from 'lucide-react';

// Replaces the old fabricated-data previews on the landing. No numbers, no fake
// transactions: a plain explanation of how PACTA works.
export function HowItWorks() {
  const steps = [
    { icon: <Wallet size={18} aria-hidden />, title: 'Connect your wallet', body: 'PACTA is non-custodial. It never holds your keys or funds; you connect a Stellar wallet like Freighter or xBull.' },
    { icon: <ArrowUpDown size={18} aria-hidden />, title: 'Hold, send, receive, convert', body: 'See your real balances and move money with standard signed Stellar transactions. Nothing here is simulated.' },
    { icon: <ShieldCheck size={18} aria-hidden />, title: 'Send protected when it matters', body: 'For a payment that needs safety, Send protected creates a Pact: on-chain escrow with a security bond and staged, deadline-gated release.' },
  ];
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {steps.map((s) => (
        <div key={s.title} className="rounded-card border border-hairline bg-paper p-5">
          <span className="grid h-10 w-10 place-items-center rounded-pill bg-accent text-white">{s.icon}</span>
          <h3 className="mt-3 text-[15px] font-semibold text-ink">{s.title}</h3>
          <p className="mt-1.5 text-[13px] leading-relaxed text-slate">{s.body}</p>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Replace fabricated-data previews on the landing**

Read `frontend/src/pages/Landing.tsx` and the preview components (`HeroShowcase.tsx`, `AppPreview.tsx`, `WalletPreview.tsx`, `PhoneMockup.tsx`). Remove every rendering of a fabricated balance, amount, portfolio total, or transaction (any hardcoded number that reads as real wallet data, and the placeholder `GAAAAAAA...` trader addresses). Where those previews were rendered in `Landing.tsx`, render `<HowItWorks />` instead. If a preview component becomes entirely unused after its fake data is removed, delete the component file and its import; if it has non-data structure worth keeping (layout, hero art), keep only the non-data parts. Do not touch the connected app pages.

- [ ] **Step 3: Verify no fabricated data remains on the landing**

Run:
```bash
cd frontend && npx tsc -b && npm run build
grep -rn "GAAAAAAA" frontend/src/pages/Landing.tsx frontend/src/components/HeroShowcase.tsx frontend/src/components/AppPreview.tsx frontend/src/components/WalletPreview.tsx frontend/src/components/PhoneMockup.tsx 2>/dev/null || echo "no placeholder addresses"
```
Expected: build exit 0; the grep prints `no placeholder addresses` (deleted files won't match). Manually confirm the landing renders no fake balances/amounts/transactions.

- [ ] **Step 4: Full test**

Run: `cd frontend && npm test`
Expected: suite green.

- [ ] **Step 5: Commit**

```bash
git add -A frontend/src
git commit -m "feat(wallet-truthful): remove fabricated data from landing; add how-it-works note"
```

---

### Task 6: Final verification

**Files:** none (verification only).

- [ ] **Step 1: Full typecheck, build, test**

Run:
```bash
cd frontend && npx tsc -b && npm run build && npm test
```
Expected: exit 0; all tests pass (includes `notify.test.ts` and `pactEvents.test.ts`).

- [ ] **Step 2: Confirm no fabricated numbers remain anywhere user-facing**

Run:
```bash
grep -rn "GAAAAAAA\|DEMO_TRADER" frontend/src || echo "clean"
```
Expected: `clean` (the placeholder trader addresses are gone).

- [ ] **Step 3: Manual live drill (record results)**

With `npm run preview` and a testnet wallet:
- Send/receive a payment in another window: balances + Activity update **without** pressing refresh, and a "Received ..." toast appears.
- Open a Pact and move it through bond/deposit/release from the counterparty: the detail view updates live and event toasts fire, both sides.
- Hide the tab, move funds, restore the tab: it refreshes on focus (paused while hidden).
- Landing shows zero fabricated balances/transactions.
Record which rows were verified; note any deferred to a real two-party session.

---

## Self-Review

**Spec coverage:**
- §4.1 adapter subscription seam → Task 1. §4.2 StellarAdapter stream+fallback+visibility → Task 1. §4.3 live balances/activity → Task 2. §4.4 live Pact state (poll, testnet-gated, visibility) → Task 4. §4.5 in-app notifications (event bus + toasts, in-session) → Tasks 3-4. §4.6 wallet-truthful landing cleanup → Task 5. §4.7 resource safety (visibility/backoff/cleanup) → Tasks 1 & 4. §8 testing (pure derivation unit tests + manual drill) → Tasks 3, 4, 6.
- Cross-session push explicitly out of scope (spec §2) — no task builds it (correct).

**Placeholder scan:** No TBD/TODO. Tasks 4 Step 1/3 and Task 5 Step 2 give explicit "read the real shape first, then apply these exact edits/rules" instructions with reference code — not vague deferrals; they exist because the `Agreement` field names and the landing components' internals must be matched to reality, and the task says exactly how. Every command has an expected result.

**Type consistency:** `AppEvent` union (Task 3) is consumed by `pactEvents` (Task 4) and `messageForEvent`/`pushEvent` (Task 3) with matching kinds. `subscribeAccount(address, onChange): () => void` (Task 1) is called identically in both hooks (Task 2). `usePactLive(id: bigint | null)` (Task 4) returns `{ agreement, loading, error, refetch }`, consumed in `AgreementDetail` (Task 4 Step 6). `Toast`/`ToastTone` shared between `notify.ts` and `Toaster.tsx`.
