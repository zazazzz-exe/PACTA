# Mainnet + Network Auto-Detection (Phase A) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the wallet layer (portfolio, Send now, Receive, Convert, Activity) operate on whichever Stellar network the connected wallet is on (mainnet or testnet), while keeping the Pact/escrow layer testnet-only and gated off on mainnet.

**Architecture:** Replace the static testnet constants in `config.ts` with a network registry (`networks.ts`) and a small subscribable active-network store (`activeNetwork.ts`) resolved from the connected wallet's reported passphrase. Wallet-layer consumers read the active network; the escrow layer stays testnet-pinned and is disabled off-testnet via a single `supportsPacts` flag.

**Tech Stack:** Vite 6, React 18, TypeScript, `@stellar/stellar-sdk` (Horizon), `@creit.tech/stellar-wallets-kit`, Vitest 2 (node env).

## Global Constraints

- Do NOT touch, redeploy, or repoint the frozen testnet escrow contract. No mainnet contract calls.
- Escrow layer (`contract.ts`, Risk Lens over agreements) stays testnet-only; gate its UI entry points off on mainnet, never call it off testnet.
- Supported networks: testnet passphrase `Test SDF Network ; September 2015`; mainnet/public passphrase `Public Global Stellar Network ; September 2015`. Any other reported passphrase is unsupported (guard warns, money actions blocked).
- Confirmed mainnet USDC issuer (verified, Circle/centre.io): `GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN`. Testnet USDC issuer (existing): `GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5`.
- Public Horizon: `https://horizon.stellar.org`. Testnet Horizon: `https://horizon-testnet.stellar.org`.
- Follow the connected wallet automatically; no manual network toggle.
- Signing passphrase must always equal the active (wallet-reported) network.
- No em-dashes in UI copy. Amount conversions unchanged (×/÷ 1e7).
- Tests live at `frontend/src/**/*.test.ts` (Vitest, node environment, pure functions).

---

### Task 1: Network registry (`lib/networks.ts`)

**Files:**
- Create: `frontend/src/lib/networks.ts`
- Test: `frontend/src/lib/networks.test.ts`

**Interfaces:**
- Produces:
  - `type NetworkKey = 'testnet' | 'public'`
  - `interface NetworkInfo { key: NetworkKey; label: string; passphrase: string; horizonUrl: string; rpcUrl: string; explorerBase: string; knownAssets: { code: string; issuer?: string }[]; supportsPacts: boolean }`
  - `const TESTNET: NetworkInfo`, `const MAINNET: NetworkInfo`, `const DEFAULT_NETWORK: NetworkInfo` (= TESTNET)
  - `function networkForPassphrase(p: string | null): NetworkInfo | null`

- [ ] **Step 1: Write the failing tests**

Create `frontend/src/lib/networks.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { TESTNET, MAINNET, DEFAULT_NETWORK, networkForPassphrase } from './networks';

describe('network registry', () => {
  it('testnet supports Pacts, mainnet does not', () => {
    expect(TESTNET.supportsPacts).toBe(true);
    expect(MAINNET.supportsPacts).toBe(false);
  });
  it('has correct labels and keys', () => {
    expect(TESTNET.label).toBe('testnet');
    expect(MAINNET.label).toBe('mainnet');
    expect(MAINNET.key).toBe('public');
  });
  it('mainnet uses public Horizon and the confirmed USDC issuer', () => {
    expect(MAINNET.horizonUrl).toBe('https://horizon.stellar.org');
    const usdc = MAINNET.knownAssets.find((a) => a.code === 'USDC');
    expect(usdc?.issuer).toBe('GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN');
  });
  it('default network is testnet', () => {
    expect(DEFAULT_NETWORK).toBe(TESTNET);
  });
  it('resolves known passphrases and returns null for unknown', () => {
    expect(networkForPassphrase('Test SDF Network ; September 2015')).toBe(TESTNET);
    expect(networkForPassphrase('Public Global Stellar Network ; September 2015')).toBe(MAINNET);
    expect(networkForPassphrase('Test SDF Future Network ; October 2022')).toBeNull();
    expect(networkForPassphrase(null)).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd frontend && npx vitest run src/lib/networks.test.ts`
Expected: FAIL — cannot find module `./networks`.

- [ ] **Step 3: Write the implementation**

Create `frontend/src/lib/networks.ts`:
```ts
// Source of truth for network-varying values. Resolved from the connected
// wallet's reported passphrase by activeNetwork.ts. The escrow (Pact) contract
// is deployed only on testnet, so supportsPacts is true only there.

export type NetworkKey = 'testnet' | 'public';

export interface NetworkInfo {
  key: NetworkKey;
  label: string; // UI copy: 'testnet' | 'mainnet'
  passphrase: string;
  horizonUrl: string;
  rpcUrl: string; // used only by the testnet escrow layer; not exercised on mainnet
  explorerBase: string; // stellar.expert explorer base for this network
  knownAssets: { code: string; issuer?: string }[];
  supportsPacts: boolean;
}

export const TESTNET: NetworkInfo = {
  key: 'testnet',
  label: 'testnet',
  passphrase: 'Test SDF Network ; September 2015',
  horizonUrl: 'https://horizon-testnet.stellar.org',
  rpcUrl: 'https://soroban-testnet.stellar.org',
  explorerBase: 'https://stellar.expert/explorer/testnet',
  knownAssets: [
    { code: 'XLM' },
    { code: 'USDC', issuer: 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5' },
  ],
  supportsPacts: true,
};

export const MAINNET: NetworkInfo = {
  key: 'public',
  label: 'mainnet',
  passphrase: 'Public Global Stellar Network ; September 2015',
  horizonUrl: 'https://horizon.stellar.org',
  rpcUrl: 'https://mainnet.sorobanrpc.com',
  explorerBase: 'https://stellar.expert/explorer/public',
  knownAssets: [
    { code: 'XLM' },
    { code: 'USDC', issuer: 'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN' },
  ],
  supportsPacts: false,
};

// Pre-connect / fallback network.
export const DEFAULT_NETWORK: NetworkInfo = TESTNET;

const SUPPORTED = [TESTNET, MAINNET];

// Resolve a wallet-reported passphrase to a supported network, or null if the
// network is not one we support (e.g. futurenet or a custom network).
export function networkForPassphrase(p: string | null): NetworkInfo | null {
  return SUPPORTED.find((n) => n.passphrase === p) ?? null;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd frontend && npx vitest run src/lib/networks.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/lib/networks.ts frontend/src/lib/networks.test.ts
git commit -m "feat(network): network registry (testnet + mainnet)"
```

---

### Task 2: Active-network store (`lib/activeNetwork.ts`)

**Files:**
- Create: `frontend/src/lib/activeNetwork.ts`
- Test: `frontend/src/lib/activeNetwork.test.ts`

**Interfaces:**
- Consumes: `NetworkInfo`, `TESTNET`, `MAINNET`, `DEFAULT_NETWORK`, `networkForPassphrase` from `./networks` (Task 1).
- Produces:
  - `function getActiveNetwork(): NetworkInfo`
  - `function setActiveNetworkFromPassphrase(p: string | null): void`
  - `function isSupportedNetwork(p: string | null): boolean`
  - `function useActiveNetwork(): NetworkInfo` (React hook)

- [ ] **Step 1: Write the failing tests**

Create `frontend/src/lib/activeNetwork.test.ts`:
```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { TESTNET, MAINNET } from './networks';
import {
  getActiveNetwork,
  setActiveNetworkFromPassphrase,
  isSupportedNetwork,
} from './activeNetwork';

describe('activeNetwork store', () => {
  beforeEach(() => {
    setActiveNetworkFromPassphrase(TESTNET.passphrase); // reset to a known state
  });

  it('defaults to testnet', () => {
    expect(getActiveNetwork()).toBe(TESTNET);
  });
  it('switches to mainnet on the public passphrase', () => {
    setActiveNetworkFromPassphrase(MAINNET.passphrase);
    expect(getActiveNetwork()).toBe(MAINNET);
  });
  it('keeps the last supported network when given an unsupported passphrase', () => {
    setActiveNetworkFromPassphrase(MAINNET.passphrase);
    setActiveNetworkFromPassphrase('Test SDF Future Network ; October 2022');
    expect(getActiveNetwork()).toBe(MAINNET);
  });
  it('keeps the last supported network when given null', () => {
    setActiveNetworkFromPassphrase(MAINNET.passphrase);
    setActiveNetworkFromPassphrase(null);
    expect(getActiveNetwork()).toBe(MAINNET);
  });
  it('isSupportedNetwork is true only for the two known passphrases', () => {
    expect(isSupportedNetwork(TESTNET.passphrase)).toBe(true);
    expect(isSupportedNetwork(MAINNET.passphrase)).toBe(true);
    expect(isSupportedNetwork('Test SDF Future Network ; October 2022')).toBe(false);
    expect(isSupportedNetwork(null)).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd frontend && npx vitest run src/lib/activeNetwork.test.ts`
Expected: FAIL — cannot find module `./activeNetwork`.

- [ ] **Step 3: Write the implementation**

Create `frontend/src/lib/activeNetwork.ts`:
```ts
import { useEffect, useState } from 'react';
import { type NetworkInfo, DEFAULT_NETWORK, networkForPassphrase } from './networks';

// Subscribable store for the network the app currently operates on. Resolved
// from the connected wallet's reported passphrase (follow-the-wallet). Same
// module-singleton + subscriber pattern as outbox.ts.

let active: NetworkInfo = DEFAULT_NETWORK;
const subs = new Set<() => void>();

export function getActiveNetwork(): NetworkInfo {
  return active;
}

// Set the active network from a wallet-reported passphrase. A supported
// passphrase becomes active; an unsupported/unknown one leaves the last
// supported network in place (so consumers always have a valid network) while
// isSupportedNetwork() reports false so the guard can block actions.
export function setActiveNetworkFromPassphrase(p: string | null): void {
  const next = networkForPassphrase(p);
  if (next && next !== active) {
    active = next;
    subs.forEach((f) => f());
  }
}

export function isSupportedNetwork(p: string | null): boolean {
  return networkForPassphrase(p) !== null;
}

export function useActiveNetwork(): NetworkInfo {
  const [net, setNet] = useState<NetworkInfo>(active);
  useEffect(() => {
    const update = () => setNet(active);
    subs.add(update);
    update();
    return () => {
      subs.delete(update);
    };
  }, []);
  return net;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd frontend && npx vitest run src/lib/activeNetwork.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/lib/activeNetwork.ts frontend/src/lib/activeNetwork.test.ts
git commit -m "feat(network): active-network store resolved from the wallet"
```

---

### Task 3: Wire active network on connect + network-aware guard and badge

**Files:**
- Modify: `frontend/src/main.tsx`
- Modify: `frontend/src/App.tsx` (`NetworkBadge`)
- Modify: `frontend/src/components/NetworkGuard.tsx`

**Interfaces:**
- Consumes: `setActiveNetworkFromPassphrase`, `isSupportedNetwork`, `useActiveNetwork` from `../lib/activeNetwork`.

- [ ] **Step 1: Set the active network wherever the wallet network is read, in `frontend/src/main.tsx`**

Add the import near the other `./lib` imports:
```tsx
import { setActiveNetworkFromPassphrase, isSupportedNetwork } from './lib/activeNetwork';
```
In `connect()`, the code currently does `setNetwork(await getWalletNetworkPassphrase());`. Replace that single line with:
```tsx
      const passphrase = await getWalletNetworkPassphrase();
      setNetwork(passphrase);
      setActiveNetworkFromPassphrase(passphrase);
```
Then change the `networkOk` computation. It currently reads:
```tsx
  const networkOk = network == null || network === NETWORK_PASSPHRASE;
```
Replace with:
```tsx
  const networkOk = network == null || isSupportedNetwork(network);
```
Remove the now-unused `NETWORK_PASSPHRASE` import if `main.tsx` no longer uses it elsewhere (verify with the grep in Step 4).

- [ ] **Step 2: Make the header badge live, in `frontend/src/App.tsx`**

Add the import after the other component/lib imports:
```tsx
import { useActiveNetwork } from './lib/activeNetwork';
```
Replace the `NetworkBadge` component:
```tsx
function NetworkBadge() {
  return (
    <span
      data-tour="network"
      className="mono hidden sm:inline-flex items-center gap-1.5 text-[12px] text-slate"
    >
      <span className="h-1.5 w-1.5 rounded-pill bg-accent pulse-dot" aria-hidden />
      testnet
    </span>
  );
}
```
with:
```tsx
function NetworkBadge() {
  const net = useActiveNetwork();
  return (
    <span
      data-tour="network"
      className="mono hidden sm:inline-flex items-center gap-1.5 text-[12px] text-slate"
    >
      <span className="h-1.5 w-1.5 rounded-pill bg-accent pulse-dot" aria-hidden />
      {net.label}
    </span>
  );
}
```

- [ ] **Step 3: Make the guard warn only on unsupported networks, in `frontend/src/components/NetworkGuard.tsx`**

Replace the whole file with:
```tsx
import { AlertTriangle } from 'lucide-react';
import { useWallet } from '../hooks/useWallet';

// Warns only when the connected wallet is on a network PACTA does not support
// (not testnet and not mainnet), so the user does not sign against an unknown
// network. Mainnet and testnet are both supported and get no warning.
// Best-effort: if the network can't be read (networkOk stays true), no warning.
export function NetworkGuard() {
  const { address, networkOk } = useWallet();
  if (!address || networkOk) return null;

  return (
    <div className="bg-deadline-tint border-b border-deadline/30">
      <div className="mx-auto max-w-6xl px-5 py-2.5 flex items-center gap-2 text-[13px] text-deadline-deep">
        <AlertTriangle size={16} aria-hidden />
        <span>
          Your wallet is on an unsupported network. Switch it to Stellar mainnet or testnet.
        </span>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Typecheck, verify no dangling constants, build**

Run:
```bash
cd frontend && npx tsc -b && npm run build
```
Expected: exit 0. Then confirm `NETWORK_PASSPHRASE` is gone from `main.tsx`:
```bash
grep -n "NETWORK_PASSPHRASE" frontend/src/main.tsx || echo "clean"
```
Expected: `clean` (no matches).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/main.tsx frontend/src/App.tsx frontend/src/components/NetworkGuard.tsx
git commit -m "feat(network): follow wallet network; live badge; unsupported-network guard"
```

---

### Task 4: Route the money path through the active network (adapter + signing)

**Files:**
- Modify: `frontend/src/lib/adapters/StellarAdapter.ts`
- Modify: `frontend/src/lib/wallet.ts`

**Interfaces:**
- Consumes: `getActiveNetwork` from `../activeNetwork` (adapter) / `./activeNetwork` (wallet).

- [ ] **Step 1: Point the adapter at the active network, in `frontend/src/lib/adapters/StellarAdapter.ts`**

Change the imports. Replace:
```tsx
import { HORIZON_URL } from '../config';
```
with:
```tsx
import { getActiveNetwork } from '../activeNetwork';
```
and replace:
```tsx
import { NETWORK_PASSPHRASE, txExplorerUrl } from '../config';
```
with:
```tsx
import { txExplorerUrl } from '../config';
```
Replace the static server field:
```tsx
  private server = new Horizon.Server(HORIZON_URL);
```
with a per-network cached getter (a fresh `Horizon.Server` bound to the active network, rebuilt only when the network changes):
```tsx
  private _server?: Horizon.Server;
  private _serverHorizon?: string;
  private get server(): Horizon.Server {
    const { horizonUrl } = getActiveNetwork();
    if (!this._server || this._serverHorizon !== horizonUrl) {
      this._server = new Horizon.Server(horizonUrl);
      this._serverHorizon = horizonUrl;
    }
    return this._server;
  }
```
Then replace every remaining `NETWORK_PASSPHRASE` reference in this file with `getActiveNetwork().passphrase` (there are uses in the send/build and submit paths). Read the file and update each occurrence.

- [ ] **Step 2: Sign against the active network, in `frontend/src/lib/wallet.ts`**

Replace the import:
```tsx
import { NETWORK_PASSPHRASE } from './config';
```
with:
```tsx
import { getActiveNetwork } from './activeNetwork';
```
In `signTransaction`, replace:
```tsx
    networkPassphrase: opts?.networkPassphrase ?? NETWORK_PASSPHRASE,
```
with:
```tsx
    networkPassphrase: opts?.networkPassphrase ?? getActiveNetwork().passphrase,
```
In `signMessage`, replace:
```tsx
    networkPassphrase: NETWORK_PASSPHRASE,
```
with:
```tsx
    networkPassphrase: getActiveNetwork().passphrase,
```

- [ ] **Step 3: Typecheck, verify, build, run tests**

Run:
```bash
cd frontend && npx tsc -b && npm run build && npm test
```
Expected: exit 0; tests still pass (existing adapter tests unaffected). Then confirm the adapter no longer references the removed constants:
```bash
grep -n "NETWORK_PASSPHRASE\|HORIZON_URL" frontend/src/lib/adapters/StellarAdapter.ts frontend/src/lib/wallet.ts || echo "clean"
```
Expected: `clean`.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/lib/adapters/StellarAdapter.ts frontend/src/lib/wallet.ts
git commit -m "feat(network): adapter and signing use the active network"
```

---

### Task 5: Network-aware explorer links + Convert assets; retire dead config exports

**Files:**
- Modify: `frontend/src/lib/config.ts`
- Modify: `frontend/src/pages/Convert.tsx`

**Interfaces:**
- Consumes: `getActiveNetwork` from `./activeNetwork` (config) / `../lib/activeNetwork` (Convert).

- [ ] **Step 1: Make explorer helpers network-aware and remove dead exports, in `frontend/src/lib/config.ts`**

Add the import at the top of the file:
```ts
import { getActiveNetwork } from './activeNetwork';
```
Replace the explorer section. The file currently has:
```ts
export const STELLAR_EXPERT = 'https://stellar.expert/explorer/testnet';
export const contractExplorerUrl = () => `${STELLAR_EXPERT}/contract/${CONTRACT_ID}`;
export const txExplorerUrl = (hash: string) => `${STELLAR_EXPERT}/tx/${hash}`;
```
with:
```ts
export const contractExplorerUrl = () =>
  `${getActiveNetwork().explorerBase}/contract/${CONTRACT_ID}`;
export const txExplorerUrl = (hash: string) =>
  `${getActiveNetwork().explorerBase}/tx/${hash}`;
```
Remove the now network-owned constants from `config.ts`: delete the `HORIZON_URL` export (line with `export const HORIZON_URL = ...`), delete the `NETWORK_PASSPHRASE` export, delete `USDC_TESTNET_ISSUER` and `KNOWN_ASSETS` (they move to the registry / are read from the active network). Keep `RPC_URL` (still used by the testnet escrow `contract.ts`), `CONTRACT_ID`, `TOKEN_ADDRESS`, `READ_SOURCE`, `TOKEN_SYMBOL`, `TOKEN_DECIMALS`, `PHP_PER_XLM`, `PHP_RATES`.

- [ ] **Step 2: Source Convert destinations from the active network, in `frontend/src/pages/Convert.tsx`**

Replace the import:
```tsx
import { KNOWN_ASSETS, txExplorerUrl } from '../lib/config';
```
with:
```tsx
import { txExplorerUrl } from '../lib/config';
import { useActiveNetwork } from '../lib/activeNetwork';
```
Inside the `Convert` component, add near the top of the component body (with the other hooks):
```tsx
  const net = useActiveNetwork();
```
Then replace the `KNOWN_ASSETS` usage:
```tsx
    () => (from ? mergeToAssets(KNOWN_ASSETS, balances, from.asset) : []),
```
with:
```tsx
    () => (from ? mergeToAssets(net.knownAssets, balances, from.asset) : []),
```
Add `net.knownAssets` to that `useMemo` dependency array (append `net.knownAssets` alongside the existing deps `from`, `balances`).

- [ ] **Step 3: Typecheck, verify no orphaned importers, build, test**

Run:
```bash
cd frontend && npx tsc -b && npm run build && npm test
```
Expected: exit 0, tests pass. Then confirm nothing still imports the removed names:
```bash
grep -rn "HORIZON_URL\|NETWORK_PASSPHRASE\|KNOWN_ASSETS\|USDC_TESTNET_ISSUER\|STELLAR_EXPERT" frontend/src || echo "clean"
```
Expected: `clean` (no matches). If `tsc` flagged an importer this grep will show it; fix that importer to use the active network before committing.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/lib/config.ts frontend/src/pages/Convert.tsx
git commit -m "feat(network): network-aware explorer links and Convert assets"
```

---

### Task 6: Gate the Pact layer off on non-testnet

**Files:**
- Modify: `frontend/src/pages/Send.tsx`
- Modify: `frontend/src/pages/Dashboard.tsx`

**Interfaces:**
- Consumes: `useActiveNetwork` from `../lib/activeNetwork`; the `supportsPacts` flag on `NetworkInfo`.

- [ ] **Step 1: Read the current protected-send entry point, in `frontend/src/pages/Send.tsx`**

Read `frontend/src/pages/Send.tsx` and locate the "Send protected" control (the button/option that routes into the protected/Pact flow, e.g. via `navigate('/create')` or a `mode` toggle). Note its exact JSX so Step 2 wraps it precisely.

- [ ] **Step 2: Disable "Send protected" off-testnet with a switch message, in `frontend/src/pages/Send.tsx`**

Add the import after the existing imports:
```tsx
import { useActiveNetwork } from '../lib/activeNetwork';
```
Add near the other hooks in the `Send` component:
```tsx
  const net = useActiveNetwork();
```
Wrap the "Send protected" control so that when `!net.supportsPacts` it renders a disabled state with copy instead of the active control. Use this exact disabled block in place of (immediately adjacent to) the protected control, gated on `net.supportsPacts`:
```tsx
  {net.supportsPacts ? (
    /* existing "Send protected" control goes here, unchanged */
    <SendProtectedControl />
  ) : (
    <div className="rounded-card border border-hairline bg-mist px-4 py-3 text-[13px] text-slate">
      Protected payments are on testnet for now. Switch your wallet to testnet to use them.
    </div>
  )}
```
Note to implementer: `<SendProtectedControl />` above is a stand-in for whatever the existing protected-send JSX is (button, card, or branch identified in Step 1) — keep that existing markup verbatim inside the `net.supportsPacts ?` branch; do not introduce a new component. "Send now" stays outside this conditional, always enabled.

- [ ] **Step 3: Show the disabled explanation on the Pacts screen off-testnet, in `frontend/src/pages/Dashboard.tsx`**

Read `frontend/src/pages/Dashboard.tsx`. Add the import after the existing imports:
```tsx
import { useActiveNetwork } from '../lib/activeNetwork';
```
Add at the very top of the `Dashboard` component body, before the existing hooks that read the contract (so the contract is never read off testnet):
```tsx
  const net = useActiveNetwork();
```
Immediately after the component's early `if (!address)` guard (if present) or at the start of the returned JSX, add an early return for the non-testnet case, before any hook that fetches agreements is used. If agreement-fetching hooks are called unconditionally above the return, move the `net.supportsPacts` gate to wrap only the rendered list/content (not the hooks) to preserve hook order, rendering this block when `!net.supportsPacts`:
```tsx
  if (!net.supportsPacts) {
    return (
      <div className="mx-auto max-w-app px-1 py-16 text-center">
        <h1 className="text-[22px] font-semibold tracking-tight text-ink">Pacts</h1>
        <p className="mt-2 text-[14px] text-slate">
          Protected payments are on testnet for now. Switch your wallet to testnet to view and create Pacts.
        </p>
      </div>
    );
  }
```
Note to implementer: React hook order must stay stable. If `Dashboard` calls agreement-fetching hooks unconditionally at the top, place this early return BELOW those hook calls but ABOVE the content render, and confirm the hooks tolerate not being on testnet (they fetch against the testnet contract; if the wallet is on mainnet the reads simply will not be shown). If in doubt, report as DONE_WITH_CONCERNS describing the hook layout.

- [ ] **Step 4: Typecheck, build, test**

Run:
```bash
cd frontend && npx tsc -b && npm run build && npm test
```
Expected: exit 0, tests pass.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/Send.tsx frontend/src/pages/Dashboard.tsx
git commit -m "feat(network): gate protected payments (Pacts) to testnet"
```

---

### Task 7: Final verification

**Files:** none (verification only).

- [ ] **Step 1: Full typecheck, build, and test suite**

Run:
```bash
cd frontend && npx tsc -b && npm run build && npm test
```
Expected: exit 0; all tests pass (includes the new `networks.test.ts` and `activeNetwork.test.ts`).

- [ ] **Step 2: Confirm no testnet constants leaked back**

Run:
```bash
grep -rn "HORIZON_URL\|NETWORK_PASSPHRASE\|KNOWN_ASSETS\|USDC_TESTNET_ISSUER\|STELLAR_EXPERT" frontend/src || echo "clean"
```
Expected: `clean`.

- [ ] **Step 3: Manual verification matrix (record results)**

With `npm run preview` on the built app, using a real wallet:
- **Testnet wallet:** header badge reads "testnet"; balances load; Send now / Receive / Convert work; "Send protected" and the Pacts screen work as before.
- **Mainnet wallet:** header badge reads "mainnet"; real mainnet balances load; Send now / Receive / Convert work against mainnet; "Send protected" shows the switch-to-testnet message; the Pacts screen shows the switch-to-testnet message; no console errors about a missing contract.
- **Unsupported network (e.g. futurenet):** the `NetworkGuard` warning bar appears; money actions are effectively blocked by the guard.
Record the outcome of each row. If a physical mainnet wallet is unavailable, note which rows were verified vs deferred.

---

## Self-Review

**Spec coverage:**
- §4.1 registry → Task 1. §4.2 active store → Task 2. §4.3 consumer refactors: main.tsx guard + badge + wiring → Task 3; StellarAdapter + wallet signing → Task 4; config explorer + Convert assets → Task 5. §4.4 Pact gating (Send + Dashboard) → Task 6. §6 edge cases: unsupported-network keep-last + guard → Tasks 2/3; signing-safety (active passphrase) → Task 4. §8 testing → Tasks 1, 2 (unit) + Task 7 (manual matrix). §9 guardrails: contract untouched (no task modifies `contract.ts`), confirmed USDC issuer (Global Constraints + Task 1), no em-dashes (copy in Tasks 3/6 checked). BottomTabs intentionally not modified — the Pacts tab stays clickable and the Dashboard screen shows the gated message (spec §4.4).

**Placeholder scan:** No TBD/TODO. The one stand-in (`<SendProtectedControl />` in Task 6 Step 2) is explicitly annotated as a pointer to the existing JSX identified in Step 1, with instructions to keep the existing markup verbatim — not an unwritten component. Every command has an expected result.

**Type consistency:** `NetworkInfo` fields (`key`, `label`, `passphrase`, `horizonUrl`, `rpcUrl`, `explorerBase`, `knownAssets`, `supportsPacts`) are used consistently across Tasks 1-6. `getActiveNetwork()`, `setActiveNetworkFromPassphrase()`, `isSupportedNetwork()`, `useActiveNetwork()` names match between definition (Task 2) and all consumers (Tasks 3-6). `networkForPassphrase` returns `NetworkInfo | null`, consumed as such in Task 2.
