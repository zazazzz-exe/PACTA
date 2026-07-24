# Mainnet support + network auto-detection (Phase A) — design spec

**Date:** 2026-07-25
**Status:** Draft (decisions auto-accepted by user; proceed to plan)
**Scope:** Make the wallet layer (portfolio, Send now, Receive, Convert, Activity) work on
whichever Stellar network the connected wallet is on (mainnet or testnet), by turning the
app's static testnet config into a network registry resolved from the wallet. The Pact /
escrow layer stays testnet-only and is gated off on mainnet with a clear message.

**Explicitly out of scope (Phase B, separate audit-gated project):** deploying an escrow
contract to mainnet and enabling protected payments (Pacts) on mainnet. This spec does NOT
touch, redeploy, or repoint the frozen testnet contract.

## 1. Goal

1. A user whose wallet (Freighter/xBull/etc.) is set to **mainnet** connects and sees their
   real mainnet balances, and can Send now / Receive / Convert on mainnet.
2. A user on **testnet** gets today's behavior unchanged, including full Pact features.
3. The app **auto-detects** the network from the connected wallet and follows it; if the
   wallet switches network, the app follows on the next connect/report.
4. On mainnet, protected-payment (Pact) features are **visible but disabled** with copy:
   "Protected payments are on testnet for now. Switch your wallet to testnet to use them."

## 2. Current state (why this is a refactor, not a toggle)

Every network value is a static constant in `frontend/src/lib/config.ts`, imported directly:
- `NETWORK_PASSPHRASE`, `HORIZON_URL`, `RPC_URL` — used by `StellarAdapter` (Horizon server +
  tx building/signing), `wallet.ts` (sign passphrase), `main.tsx` (`networkOk`).
- `KNOWN_ASSETS` / `USDC_TESTNET_ISSUER` — used by `Convert`.
- `STELLAR_EXPERT` explorer base — testnet path.
- `CONTRACT_ID`, `TOKEN_ADDRESS`, `READ_SOURCE` + `networks.testnet` — the escrow layer
  (`contract.ts`), testnet-only.

The wallet already reports its network (`getWalletNetworkPassphrase`), but the only consumer is
`NetworkGuard`, which warns "you're not on testnet." Phase A makes the network-varying values
resolve from the connected wallet instead of being testnet constants.

## 3. Decisions (locked)

- **Selection:** follow the connected wallet automatically. No manual override toggle.
- **Supported networks:** testnet (`Test SDF Network ; September 2015`) and mainnet /
  public (`Public Global Stellar Network ; September 2015`). Any other reported passphrase is
  "unsupported": the guard warns and money actions are blocked.
- **Pre-connect default:** testnet (the landing/header state before a wallet connects). The
  active network switches to the wallet's network on connect.
- **Pacts on mainnet:** visible but disabled with the switch-to-testnet message. Send now,
  Receive, Convert, Activity are fully enabled on mainnet.
- **Mainnet USDC issuer:** the canonical Circle USDC mainnet issuer address MUST be confirmed
  from official Circle/Stellar documentation during implementation before it ships (it moves
  real funds; it will not be guessed). Until confirmed, mainnet Convert offers XLM plus the
  user's already-held assets only.

## 4. Architecture

### 4.1 Network registry — `frontend/src/lib/networks.ts` (new, source of truth)
```
export type NetworkKey = 'testnet' | 'public';
export interface NetworkInfo {
  key: NetworkKey;
  label: string;            // 'testnet' | 'mainnet' (UI copy)
  passphrase: string;
  horizonUrl: string;
  rpcUrl: string;
  explorerBase: string;     // stellar.expert base, e.g. .../explorer/testnet | .../explorer/public
  knownAssets: { code: string; issuer?: string }[];
  supportsPacts: boolean;   // true only for testnet (escrow deployed there)
}
export const TESTNET: NetworkInfo;
export const MAINNET: NetworkInfo;
export const DEFAULT_NETWORK = TESTNET;         // pre-connect
export function networkForPassphrase(p: string | null): NetworkInfo | null; // null = unsupported
```
- `TESTNET` carries today's values (testnet Horizon/RPC, testnet USDC issuer, `supportsPacts:true`).
- `MAINNET` carries public Horizon (`https://horizon.stellar.org`), `explorer/public`, mainnet
  known assets (XLM + confirmed USDC), `supportsPacts:false`. Its `rpcUrl` is set to the public
  Soroban RPC for completeness but is **not exercised in Phase A**: only `contract.ts` (the
  escrow layer) uses RPC, and that layer is testnet-only and gated off on mainnet. The wallet
  layer (`StellarAdapter`) uses Horizon exclusively, so mainnet money actions never call RPC.

### 4.2 Active-network store — `frontend/src/lib/activeNetwork.ts` (new)
A tiny subscribable store (same pattern as `outbox.ts`):
```
export function getActiveNetwork(): NetworkInfo;               // defaults to DEFAULT_NETWORK
export function setActiveNetworkFromPassphrase(p: string | null): void;
export function useActiveNetwork(): NetworkInfo;               // React hook
export function isSupportedNetwork(p: string | null): boolean; // testnet or public
```
- `setActiveNetworkFromPassphrase` resolves via `networkForPassphrase`; a supported result
  becomes active. An unsupported/unknown passphrase leaves the active network at its last
  supported value (so consumers always have a valid network) but `isSupportedNetwork` returns
  false so the guard blocks actions.
- Set from `main.tsx` `WalletProvider` after connect and whenever the wallet's network is read.

### 4.3 Consumer refactors (read active network instead of constants)
- `StellarAdapter.ts`: the `Horizon.Server` and the tx-building/signing passphrase come from
  `getActiveNetwork()` (server cached per network key). All send/quote/swap/submit paths use
  the active network's Horizon + passphrase.
- `wallet.ts`: `signTransaction` / `signMessage` use the active network passphrase instead of
  the static `NETWORK_PASSPHRASE`.
- `Convert.tsx`: destination options come from `getActiveNetwork().knownAssets`.
- `config.ts` explorer helpers (`txExplorerUrl`, `contractExplorerUrl`): use
  `getActiveNetwork().explorerBase`. Escrow constants (`CONTRACT_ID`, `TOKEN_ADDRESS`,
  `READ_SOURCE`) stay in `config.ts` (testnet-only, consumed only by the gated Pact layer).
- `main.tsx`: `networkOk` becomes `network == null || isSupportedNetwork(network)`.
- `App.tsx` `NetworkBadge`: shows `getActiveNetwork().label` (live) instead of hardcoded
  "testnet".
- `NetworkGuard.tsx`: no longer warns on mainnet. Warns only when the wallet is on an
  unsupported network ("Unsupported network. Switch your wallet to Stellar mainnet or testnet.").

### 4.4 Pact gating — `supportsPacts`
A single source of truth: `getActiveNetwork().supportsPacts` (only testnet true). Applied at:
- **Send** (`Send.tsx`): the "Send protected" option is disabled off-testnet with the
  switch-to-testnet message; "Send now" always available.
- **Pacts tab / Dashboard** (`BottomTabs.tsx` / `Dashboard.tsx`): the tab is visible but its
  screen shows the disabled explanation off-testnet instead of reading the contract.
- The escrow read/write functions in `contract.ts` are never called off-testnet (the UI paths
  that call them are gated), so `contract.ts` itself stays testnet-pinned and unchanged.

## 5. Data flow

```
connect wallet → read wallet passphrase (getWalletNetworkPassphrase)
   → setActiveNetworkFromPassphrase(p)
       → supported? active = TESTNET|MAINNET ; unsupported? keep last + guard blocks
   → wallet layer (balances/send/receive/convert) uses getActiveNetwork() (Horizon/RPC/assets/passphrase/explorer)
   → supportsPacts?  testnet: Pact features enabled  |  mainnet: disabled + switch message
```

## 6. Edge cases

- **Wallet switches network mid-session:** the active network updates on the next connect or
  network read; balances refetch against the new network. (A live wallet-network change
  listener is out of scope; reconnect covers it.)
- **Unsupported network (futurenet/custom):** guard warns, money actions blocked, active
  network stays at last supported value so nothing crashes.
- **Signing safety:** the sign passphrase always equals the active (wallet-reported) network,
  so we never sign against a different network than the wallet is on.
- **Reads before connect:** default testnet; wallet-layer data requires a connected address
  anyway, so pre-connect network only affects the header badge and explorer links.

## 7. Files

New:
- `frontend/src/lib/networks.ts` (+ `networks.test.ts`)
- `frontend/src/lib/activeNetwork.ts` (+ `activeNetwork.test.ts`)

Modified:
- `frontend/src/lib/config.ts` (explorer helpers read active network; escrow constants stay)
- `frontend/src/lib/adapters/StellarAdapter.ts`
- `frontend/src/lib/wallet.ts`
- `frontend/src/pages/Convert.tsx`
- `frontend/src/pages/Send.tsx` (Pact gating)
- `frontend/src/pages/Dashboard.tsx` (Pact gating)
- `frontend/src/components/BottomTabs.tsx` (Pact-tab gating copy)
- `frontend/src/components/NetworkGuard.tsx`
- `frontend/src/App.tsx` (`NetworkBadge` live label)
- `frontend/src/main.tsx` (`networkOk` via `isSupportedNetwork`)

## 8. Testing

- `networks.test.ts`: `networkForPassphrase` maps the two known passphrases correctly, returns
  null for unknown; `supportsPacts` true only for testnet; registry values well-formed.
- `activeNetwork.test.ts`: default is testnet; `setActiveNetworkFromPassphrase` switches on a
  supported passphrase, keeps last on unsupported; `isSupportedNetwork` correct.
- Manual: connect a mainnet wallet → real balances load, Send now/Receive/Convert work,
  header badge reads "mainnet", Pact features disabled with the message; connect a testnet
  wallet → unchanged behavior incl. Pacts; unsupported network → guard warning.

## 9. Guardrails

- The frozen testnet escrow contract is not touched, redeployed, or repointed.
- No mainnet Pact contract, no contract calls off testnet.
- Real-money addresses (mainnet USDC issuer) are confirmed from official docs before shipping,
  never guessed.
- Amount conversions unchanged (×/÷ 1e7). No em-dashes in UI copy.
