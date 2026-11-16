# Phase 1 — Wallet Hub + Chain-Adapter Layer (Stellar) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn PACTA's front door into a non-custodial wallet: a `ChainAdapter` seam with a real `StellarAdapter.getBalances`, a Wallet Home showing the connected wallet's live multi-asset portfolio, a working Receive screen, and a mobile-first bottom tab shell.

**Architecture:** Every new wallet surface depends only on a thin `ChainAdapter` interface (`getBalances`, `send`, `getQuote`, `swap`, `signAndSubmit`), implemented once by `StellarAdapter`. Phase 1 implements `getBalances` (via Horizon) for real; the other methods are declared and throw `NotImplementedError` until Phases 2–3. Balances are read from the user's own wallet over Horizon; no custody, no new on-chain code. The frozen escrow contract is not touched. UI reuses the existing "Calm Trust" Tailwind tokens and the custom hash router.

**Tech Stack:** Vite + React 18 + TypeScript + Tailwind 3, `@stellar/stellar-sdk` v14 (Horizon), `@creit.tech/stellar-wallets-kit`, `lucide-react`, `qrcode` (new, for Receive), `vitest` (new, for unit tests). Package manager: npm. Run all frontend commands from `frontend/`.

## Global Constraints

Copied from `PRD.md` / `CLAUDE.md`; every task implicitly includes these.

- **Do not touch the escrow contract** (`contracts/`, `PRD.md` §8) or the generated `packages/pacta` bindings. Phase 1 needs no contract change.
- Wallet surfaces depend only on the `ChainAdapter` interface, never on `@stellar/stellar-sdk` or Horizon directly. The one sanctioned exception (protected send calling the escrow bindings) is Phase 2, not here.
- Product name is **PACTA**; a protected payment is a **Pact**; UI roles are **sender** / **recipient**. Never "Katiwala" or "PactAI".
- **No em-dashes in UI copy.** Use commas, colons, or parentheses.
- Amounts cross the UI boundary as human strings for display and `bigint` base units for any on-chain call (×/÷ 1e7 for 7-decimal assets). Reuse `src/lib/format.ts` helpers.
- Display values (portfolio totals, per-asset value) are computed in code from live reads and static rates, never invented by a model.
- Reuse existing design tokens: colors `canvas/paper/mist/ink/slate/hairline(-strong)/accent(-deep/-tint)/signal`, radii `rounded-card/control/pill`, `max-w-app` (480px), the `.mono` utility, and the `Button` component. One primary (emerald `accent`) action per screen.
- Testing strategy: unit-test pure logic (balance parsing, pricing, totals) with **vitest** in a Node env. UI screens are gated on `tsc` typecheck + `vite build` + a manual browser check on testnet (no DOM test harness is added this phase). This is deliberate: Phase 1's risk is in the parsing/pricing logic, which is fully unit-tested.
- Multi-chain / EVM and fiat on/off-ramp are later sub-projects. Do not build them.

---

## File Structure

**New files:**
- `frontend/vitest.config.ts` — vitest config (Node env).
- `frontend/src/lib/adapters/ChainAdapter.ts` — the interface + shared types (`AssetId`, `AssetBalance`, `Quote`, `TxResult`, `SendParams`, `QuoteParams`, `NotImplementedError`, `NoRouteError`) + the pure `parseBalances` helper.
- `frontend/src/lib/adapters/ChainAdapter.test.ts` — unit tests for `parseBalances`.
- `frontend/src/lib/adapters/StellarAdapter.ts` — the Horizon-backed implementation + the exported `adapter` singleton.
- `frontend/src/lib/prices.ts` — static PHP price table + display-value helpers.
- `frontend/src/lib/prices.test.ts` — unit tests for pricing.
- `frontend/src/hooks/useBalances.ts` — portfolio hook over `adapter.getBalances`.
- `frontend/src/components/BalanceHeader.tsx` — portfolio total + address + testnet badge.
- `frontend/src/components/AssetRow.tsx` — one holding row.
- `frontend/src/components/BottomTabs.tsx` — mobile-first tab bar.
- `frontend/src/components/ComingSoon.tsx` — placeholder for tabs built in later phases.
- `frontend/src/pages/Home.tsx` — Wallet Home.
- `frontend/src/pages/Receive.tsx` — address + QR.

**Modified files:**
- `frontend/package.json` — add `qrcode`, `@types/qrcode`, `vitest` deps + `test` script.
- `frontend/src/lib/config.ts` — add `HORIZON_URL` and per-asset display metadata.
- `frontend/src/lib/router.ts` — add `home`, `receive`, `convert`, `activity`, `profile` routes.
- `frontend/src/App.tsx` — render new routes, mount `BottomTabs`, add bottom padding.
- `frontend/src/main.tsx` — navigate to `/home` after a successful connect.

---

## Task 1: Test tooling (vitest)

Enables TDD for every later task. No app behavior changes.

**Files:**
- Modify: `frontend/package.json`
- Create: `frontend/vitest.config.ts`
- Create (temporary sanity test): `frontend/src/lib/_sanity.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: an `npm run test` script that runs vitest in Node env.

- [ ] **Step 1: Install vitest**

Run (from `frontend/`):
```bash
npm install -D vitest@^2
```

- [ ] **Step 2: Add the test script**

Edit `frontend/package.json` `"scripts"` to add:
```json
    "test": "vitest run",
    "test:watch": "vitest"
```

- [ ] **Step 3: Create the vitest config**

Create `frontend/vitest.config.ts`:
```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
```

- [ ] **Step 4: Add a temporary sanity test**

Create `frontend/src/lib/_sanity.test.ts`:
```ts
import { describe, it, expect } from 'vitest';

describe('vitest', () => {
  it('runs', () => {
    expect(1 + 1).toBe(2);
  });
});
```

- [ ] **Step 5: Run it to confirm the runner works**

Run: `npm run test`
Expected: PASS, 1 test passed.

- [ ] **Step 6: Delete the sanity test and commit**

```bash
rm src/lib/_sanity.test.ts
git add package.json package-lock.json vitest.config.ts
git commit -m "chore(frontend): add vitest test runner"
```

---

## Task 2: ChainAdapter interface + parseBalances (TDD)

The seam and the one pure function worth testing hard: turning raw Horizon balance lines into typed `AssetBalance[]`.

**Files:**
- Create: `frontend/src/lib/adapters/ChainAdapter.ts`
- Test: `frontend/src/lib/adapters/ChainAdapter.test.ts`

**Interfaces:**
- Consumes: `toBaseUnits` is NOT used here (Horizon strings are parsed directly for precision).
- Produces:
  - `interface AssetId { code: string; issuer?: string }`
  - `interface AssetBalance { asset: AssetId; amount: string; baseUnits: bigint; displayValuePhp?: number }`
  - `interface TxResult { hash: string; explorerUrl: string; status: 'success' | 'pending' }`
  - `interface SendParams { to: string; asset: AssetId; amount: string }`
  - `interface QuoteParams { from: AssetId; to: AssetId; amount: string; slippageBps?: number }`
  - `interface Quote { from: AssetId; to: AssetId; amountIn: string; amountOut: string; minReceived: string; path: AssetId[]; raw: unknown }`
  - `interface ChainAdapter { chainId: string; getBalances(a: string): Promise<AssetBalance[]>; send(p: SendParams): Promise<TxResult>; getQuote(p: QuoteParams): Promise<Quote>; swap(q: Quote): Promise<TxResult>; signAndSubmit(xdr: string): Promise<TxResult> }`
  - `class NotImplementedError extends Error`
  - `class NoRouteError extends Error`
  - `interface RawBalanceLine { asset_type: string; balance: string; asset_code?: string; asset_issuer?: string }`
  - `function parseBalances(raw: RawBalanceLine[]): AssetBalance[]`
  - `function humanToBaseUnits(human: string): bigint`

- [ ] **Step 1: Write the failing tests**

Create `frontend/src/lib/adapters/ChainAdapter.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { parseBalances, humanToBaseUnits, type RawBalanceLine } from './ChainAdapter';

describe('humanToBaseUnits', () => {
  it('converts a 7-decimal Horizon string exactly', () => {
    expect(humanToBaseUnits('100.0000000')).toBe(1_000_000_000n);
  });
  it('handles fewer decimals and integers', () => {
    expect(humanToBaseUnits('1.5')).toBe(15_000_000n);
    expect(humanToBaseUnits('42')).toBe(420_000_000n);
  });
  it('does not lose precision on large balances', () => {
    expect(humanToBaseUnits('1234567.8901234')).toBe(12_345_678_901_234n);
  });
});

describe('parseBalances', () => {
  it('maps native XLM', () => {
    const raw: RawBalanceLine[] = [{ asset_type: 'native', balance: '100.0000000' }];
    const out = parseBalances(raw);
    expect(out).toHaveLength(1);
    expect(out[0].asset).toEqual({ code: 'XLM' });
    expect(out[0].amount).toBe('100.0000000');
    expect(out[0].baseUnits).toBe(1_000_000_000n);
  });

  it('maps issued assets with code + issuer', () => {
    const raw: RawBalanceLine[] = [
      { asset_type: 'credit_alphanum4', balance: '50.0000000', asset_code: 'USDC', asset_issuer: 'GISSUER' },
    ];
    const out = parseBalances(raw);
    expect(out[0].asset).toEqual({ code: 'USDC', issuer: 'GISSUER' });
    expect(out[0].baseUnits).toBe(500_000_000n);
  });

  it('skips liquidity pool shares', () => {
    const raw: RawBalanceLine[] = [
      { asset_type: 'liquidity_pool_shares', balance: '1.0000000' },
      { asset_type: 'native', balance: '5.0000000' },
    ];
    const out = parseBalances(raw);
    expect(out).toHaveLength(1);
    expect(out[0].asset.code).toBe('XLM');
  });

  it('never sets displayValuePhp (pricing is a separate concern)', () => {
    const out = parseBalances([{ asset_type: 'native', balance: '1.0000000' }]);
    expect(out[0].displayValuePhp).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm run test -- ChainAdapter`
Expected: FAIL with "Cannot find module './ChainAdapter'".

- [ ] **Step 3: Implement the interface + helpers**

Create `frontend/src/lib/adapters/ChainAdapter.ts`:
```ts
// The one seam the wallet layer depends on. See docs/architecture/chain-adapter.md.

export interface AssetId {
  code: string; // "XLM", "USDC", ...
  issuer?: string; // undefined for native XLM
}

export interface AssetBalance {
  asset: AssetId;
  amount: string; // human decimal string from Horizon ("100.0000000")
  baseUnits: bigint; // raw 7-decimal base units
  displayValuePhp?: number; // filled by the pricing layer, never here
}

export interface TxResult {
  hash: string;
  explorerUrl: string;
  status: 'success' | 'pending';
}

export interface SendParams {
  to: string;
  asset: AssetId;
  amount: string; // human
}

export interface QuoteParams {
  from: AssetId;
  to: AssetId;
  amount: string; // human, amount-in
  slippageBps?: number;
}

export interface Quote {
  from: AssetId;
  to: AssetId;
  amountIn: string;
  amountOut: string;
  minReceived: string;
  path: AssetId[];
  raw: unknown;
}

export interface ChainAdapter {
  readonly chainId: string;
  getBalances(address: string): Promise<AssetBalance[]>;
  send(params: SendParams): Promise<TxResult>;
  getQuote(params: QuoteParams): Promise<Quote>;
  swap(quote: Quote): Promise<TxResult>;
  signAndSubmit(xdr: string): Promise<TxResult>;
}

export class NotImplementedError extends Error {
  constructor(method: string) {
    super(`${method} is not implemented in this phase`);
    this.name = 'NotImplementedError';
  }
}

export class NoRouteError extends Error {
  constructor(message = 'No conversion route for this pair') {
    super(message);
    this.name = 'NoRouteError';
  }
}

// ---- pure helpers (unit-tested) ----

export interface RawBalanceLine {
  asset_type: string;
  balance: string;
  asset_code?: string;
  asset_issuer?: string;
}

const DECIMALS = 7;

// Parse a Horizon human decimal string into exact 7-decimal base units without
// floating point. "100.0000000" -> 1000000000n.
export function humanToBaseUnits(human: string): bigint {
  const neg = human.startsWith('-');
  const clean = neg ? human.slice(1) : human;
  const [whole, frac = ''] = clean.split('.');
  const fracPadded = (frac + '0'.repeat(DECIMALS)).slice(0, DECIMALS);
  const combined = `${whole}${fracPadded}`.replace(/^0+(?=\d)/, '');
  const v = BigInt(combined || '0');
  return neg ? -v : v;
}

export function parseBalances(raw: RawBalanceLine[]): AssetBalance[] {
  const out: AssetBalance[] = [];
  for (const line of raw) {
    if (line.asset_type === 'liquidity_pool_shares') continue;
    const asset: AssetId =
      line.asset_type === 'native'
        ? { code: 'XLM' }
        : { code: line.asset_code ?? '???', issuer: line.asset_issuer };
    out.push({
      asset,
      amount: line.balance,
      baseUnits: humanToBaseUnits(line.balance),
    });
  }
  return out;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm run test -- ChainAdapter`
Expected: PASS, all `parseBalances` and `humanToBaseUnits` tests green.

- [ ] **Step 5: Commit**

```bash
git add src/lib/adapters/ChainAdapter.ts src/lib/adapters/ChainAdapter.test.ts
git commit -m "feat(wallet): add ChainAdapter interface and parseBalances"
```

---

## Task 3: Pricing / display value (TDD)

Static, honest PHP rates so the portfolio can show a familiar peso estimate. Deterministic; clearly approximate.

**Files:**
- Modify: `frontend/src/lib/config.ts` (add rates)
- Create: `frontend/src/lib/prices.ts`
- Test: `frontend/src/lib/prices.test.ts`

**Interfaces:**
- Consumes: `AssetId`, `AssetBalance` from `./adapters/ChainAdapter`; `PHP_PER_XLM` from `./config`.
- Produces:
  - `function priceForAssetPhp(asset: AssetId): number | undefined` — PHP per whole unit.
  - `function displayValuePhp(bal: AssetBalance): number | undefined`
  - `function withDisplayValues(balances: AssetBalance[]): AssetBalance[]` — returns copies with `displayValuePhp` filled where known.
  - `function totalPhp(balances: AssetBalance[]): number` — sum of known display values.

- [ ] **Step 1: Add static rates to config**

Edit `frontend/src/lib/config.ts`, append:
```ts
// Static, display-only PHP rates by asset code (approximate; never used in a
// contract call). Unknown assets show their amount only, no peso estimate.
export const PHP_RATES: Record<string, number> = {
  XLM: PHP_PER_XLM, // reuse the existing anchor (22)
  USDC: 56,
  EURC: 60,
};
```

- [ ] **Step 2: Write the failing tests**

Create `frontend/src/lib/prices.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { priceForAssetPhp, displayValuePhp, withDisplayValues, totalPhp } from './prices';
import type { AssetBalance } from './adapters/ChainAdapter';

const xlm: AssetBalance = { asset: { code: 'XLM' }, amount: '100.0000000', baseUnits: 1_000_000_000n };
const usdc: AssetBalance = { asset: { code: 'USDC', issuer: 'G...' }, amount: '10.0000000', baseUnits: 100_000_000n };
const unknown: AssetBalance = { asset: { code: 'FOO', issuer: 'G...' }, amount: '5.0000000', baseUnits: 50_000_000n };

describe('priceForAssetPhp', () => {
  it('knows XLM and USDC', () => {
    expect(priceForAssetPhp({ code: 'XLM' })).toBe(22);
    expect(priceForAssetPhp({ code: 'USDC' })).toBe(56);
  });
  it('returns undefined for unknown assets', () => {
    expect(priceForAssetPhp({ code: 'FOO' })).toBeUndefined();
  });
});

describe('displayValuePhp', () => {
  it('multiplies amount by rate', () => {
    expect(displayValuePhp(xlm)).toBe(2200); // 100 * 22
    expect(displayValuePhp(usdc)).toBe(560); // 10 * 56
  });
  it('is undefined for unpriced assets', () => {
    expect(displayValuePhp(unknown)).toBeUndefined();
  });
});

describe('withDisplayValues + totalPhp', () => {
  it('fills known values and sums only those', () => {
    const enriched = withDisplayValues([xlm, usdc, unknown]);
    expect(enriched[0].displayValuePhp).toBe(2200);
    expect(enriched[2].displayValuePhp).toBeUndefined();
    expect(totalPhp(enriched)).toBe(2760);
  });
});
```

- [ ] **Step 3: Run to verify failure**

Run: `npm run test -- prices`
Expected: FAIL with "Cannot find module './prices'".

- [ ] **Step 4: Implement prices.ts**

Create `frontend/src/lib/prices.ts`:
```ts
import { PHP_RATES } from './config';
import { fromBaseUnits } from './format';
import type { AssetId, AssetBalance } from './adapters/ChainAdapter';

// PHP per whole unit of the asset, or undefined if we have no rate.
export function priceForAssetPhp(asset: AssetId): number | undefined {
  return PHP_RATES[asset.code];
}

export function displayValuePhp(bal: AssetBalance): number | undefined {
  const rate = priceForAssetPhp(bal.asset);
  if (rate === undefined) return undefined;
  return fromBaseUnits(bal.baseUnits) * rate;
}

export function withDisplayValues(balances: AssetBalance[]): AssetBalance[] {
  return balances.map((b) => ({ ...b, displayValuePhp: displayValuePhp(b) }));
}

export function totalPhp(balances: AssetBalance[]): number {
  return balances.reduce((sum, b) => sum + (b.displayValuePhp ?? 0), 0);
}
```

- [ ] **Step 5: Run to verify pass**

Run: `npm run test -- prices`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/config.ts src/lib/prices.ts src/lib/prices.test.ts
git commit -m "feat(wallet): add static PHP pricing and portfolio total"
```

---

## Task 4: StellarAdapter.getBalances (Horizon)

Wire the real balance read. Logic is already tested (Task 2/3); this task is the thin Horizon integration and the singleton every surface imports.

**Files:**
- Modify: `frontend/src/lib/config.ts` (add `HORIZON_URL`)
- Create: `frontend/src/lib/adapters/StellarAdapter.ts`

**Interfaces:**
- Consumes: `ChainAdapter`, `AssetBalance`, `parseBalances`, `NotImplementedError` from `./ChainAdapter`; `withDisplayValues` from `../prices`; `HORIZON_URL` from `../config`; `Horizon` from `@stellar/stellar-sdk`.
- Produces: `class StellarAdapter implements ChainAdapter` and `export const adapter: ChainAdapter`.

- [ ] **Step 1: Add HORIZON_URL to config**

Edit `frontend/src/lib/config.ts`, add near the RPC constants:
```ts
// Horizon (classic Stellar API) for reading account balances. Separate from the
// Soroban RPC_URL used for contract calls.
export const HORIZON_URL = 'https://horizon-testnet.stellar.org';
```

- [ ] **Step 2: Implement the adapter**

Create `frontend/src/lib/adapters/StellarAdapter.ts`:
```ts
import { Horizon } from '@stellar/stellar-sdk';
import { HORIZON_URL } from '../config';
import { withDisplayValues } from '../prices';
import {
  type ChainAdapter,
  type AssetBalance,
  type SendParams,
  type QuoteParams,
  type Quote,
  type TxResult,
  parseBalances,
  type RawBalanceLine,
  NotImplementedError,
} from './ChainAdapter';

export class StellarAdapter implements ChainAdapter {
  readonly chainId = 'stellar:testnet';
  private server = new Horizon.Server(HORIZON_URL);

  async getBalances(address: string): Promise<AssetBalance[]> {
    try {
      const account = await this.server.loadAccount(address);
      // Horizon balance lines match RawBalanceLine's shape (asset_type/balance/
      // asset_code/asset_issuer). Cast to the decoupled input type for parsing.
      const parsed = parseBalances(account.balances as unknown as RawBalanceLine[]);
      return withDisplayValues(parsed);
    } catch (e: unknown) {
      // A brand-new, unfunded account has no Horizon entry yet: show an empty
      // portfolio rather than an error.
      if (e && typeof e === 'object' && 'response' in e) {
        const status = (e as { response?: { status?: number } }).response?.status;
        if (status === 404) return [];
      }
      throw e;
    }
  }

  // Implemented in later phases; declared now to satisfy the seam.
  async send(_params: SendParams): Promise<TxResult> {
    throw new NotImplementedError('send'); // Phase 2
  }
  async getQuote(_params: QuoteParams): Promise<Quote> {
    throw new NotImplementedError('getQuote'); // Phase 3
  }
  async swap(_quote: Quote): Promise<TxResult> {
    throw new NotImplementedError('swap'); // Phase 3
  }
  async signAndSubmit(_xdr: string): Promise<TxResult> {
    throw new NotImplementedError('signAndSubmit'); // Phase 2
  }
}

// The single adapter the wallet layer imports. Swapping in an EvmAdapter later
// is a one-line change here.
export const adapter: ChainAdapter = new StellarAdapter();
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc -b --noEmit` (from `frontend/`)
Expected: no type errors. (If `Horizon.Server` or `account.balances` types differ in the installed v14, adjust the cast only; do not change `parseBalances`.)

- [ ] **Step 4: Commit**

```bash
git add src/lib/config.ts src/lib/adapters/StellarAdapter.ts
git commit -m "feat(wallet): StellarAdapter.getBalances over Horizon"
```

---

## Task 5: useBalances hook

The React data hook the Home screen consumes. Mirrors the loading/refetch shape of the existing `useAgreements`/`useRiskLens` hooks.

**Files:**
- Create: `frontend/src/hooks/useBalances.ts`

**Interfaces:**
- Consumes: `adapter` from `../lib/adapters/StellarAdapter`; `AssetBalance` from `../lib/adapters/ChainAdapter`; `totalPhp` from `../lib/prices`.
- Produces: `function useBalances(address: string | null): { balances: AssetBalance[]; totalPhp: number; loading: boolean; error: string | null; refetch: () => void }`.

- [ ] **Step 1: Implement the hook**

Create `frontend/src/hooks/useBalances.ts`:
```ts
import { useCallback, useEffect, useState } from 'react';
import { adapter } from '../lib/adapters/StellarAdapter';
import { totalPhp as sumPhp } from '../lib/prices';
import type { AssetBalance } from '../lib/adapters/ChainAdapter';
import { friendlyError } from '../lib/errors';

export function useBalances(address: string | null) {
  const [balances, setBalances] = useState<AssetBalance[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!address) {
      setBalances([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setBalances(await adapter.getBalances(address));
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setLoading(false);
    }
  }, [address]);

  useEffect(() => {
    void load();
  }, [load]);

  return {
    balances,
    totalPhp: sumPhp(balances),
    loading,
    error,
    refetch: () => void load(),
  };
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc -b --noEmit`
Expected: no errors. (Confirm `friendlyError` is exported from `src/lib/errors.ts`; it is used the same way in `main.tsx`.)

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useBalances.ts
git commit -m "feat(wallet): useBalances portfolio hook"
```

---

## Task 6: Router — add wallet routes

Extend the hash router with the new surfaces. Only `home` and `receive` render real screens this phase; `convert`/`activity`/`profile` are wired so the tab bar has no dead ends.

**Files:**
- Modify: `frontend/src/lib/router.ts`

**Interfaces:**
- Consumes: nothing new.
- Produces: `Route` union extended with `{ name: 'home' } | { name: 'receive' } | { name: 'convert' } | { name: 'activity' } | { name: 'profile' }`.

- [ ] **Step 1: Extend the Route type**

Edit `frontend/src/lib/router.ts`, replace the `Route` type with:
```ts
export type Route =
  | { name: 'landing' }
  | { name: 'home' }
  | { name: 'receive' }
  | { name: 'convert' }
  | { name: 'activity' }
  | { name: 'profile' }
  | { name: 'dashboard' }
  | { name: 'create' }
  | { name: 'detail'; id: bigint }
  | { name: 'trader'; address: string }
  | { name: 'verify' };
```

- [ ] **Step 2: Add the parse cases**

In `parseHash`, add these before the final `return { name: 'landing' }`:
```ts
  if (h === '/home') return { name: 'home' };
  if (h === '/receive') return { name: 'receive' };
  if (h === '/convert') return { name: 'convert' };
  if (h === '/activity') return { name: 'activity' };
  if (h === '/profile') return { name: 'profile' };
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc -b --noEmit`
Expected: no type errors. (`App.tsx` and `routeKey` select on `route.name` with string conditionals, not an exhaustive switch, so adding route names does not break them. The new routes simply are not rendered until Task 11.)

- [ ] **Step 4: Commit**

```bash
git add src/lib/router.ts
git commit -m "feat(wallet): add home/receive/convert/activity/profile routes"
```

---

## Task 7: BottomTabs + ComingSoon

The mobile-first navigation shell and the honest placeholder for not-yet-built tabs.

**Files:**
- Create: `frontend/src/components/ComingSoon.tsx`
- Create: `frontend/src/components/BottomTabs.tsx`

**Interfaces:**
- Consumes: `navigate`, `type Route` from `../lib/router`; `lucide-react` icons.
- Produces: `function BottomTabs({ current }: { current: Route['name'] })`; `function ComingSoon({ title }: { title: string })`.

- [ ] **Step 1: ComingSoon placeholder**

Create `frontend/src/components/ComingSoon.tsx`:
```tsx
export function ComingSoon({ title }: { title: string }) {
  return (
    <div className="mx-auto max-w-app px-1 py-16 text-center">
      <h1 className="text-[22px] font-semibold tracking-tight text-ink">{title}</h1>
      <p className="mt-2 text-[14px] text-slate">
        This part of the wallet arrives in the next build step. Your funds and Pacts are unaffected.
      </p>
    </div>
  );
}
```

- [ ] **Step 2: BottomTabs**

Create `frontend/src/components/BottomTabs.tsx`:
```tsx
import { Wallet, ArrowLeftRight, ShieldCheck, Receipt, User } from 'lucide-react';
import { navigate, type Route } from '../lib/router';

type TabName = 'home' | 'convert' | 'dashboard' | 'activity' | 'profile';

const TABS: { name: TabName; label: string; path: string; icon: typeof Wallet }[] = [
  { name: 'home', label: 'Home', path: '/home', icon: Wallet },
  { name: 'convert', label: 'Convert', path: '/convert', icon: ArrowLeftRight },
  { name: 'dashboard', label: 'Pacts', path: '/dashboard', icon: ShieldCheck },
  { name: 'activity', label: 'Activity', path: '/activity', icon: Receipt },
  { name: 'profile', label: 'Profile', path: '/profile', icon: User },
];

export function BottomTabs({ current }: { current: Route['name'] }) {
  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-hairline bg-canvas/95 backdrop-blur"
    >
      <div className="mx-auto flex max-w-app items-stretch justify-between px-2">
        {TABS.map((t) => {
          const active = current === t.name;
          const Icon = t.icon;
          return (
            <button
              key={t.name}
              onClick={() => navigate(t.path)}
              aria-current={active ? 'page' : undefined}
              className={`flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 ${
                active ? 'text-accent' : 'text-slate'
              }`}
            >
              <Icon size={22} aria-hidden strokeWidth={active ? 2.4 : 1.8} />
              {t.label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc -b --noEmit`
Expected: no type errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/ComingSoon.tsx src/components/BottomTabs.tsx
git commit -m "feat(wallet): bottom tab shell and coming-soon placeholder"
```

---

## Task 8: BalanceHeader + AssetRow

The two portfolio display components. Pure presentation from props.

**Files:**
- Create: `frontend/src/components/BalanceHeader.tsx`
- Create: `frontend/src/components/AssetRow.tsx`

**Interfaces:**
- Consumes: `AssetBalance` from `../lib/adapters/ChainAdapter`; `shortAddr` from `../lib/format`; `CopyButton` from `./CopyButton`.
- Produces:
  - `function BalanceHeader({ address, totalPhp, loading }: { address: string; totalPhp: number; loading: boolean })`
  - `function AssetRow({ balance }: { balance: AssetBalance })`

- [ ] **Step 1: AssetRow**

Create `frontend/src/components/AssetRow.tsx`:
```tsx
import type { AssetBalance } from '../lib/adapters/ChainAdapter';

// Trim trailing zeros for a scannable amount ("100" not "100.0000000").
function trim(amount: string): string {
  if (!amount.includes('.')) return amount;
  return amount.replace(/\.?0+$/, '');
}

export function AssetRow({ balance }: { balance: AssetBalance }) {
  const php = balance.displayValuePhp;
  return (
    <div className="flex items-center justify-between rounded-card border border-hairline bg-paper px-4 py-3.5">
      <div className="flex items-center gap-3">
        <span className="grid h-9 w-9 place-items-center rounded-pill bg-accent-tint text-[12px] font-semibold text-accent-deep">
          {balance.asset.code.slice(0, 4)}
        </span>
        <span className="text-[15px] font-medium text-ink">{balance.asset.code}</span>
      </div>
      <div className="text-right">
        <div className="mono text-[15px] text-ink">{trim(balance.amount)}</div>
        {php !== undefined && (
          <div className="text-[12px] text-slate">
            {'≈'} {'₱'}
            {Math.round(php).toLocaleString()}
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: BalanceHeader**

Create `frontend/src/components/BalanceHeader.tsx`:
```tsx
import { shortAddr } from '../lib/format';
import { CopyButton } from './CopyButton';

export function BalanceHeader({
  address,
  totalPhp,
  loading,
}: {
  address: string;
  totalPhp: number;
  loading: boolean;
}) {
  return (
    <div className="rounded-card border border-hairline bg-paper px-5 py-6 text-center shadow-card">
      <div className="text-[12px] font-medium uppercase tracking-wider text-slate">
        Total balance
      </div>
      <div className="mono mt-1 text-[34px] font-semibold leading-tight text-ink">
        {loading ? (
          <span className="inline-block h-9 w-40 animate-pulse rounded-control bg-mist align-middle" />
        ) : (
          <>
            {'₱'}
            {Math.round(totalPhp).toLocaleString()}
          </>
        )}
      </div>
      <div className="mt-3 inline-flex items-center gap-1.5 text-[12px] text-slate">
        <span className="mono">{shortAddr(address)}</span>
        <CopyButton value={address} />
        <span className="ml-1 inline-flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-pill bg-accent" aria-hidden />
          testnet
        </span>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Verify CopyButton's prop name**

Run: `npx tsc -b --noEmit`
Expected: no type errors. (`CopyButton` takes a `value: string` prop, already matched.)

- [ ] **Step 4: Commit**

```bash
git add src/components/BalanceHeader.tsx src/components/AssetRow.tsx
git commit -m "feat(wallet): balance header and asset row"
```

---

## Task 9: Home page (Wallet Home)

Assembles the portfolio: header, three actions, asset list, loading + empty + error states.

**Files:**
- Create: `frontend/src/pages/Home.tsx`

**Interfaces:**
- Consumes: `useWallet` from `../hooks/useWallet`; `useBalances` from `../hooks/useBalances`; `BalanceHeader`, `AssetRow` components; `navigate` from `../lib/router`; `Button` from `../components/Button`; `lucide-react` icons; `ConnectButton` from `../components/ConnectButton`.
- Produces: `function Home()`.

- [ ] **Step 1: Implement Home**

Create `frontend/src/pages/Home.tsx`:
```tsx
import { ArrowUp, ArrowDown, ArrowLeftRight, RefreshCw } from 'lucide-react';
import { useWallet } from '../hooks/useWallet';
import { useBalances } from '../hooks/useBalances';
import { BalanceHeader } from '../components/BalanceHeader';
import { AssetRow } from '../components/AssetRow';
import { ConnectButton } from '../components/ConnectButton';
import { navigate } from '../lib/router';

function Action({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex flex-1 flex-col items-center gap-2 rounded-card border border-hairline bg-paper py-4 text-[13px] font-medium text-ink transition hover:border-accent/30 hover:bg-accent-tint focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
    >
      <span className="grid h-10 w-10 place-items-center rounded-pill bg-accent text-white">
        {icon}
      </span>
      {label}
    </button>
  );
}

export function Home() {
  const { address } = useWallet();
  const { balances, totalPhp, loading, error, refetch } = useBalances(address);

  if (!address) {
    return (
      <div className="mx-auto max-w-app px-1 py-16 text-center">
        <h1 className="text-[22px] font-semibold tracking-tight text-ink">Your wallet</h1>
        <p className="mt-2 text-[14px] text-slate">
          Connect a wallet to see your balance, send, receive, and convert.
        </p>
        <div className="mt-6 flex justify-center">
          <ConnectButton />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-app space-y-5 px-1">
      <BalanceHeader address={address} totalPhp={totalPhp} loading={loading} />

      <div className="flex gap-3">
        <Action icon={<ArrowUp size={18} aria-hidden />} label="Send" onClick={() => navigate('/send')} />
        <Action icon={<ArrowDown size={18} aria-hidden />} label="Receive" onClick={() => navigate('/receive')} />
        <Action icon={<ArrowLeftRight size={18} aria-hidden />} label="Convert" onClick={() => navigate('/convert')} />
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between px-1">
          <h2 className="text-[13px] font-semibold uppercase tracking-wider text-slate">Assets</h2>
          <button
            onClick={refetch}
            aria-label="Refresh balances"
            className="grid h-8 w-8 place-items-center rounded-control text-slate hover:bg-mist focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
          >
            <RefreshCw size={15} aria-hidden className={loading ? 'animate-spin' : ''} />
          </button>
        </div>

        {error && (
          <div className="rounded-card border border-refund/40 bg-refund-tint px-4 py-3 text-[13px] text-refund-deep">
            {error}
          </div>
        )}

        {loading && balances.length === 0 && (
          <div className="space-y-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-16 animate-pulse rounded-card bg-mist" />
            ))}
          </div>
        )}

        {!loading && !error && balances.length === 0 && (
          <div className="rounded-card border border-hairline bg-paper px-4 py-8 text-center text-[14px] text-slate">
            No assets yet. Receive some XLM to get started.
          </div>
        )}

        <div className="space-y-2">
          {balances.map((b) => (
            <AssetRow key={`${b.asset.code}:${b.asset.issuer ?? 'native'}`} balance={b} />
          ))}
        </div>
      </div>
    </div>
  );
}
```

> Note: the Send and Convert actions route to `/send` and `/convert`. Task 11 adds a `send` route and renders both through `ComingSoon` until Phase 2 (Send) and Phase 3 (Convert) land, so neither action is a dead end. Receive is fully functional this phase.

- [ ] **Step 2: Typecheck**

Run: `npx tsc -b --noEmit`
Expected: no type errors.

- [ ] **Step 3: Commit**

```bash
git add src/pages/Home.tsx
git commit -m "feat(wallet): Wallet Home portfolio screen"
```

---

## Task 10: Receive page

Address + QR + copy. Adds the `qrcode` dependency.

**Files:**
- Modify: `frontend/package.json` (via install)
- Create: `frontend/src/pages/Receive.tsx`

**Interfaces:**
- Consumes: `useWallet`; `CopyButton`; `qrcode`.
- Produces: `function Receive()`.

- [ ] **Step 1: Install qrcode**

Run (from `frontend/`):
```bash
npm install qrcode && npm install -D @types/qrcode
```

- [ ] **Step 2: Implement Receive**

Create `frontend/src/pages/Receive.tsx`:
```tsx
import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { useWallet } from '../hooks/useWallet';
import { CopyButton } from '../components/CopyButton';
import { ConnectButton } from '../components/ConnectButton';

export function Receive() {
  const { address } = useWallet();
  const [qr, setQr] = useState<string>('');

  useEffect(() => {
    if (!address) return;
    QRCode.toDataURL(address, { margin: 1, width: 220 })
      .then(setQr)
      .catch(() => setQr(''));
  }, [address]);

  if (!address) {
    return (
      <div className="mx-auto max-w-app px-1 py-16 text-center">
        <p className="text-[14px] text-slate">Connect a wallet to see your receive address.</p>
        <div className="mt-6 flex justify-center">
          <ConnectButton />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-app space-y-5 px-1">
      <div>
        <h1 className="text-[22px] font-semibold tracking-tight text-ink">Receive</h1>
        <p className="mt-1 text-[14px] text-slate">
          Share this address or QR to receive any Stellar asset.
        </p>
      </div>

      <div className="rounded-card border border-hairline bg-paper px-5 py-6 text-center shadow-card">
        {qr ? (
          <img src={qr} alt="Your wallet address as a QR code" className="mx-auto h-[220px] w-[220px]" />
        ) : (
          <div className="mx-auto h-[220px] w-[220px] animate-pulse rounded-card bg-mist" />
        )}
        <div className="mono mt-5 break-all rounded-control bg-mist px-3 py-3 text-[13px] text-ink">
          {address}
        </div>
        <div className="mt-3 flex justify-center">
          <CopyButton value={address} />
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc -b --noEmit`
Expected: no type errors. (`CopyButton` takes a `value: string` prop, already matched.)

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json src/pages/Receive.tsx
git commit -m "feat(wallet): Receive screen with QR"
```

---

## Task 11: Integrate into App + navigate home on connect

Render the new routes, mount `BottomTabs`, add bottom padding so content clears the fixed bar, add a `send` placeholder route, and route to `/home` after connect.

**Files:**
- Modify: `frontend/src/lib/router.ts` (add `send` placeholder route)
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/main.tsx`

**Interfaces:**
- Consumes: `Home`, `Receive`, `ComingSoon`, `BottomTabs`, existing pages.
- Produces: the finished, buildable app.

- [ ] **Step 1: Add the `send` placeholder route**

Edit `frontend/src/lib/router.ts`: add `| { name: 'send' }` to the `Route` union, and in `parseHash` add before the landing fallback:
```ts
  if (h === '/send') return { name: 'send' };
```

- [ ] **Step 2: Wire routes and tabs in App.tsx**

In `frontend/src/App.tsx`:

Add imports near the other page imports:
```tsx
import { Home } from './pages/Home';
import { Receive } from './pages/Receive';
import { ComingSoon } from './components/ComingSoon';
import { BottomTabs } from './components/BottomTabs';
```

In the `<main>` block, add these cases alongside the existing ones:
```tsx
          {route.name === 'home' && <Home />}
          {route.name === 'receive' && <Receive />}
          {route.name === 'send' && <ComingSoon title="Send" />}
          {route.name === 'convert' && <ComingSoon title="Convert" />}
          {route.name === 'activity' && <ComingSoon title="Activity" />}
          {route.name === 'profile' && <Verify />}
```

> `profile` reuses the existing `Verify` page (identity + status) this phase; a dedicated Profile arrives in Phase 4.

Change the `<main>` className so content clears the fixed tab bar when the bar is shown. Replace:
```tsx
      <main className={`relative z-10 flex-1 ${route.name === 'landing' ? '' : 'px-5 py-6 sm:py-8'}`}>
```
with:
```tsx
      <main
        className={`relative z-10 flex-1 ${
          route.name === 'landing' ? '' : 'px-5 py-6 sm:py-8'
        } ${address && route.name !== 'landing' ? 'pb-24' : ''}`}
      >
```

Mount the tab bar just before the closing `</div>` of the root wrapper (after `</footer>`):
```tsx
      {address && route.name !== 'landing' && <BottomTabs current={route.name} />}
```

- [ ] **Step 3: Route to Home after connect**

In `frontend/src/main.tsx`, import navigate:
```ts
import { navigate } from './lib/router';
```
In `connect`, right after `setAddress(addr);`, add:
```ts
      navigate('/home');
```

- [ ] **Step 4: Full typecheck + build**

Run: `npx tsc -b --noEmit && npm run build`
Expected: no type errors; Vite build succeeds. All route names are now handled.

- [ ] **Step 5: Run the unit tests**

Run: `npm run test`
Expected: PASS (ChainAdapter + prices suites).

- [ ] **Step 6: Manual verification on testnet (the Phase 1 gate)**

Run: `npm run dev`, open the app, and confirm:
1. Connect a funded testnet wallet (Freighter). The app routes to Wallet Home.
2. The balance header shows a peso total and the asset list shows real balances (at least native XLM) in monospace.
3. The Refresh button re-reads balances.
4. Tap Receive: the address and a scannable QR render; Copy works.
5. The bottom tab bar shows Home, Convert, Pacts, Activity, Profile; Convert and Activity show the "coming soon" placeholder; Pacts opens the existing agreements list; Profile opens the verify screen.
6. Disconnecting returns to a connect prompt without errors.

- [ ] **Step 7: Commit**

```bash
git add src/App.tsx src/main.tsx src/lib/router.ts
git commit -m "feat(wallet): mount Wallet Home, Receive, and bottom tab shell"
```

---

## Notes for the implementer

- If `npx tsc -b --noEmit` is not how this repo typechecks, use the `build` script's typecheck (`tsc -b`) without emitting, or just rely on `npm run build` at the integration gate. Extending the `Route` union does not cause type errors (`App.tsx` and `routeKey` select on `route.name` with string conditionals), so each task's typecheck should be clean once its own imports resolve.
- Do not add the Send/Convert money logic here. `StellarAdapter.send/getQuote/swap/signAndSubmit` intentionally throw `NotImplementedError`; Phase 2 (Send fork) and Phase 3 (Convert) implement them.
- Keep the `ComingSoon` copy free of em-dashes and on-brand.
- After Phase 1 is green, the next plan (Phase 2) builds the Send fork: `StellarAdapter.send` + `signAndSubmit`, the Send screen with "Send now" vs "Send protected", the Risk Lens mount, and the KYC gate.
