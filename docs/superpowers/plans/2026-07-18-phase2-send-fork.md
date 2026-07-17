# Phase 2 — Send flow with the "Send protected" fork Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give PACTA a working Send flow where the user picks **Send now** (a plain, wallet-signed Stellar payment through the adapter) or **Send protected** (a Pact: the existing escrow create flow, which already carries the Risk Lens and the KYC gate).

**Architecture:** Implement `StellarAdapter.send` + `signAndSubmit` (the payment-building and signing chokepoint) so "Send now" runs entirely through the `ChainAdapter` seam. "Send protected" reuses the existing `CreateAgreement` page (Risk Lens + KYC already built in) via a tiny in-memory prefill store, so no escrow logic is duplicated and the frozen contract is untouched. A new `Send` page hosts the fork and replaces the Phase 1 `ComingSoon` placeholder at `/send`.

**Tech Stack:** Vite + React 18 + TS + Tailwind 3, `@stellar/stellar-sdk` v14 (`TransactionBuilder`/`Operation`/`Asset`/`Horizon`), `@creit.tech/stellar-wallets-kit` (signing), `lucide-react`, `vitest`.

## Global Constraints

- **Do not touch the escrow contract** (`contracts/`, `packages/pacta`) or the generated bindings. "Send protected" calls the existing `createAgreement` binding wrapper (`lib/contract.ts`) unchanged.
- Wallet surfaces depend only on the `ChainAdapter` interface / the `adapter` singleton. The ONE sanctioned exception is the protected path, which reaches escrow through the existing `CreateAgreement` page (which imports `lib/contract.ts`). Only `StellarAdapter.ts` and the new `stellarAssets.ts` may import `@stellar/stellar-sdk`.
- **Send now is NOT KYC-gated** (it moves the user's own funds). **Send protected IS gated**, but that gate already lives inside `CreateAgreement` (`kycStatus !== 'verified'` → `<KycGate/>`); do not add a second gate.
- **Send protected supports XLM only in this build.** The escrow settles in the native XLM SAC (`TOKEN_ADDRESS` in `config.ts`), so the protected option is enabled only when the selected asset is native XLM; for other assets it is disabled with a short note. Send now works for any held asset.
- Product name is **PACTA**; a protected payment is a **Pact**; UI roles are **sender** / **recipient**. Never "Katiwala" or "PactAI".
- **No em-dashes in UI copy.** Use commas, colons, or parentheses.
- Amounts: the Stellar SDK `Operation.payment` takes a human decimal **string** (e.g. "1.5"); pass the user's amount string straight through. For contract calls the existing `toBaseUnits` boundary still applies (handled inside `CreateAgreement`).
- Reuse existing components and tokens: `Button`, `ConfirmDialog` (`{open,title,description,confirmLabel,variant,busy,onConfirm,onCancel}`), `CopyButton`, `useBalances`, `useWallet`, `friendlyError`, `isValidStellarAddress`, `shortAddr`, `txExplorerUrl`, and the Tailwind tokens (`canvas/paper/mist/ink/slate/hairline/accent(-deep/-tint)/refund(-tint/-deep)/deadline`, `rounded-card/control/pill`, `max-w-app`, `.mono`). Icons from `lucide-react`.
- Multi-chain / EVM, Convert (Phase 3), and fiat ramp are out of scope.

---

## File Structure

**New files:**
- `frontend/src/lib/adapters/stellarAssets.ts` — pure `assetFromId(asset: AssetId): Asset` (native vs issued), the one small SDK-touching helper worth unit-testing.
- `frontend/src/lib/adapters/stellarAssets.test.ts` — unit tests for `assetFromId`.
- `frontend/src/lib/pendingSend.ts` — tiny in-memory consume-once store to carry (recipient, amount) from Send into the protected create flow.
- `frontend/src/pages/Send.tsx` — the Send screen: recipient + asset + amount, the fork, Send now (confirm → adapter.send → receipt), Send protected (stash + route to create).

**Modified files:**
- `frontend/src/lib/adapters/ChainAdapter.ts` — add `from: string` to `SendParams`.
- `docs/architecture/chain-adapter.md` — document the `from` field on `send`.
- `frontend/src/lib/adapters/StellarAdapter.ts` — implement `send` + `signAndSubmit`.
- `frontend/src/pages/CreateAgreement.tsx` — consume the prefill store (recipient + capital), retitle to "Send protected", back button to `/send`.
- `frontend/src/App.tsx` — render `Send` for the `send` route (replace the `ComingSoon` placeholder).

---

## Task 1: Evolve the adapter seam (assetFromId + SendParams.from)

**Files:**
- Create: `frontend/src/lib/adapters/stellarAssets.ts`
- Test: `frontend/src/lib/adapters/stellarAssets.test.ts`
- Modify: `frontend/src/lib/adapters/ChainAdapter.ts`
- Modify: `docs/architecture/chain-adapter.md`

**Interfaces:**
- Consumes: `AssetId` from `./ChainAdapter`; `Asset` from `@stellar/stellar-sdk`.
- Produces: `function assetFromId(asset: AssetId): Asset`; `SendParams` gains `from: string`.

- [ ] **Step 1: Write the failing test**

Create `frontend/src/lib/adapters/stellarAssets.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { Asset } from '@stellar/stellar-sdk';
import { assetFromId } from './stellarAssets';

describe('assetFromId', () => {
  it('maps native XLM (no issuer) to Asset.native()', () => {
    const a = assetFromId({ code: 'XLM' });
    expect(a.isNative()).toBe(true);
  });

  it('maps an issued asset to a code+issuer Asset', () => {
    const issuer = 'GCEXAMPLE00000000000000000000000000000000000000000000000000';
    const a = assetFromId({ code: 'USDC', issuer });
    expect(a.isNative()).toBe(false);
    expect(a.getCode()).toBe('USDC');
    expect(a.getIssuer()).toBe(issuer);
    expect(a).toBeInstanceOf(Asset);
  });

  it('throws when a non-native asset has no issuer', () => {
    expect(() => assetFromId({ code: 'USDC' })).toThrow();
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run (from `frontend/`): `npm run test -- stellarAssets`
Expected: FAIL, cannot find module `./stellarAssets`.

- [ ] **Step 3: Implement the helper**

Create `frontend/src/lib/adapters/stellarAssets.ts`:
```ts
import { Asset } from '@stellar/stellar-sdk';
import type { AssetId } from './ChainAdapter';

// Turn our chain-agnostic AssetId into a Stellar SDK Asset. Native XLM has no
// issuer; every other asset requires one.
export function assetFromId(asset: AssetId): Asset {
  if (asset.code === 'XLM' && !asset.issuer) return Asset.native();
  if (!asset.issuer) {
    throw new Error(`Asset ${asset.code} needs an issuer`);
  }
  return new Asset(asset.code, asset.issuer);
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npm run test -- stellarAssets`
Expected: PASS (3 tests).

- [ ] **Step 5: Add `from` to SendParams**

Edit `frontend/src/lib/adapters/ChainAdapter.ts`. Change the `SendParams` interface from:
```ts
export interface SendParams {
  to: string;
  asset: AssetId;
  amount: string; // human
}
```
to:
```ts
export interface SendParams {
  from: string; // sender address (source account); needed to build the tx
  to: string;
  asset: AssetId;
  amount: string; // human
}
```

- [ ] **Step 6: Update the adapter doc**

Edit `docs/architecture/chain-adapter.md`. In the `send` method contract and the interface code block, update the `send` signature to include `from`. Find the interface line:
```ts
  send(params: SendParams): Promise<TxResult>;
```
and the `SendParams` description prose, and add a note that `send` takes `{ from, to, asset, amount }`, where `from` is the connected sender's address (the source account whose sequence number the tx uses). Keep the rest of the file unchanged.

- [ ] **Step 7: Typecheck + full test**

Run: `npx tsc -b --noEmit && npm run test`
Expected: no type errors (the only `SendParams` user, `StellarAdapter.send`, still throws `NotImplementedError` and does not read fields yet, so adding a field does not break it); tests pass (Phase 1 suites + the 3 new).

- [ ] **Step 8: Commit**

```bash
git add frontend/src/lib/adapters/stellarAssets.ts frontend/src/lib/adapters/stellarAssets.test.ts frontend/src/lib/adapters/ChainAdapter.ts docs/architecture/chain-adapter.md
git commit -m "feat(wallet): assetFromId helper and SendParams.from for payments"
```

---

## Task 2: Implement StellarAdapter.send + signAndSubmit

**Files:**
- Modify: `frontend/src/lib/adapters/StellarAdapter.ts`

**Interfaces:**
- Consumes: `TransactionBuilder`, `Operation`, `BASE_FEE`, `Horizon` from `@stellar/stellar-sdk`; `assetFromId` from `./stellarAssets`; `signTransaction` from `../wallet`; `NETWORK_PASSPHRASE`, `txExplorerUrl` from `../config`.
- Produces: working `send(params: SendParams): Promise<TxResult>` and `signAndSubmit(xdr: string): Promise<TxResult>`.

- [ ] **Step 1: Replace the two throwing methods**

Edit `frontend/src/lib/adapters/StellarAdapter.ts`.

Update the import from `@stellar/stellar-sdk` (currently `import { Horizon } from '@stellar/stellar-sdk';`) to:
```ts
import { Horizon, TransactionBuilder, Operation, BASE_FEE } from '@stellar/stellar-sdk';
```

Add these imports below the existing ones:
```ts
import { assetFromId } from './stellarAssets';
import { signTransaction } from '../wallet';
import { NETWORK_PASSPHRASE, txExplorerUrl } from '../config';
```

Replace the `send` method:
```ts
  async send(_params: SendParams): Promise<TxResult> {
    throw new NotImplementedError('send'); // Phase 2
  }
```
with:
```ts
  async send({ from, to, asset, amount }: SendParams): Promise<TxResult> {
    // Load the sender account for its current sequence number, build a single
    // payment operation, then hand the XDR to the shared signing chokepoint.
    const account = await this.server.loadAccount(from);
    const tx = new TransactionBuilder(account, {
      fee: BASE_FEE,
      networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(
        Operation.payment({
          destination: to,
          asset: assetFromId(asset),
          amount, // human decimal string, e.g. "1.5"
        }),
      )
      .setTimeout(180)
      .build();
    return this.signAndSubmit(tx.toXDR());
  }
```

Replace the `signAndSubmit` method:
```ts
  async signAndSubmit(_xdr: string): Promise<TxResult> {
    throw new NotImplementedError('signAndSubmit'); // Phase 2
  }
```
with:
```ts
  async signAndSubmit(xdr: string): Promise<TxResult> {
    // Single signing chokepoint for every write path. The wallet returns a
    // signed XDR; submit it via Horizon and surface the hash + explorer link.
    const { signedTxXdr } = await signTransaction(xdr);
    const signed = TransactionBuilder.fromXDR(signedTxXdr, NETWORK_PASSPHRASE);
    const resp = await this.server.submitTransaction(signed);
    return { hash: resp.hash, explorerUrl: txExplorerUrl(resp.hash), status: 'success' };
  }
```

Leave `getQuote`/`swap` throwing `NotImplementedError` (Phase 3). `NotImplementedError` is still imported and used, so keep that import.

- [ ] **Step 2: Typecheck + build**

Run: `npx tsc -b --noEmit && npm run build`
Expected: no type errors, build succeeds. If v14's `submitTransaction` return type does not expose `.hash` directly, read the returned object's shape and use the correct hash field (Horizon's submit response has `hash`); adjust only that access, do not change the flow.

- [ ] **Step 3: Run tests (no regressions)**

Run: `npm run test`
Expected: PASS (Phase 1 suites + stellarAssets). No new unit test here: `send`/`signAndSubmit` are thin Horizon+wallet integration; the pure `assetFromId` they rely on is already tested, and the flow is exercised manually in Task 5.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/lib/adapters/StellarAdapter.ts
git commit -m "feat(wallet): StellarAdapter.send and signAndSubmit (Stellar payment)"
```

---

## Task 3: Prefill store + wire the protected create flow

**Files:**
- Create: `frontend/src/lib/pendingSend.ts`
- Modify: `frontend/src/pages/CreateAgreement.tsx`

**Interfaces:**
- Consumes (CreateAgreement): `takePendingSend` from `../lib/pendingSend`.
- Produces: `interface PendingSend { trader: string; capital: string }`; `setPendingSend(p)`, `takePendingSend(): PendingSend | null` (consume-once).

- [ ] **Step 1: Create the store**

Create `frontend/src/lib/pendingSend.ts`:
```ts
// A tiny in-memory handoff from the Send screen to the protected create flow.
// Consume-once: reading it clears it, so a later manual visit to /create is not
// accidentally prefilled. Not persisted (a reload clears it, which is fine).
export interface PendingSend {
  trader: string; // recipient address
  capital: string; // human amount to protect
}

let pending: PendingSend | null = null;

export function setPendingSend(p: PendingSend): void {
  pending = p;
}

export function takePendingSend(): PendingSend | null {
  const p = pending;
  pending = null;
  return p;
}
```

- [ ] **Step 2: Prefill + relabel CreateAgreement**

Edit `frontend/src/pages/CreateAgreement.tsx`:

Add to the imports (with the other `../lib` imports):
```ts
import { takePendingSend } from '../lib/pendingSend';
```
Add `useRef` to the React import (it currently imports `useState`):
```ts
import { useRef, useState } from 'react';
```

Immediately inside `CreateAgreement()`, before the existing `useState` calls, read the prefill once:
```ts
  // If arriving from the Send screen's "Send protected" option, prefill the
  // recipient and amount. Consume-once so a later direct visit is not prefilled.
  const prefill = useRef(takePendingSend()).current;
```
Change the two initial states to use it:
```ts
  const [trader, setTrader] = useState(prefill?.trader ?? '');
  const [capital, setCapital] = useState(prefill?.capital ?? '100');
```

Relabel the user-facing strings (no behavior change):
- The back button: change `onClick={() => navigate('/dashboard')}` to `onClick={() => navigate('/send')}` and its `aria-label="Back to dashboard"` to `aria-label="Back to send"`.
- The title `New agreement` → `Send protected`.
- The not-connected copy `Connect your wallet to create an agreement.` → `Connect your wallet to send a protected payment.`
- The field label `Provider address` → `Recipient address`.
- The submit button label `Create agreement` → `Create Pact`.

Do not change any other logic (validation, `createAgreement` call, Risk Lens, KYC gate, navigation to `/agreement/${id}`).

- [ ] **Step 3: Typecheck + build**

Run: `npx tsc -b --noEmit && npm run build`
Expected: no type errors, build succeeds.

- [ ] **Step 4: Run tests (no regressions)**

Run: `npm run test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/lib/pendingSend.ts frontend/src/pages/CreateAgreement.tsx
git commit -m "feat(wallet): prefill store and Send-protected framing for the create flow"
```

---

## Task 4: The Send screen (the fork)

**Files:**
- Create: `frontend/src/pages/Send.tsx`

**Interfaces:**
- Consumes: `useWallet`; `useBalances`; `adapter` from `../lib/adapters/StellarAdapter`; `AssetBalance` from `../lib/adapters/ChainAdapter`; `ConfirmDialog`; `Button`; `CopyButton`; `setPendingSend` from `../lib/pendingSend`; `navigate` from `../lib/router`; `isValidStellarAddress`, `shortAddr` from `../lib/format`; `txExplorerUrl` from `../lib/config`; `lucide-react` icons; `friendlyError` from `../lib/errors`.
- Produces: `function Send()`.

- [ ] **Step 1: Implement the Send page**

Create `frontend/src/pages/Send.tsx`:
```tsx
import { useMemo, useState } from 'react';
import { ArrowUp, ShieldCheck, CheckCircle2, ArrowUpRight } from 'lucide-react';
import { useWallet } from '../hooks/useWallet';
import { useBalances } from '../hooks/useBalances';
import { adapter } from '../lib/adapters/StellarAdapter';
import type { AssetBalance } from '../lib/adapters/ChainAdapter';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { Button } from '../components/Button';
import { CopyButton } from '../components/CopyButton';
import { ConnectButton } from '../components/ConnectButton';
import { setPendingSend } from '../lib/pendingSend';
import { navigate } from '../lib/router';
import { isValidStellarAddress, shortAddr } from '../lib/format';
import { txExplorerUrl } from '../lib/config';
import { friendlyError } from '../lib/errors';

const keyOf = (b: AssetBalance) => `${b.asset.code}:${b.asset.issuer ?? 'native'}`;

export function Send() {
  const { address } = useWallet();
  const { balances, loading } = useBalances(address);

  const [to, setTo] = useState('');
  const [assetKey, setAssetKey] = useState('');
  const [amount, setAmount] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sentHash, setSentHash] = useState<string | null>(null);

  const selected = useMemo(() => {
    if (balances.length === 0) return undefined;
    return balances.find((b) => keyOf(b) === assetKey) ?? balances[0];
  }, [balances, assetKey]);

  if (!address) {
    return (
      <div className="mx-auto max-w-app px-1 py-16 text-center">
        <h1 className="text-[22px] font-semibold tracking-tight text-ink">Send</h1>
        <p className="mt-2 text-[14px] text-slate">Connect a wallet to send a payment.</p>
        <div className="mt-6 flex justify-center">
          <ConnectButton />
        </div>
      </div>
    );
  }

  // Success receipt.
  if (sentHash) {
    return (
      <div className="mx-auto max-w-app space-y-5 px-1 text-center">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-pill bg-accent text-white">
          <CheckCircle2 size={28} aria-hidden />
        </span>
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight text-ink">Sent</h1>
          <p className="mt-1 text-[14px] text-slate">
            {amount} {selected?.asset.code} to <span className="mono">{shortAddr(to)}</span>
          </p>
        </div>
        <a
          href={txExplorerUrl(sentHash)}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-[13px] text-accent-deep hover:opacity-80"
        >
          View on Stellar Expert <ArrowUpRight size={14} aria-hidden />
        </a>
        <div className="flex gap-3">
          <Button variant="secondary" className="flex-1" onClick={() => { setSentHash(null); setAmount(''); }}>
            Send another
          </Button>
          <Button className="flex-1" onClick={() => navigate('/home')}>Done</Button>
        </div>
      </div>
    );
  }

  const amountNum = Number(amount);
  const maxNum = selected ? Number(selected.amount) : 0;
  const isXlm = selected?.asset.code === 'XLM' && !selected?.asset.issuer;

  const formError =
    !isValidStellarAddress(to.trim())
      ? 'Enter a valid recipient address.'
      : to.trim() === address
        ? 'You cannot send to yourself.'
        : !(amountNum > 0)
          ? 'Enter an amount greater than zero.'
          : amountNum > maxNum
            ? 'Amount is more than your balance.'
            : null;

  const ready = !formError && !!selected;

  async function doSendNow() {
    if (!selected) return;
    setSending(true);
    setError(null);
    try {
      const res = await adapter.send({ from: address!, to: to.trim(), asset: selected.asset, amount });
      setConfirming(false);
      setSentHash(res.hash);
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setSending(false);
    }
  }

  function doSendProtected() {
    setPendingSend({ trader: to.trim(), capital: amount });
    navigate('/create');
  }

  return (
    <div className="mx-auto max-w-app space-y-5 px-1">
      <h1 className="text-[22px] font-semibold tracking-tight text-ink">Send</h1>

      <label className="block">
        <span className="mb-1.5 block text-[13px] text-slate">Recipient address</span>
        <input
          value={to}
          onChange={(e) => setTo(e.target.value)}
          placeholder="G..."
          spellCheck={false}
          className="mono h-12 w-full rounded-control border border-hairline bg-paper px-3.5 text-ink placeholder:text-fog focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/15"
        />
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="mb-1.5 block text-[13px] text-slate">Asset</span>
          <select
            value={selected ? keyOf(selected) : ''}
            onChange={(e) => setAssetKey(e.target.value)}
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
      </div>
      {selected && (
        <p className="-mt-2 text-[12px] text-slate">
          Balance: <span className="mono">{selected.amount}</span> {selected.asset.code}
        </p>
      )}

      {formError && amount !== '' && <p className="text-[13px] text-refund">{formError}</p>}
      {error && <p className="text-[13px] text-refund">{error}</p>}

      {/* The fork */}
      <div className="space-y-3 pt-1">
        <button
          disabled={!ready}
          onClick={() => setConfirming(true)}
          className="flex w-full items-start gap-3 rounded-card border border-hairline bg-paper p-4 text-left transition hover:border-accent/30 disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
        >
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-pill bg-mist text-slate">
            <ArrowUp size={18} aria-hidden />
          </span>
          <span>
            <span className="block text-[15px] font-medium text-ink">Send now</span>
            <span className="block text-[13px] text-slate">Pay directly. Fast and final.</span>
          </span>
        </button>

        <button
          disabled={!ready || !isXlm}
          onClick={doSendProtected}
          className="flex w-full items-start gap-3 rounded-card border border-accent/30 bg-accent-tint p-4 text-left transition hover:border-accent/50 disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
        >
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-pill bg-accent text-white">
            <ShieldCheck size={18} aria-hidden />
          </span>
          <span>
            <span className="block text-[15px] font-medium text-ink">Send protected (a Pact)</span>
            <span className="block text-[13px] text-slate">
              {isXlm
                ? 'Release in milestones, backed by a bond, refundable if they fail to deliver.'
                : 'Protected payments support XLM in this build.'}
            </span>
          </span>
        </button>
      </div>

      <ConfirmDialog
        open={confirming}
        title="Send now"
        description={
          <>
            You are sending <span className="mono text-ink">{amount} {selected?.asset.code}</span> to{' '}
            <span className="mono text-ink">{shortAddr(to.trim())}</span>. This is final and cannot be undone.
          </>
        }
        confirmLabel="Send"
        busy={sending}
        onConfirm={doSendNow}
        onCancel={() => setConfirming(false)}
      />

      <div className="flex items-center justify-center gap-1.5 pt-1 text-[12px] text-slate">
        <span className="mono">{shortAddr(address)}</span>
        <CopyButton value={address} />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Typecheck + build**

Run: `npx tsc -b --noEmit && npm run build`
Expected: no type errors, build succeeds. (Verify the lucide icons `ArrowUp`, `ShieldCheck`, `CheckCircle2`, `ArrowUpRight` exist in the installed `lucide-react`; if a name differs, use the correct export. The repo build fails on unused imports, so do not add icons you do not render.)

- [ ] **Step 3: Run tests (no regressions)**

Run: `npm run test`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/Send.tsx
git commit -m "feat(wallet): Send screen with Send now and Send protected fork"
```

---

## Task 5: Wire /send to the Send screen + integration gate

**Files:**
- Modify: `frontend/src/App.tsx`

**Interfaces:**
- Consumes: `Send` from `./pages/Send`.
- Produces: the `/send` route renders `Send` instead of the `ComingSoon` placeholder.

- [ ] **Step 1: Render Send for the send route**

Edit `frontend/src/App.tsx`:

Add the import near the other page imports:
```tsx
import { Send } from './pages/Send';
```

Change the send render case from:
```tsx
          {route.name === 'send' && <ComingSoon title="Send" />}
```
to:
```tsx
          {route.name === 'send' && <Send />}
```
Leave the `convert` and `activity` `ComingSoon` cases unchanged (still Phase 3/4). `ComingSoon` is still used, keep its import.

- [ ] **Step 2: Full typecheck + build**

Run: `npx tsc -b --noEmit && npm run build`
Expected: no type errors, build succeeds.

- [ ] **Step 3: Run tests**

Run: `npm run test`
Expected: PASS.

- [ ] **Step 4: Manual verification on testnet (the Phase 2 gate)**

Run `npm run dev`, connect a funded testnet wallet, and confirm:
1. Wallet Home → Send opens the Send screen.
2. Enter a valid recipient, pick XLM, enter an amount within balance. Both fork options enable.
3. **Send now** → confirm dialog shows the amount and recipient → Sign in the wallet → success receipt with a working Stellar Expert link; returning Home shows the reduced balance after a refresh.
4. **Send protected** → routes to the create flow with the recipient and amount prefilled and titled "Send protected"; the KYC gate appears if unverified; the Risk Lens appears for the recipient; creating the Pact lands on the agreement detail.
5. Pick a non-XLM asset (if held): Send now still works, Send protected is disabled with the "supports XLM in this build" note.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/App.tsx
git commit -m "feat(wallet): mount the Send screen at /send"
```

---

## Notes for the implementer

- Do not implement Convert (`getQuote`/`swap` stay throwing `NotImplementedError`); that is Phase 3.
- The protected path deliberately reuses `CreateAgreement` rather than duplicating escrow logic; the only new coupling is the consume-once `pendingSend` store.
- A plain payment requires the destination account to already exist and (for issued assets) to hold a trustline; a failure surfaces through `friendlyError`. Creating new accounts / trustlines is out of scope this phase.
- After Phase 2 is green, Phase 3 implements Convert: `StellarAdapter.getQuote`/`swap` via path payments and the Convert screen at `/convert`.
