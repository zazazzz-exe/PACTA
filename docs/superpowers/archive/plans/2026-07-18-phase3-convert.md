# Phase 3 — Convert (Stellar DEX) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Convert screen that swaps one asset the user holds for another on the Stellar DEX, via strict-send path payments, through the existing `ChainAdapter` seam.

**Architecture:** Implement the two remaining `ChainAdapter` methods on `StellarAdapter` — `getQuote` (Horizon strict-send path finding) and `swap` (a single signed transaction that path-pays strict-send, prepending a `changeTrust` op when the user has no trustline for the destination asset). All quote math (slippage, min-received, asset merging) lives in a pure, unit-tested `lib/convert.ts` that imports no SDK. A new `Convert.tsx` page mirrors the existing `Send.tsx` structure and reuses `ConfirmDialog`, `useBalances`, and `friendlyError`.

**Tech Stack:** React 18 + TypeScript + Tailwind 3, Vite, Vitest, `@stellar/stellar-sdk` v14.6.1 (Horizon `strictSendPaths`, `Operation.pathPaymentStrictSend`, `Operation.changeTrust`).

## Global Constraints

- **Do not touch the contract.** `PRD.md` §8 is frozen and already deployed. Convert never calls the escrow.
- **Adapter seam.** Only `StellarAdapter.ts` and `stellarAssets.ts` may import `@stellar/stellar-sdk`. `lib/convert.ts`, the Convert page, and all other wallet surfaces import only the `ChainAdapter` interface + pure helpers. No Horizon or SDK import leaks into `convert.ts` or `Convert.tsx`.
- **Amounts.** Human decimal strings at the UI boundary; exact base-unit math via `bigint` (×/÷ 1e7, 7 decimals). Never use floating point for money math that feeds an on-chain operation.
- **Single signing chokepoint.** Every write path funnels through `StellarAdapter.signAndSubmit`. `swap` builds the XDR and hands it to `signAndSubmit`; it does not call the wallet or submit directly.
- **Extending the interface means updating `docs/architecture/chain-adapter.md` first**, then `ChainAdapter.ts`, then the implementation. This plan adds one field (`Quote.sender`); Task 1 updates the doc.
- **Convert is NOT KYC-gated** (`docs/kyc.md`): it is an ordinary self-custodial move of the user's own funds. No verification check anywhere in this phase.
- **No em-dashes in UI copy.** Map failures to friendly messages via `lib/errors.ts` (`PRD.md` §8.4 pattern).
- **Testnet USDC issuer** is `GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5` (confirmed against Circle/Stellar docs). Native XLM has no issuer.

## File Structure

- **Create** `frontend/src/lib/convert.ts` — pure Convert helpers (slippage, asset keys, to-asset merge, trustline check, quote builder). No SDK import.
- **Create** `frontend/src/lib/convert.test.ts` — unit tests for the above.
- **Create** `frontend/src/pages/Convert.tsx` — the Convert screen.
- **Modify** `frontend/src/lib/adapters/ChainAdapter.ts` — add `baseUnitsToHuman`; add `sender?: string` to `Quote`.
- **Modify** `frontend/src/lib/config.ts` — add `USDC_TESTNET_ISSUER` and `KNOWN_ASSETS`.
- **Modify** `frontend/src/lib/adapters/StellarAdapter.ts` — implement `getQuote` + `swap`; add exported pure `buildConvertTx`.
- **Modify** `frontend/src/lib/adapters/StellarAdapter.buildConvertTx.test.ts` (create) — pure tx-shape test.
- **Modify** `frontend/src/lib/errors.ts` — add path-payment + changeTrust op codes.
- **Modify** `frontend/src/lib/errors.test.ts` — cover the new codes.
- **Modify** `frontend/src/App.tsx` — route `/convert` to `<Convert/>` instead of `<ComingSoon/>`.

---

### Task 1: Pure Convert core + interface field + config

**Files:**
- Modify: `frontend/src/lib/adapters/ChainAdapter.ts` (add `baseUnitsToHuman`, add `Quote.sender`)
- Modify: `frontend/src/lib/config.ts` (add `USDC_TESTNET_ISSUER`, `KNOWN_ASSETS`)
- Modify: `docs/architecture/chain-adapter.md` (document `Quote.sender`)
- Create: `frontend/src/lib/convert.ts`
- Test: `frontend/src/lib/convert.test.ts`

**Interfaces:**
- Consumes: `AssetId`, `AssetBalance`, `Quote` from `ChainAdapter.ts`; `humanToBaseUnits` from `ChainAdapter.ts`.
- Produces (used by Tasks 2 and 3):
  - `baseUnitsToHuman(base: bigint): string`
  - `Quote.sender?: string`
  - `USDC_TESTNET_ISSUER: string`, `KNOWN_ASSETS: AssetId[]`
  - `DEFAULT_SLIPPAGE_BPS: number`
  - `applySlippage(amountOutBase: bigint, bps: number): bigint`
  - `assetKey(a: AssetId): string`, `sameAsset(a: AssetId, b: AssetId): boolean`
  - `hasTrustline(balances: AssetBalance[], to: AssetId): boolean`
  - `mergeToAssets(known: AssetId[], balances: AssetBalance[], from: AssetId): AssetId[]`
  - `assetIdFromHop(hop: PathHop): AssetId`
  - `buildQuote(from: AssetId, to: AssetId, amountIn: string, record: PathRecord, bps: number): Quote`
  - types `PathHop`, `PathRecord`

- [ ] **Step 1: Add `baseUnitsToHuman` to `ChainAdapter.ts`**

Add directly beneath `humanToBaseUnits` (it mirrors it; `DECIMALS` is already in scope):

```ts
// Inverse of humanToBaseUnits. 1000000000n -> "100", 15000000n -> "1.5".
// Trailing zeros trimmed; no floating point.
export function baseUnitsToHuman(base: bigint): string {
  const neg = base < 0n;
  const v = neg ? -base : base;
  const s = v.toString().padStart(DECIMALS + 1, '0');
  const whole = s.slice(0, -DECIMALS);
  const frac = s.slice(-DECIMALS).replace(/0+$/, '');
  const out = frac ? `${whole}.${frac}` : whole;
  return neg ? `-${out}` : out;
}
```

- [ ] **Step 2: Add `sender` to the `Quote` interface in `ChainAdapter.ts`**

```ts
export interface Quote {
  from: AssetId;
  to: AssetId;
  amountIn: string;
  amountOut: string;
  minReceived: string;
  path: AssetId[];
  raw: unknown;
  sender?: string; // account performing the swap; the caller sets this before swap()
}
```

- [ ] **Step 3: Document `Quote.sender` in `docs/architecture/chain-adapter.md`**

In the `Quote` TypeScript block, add the `sender?: string` line with a comment, and in the `swap(quote)` method contract add one sentence: "The caller sets `quote.sender` (the source account) before calling `swap`; `getQuote` leaves it undefined because path finding does not need an account." This preserves the "update the doc first" invariant.

- [ ] **Step 4: Add config constants in `config.ts`**

Append:

```ts
// Circle USDC on Stellar testnet (confirmed against Circle/Stellar docs).
export const USDC_TESTNET_ISSUER = 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5';

// Assets offered as Convert destinations even when the user holds no balance/
// trustline for them yet. XLM (native) plus testnet USDC. EURC is omitted until
// its testnet issuer is confirmed.
export const KNOWN_ASSETS: { code: string; issuer?: string }[] = [
  { code: 'XLM' },
  { code: 'USDC', issuer: USDC_TESTNET_ISSUER },
];
```

- [ ] **Step 5: Write the failing tests `frontend/src/lib/convert.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import {
  applySlippage,
  DEFAULT_SLIPPAGE_BPS,
  assetKey,
  sameAsset,
  hasTrustline,
  mergeToAssets,
  assetIdFromHop,
  buildQuote,
} from './convert';
import { baseUnitsToHuman } from './adapters/ChainAdapter';
import type { AssetBalance } from './adapters/ChainAdapter';

const XLM = { code: 'XLM' };
const USDC = { code: 'USDC', issuer: 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5' };

const bal = (code: string, issuer: string | undefined, amount: string): AssetBalance => ({
  asset: issuer ? { code, issuer } : { code },
  amount,
  baseUnits: 0n,
});

describe('baseUnitsToHuman', () => {
  it('inverts humanToBaseUnits', () => {
    expect(baseUnitsToHuman(1_000_000_000n)).toBe('100');
    expect(baseUnitsToHuman(15_000_000n)).toBe('1.5');
    expect(baseUnitsToHuman(1n)).toBe('0.0000001');
    expect(baseUnitsToHuman(0n)).toBe('0');
  });
});

describe('applySlippage', () => {
  it('reduces by the bps in base units', () => {
    expect(applySlippage(1_000_000_000n, 50)).toBe(995_000_000n); // -0.5%
    expect(applySlippage(1_000_000_000n, 0)).toBe(1_000_000_000n);
    expect(DEFAULT_SLIPPAGE_BPS).toBe(50);
  });
});

describe('assetKey / sameAsset', () => {
  it('keys native and issued distinctly', () => {
    expect(assetKey(XLM)).toBe('XLM:native');
    expect(assetKey(USDC)).toBe(`USDC:${USDC.issuer}`);
    expect(sameAsset(XLM, { code: 'XLM' })).toBe(true);
    expect(sameAsset(XLM, USDC)).toBe(false);
  });
});

describe('hasTrustline', () => {
  it('native never needs a trustline', () => {
    expect(hasTrustline([], XLM)).toBe(true);
  });
  it('true only when the issued asset is already held', () => {
    expect(hasTrustline([bal('USDC', USDC.issuer, '0')], USDC)).toBe(true);
    expect(hasTrustline([bal('XLM', undefined, '10')], USDC)).toBe(false);
  });
});

describe('mergeToAssets', () => {
  it('unions known + held, drops the from-asset, de-dupes', () => {
    const balances = [bal('XLM', undefined, '10'), bal('USDC', USDC.issuer, '5')];
    const out = mergeToAssets([XLM, USDC], balances, XLM);
    expect(out.map(assetKey)).toEqual([`USDC:${USDC.issuer}`]);
  });
});

describe('assetIdFromHop', () => {
  it('maps native and issued hops', () => {
    expect(assetIdFromHop({ asset_type: 'native' })).toEqual({ code: 'XLM' });
    expect(
      assetIdFromHop({ asset_type: 'credit_alphanum4', asset_code: 'USDC', asset_issuer: USDC.issuer }),
    ).toEqual({ code: 'USDC', issuer: USDC.issuer });
  });
});

describe('buildQuote', () => {
  it('sets amountOut, min-received after slippage, and maps the path', () => {
    const record = {
      destination_amount: '4.5000000',
      path: [{ asset_type: 'native' }],
    };
    const q = buildQuote(XLM, USDC, '100', record, 50);
    expect(q.from).toEqual(XLM);
    expect(q.to).toEqual(USDC);
    expect(q.amountIn).toBe('100');
    expect(q.amountOut).toBe('4.5000000');
    expect(q.minReceived).toBe('4.4775'); // 4.5 * 0.995
    expect(q.path).toEqual([{ code: 'XLM' }]);
    expect(q.sender).toBeUndefined();
  });
});
```

- [ ] **Step 6: Run the tests to verify they fail**

Run: `cd frontend && npx vitest run src/lib/convert.test.ts`
Expected: FAIL — `convert.ts` does not exist / exports missing.

- [ ] **Step 7: Implement `frontend/src/lib/convert.ts`**

```ts
// Pure Convert helpers. No SDK import: this file is a wallet surface and must
// stay chain-agnostic (only StellarAdapter/stellarAssets touch @stellar/stellar-sdk).
import type { AssetId, AssetBalance, Quote } from './adapters/ChainAdapter';
import { humanToBaseUnits, baseUnitsToHuman } from './adapters/ChainAdapter';

export const DEFAULT_SLIPPAGE_BPS = 50; // 0.5%

// Minimal shape of a Horizon strict-send path record, mirrored so this file
// needs no SDK types. StellarAdapter passes the real records in.
export interface PathHop {
  asset_type: string;
  asset_code?: string;
  asset_issuer?: string;
}
export interface PathRecord {
  destination_amount: string;
  path: PathHop[];
}

// Reduce an out-amount by the slippage tolerance, in exact base units.
export function applySlippage(amountOutBase: bigint, bps: number): bigint {
  return (amountOutBase * BigInt(10_000 - bps)) / 10_000n;
}

export function assetKey(a: AssetId): string {
  return `${a.code}:${a.issuer ?? 'native'}`;
}

export function sameAsset(a: AssetId, b: AssetId): boolean {
  return assetKey(a) === assetKey(b);
}

// Native XLM never needs a trustline; an issued asset needs one that the
// account already holds (a zero-balance trustline still counts).
export function hasTrustline(balances: AssetBalance[], to: AssetId): boolean {
  if (to.code === 'XLM' && !to.issuer) return true;
  return balances.some((b) => sameAsset(b.asset, to));
}

// Destination options = curated known assets ∪ assets the user already holds,
// minus the from-asset, de-duped (held asset wins on identical key).
export function mergeToAssets(
  known: AssetId[],
  balances: AssetBalance[],
  from: AssetId,
): AssetId[] {
  const map = new Map<string, AssetId>();
  for (const a of known) map.set(assetKey(a), a);
  for (const b of balances) map.set(assetKey(b.asset), b.asset);
  map.delete(assetKey(from));
  return [...map.values()];
}

export function assetIdFromHop(hop: PathHop): AssetId {
  if (hop.asset_type === 'native') return { code: 'XLM' };
  return { code: hop.asset_code as string, issuer: hop.asset_issuer as string };
}

// Turn one chosen path record into a Quote. min-received is the estimated
// out-amount reduced by slippage, in exact base units then back to a string.
export function buildQuote(
  from: AssetId,
  to: AssetId,
  amountIn: string,
  record: PathRecord,
  bps: number,
): Quote {
  const outBase = humanToBaseUnits(record.destination_amount);
  const minBase = applySlippage(outBase, bps);
  return {
    from,
    to,
    amountIn,
    amountOut: record.destination_amount,
    minReceived: baseUnitsToHuman(minBase),
    path: record.path.map(assetIdFromHop),
    raw: record,
  };
}
```

- [ ] **Step 8: Run the tests to verify they pass**

Run: `cd frontend && npx vitest run src/lib/convert.test.ts`
Expected: PASS (all cases).

- [ ] **Step 9: Typecheck**

Run: `cd frontend && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 10: Commit**

```bash
git add frontend/src/lib/convert.ts frontend/src/lib/convert.test.ts frontend/src/lib/adapters/ChainAdapter.ts frontend/src/lib/config.ts docs/architecture/chain-adapter.md
git commit -m "feat(convert): pure quote helpers, Quote.sender, known-asset config"
```

---

### Task 2: StellarAdapter getQuote + swap

**Files:**
- Modify: `frontend/src/lib/adapters/StellarAdapter.ts`
- Modify: `frontend/src/lib/errors.ts`
- Test: `frontend/src/lib/adapters/StellarAdapter.buildConvertTx.test.ts` (create)
- Test: `frontend/src/lib/errors.test.ts` (extend)

**Interfaces:**
- Consumes: `buildQuote`, `hasTrustline`, `DEFAULT_SLIPPAGE_BPS`, `PathRecord` from `convert.ts`; `assetFromId` from `stellarAssets.ts`; `parseBalances`, `RawBalanceLine`, `NoRouteError`, `QuoteParams`, `Quote`, `TxResult`, `humanToBaseUnits` from `ChainAdapter.ts`.
- Produces: working `adapter.getQuote(params)` and `adapter.swap(quote)`; exported pure `buildConvertTx(account, opts)`.

- [ ] **Step 1: Write the failing tx-shape test `StellarAdapter.buildConvertTx.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { Account, Asset } from '@stellar/stellar-sdk';
import { buildConvertTx } from './StellarAdapter';

const SENDER = 'GDCOP33NLUKXJXALCJCPTXJUGS42GZRM5YOYLS5RTKMLZNPORM2Z76GI';
const USDC = new Asset('USDC', 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5');

const base = () => ({
  sendAsset: Asset.native(),
  sendAmount: '100',
  destination: SENDER,
  destAsset: USDC,
  destMin: '4.4775',
  path: [] as Asset[],
});

describe('buildConvertTx', () => {
  it('builds a single path-payment op when the trustline exists', () => {
    const tx = buildConvertTx(new Account(SENDER, '0'), { ...base(), addTrust: false });
    expect(tx.operations).toHaveLength(1);
    expect(tx.operations[0].type).toBe('pathPaymentStrictSend');
  });

  it('prepends changeTrust when a trustline is needed', () => {
    const tx = buildConvertTx(new Account(SENDER, '0'), { ...base(), addTrust: true });
    expect(tx.operations).toHaveLength(2);
    expect(tx.operations[0].type).toBe('changeTrust');
    expect(tx.operations[1].type).toBe('pathPaymentStrictSend');
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `cd frontend && npx vitest run src/lib/adapters/StellarAdapter.buildConvertTx.test.ts`
Expected: FAIL — `buildConvertTx` not exported.

- [ ] **Step 3: Implement `getQuote`, `swap`, and `buildConvertTx` in `StellarAdapter.ts`**

Update the imports at the top of the file:

```ts
import {
  Horizon,
  TransactionBuilder,
  Operation,
  BASE_FEE,
  Asset,
  Account,
  Transaction,
} from '@stellar/stellar-sdk';
```

Add to the existing `ChainAdapter` imports block: `type QuoteParams`, `type Quote` are already imported; add nothing new there. Add these imports:

```ts
import { buildQuote, hasTrustline, DEFAULT_SLIPPAGE_BPS, type PathRecord } from '../convert';
```

Replace the two `NotImplementedError` stubs with:

```ts
  async getQuote({ from, to, amount, slippageBps }: QuoteParams): Promise<Quote> {
    const bps = slippageBps ?? DEFAULT_SLIPPAGE_BPS;
    const res = await this.server
      .strictSendPaths(assetFromId(from), amount, [assetFromId(to)])
      .call();
    const records = res.records as unknown as PathRecord[];
    if (records.length === 0) throw new NoRouteError();
    // Choose the path that yields the most of the destination asset.
    const best = records.reduce((a, b) =>
      humanToBaseUnits(b.destination_amount) > humanToBaseUnits(a.destination_amount) ? b : a,
    );
    return buildQuote(from, to, amount, best, bps);
  }

  async swap(quote: Quote): Promise<TxResult> {
    const sender = quote.sender;
    if (!sender) throw new Error('swap requires quote.sender (the source account)');
    const account = await this.server.loadAccount(sender);
    // Authoritative trustline check from the freshly loaded account.
    const held = parseBalances(account.balances as unknown as RawBalanceLine[]);
    const addTrust = !hasTrustline(held, quote.to);
    const tx = buildConvertTx(account, {
      sendAsset: assetFromId(quote.from),
      sendAmount: quote.amountIn,
      destination: sender, // self-swap: receive into the same account
      destAsset: assetFromId(quote.to),
      destMin: quote.minReceived,
      path: quote.path.map(assetFromId),
      addTrust,
    });
    return this.signAndSubmit(tx.toXDR());
  }
```

Make sure `NoRouteError` and `humanToBaseUnits` are in the `ChainAdapter` import list (add them if missing).

Add the exported pure builder at the bottom of the file, above the `export const adapter` line:

```ts
// Pure: builds the Convert transaction (one path-payment, optionally preceded by
// a changeTrust op). Exported so the operation shape is unit-testable without a
// network round-trip. Signing happens via signAndSubmit, never here.
export function buildConvertTx(
  account: Account,
  opts: {
    sendAsset: Asset;
    sendAmount: string;
    destination: string;
    destAsset: Asset;
    destMin: string;
    path: Asset[];
    addTrust: boolean;
  },
): Transaction {
  const b = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  });
  if (opts.addTrust) {
    b.addOperation(Operation.changeTrust({ asset: opts.destAsset }));
  }
  b.addOperation(
    Operation.pathPaymentStrictSend({
      sendAsset: opts.sendAsset,
      sendAmount: opts.sendAmount,
      destination: opts.destination,
      destAsset: opts.destAsset,
      destMin: opts.destMin,
      path: opts.path,
    }),
  );
  return b.setTimeout(180).build();
}
```

Remove the now-unused `NotImplementedError` import if nothing else uses it (check first: search the file).

- [ ] **Step 4: Run the tx-shape test to verify it passes**

Run: `cd frontend && npx vitest run src/lib/adapters/StellarAdapter.buildConvertTx.test.ts`
Expected: PASS (both cases).

- [ ] **Step 5: Extend `errors.ts` with Convert failure codes**

Add these entries to `HORIZON_OP_FRIENDLY` (keep the existing ones):

```ts
  op_too_few_offers:
    'There are not enough offers on the network to convert this amount right now. Try a smaller amount.',
  op_under_dest_min:
    'The price moved past your slippage limit. Get a fresh quote and try again.',
  op_over_source_max:
    'The price moved past your limit. Get a fresh quote and try again.',
  op_no_issuer: 'The destination asset issuer was not found on the network.',
  op_low_reserve:
    'You need a little more XLM to add this asset (each asset needs a small reserve).',
```

(`op_no_trust` and `op_line_full` already exist and cover the trustline/line-full cases.)

- [ ] **Step 6: Add tests to `errors.test.ts` for the new codes**

Append cases mirroring the existing Horizon-code tests (use the same fixture shape already in the file):

```ts
it('maps path-payment op codes', () => {
  expect(
    friendlyError({ response: { data: { extras: { result_codes: { operations: ['op_too_few_offers'] } } } } }),
  ).toMatch(/not enough offers/i);
  expect(
    friendlyError({ response: { data: { extras: { result_codes: { operations: ['op_under_dest_min'] } } } } }),
  ).toMatch(/slippage limit/i);
  expect(
    friendlyError({ response: { data: { extras: { result_codes: { operations: ['op_low_reserve'] } } } } }),
  ).toMatch(/little more XLM/i);
});
```

- [ ] **Step 7: Run the errors tests**

Run: `cd frontend && npx vitest run src/lib/errors.test.ts`
Expected: PASS.

- [ ] **Step 8: Full test + typecheck + build**

Run: `cd frontend && npx vitest run && npx tsc --noEmit && npm run build`
Expected: all tests pass; no type errors; build succeeds (the repo build fails on unused imports, so confirm none were left behind).

- [ ] **Step 9: Commit**

```bash
git add frontend/src/lib/adapters/StellarAdapter.ts frontend/src/lib/adapters/StellarAdapter.buildConvertTx.test.ts frontend/src/lib/errors.ts frontend/src/lib/errors.test.ts
git commit -m "feat(convert): implement StellarAdapter getQuote + swap with trustline auto-add"
```

---

### Task 3: Convert screen + route wiring

**Files:**
- Create: `frontend/src/pages/Convert.tsx`
- Modify: `frontend/src/App.tsx`

**Interfaces:**
- Consumes: `adapter` from `StellarAdapter.ts`; `useWallet`, `useBalances`; `mergeToAssets`, `assetKey`, `sameAsset`, `hasTrustline`, `DEFAULT_SLIPPAGE_BPS` from `convert.ts`; `KNOWN_ASSETS`, `txExplorerUrl` from `config.ts`; `NoRouteError`, `type AssetId`, `type AssetBalance`, `type Quote` from `ChainAdapter.ts`; `ConfirmDialog`, `Button`, `ConnectButton`, `friendlyError`, `navigate`.
- Produces: `<Convert/>` default screen at `/convert`.

- [ ] **Step 1: Implement `frontend/src/pages/Convert.tsx`**

Mirror `Send.tsx` conventions (same Tailwind tokens, same connect-gate and success-receipt patterns). A live quote is fetched with a debounce and stale-guard.

```tsx
import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowDownUp, CheckCircle2, ArrowUpRight, Loader2 } from 'lucide-react';
import { useWallet } from '../hooks/useWallet';
import { useBalances } from '../hooks/useBalances';
import { adapter } from '../lib/adapters/StellarAdapter';
import { NoRouteError, type AssetId, type AssetBalance, type Quote } from '../lib/adapters/ChainAdapter';
import {
  mergeToAssets,
  assetKey,
  sameAsset,
  hasTrustline,
  DEFAULT_SLIPPAGE_BPS,
} from '../lib/convert';
import { KNOWN_ASSETS, txExplorerUrl } from '../lib/config';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { Button } from '../components/Button';
import { ConnectButton } from '../components/ConnectButton';
import { friendlyError } from '../lib/errors';
import { navigate } from '../lib/router';

const keyOf = (b: AssetBalance) => assetKey(b.asset);

export function Convert() {
  const { address } = useWallet();
  const { balances, loading, refetch } = useBalances(address);

  const [fromKey, setFromKey] = useState('');
  const [toKey, setToKey] = useState('');
  const [amount, setAmount] = useState('');
  const [quote, setQuote] = useState<Quote | null>(null);
  const [quoting, setQuoting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [swapping, setSwapping] = useState(false);
  const [doneHash, setDoneHash] = useState<string | null>(null);

  const from = useMemo(() => {
    if (balances.length === 0) return undefined;
    return balances.find((b) => keyOf(b) === fromKey) ?? balances[0];
  }, [balances, fromKey]);

  const toOptions = useMemo(
    () => (from ? mergeToAssets(KNOWN_ASSETS, balances, from.asset) : []),
    [balances, from],
  );

  const to = useMemo(() => {
    if (toOptions.length === 0) return undefined;
    return toOptions.find((a) => assetKey(a) === toKey) ?? toOptions[0];
  }, [toOptions, toKey]);

  const amountNum = Number(amount);
  const maxNum = from ? Number(from.amount) : 0;
  const overBalance = amountNum > maxNum;
  const validAmount = amountNum > 0 && !overBalance;

  // Debounced live quote with a stale-guard.
  const reqId = useRef(0);
  useEffect(() => {
    setQuote(null);
    if (!from || !to || !validAmount) return;
    const id = ++reqId.current;
    setQuoting(true);
    setError(null);
    const t = setTimeout(async () => {
      try {
        const q = await adapter.getQuote({ from: from.asset, to, amount });
        if (id === reqId.current) setQuote(q);
      } catch (e) {
        if (id === reqId.current) {
          setError(e instanceof NoRouteError ? 'No route for this pair on testnet.' : friendlyError(e));
        }
      } finally {
        if (id === reqId.current) setQuoting(false);
      }
    }, 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from && assetKey(from.asset), to && assetKey(to), amount]);

  if (!address) {
    return (
      <div className="mx-auto max-w-app px-1 py-16 text-center">
        <h1 className="text-[22px] font-semibold tracking-tight text-ink">Convert</h1>
        <p className="mt-2 text-[14px] text-slate">Connect a wallet to convert assets.</p>
        <div className="mt-6 flex justify-center">
          <ConnectButton />
        </div>
      </div>
    );
  }

  if (doneHash) {
    return (
      <div className="mx-auto max-w-app space-y-5 px-1 text-center">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-pill bg-accent text-white">
          <CheckCircle2 size={28} aria-hidden />
        </span>
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight text-ink">Converted</h1>
          <p className="mt-1 text-[14px] text-slate">
            {amount} {from?.asset.code} to {to?.code}
          </p>
        </div>
        <a
          href={txExplorerUrl(doneHash)}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-[13px] text-accent-deep hover:opacity-80"
        >
          View on Stellar Expert <ArrowUpRight size={14} aria-hidden />
        </a>
        <div className="flex gap-3">
          <Button
            variant="secondary"
            className="flex-1"
            onClick={() => {
              setDoneHash(null);
              setAmount('');
              setQuote(null);
            }}
          >
            Convert more
          </Button>
          <Button className="flex-1" onClick={() => navigate('/home')}>Done</Button>
        </div>
      </div>
    );
  }

  const needTrust = to ? !hasTrustline(balances, to) : false;
  const ready = !!from && !!to && !!quote && validAmount && !quoting && !sameAsset(from.asset, to);

  async function doSwap() {
    if (!quote || !address) return;
    setSwapping(true);
    setError(null);
    try {
      const res = await adapter.swap({ ...quote, sender: address });
      setConfirming(false);
      setDoneHash(res.hash);
      refetch();
    } catch (e) {
      setError(friendlyError(e));
      setConfirming(false);
    } finally {
      setSwapping(false);
    }
  }

  return (
    <div className="mx-auto max-w-app space-y-5 px-1">
      <h1 className="text-[22px] font-semibold tracking-tight text-ink">Convert</h1>

      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="mb-1.5 block text-[13px] text-slate">From</span>
          <select
            value={from ? keyOf(from) : ''}
            onChange={(e) => setFromKey(e.target.value)}
            disabled={loading || balances.length === 0}
            className="h-12 w-full rounded-control border border-hairline bg-paper px-3 text-ink focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/15"
          >
            {balances.map((b) => (
              <option key={keyOf(b)} value={keyOf(b)}>
                {b.asset.code}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1.5 block text-[13px] text-slate">To</span>
          <select
            value={to ? assetKey(to) : ''}
            onChange={(e) => setToKey(e.target.value)}
            disabled={!from || toOptions.length === 0}
            className="h-12 w-full rounded-control border border-hairline bg-paper px-3 text-ink focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/15"
          >
            {toOptions.map((a) => (
              <option key={assetKey(a)} value={assetKey(a)}>
                {a.code}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="block">
        <span className="mb-1.5 block text-[13px] text-slate">Amount</span>
        <input
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          type="number"
          min="0"
          step="any"
          placeholder="0.0"
          className="mono h-12 w-full rounded-control border border-hairline bg-paper px-3.5 text-ink placeholder:text-fog focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/15"
        />
      </label>
      {from && (
        <p className="-mt-2 text-[12px] text-slate">
          Balance: <span className="mono">{from.amount}</span> {from.asset.code}
        </p>
      )}

      {overBalance && <p className="text-[13px] text-refund">Amount is more than your balance.</p>}

      {/* Quote panel */}
      {validAmount && !overBalance && (
        <div className="rounded-card border border-hairline bg-paper p-4 text-[13px]">
          {quoting ? (
            <span className="flex items-center gap-2 text-slate">
              <Loader2 size={15} className="animate-spin" aria-hidden /> Finding the best rate...
            </span>
          ) : quote ? (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-slate">You get about</span>
                <span className="mono text-ink">{quote.amountOut} {to?.code}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate">Minimum received</span>
                <span className="mono text-ink">{quote.minReceived} {to?.code}</span>
              </div>
              <p className="text-[12px] text-slate">Slippage tolerance {DEFAULT_SLIPPAGE_BPS / 100}%.</p>
              {needTrust && (
                <p className="text-[12px] text-slate">
                  A trustline for {to?.code} will be added in the same transaction (a small XLM reserve applies).
                </p>
              )}
            </div>
          ) : null}
        </div>
      )}

      {error && <p className="text-[13px] text-refund">{error}</p>}

      <button
        disabled={!ready}
        onClick={() => setConfirming(true)}
        className="flex w-full items-center justify-center gap-2 rounded-control bg-accent px-4 py-3.5 text-[15px] font-medium text-white transition hover:bg-accent-deep disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
      >
        <ArrowDownUp size={18} aria-hidden /> Convert
      </button>

      <ConfirmDialog
        open={confirming}
        title="Convert"
        description={
          <>
            You are converting <span className="mono text-ink">{amount} {from?.asset.code}</span> to about{' '}
            <span className="mono text-ink">{quote?.amountOut} {to?.code}</span> (at least{' '}
            <span className="mono text-ink">{quote?.minReceived} {to?.code}</span>).
            {needTrust && ' A trustline for the destination asset will be added.'}
          </>
        }
        confirmLabel="Convert"
        busy={swapping}
        onConfirm={doSwap}
        onCancel={() => {
          setConfirming(false);
          setError(null);
        }}
      />
    </div>
  );
}
```

- [ ] **Step 2: Wire the route in `App.tsx`**

Add the import beside the other page imports:

```ts
import { Convert } from './pages/Convert';
```

Replace:

```tsx
          {route.name === 'convert' && <ComingSoon title="Convert" />}
```

with:

```tsx
          {route.name === 'convert' && <Convert />}
```

Leave the `activity` `ComingSoon` line as is (Phase 4).

- [ ] **Step 3: Typecheck**

Run: `cd frontend && npx tsc --noEmit`
Expected: no errors. If `ComingSoon` becomes unused, it is still referenced by the `activity` route, so the import stays.

- [ ] **Step 4: Build (unused-import gate)**

Run: `cd frontend && npm run build`
Expected: build succeeds. Fix any unused import/variable the build flags (e.g. `sameAsset` must be used — it is, in `ready`).

- [ ] **Step 5: Full test suite**

Run: `cd frontend && npx vitest run`
Expected: all suites pass (ChainAdapter, convert, buildConvertTx, errors, prices, stellarAssets).

- [ ] **Step 6: Commit**

```bash
git add frontend/src/pages/Convert.tsx frontend/src/App.tsx
git commit -m "feat(convert): Convert screen with live quote, slippage, and trustline notice"
```

---

## Manual testnet verification (the Phase 3 gate — user runs this)

Not an automated step; the user performs it with a funded Freighter wallet:

1. Connect Freighter (testnet) with an XLM balance.
2. Go to Convert, From = XLM, To = USDC, enter e.g. `10`.
3. A live quote appears (out-amount + minimum received). If the testnet DEX has no XLM->USDC liquidity for that issuer, the UI shows "No route for this pair on testnet." (correct behavior; try a different amount or seed liquidity).
4. Convert -> confirm -> sign in Freighter. If no USDC trustline exists, the single transaction adds it and swaps in one signature.
5. Success receipt shows the tx with a Stellar Expert link; Home balances reflect the new USDC after a few seconds.

**Known testnet caveat (surface to the user, do not silently absorb):** testnet path liquidity for XLM<->USDC is not guaranteed. If no route exists at demo time, the swap cannot complete on testnet through no fault of the code; the gate then needs a liquid pair or a seeded offer. The code path (quote, trustline, path-payment, receipt) is what Phase 3 delivers.

---

## Self-Review notes (author)

- **Spec coverage:** `PRD.md` §5.3 Phase 3 = Convert screen + `getQuote`/`swap` via path payments + real XLM<->USDC swap gate. Covered by Tasks 1-3 + manual gate.
- **Adapter seam:** only `StellarAdapter.ts`/`stellarAssets.ts` import the SDK; `convert.ts` and `Convert.tsx` do not. Preserved.
- **Interface extension:** `Quote.sender` documented in `chain-adapter.md` before use (Task 1 Step 3). Honors the invariant.
- **No float money math:** slippage and min-received use `bigint` base units (`applySlippage`), then `baseUnitsToHuman`.
- **Not KYC-gated:** no verification check in any Convert path. Matches `docs/kyc.md`.
- **Type consistency:** `assetKey`/`sameAsset`/`hasTrustline`/`mergeToAssets`/`buildQuote`/`buildConvertTx` signatures match between definition (Tasks 1-2) and use (Tasks 2-3).
