# Phase 4a — Activity + Profile + shell reconciliation + polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the wallet shell: an Activity feed of the connected account's on-chain history, a real Profile page (identity + KYC + on-chain reputation), correct bottom-tab highlighting on child routes, and the confirmed polish fixes.

**Architecture:** Activity reads Horizon payment history through a new `ChainAdapter.getActivity` method (only `StellarAdapter` implements it; pure `parseActivity` maps Horizon records to a chain-agnostic `ActivityItem`). Profile composes existing pieces — `useWallet` (address, kycStatus), `fetchKycStatus` (masked name, expiry), and the frozen escrow's `getReputation`. A pure `tabForRoute` helper fixes bottom-tab active state on child routes. Polish fixes are small, localized corrections.

**Tech Stack:** React 18 + TypeScript + Tailwind 3, Vite, Vitest, `@stellar/stellar-sdk` v14.6.1 (Horizon `payments().forAccount()`), the generated `pacta` escrow bindings (read-only `getReputation`).

## Global Constraints

- **Do not touch the contract.** `PRD.md` §8 is frozen and deployed. Profile only *reads* reputation via the existing `getReputation` binding; Activity never calls the contract.
- **Adapter seam.** Only `StellarAdapter.ts` and `stellarAssets.ts` import `@stellar/stellar-sdk`. `parseActivity` (in `lib/activity.ts`), `Activity.tsx`, and `Profile.tsx` import only the `ChainAdapter` interface, pure helpers, hooks, and (Profile only) the sanctioned `lib/contract.ts` reputation read — the same exception the escrow pages already use. No Horizon/SDK import leaks into a wallet surface.
- **Extending the interface means updating `docs/architecture/chain-adapter.md` first**, then `ChainAdapter.ts`, then `StellarAdapter`. This plan adds one method (`getActivity`); Task 1 updates the doc.
- **Amounts.** Human decimal strings for display; exact base-unit math (`bigint`, ×/÷ 1e7) where any comparison or total is computed. Horizon returns human strings already; convert with the existing `humanToBaseUnits`/`formatAmount`.
- **Determinism in tests.** Pure time/parse helpers take `now` (ms) as a parameter — never call `Date.now()` inside a pure helper, so unit tests are deterministic.
- **Convert/Activity/Receive/Profile are NOT KYC-gated.** Only escrow commitment actions are (unchanged). Add no gate to these screens.
- **No em-dashes in UI copy.** Map failures with `friendlyError`.
- **Match the wallet-shell page pattern** from `Home.tsx`/`Receive.tsx`: root `mx-auto max-w-app space-y-5 px-1`, disconnected guard with `<ConnectButton/>`, `text-[22px] font-semibold` h1, cards `rounded-card border border-hairline bg-paper`, `animate-pulse rounded-card bg-mist` skeletons, `border-refund/40 bg-refund-tint` error banner, explicit empty state.

## File Structure

- **Create** `frontend/src/lib/activity.ts` — `ActivityItem` type, pure `parseActivity`, pure `timeAgo`. No SDK import.
- **Create** `frontend/src/lib/activity.test.ts` — unit tests.
- **Create** `frontend/src/hooks/useActivity.ts` — fetch hook (mirrors `useBalances`).
- **Create** `frontend/src/pages/Activity.tsx` — the Activity feed page.
- **Create** `frontend/src/pages/Profile.tsx` — the Profile page.
- **Create** `frontend/src/lib/tabForRoute.ts` — pure route→tab mapping.
- **Create** `frontend/src/lib/tabForRoute.test.ts` — unit tests.
- **Modify** `frontend/src/lib/adapters/ChainAdapter.ts` — add `ActivityItem` re-export note + `getActivity` to the interface (import the type from `activity.ts`), or declare the type in `ChainAdapter.ts` (see Task 1 for the exact placement chosen).
- **Modify** `frontend/src/lib/adapters/StellarAdapter.ts` — implement `getActivity`.
- **Modify** `frontend/src/components/BottomTabs.tsx` — use `tabForRoute` for the active state.
- **Modify** `frontend/src/App.tsx` — route `/activity` → `<Activity/>`, `/profile` → `<Profile/>`.
- **Modify** `frontend/src/lib/format.ts` — (only if `timeAgo` is placed here; this plan puts it in `activity.ts` to keep it SDK-adjacent-free — see Task 1).
- **Modify** `frontend/src/pages/Convert.tsx` — clear stale `error` before the quote effect early-return.
- **Modify** `frontend/src/pages/Receive.tsx` — reset QR + stale-guard on address change.
- **Modify** `frontend/src/lib/wallet.ts` — lazy-init the wallets kit.

---

### Task 1: Activity adapter core (pure parse + timeAgo + interface + doc)

**Files:**
- Create: `frontend/src/lib/activity.ts`
- Test: `frontend/src/lib/activity.test.ts`
- Modify: `frontend/src/lib/adapters/ChainAdapter.ts` (add `getActivity` to interface; import `ActivityItem`)
- Modify: `frontend/src/lib/adapters/StellarAdapter.ts` (implement `getActivity`)
- Modify: `docs/architecture/chain-adapter.md` (document `getActivity` + `ActivityItem`)

**Interfaces:**
- Consumes: `AssetId` from `ChainAdapter.ts`.
- Produces (used by Tasks 2):
  - type `ActivityItem = { id: string; kind: 'sent' | 'received'; counterparty: string; assetCode: string; amount: string; createdAt: string; hash: string }`
  - type `RawPaymentRecord` (local mirror of the Horizon fields used)
  - `parseActivity(records: RawPaymentRecord[], address: string): ActivityItem[]`
  - `timeAgo(iso: string, nowMs: number): string`
  - `ChainAdapter.getActivity(address: string, limit?: number): Promise<ActivityItem[]>`

- [ ] **Step 1: Write `frontend/src/lib/activity.ts`**

```ts
// Pure Activity helpers. No SDK import: this is a wallet-surface support module,
// so it mirrors the Horizon payment-record shape with its own local type.
export interface ActivityItem {
  id: string;
  kind: 'sent' | 'received';
  counterparty: string;
  assetCode: string;
  amount: string; // human decimal string as Horizon returns it
  createdAt: string; // ISO timestamp
  hash: string; // transaction hash
}

// Minimal mirror of the Horizon payments-endpoint records we render. Other
// record types (account_merge, invoke_host_function) are ignored.
export interface RawPaymentRecord {
  id: string;
  type: string;
  created_at: string;
  transaction_hash: string;
  // payment / path payment
  from?: string;
  to?: string;
  amount?: string;
  asset_type?: string;
  asset_code?: string;
  // path payment (strict send/receive) source side
  source_amount?: string;
  source_asset_type?: string;
  source_asset_code?: string;
  // create_account
  account?: string;
  funder?: string;
  starting_balance?: string;
}

const codeOf = (assetType?: string, assetCode?: string): string =>
  assetType === 'native' || !assetType ? 'XLM' : assetCode ?? '???';

// Map raw Horizon payment records (newest-first) for `address` into ActivityItems.
// Unsupported record types are dropped.
export function parseActivity(records: RawPaymentRecord[], address: string): ActivityItem[] {
  const out: ActivityItem[] = [];
  for (const r of records) {
    let item: ActivityItem | null = null;
    if (r.type === 'payment') {
      const received = r.to === address;
      item = {
        id: r.id,
        kind: received ? 'received' : 'sent',
        counterparty: (received ? r.from : r.to) ?? '',
        assetCode: codeOf(r.asset_type, r.asset_code),
        amount: r.amount ?? '0',
        createdAt: r.created_at,
        hash: r.transaction_hash,
      };
    } else if (r.type === 'path_payment_strict_send' || r.type === 'path_payment_strict_receive') {
      const received = r.to === address;
      item = {
        id: r.id,
        kind: received ? 'received' : 'sent',
        counterparty: (received ? r.from : r.to) ?? '',
        // Received: the destination asset/amount. Sent: the source asset/amount.
        assetCode: received
          ? codeOf(r.asset_type, r.asset_code)
          : codeOf(r.source_asset_type, r.source_asset_code),
        amount: (received ? r.amount : r.source_amount) ?? '0',
        createdAt: r.created_at,
        hash: r.transaction_hash,
      };
    } else if (r.type === 'create_account') {
      const received = r.account === address;
      item = {
        id: r.id,
        kind: received ? 'received' : 'sent',
        counterparty: (received ? r.funder : r.account) ?? '',
        assetCode: 'XLM',
        amount: r.starting_balance ?? '0',
        createdAt: r.created_at,
        hash: r.transaction_hash,
      };
    }
    if (item) out.push(item);
  }
  return out;
}

// Compact "time ago" from an ISO timestamp relative to nowMs (passed in for
// deterministic tests). e.g. "just now", "5m", "3h", "2d", or a date.
export function timeAgo(iso: string, nowMs: number): string {
  const then = Date.parse(iso);
  if (Number.isNaN(then)) return '';
  const s = Math.max(0, Math.floor((nowMs - then) / 1000));
  if (s < 45) return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d`;
  return new Date(then).toLocaleDateString();
}
```

- [ ] **Step 2: Write the failing tests `frontend/src/lib/activity.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { parseActivity, timeAgo, type RawPaymentRecord } from './activity';

const ME = 'GDCOP33NLUKXJXALCJCPTXJUGS42GZRM5YOYLS5RTKMLZNPORM2Z76GI';
const OTHER = 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5';

const rec = (r: Partial<RawPaymentRecord>): RawPaymentRecord => ({
  id: '1',
  type: 'payment',
  created_at: '2026-07-18T00:00:00Z',
  transaction_hash: 'h1',
  ...r,
});

describe('parseActivity', () => {
  it('classifies a received native payment', () => {
    const out = parseActivity([rec({ type: 'payment', from: OTHER, to: ME, amount: '10.0000000', asset_type: 'native' })], ME);
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ kind: 'received', counterparty: OTHER, assetCode: 'XLM', amount: '10.0000000' });
  });

  it('classifies a sent issued payment', () => {
    const out = parseActivity(
      [rec({ type: 'payment', from: ME, to: OTHER, amount: '5.0000000', asset_type: 'credit_alphanum4', asset_code: 'USDC' })],
      ME,
    );
    expect(out[0]).toMatchObject({ kind: 'sent', counterparty: OTHER, assetCode: 'USDC' });
  });

  it('uses source asset/amount for a sent path payment', () => {
    const out = parseActivity(
      [rec({
        type: 'path_payment_strict_send',
        from: ME,
        to: OTHER,
        amount: '4.5',
        asset_type: 'credit_alphanum4',
        asset_code: 'USDC',
        source_amount: '100',
        source_asset_type: 'native',
      })],
      ME,
    );
    expect(out[0]).toMatchObject({ kind: 'sent', assetCode: 'XLM', amount: '100' });
  });

  it('classifies create_account funding as received', () => {
    const out = parseActivity(
      [rec({ type: 'create_account', account: ME, funder: OTHER, starting_balance: '2.5', amount: undefined })],
      ME,
    );
    expect(out[0]).toMatchObject({ kind: 'received', counterparty: OTHER, assetCode: 'XLM', amount: '2.5' });
  });

  it('drops unsupported record types', () => {
    const out = parseActivity([rec({ type: 'invoke_host_function' })], ME);
    expect(out).toHaveLength(0);
  });
});

describe('timeAgo', () => {
  const now = Date.parse('2026-07-18T12:00:00Z');
  it('formats recent spans', () => {
    expect(timeAgo('2026-07-18T11:59:40Z', now)).toBe('just now');
    expect(timeAgo('2026-07-18T11:30:00Z', now)).toBe('30m');
    expect(timeAgo('2026-07-18T09:00:00Z', now)).toBe('3h');
    expect(timeAgo('2026-07-16T12:00:00Z', now)).toBe('2d');
  });
  it('returns empty for an unparseable timestamp', () => {
    expect(timeAgo('not-a-date', now)).toBe('');
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `cd frontend && npx vitest run src/lib/activity.test.ts`
Expected: FAIL (module/exports missing).

- [ ] **Step 4: Add `getActivity` to the `ChainAdapter` interface**

In `frontend/src/lib/adapters/ChainAdapter.ts`, add an import + interface method. At the top, add:

```ts
import type { ActivityItem } from '../activity';
```

Add to the `ChainAdapter` interface (after `getBalances`):

```ts
  getActivity(address: string, limit?: number): Promise<ActivityItem[]>;
```

- [ ] **Step 5: Document the extension in `docs/architecture/chain-adapter.md`**

In the interface TypeScript block add the `getActivity(address, limit?)` line, and add a short method-contract bullet: "`getActivity(address, limit?)` returns the account's recent payment history (sent/received, newest first), mapped to a chain-agnostic `ActivityItem`. `StellarAdapter` reads Horizon's `payments().forAccount()` endpoint; the Soroban escrow has no history method, so protected-payment steps appear only as their underlying payments." Add `ActivityItem` to the interfaces shown.

- [ ] **Step 6: Implement `getActivity` in `StellarAdapter.ts`**

Add the import:

```ts
import { parseActivity, type RawPaymentRecord, type ActivityItem } from '../activity';
```

Add the method (after `getBalances`):

```ts
  async getActivity(address: string, limit = 20): Promise<ActivityItem[]> {
    try {
      const page = await this.server
        .payments()
        .forAccount(address)
        .order('desc')
        .limit(limit)
        .call();
      return parseActivity(page.records as unknown as RawPaymentRecord[], address);
    } catch (e: unknown) {
      // Unfunded/brand-new account has no history yet.
      if (e && typeof e === 'object' && 'response' in e) {
        const status = (e as { response?: { status?: number } }).response?.status;
        if (status === 404) return [];
      }
      throw e;
    }
  }
```

- [ ] **Step 7: Run activity tests to verify they pass**

Run: `cd frontend && npx vitest run src/lib/activity.test.ts`
Expected: PASS.

- [ ] **Step 8: Typecheck**

Run: `cd frontend && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 9: Commit**

```bash
git add frontend/src/lib/activity.ts frontend/src/lib/activity.test.ts frontend/src/lib/adapters/ChainAdapter.ts frontend/src/lib/adapters/StellarAdapter.ts docs/architecture/chain-adapter.md
git commit -m "feat(activity): getActivity adapter method + pure parseActivity/timeAgo"
```

---

### Task 2: useActivity hook + Activity page + route

**Files:**
- Create: `frontend/src/hooks/useActivity.ts`
- Create: `frontend/src/pages/Activity.tsx`
- Modify: `frontend/src/App.tsx`

**Interfaces:**
- Consumes: `adapter` from `StellarAdapter.ts`; `ActivityItem`, `timeAgo` from `activity.ts`; `friendlyError`; `useWallet`; `shortAddr`, `formatAmount`/trim from `format.ts`; `txExplorerUrl` from `config.ts`; `ConnectButton`.
- Produces: `<Activity/>` default screen at `/activity`.

- [ ] **Step 1: Implement `useActivity.ts`** (mirror `useBalances.ts` exactly, swapping `getActivity`)

```ts
import { useCallback, useEffect, useState } from 'react';
import { adapter } from '../lib/adapters/StellarAdapter';
import type { ActivityItem } from '../lib/activity';
import { friendlyError } from '../lib/errors';

export function useActivity(address: string | null) {
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (isStale?: () => boolean) => {
    if (!address) {
      setItems([]);
      setError(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await adapter.getActivity(address);
      if (!isStale?.()) setItems(result);
    } catch (e) {
      if (!isStale?.()) setError(friendlyError(e));
    } finally {
      if (!isStale?.()) setLoading(false);
    }
  }, [address]);

  useEffect(() => {
    let ignore = false;
    void load(() => ignore);
    return () => {
      ignore = true;
    };
  }, [load]);

  return { items, loading, error, refetch: () => void load() };
}
```

- [ ] **Step 2: Implement `Activity.tsx`** (wallet-shell pattern; list of rows with direction icon, amount, counterparty, time, explorer link)

```tsx
import { ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import { useWallet } from '../hooks/useWallet';
import { useActivity } from '../hooks/useActivity';
import type { ActivityItem } from '../lib/activity';
import { timeAgo } from '../lib/activity';
import { shortAddr } from '../lib/format';
import { txExplorerUrl } from '../lib/config';
import { ConnectButton } from '../components/ConnectButton';

function Row({ item, now }: { item: ActivityItem; now: number }) {
  const received = item.kind === 'received';
  return (
    <a
      href={txExplorerUrl(item.hash)}
      target="_blank"
      rel="noreferrer"
      className="flex items-center gap-3 rounded-card border border-hairline bg-paper p-3.5 transition hover:border-accent/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
    >
      <span
        className={`grid h-9 w-9 shrink-0 place-items-center rounded-pill ${
          received ? 'bg-accent-tint text-accent-deep' : 'bg-mist text-slate'
        }`}
      >
        {received ? <ArrowDownLeft size={18} aria-hidden /> : <ArrowUpRight size={18} aria-hidden />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-medium text-ink">
          {received ? 'Received' : 'Sent'} {item.assetCode}
        </span>
        <span className="mono block truncate text-[12px] text-slate">
          {received ? 'from' : 'to'} {shortAddr(item.counterparty)}
        </span>
      </span>
      <span className="shrink-0 text-right">
        <span className={`mono block text-[15px] ${received ? 'text-accent-deep' : 'text-ink'}`}>
          {received ? '+' : '-'}
          {item.amount} {item.assetCode}
        </span>
        <span className="block text-[12px] text-slate">{timeAgo(item.createdAt, now)}</span>
      </span>
    </a>
  );
}

export function Activity() {
  const { address } = useWallet();
  const { items, loading, error } = useActivity(address);
  const now = Date.now();

  if (!address) {
    return (
      <div className="mx-auto max-w-app px-1 py-16 text-center">
        <h1 className="text-[22px] font-semibold tracking-tight text-ink">Activity</h1>
        <p className="mt-2 text-[14px] text-slate">Connect a wallet to see your history.</p>
        <div className="mt-6 flex justify-center">
          <ConnectButton />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-app space-y-5 px-1">
      <h1 className="text-[22px] font-semibold tracking-tight text-ink">Activity</h1>

      {error && (
        <p className="rounded-card border border-refund/40 bg-refund-tint p-3 text-[13px] text-refund-deep">{error}</p>
      )}

      {loading && items.length === 0 && (
        <div className="space-y-3">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-card bg-mist" />
          ))}
        </div>
      )}

      {!loading && !error && items.length === 0 && (
        <div className="rounded-card border border-hairline bg-paper p-6 text-center text-[14px] text-slate">
          No activity yet. Your sends, receives, and swaps will show up here.
        </div>
      )}

      {items.length > 0 && (
        <div className="space-y-3">
          {items.map((it) => (
            <Row key={it.id} item={it} now={now} />
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Wire the route in `App.tsx`**

Add the import beside the other page imports:

```ts
import { Activity } from './pages/Activity';
```

Replace:

```tsx
          {route.name === 'activity' && <ComingSoon title="Activity" />}
```

with:

```tsx
          {route.name === 'activity' && <Activity />}
```

`ComingSoon` is now unused — remove its import from `App.tsx` (the build fails on unused imports). Confirm no other route uses it.

- [ ] **Step 4: Typecheck + build + full test run**

Run: `cd frontend && npx tsc --noEmit && npm run build && npx vitest run`
Expected: no type errors; build succeeds (catches the now-unused `ComingSoon` import if missed); all tests pass.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/hooks/useActivity.ts frontend/src/pages/Activity.tsx frontend/src/App.tsx
git commit -m "feat(activity): useActivity hook + Activity feed page + route"
```

---

### Task 3: Profile page + route

**Files:**
- Create: `frontend/src/pages/Profile.tsx`
- Modify: `frontend/src/App.tsx`

**Interfaces:**
- Consumes: `useWallet` (`address`, `kycStatus`); `fetchKycStatus` from `lib/kycClient.ts` (returns `KycStatusRead = { kycStatus, maskedName, docType, docCountry, docExpiry, updatedAt, providerMode }`); `getReputation` from `lib/contract.ts` (returns `Reputation = { completed: u32; refunded: u32; total_volume: i128 }`); `IdentityBadge`, `Avatar`, `CopyButton`, `ConnectButton`, `Button`; `navigate`; `shortAddr`, `formatAmount`, `formatPhp`.
- Produces: `<Profile/>` default screen at `/profile`.

- [ ] **Step 1: Confirm the exact shapes before writing**

Read `frontend/src/lib/kycClient.ts` (the `fetchKycStatus` return type + function name), `frontend/src/lib/contract.ts` (`getReputation` signature), and `frontend/src/pages/TraderProfile.tsx` (how it renders the reputation `Stat` grid and `Avatar`/`IdentityBadge`). Reuse those exact patterns and prop names. If a name differs from this task's assumptions, follow the real code and note it in the report.

- [ ] **Step 2: Implement `Profile.tsx`**

Compose: identity card (Avatar + short address + CopyButton), KYC status card (`IdentityBadge` + status line + masked name/expiry when verified + a "Verify identity" `Button` → `navigate('/verify')` when not verified), and a reputation card (Completed / Refunded / Volume) read from `getReputation(address)`. Use the wallet-shell page pattern. Reputation loads in its own `useEffect` with a stale-guard (like `useBalances`). Show a link/button to `/dashboard` ("View my Pacts") rather than re-fetching all agreements (the `getAllAgreements` fan-out is slow — do not use it here).

```tsx
import { useEffect, useState } from 'react';
import { ShieldCheck, ArrowUpRight } from 'lucide-react';
import { useWallet } from '../hooks/useWallet';
import { fetchKycStatus, type KycStatusRead } from '../lib/kycClient';
import { getReputation, type Reputation } from '../lib/contract';
import { Avatar } from '../components/Avatar';
import { IdentityBadge } from '../components/kyc/IdentityBadge';
import { CopyButton } from '../components/CopyButton';
import { ConnectButton } from '../components/ConnectButton';
import { Button } from '../components/Button';
import { navigate } from '../lib/router';
import { shortAddr, formatAmount, formatPhp } from '../lib/format';

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-card border border-hairline bg-paper p-4 text-center">
      <div className="mono text-[20px] font-semibold text-ink">{value}</div>
      <div className="text-[12px] text-slate">{label}</div>
      {sub && <div className="text-[11px] text-slate">{sub}</div>}
    </div>
  );
}

export function Profile() {
  const { address, kycStatus } = useWallet();
  const [kyc, setKyc] = useState<KycStatusRead | null>(null);
  const [rep, setRep] = useState<Reputation | null>(null);
  const [repLoading, setRepLoading] = useState(false);

  useEffect(() => {
    let ignore = false;
    if (!address) {
      setKyc(null);
      setRep(null);
      return;
    }
    setRepLoading(true);
    void fetchKycStatus().then((k) => { if (!ignore) setKyc(k); }).catch(() => { if (!ignore) setKyc(null); });
    void getReputation(address)
      .then((r) => { if (!ignore) setRep(r); })
      .catch(() => { if (!ignore) setRep(null); })
      .finally(() => { if (!ignore) setRepLoading(false); });
    return () => { ignore = true; };
  }, [address]);

  if (!address) {
    return (
      <div className="mx-auto max-w-app px-1 py-16 text-center">
        <h1 className="text-[22px] font-semibold tracking-tight text-ink">Profile</h1>
        <p className="mt-2 text-[14px] text-slate">Connect a wallet to see your profile.</p>
        <div className="mt-6 flex justify-center">
          <ConnectButton />
        </div>
      </div>
    );
  }

  const verified = kycStatus === 'verified';

  return (
    <div className="mx-auto max-w-app space-y-5 px-1">
      <h1 className="text-[22px] font-semibold tracking-tight text-ink">Profile</h1>

      {/* Identity */}
      <div className="flex items-center gap-3 rounded-card border border-hairline bg-paper p-4">
        <Avatar address={address} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="mono truncate text-[14px] text-ink">{shortAddr(address)}</span>
            <CopyButton value={address} />
          </div>
          <IdentityBadge status={kycStatus} maskedName={kyc?.maskedName} className="mt-1" />
        </div>
      </div>

      {/* KYC */}
      <div className="rounded-card border border-hairline bg-paper p-4">
        <h2 className="text-[13px] font-semibold uppercase tracking-wider text-slate">Identity verification</h2>
        {verified ? (
          <p className="mt-2 text-[14px] text-ink">
            Verified{kyc?.maskedName ? ` as ${kyc.maskedName}` : ''}
            {kyc?.docExpiry ? <span className="block text-[12px] text-slate">Document valid until {kyc.docExpiry}</span> : null}
          </p>
        ) : (
          <>
            <p className="mt-2 text-[14px] text-slate">
              Verify your identity to send protected payments (a Pact), post a bond, deposit, or release a milestone.
            </p>
            <Button className="mt-3" onClick={() => navigate('/verify')}>
              <ShieldCheck size={16} aria-hidden /> Verify identity
            </Button>
          </>
        )}
      </div>

      {/* Reputation */}
      <div className="space-y-3">
        <h2 className="text-[13px] font-semibold uppercase tracking-wider text-slate">On-chain reputation</h2>
        {repLoading && !rep ? (
          <div className="grid grid-cols-3 gap-3">
            {[0, 1, 2].map((i) => <div key={i} className="h-20 animate-pulse rounded-card bg-mist" />)}
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            <Stat label="Completed" value={String(rep?.completed ?? 0)} />
            <Stat label="Refunded" value={String(rep?.refunded ?? 0)} />
            <Stat label="Volume" value={formatAmount(rep?.total_volume ?? 0n, false)} sub={formatPhp(rep?.total_volume ?? 0n)} />
          </div>
        )}
        <button
          onClick={() => navigate('/dashboard')}
          className="inline-flex items-center gap-1 text-[13px] text-accent-deep hover:opacity-80"
        >
          View my Pacts <ArrowUpRight size={14} aria-hidden />
        </button>
      </div>
    </div>
  );
}
```

Note: the `Reputation` type import path and `getReputation` return handling must match `contract.ts` exactly (Step 1). If `total_volume` is already a `bigint`, `formatAmount`/`formatPhp` accept it directly; if `getReputation` returns a wrapped result, unwrap as `contract.ts`/`TraderProfile.tsx` do.

- [ ] **Step 3: Wire the route in `App.tsx`**

Add:

```ts
import { Profile } from './pages/Profile';
```

Replace:

```tsx
          {route.name === 'profile' && <Verify />}
```

with:

```tsx
          {route.name === 'profile' && <Profile />}
```

Leave the `verify` route rendering `<Verify />` (Profile links to it).

- [ ] **Step 4: Typecheck + build**

Run: `cd frontend && npx tsc --noEmit && npm run build`
Expected: no errors; build succeeds. Fix any prop/type mismatch surfaced against the real `Avatar`/`IdentityBadge`/`getReputation`.

- [ ] **Step 5: Full test run**

Run: `cd frontend && npx vitest run`
Expected: all pass (no new tests required for this composed UI page).

- [ ] **Step 6: Commit**

```bash
git add frontend/src/pages/Profile.tsx frontend/src/App.tsx
git commit -m "feat(profile): Profile page (identity + KYC status + on-chain reputation)"
```

---

### Task 4: Bottom-tab active state on child routes

**Files:**
- Create: `frontend/src/lib/tabForRoute.ts`
- Test: `frontend/src/lib/tabForRoute.test.ts`
- Modify: `frontend/src/components/BottomTabs.tsx`

**Interfaces:**
- Consumes: `Route` from `lib/router.ts`.
- Produces: `tabForRoute(routeName: Route['name']): TabName | null`; `BottomTabs` highlights the parent tab on child routes.

- [ ] **Step 1: Write `tabForRoute.ts`**

The 5 tabs are `home | convert | dashboard | activity | profile`. Map child/escrow routes to their parent tab so the shell shows where you are:

```ts
import type { Route } from './router';

export type TabName = 'home' | 'convert' | 'dashboard' | 'activity' | 'profile';

// Which bottom tab should read as active for a given route. Child/detail routes
// map to their parent tab; routes with no home tab (landing) return null.
export function tabForRoute(name: Route['name']): TabName | null {
  switch (name) {
    case 'home':
    case 'receive':
    case 'send':
      return 'home'; // Send/Receive are launched from Home
    case 'convert':
      return 'convert';
    case 'dashboard':
    case 'create':
    case 'detail':
    case 'trader':
      return 'dashboard'; // the Pacts tab
    case 'activity':
      return 'activity';
    case 'profile':
    case 'verify':
      return 'profile';
    case 'landing':
      return null;
  }
}
```

- [ ] **Step 2: Write failing tests `tabForRoute.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { tabForRoute } from './tabForRoute';

describe('tabForRoute', () => {
  it('maps home cluster to home', () => {
    expect(tabForRoute('home')).toBe('home');
    expect(tabForRoute('receive')).toBe('home');
    expect(tabForRoute('send')).toBe('home');
  });
  it('maps the escrow cluster to the Pacts (dashboard) tab', () => {
    expect(tabForRoute('dashboard')).toBe('dashboard');
    expect(tabForRoute('create')).toBe('dashboard');
    expect(tabForRoute('detail')).toBe('dashboard');
    expect(tabForRoute('trader')).toBe('dashboard');
  });
  it('maps verify to profile and convert/activity to themselves', () => {
    expect(tabForRoute('verify')).toBe('profile');
    expect(tabForRoute('profile')).toBe('profile');
    expect(tabForRoute('convert')).toBe('convert');
    expect(tabForRoute('activity')).toBe('activity');
  });
  it('returns null for landing', () => {
    expect(tabForRoute('landing')).toBeNull();
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `cd frontend && npx vitest run src/lib/tabForRoute.test.ts`
Expected: FAIL.

- [ ] **Step 4: Use `tabForRoute` in `BottomTabs.tsx`**

Read the file first. It currently computes `const active = current === t.name`. Replace the active computation with the mapped tab:

```ts
import { tabForRoute } from '../lib/tabForRoute';
// ...
const activeTab = tabForRoute(current);
// ...in the map:
const active = activeTab === t.name;
```

Do not change the tab list, icons, or styling.

- [ ] **Step 5: Run tests to verify they pass; typecheck + build**

Run: `cd frontend && npx vitest run src/lib/tabForRoute.test.ts && npx tsc --noEmit && npm run build`
Expected: PASS; no type errors; build succeeds.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/lib/tabForRoute.ts frontend/src/lib/tabForRoute.test.ts frontend/src/components/BottomTabs.tsx
git commit -m "feat(shell): highlight the parent bottom tab on child routes"
```

---

### Task 5: Polish fixes (Convert stale error, Receive QR guard, wallet lazy-init)

**Files:**
- Modify: `frontend/src/pages/Convert.tsx`
- Modify: `frontend/src/pages/Receive.tsx`
- Modify: `frontend/src/lib/wallet.ts`

**Interfaces:**
- Consumes/Produces: no signature changes; these are localized corrections.

- [ ] **Step 1: Convert stale-error clear**

In `Convert.tsx`, the quote effect calls `setQuote(null)` then early-returns on invalid input before clearing `error`. Move `setError(null)` above the early return so a stale "No route" message clears when the amount becomes invalid/empty. Exact change: in the `useEffect` quote block, ensure the first two statements are:

```ts
    setQuote(null);
    setError(null);
    if (!from || !to || !validAmount) return;
```

(Read the current lines first; only reorder/add the `setError(null)` — do not alter the debounce or stale-guard logic.)

- [ ] **Step 2: Receive QR reset + stale-guard**

In `Receive.tsx`, the QR effect sets the data URL but never resets on address change and has no stale-guard. Replace the effect body so it clears the old QR immediately and ignores an out-of-order resolution:

```tsx
  useEffect(() => {
    let ignore = false;
    setQr('');
    if (!address) return;
    QRCode.toDataURL(address)
      .then((url) => { if (!ignore) setQr(url); })
      .catch(() => { if (!ignore) setQr(''); });
    return () => { ignore = true; };
  }, [address]);
```

(Match the real state setter name and the `QRCode` import already in the file.)

- [ ] **Step 3: Lazy-init the wallets kit in `wallet.ts`**

`wallet.ts` currently constructs `export const kit = new StellarWalletsKit({...})` at module scope, which touches `window` at import time (a test/SSR hazard that forced a `vi.mock` in the adapter test). Convert to a lazy singleton behind a getter, preserving the existing public API (every current caller of `kit` and `signTransaction`/`signMessage` must keep working):

- Replace the eager `export const kit = new StellarWalletsKit({...})` with a module-local `let _kit: StellarWalletsKit | null = null;` and a `function getKit(): StellarWalletsKit { if (!_kit) _kit = new StellarWalletsKit({...}); return _kit; }`.
- Update the internal callers in this file (e.g. `signTransaction`, `signMessage`, connect/disconnect helpers) to call `getKit()` instead of `kit`.
- If any OTHER file imports `kit` directly, either export `getKit` and update those callers, or keep a backward-compatible `export function kit()` — choose the smallest change and note which in the report. Read the file and grep for `from '.../wallet'` / `kit` usages first.

- [ ] **Step 4: Verify nothing regressed**

Run: `cd frontend && npx tsc --noEmit && npm run build && npx vitest run`
Expected: no type errors; build succeeds; all tests pass. If the `wallet.ts` lazy-init lets you drop the `vi.mock('../wallet')` in `StellarAdapter.buildConvertTx.test.ts`, you MAY remove it and re-run; if removal causes any failure, keep the mock and note why in the report (do not force it).

- [ ] **Step 5: Manual smoke (controller/user, not automated)**

Note in the report that these need an interactive check: Convert error clears when amount is emptied after a no-route; Receive QR updates immediately on wallet switch; connect/sign still works via the lazy kit.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/pages/Convert.tsx frontend/src/pages/Receive.tsx frontend/src/lib/wallet.ts frontend/src/lib/adapters/StellarAdapter.buildConvertTx.test.ts
git commit -m "fix(polish): clear stale Convert error, guard Receive QR, lazy-init wallets kit"
```

---

## Out of scope for Phase 4a (flag to the user)

- **Deep visual redesign of the escrow pages** (`Dashboard.tsx`, `AgreementDetail.tsx` layout/width overhaul). They already render correctly within the shell (no hard bottom-tab overlap; `pb-24` + `ConfirmDialog` z-50 handle it). Task 4 only fixes tab highlighting. A fuller restyle can be a later polish pass.
- **Linked identity across wallets (multi-wallet KYC)** — that is Phase 4b, gated on a design brainstorm (schema, sign-to-link flow, unlink rules) per `PRD.md` §5.3a and `docs/kyc.md`.
- The softer Home stale-error + skeleton stacking minor (b) — cosmetic; leave for the later restyle unless trivially fixable during Task 5.

## Manual gate (Phase 4 §13 click-path, user runs)

Connect → Home shows balances → Receive works → Send now / Send protected → Convert → **Activity shows the resulting payments** → **Profile shows identity + reputation** → open a Pact detail (Pacts tab stays highlighted). This is the end-to-end demo path.

## Self-Review notes (author)

- **Spec coverage:** `PRD.md` §5.3a Phase 4 UI half = Activity feed (Task 1-2), Profile/KYC + reputation (Task 3), re-skin under shell (Task 4, scoped to tab-state; deeper restyle explicitly deferred), polish (Task 5). Linked identity deferred to 4b by user decision.
- **Adapter seam:** `getActivity` added to the interface + doc; only `StellarAdapter` implements it; `activity.ts`/`Activity.tsx`/`Profile.tsx` import no SDK (Profile's `getReputation` via the sanctioned `contract.ts` escrow-read exception, same as existing escrow pages).
- **Determinism:** `parseActivity`/`timeAgo`/`tabForRoute` are pure and unit-tested; `timeAgo` takes `nowMs`.
- **No contract change:** Profile only reads `getReputation`. Contract frozen.
- **Type consistency:** `ActivityItem`/`RawPaymentRecord` defined in Task 1 and consumed unchanged in Task 2; `TabName`/`tabForRoute` defined and consumed in Task 4; `Reputation`/`KycStatusRead` shapes confirmed against real files in Task 3 Step 1.
