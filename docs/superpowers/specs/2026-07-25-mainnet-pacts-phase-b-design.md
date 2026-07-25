# Mainnet Pacts (Phase B) — code-ready behind an enablement gate — design spec

**Date:** 2026-07-25
**Status:** Draft (design approved; proceed to plan)
**Scope:** Make protected payments (Pacts) able to run on Stellar **mainnet**, fully wired in
code but held behind a hard enablement gate that stays OFF until (1) the escrow contract is
security-audited and (2) deployed to mainnet by the project owner. Nothing goes live this cycle.

## 1. Goal

- The frontend/bindings/config can target a **mainnet** escrow contract and settle Pacts in
  **mainnet USDC**, once a mainnet contract ID and settlement SAC are configured.
- Until those are configured AND an explicit flag is on, mainnet Pacts stay **disabled** and the
  Phase A behavior is unchanged (mainnet = wallet-only; "Protected payments are on testnet for
  now" message).
- Enabling mainnet Pacts later is a **config/env change the owner makes** after the audit and
  deploy, not a code edit.

## 2. Hard gates that stay OUTSIDE this cycle (owner-owned, not implemented here)

- **Security audit** of the escrow contract before it holds real funds. The contract CODE is
  unchanged from the frozen testnet version; the audit covers that same code.
- **Mainnet deployment.** The owner deploys the same contract WASM to mainnet, signing with their
  own funded mainnet key. This tool never handles keys/seeds and does not deploy.
- **Real KYC** provider configuration for mainnet (the KYC gate already applies to commitment
  actions on any network; only provider/ops config differs).

## 3. Decisions (locked)

- Scope: **code-ready, gated OFF** (no deploy, no live real-money this cycle).
- Settlement asset on mainnet: **USDC** (via its mainnet Stellar SAC), sourced from env.
- Network selection: follow the connected wallet (unchanged from Phase A).
- Approach: **runtime env-gated enablement** (chosen over hardcoding a contract ID or a separate
  mainnet build).

## 4. The enablement gate

Mainnet Pacts are live only when ALL of the following hold; otherwise `MAINNET.supportsPacts` is
false and every Phase A gate (`Send` protected control, `Dashboard`, `/create` `/detail` `/trader`
routes, Profile reputation) continues to show the testnet-only state:

1. `VITE_MAINNET_PACTS_ENABLED === 'true'` (defaults false / unset)
2. `VITE_MAINNET_ESCROW_CONTRACT_ID` is a non-empty C-address (empty until deploy)
3. `VITE_MAINNET_SETTLEMENT_SAC` is a non-empty C-address (mainnet USDC SAC)

These are **public, non-secret** values (contract IDs and asset addresses are on-chain public), so
`VITE_`-prefixing (bundled into the client) is correct and intentional. A pure function computes
the result so it is unit-testable:

```
computeMainnetSupportsPacts(env): boolean
  = env.VITE_MAINNET_PACTS_ENABLED === 'true'
    && nonEmpty(env.VITE_MAINNET_ESCROW_CONTRACT_ID)
    && nonEmpty(env.VITE_MAINNET_SETTLEMENT_SAC)
```

`MAINNET.supportsPacts` (in the Phase A registry) becomes `computeMainnetSupportsPacts(import.meta.env)`
instead of the literal `false` (the helper lives in `networks.ts`). Testnet stays
`supportsPacts: true` unconditionally.

## 5. Architecture

### 5.1 Escrow config resolution — `frontend/src/lib/escrowConfig.ts` (new)
The escrow layer needs five per-network values: contract id, RPC url, network passphrase,
settlement token (the SAC passed as `token` to `create_agreement`), and a read source (funded
account for read simulation). A single resolver returns them for the active network, or `null`
when Pacts are unsupported/unconfigured:

```
interface EscrowConfig { contractId; rpcUrl; passphrase; settlementSac; readSource }
escrowConfigFor(net: NetworkInfo): EscrowConfig | null
```
- **testnet** → today's values: `CONTRACT_ID`, `TESTNET.rpcUrl`, `TESTNET.passphrase`,
  `TOKEN_ADDRESS` (testnet XLM SAC), `READ_SOURCE` (all from `config.ts`).
- **mainnet** → `VITE_MAINNET_ESCROW_CONTRACT_ID`, `MAINNET.rpcUrl`, `MAINNET.passphrase`,
  `VITE_MAINNET_SETTLEMENT_SAC`, `VITE_MAINNET_READ_SOURCE` (env). Returns `null` if the contract
  id / settlement SAC are unset (defense in depth: even with the flag on, missing config disables).
- returns `null` for any network with `!supportsPacts`.

### 5.2 `contract.ts` becomes network-parametrized
- `getContract(publicKey?)` builds the `pacta` `Client` from `escrowConfigFor(getActiveNetwork())`
  (contractId + rpcUrl + networkPassphrase) instead of the hardcoded `...networks.testnet` +
  `RPC_URL`. The `Client` already accepts a `contractId` override.
- `createAgreement` passes `escrowConfigFor(...).settlementSac` as the `token` (instead of the
  static `TOKEN_ADDRESS`).
- The `readSource` fallback uses the active network's `readSource`.
- Because every UI path that reaches `contract.ts` is already gated on `supportsPacts` (Phase A),
  `contract.ts` is still only ever called when Pacts are supported for the active network — testnet
  always, mainnet only when fully configured + enabled + deployed. If `escrowConfigFor` returns
  `null` (should be unreachable behind the gate), the read/write functions throw a clear error
  rather than silently targeting the wrong network.

### 5.3 Bindings (`packages/pacta`)
No hand-edit of generated bindings and **no mainnet contract id committed to code**. The mainnet
contract id flows in via env at runtime through `escrowConfigFor` and the `Client`'s `contractId`
override. `networks.testnet` in the bindings stays as-is.

### 5.4 Settlement/USDC on mainnet
Pacts settle in USDC; the recipient/provider needs a USDC trustline. The Convert/trustline helpers
already exist for USDC; the create-Pact flow surfaces a clear message if the counterparty lacks the
trustline (reuse existing trustline checks). The USDC mainnet **SAC** address (the contract form of
the asset) is env-provided and confirmed at deploy time; it is distinct from the USDC **issuer**
address used for classic balances (`GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN`).

### 5.5 Env (`.env.example` additions, all empty/false by default)
```
# --- Mainnet Pacts (Phase B) — OFF until audited + deployed. Public, non-secret. ---
VITE_MAINNET_PACTS_ENABLED=false
VITE_MAINNET_ESCROW_CONTRACT_ID=      # set after the audited mainnet deploy
VITE_MAINNET_SETTLEMENT_SAC=          # mainnet USDC SAC (contract id), confirm at deploy
VITE_MAINNET_READ_SOURCE=             # a funded mainnet account for read simulation
```

### 5.6 Docs (mandated first step)
- `PRD.md` §5/§16 and `CLAUDE.md`: reframe the "frozen, testnet-only, do not redeploy" guardrail
  to allow a mainnet deployment of the **same** WASM after audit, and document the enablement gate.
- `PRD.md` §8 (contract source/interface/tests) stays **byte-for-byte frozen** — the code does not
  change; Phase B only deploys the same code to a second network and points config at it.
- Add a short "How to enable mainnet Pacts" note (the env values to set, in order, after audit +
  deploy). Not a full deploy runbook (out of scope per the chosen option).

## 6. Data flow (once enabled, mainnet)

```
wallet on mainnet + env gate satisfied → MAINNET.supportsPacts = true
   → Send-protected / Dashboard / create-detail-trader routes ENABLED (Phase A gates open)
   → contract.ts → escrowConfigFor(MAINNET) → Client(mainnet contractId, mainnet RPC, public passphrase)
   → create_agreement(token = mainnet USDC SAC, ...)
   → signing uses the active (mainnet) passphrase (Phase A) → submit to mainnet
```
With the gate unsatisfied (default): identical to today — mainnet is wallet-only, Pacts testnet-only.

## 7. Edge cases

- **Flag on but contract id / SAC unset:** `escrowConfigFor` returns null and
  `computeMainnetSupportsPacts` is false → Pacts stay disabled. No half-configured live state.
- **Counterparty without USDC trustline (mainnet):** surface the existing trustline message; do not
  attempt the Pact.
- **Read simulation on mainnet with no connected wallet:** use `VITE_MAINNET_READ_SOURCE`; if unset,
  reads that need a source are skipped/disabled (they are only reached behind the gate anyway).
- **Testnet unchanged:** all testnet values and behavior are identical to today.

## 8. Files

New:
- `frontend/src/lib/escrowConfig.ts` (+ `escrowConfig.test.ts`)
- `computeMainnetSupportsPacts(env)` lives in `networks.ts` (co-located with the registry it feeds), covered by `networks.test.ts`

Modified:
- `frontend/src/lib/networks.ts` (`MAINNET.supportsPacts` computed from env)
- `frontend/src/lib/contract.ts` (network-parametrized client + token + read source)
- `frontend/src/lib/config.ts` (testnet escrow constants feed `escrowConfigFor`; unchanged values)
- `frontend/.env.example` and repo-root `.env.example` (new VITE_ entries)
- `PRD.md`, `CLAUDE.md` (guardrail reframe + enablement note; §8 untouched)

## 9. Testing

- `computeMainnetSupportsPacts`: false when any of the three env values is unset/false; true only
  when all set. (Pure, node-testable with fake env objects.)
- `escrowConfigFor`: testnet returns the known testnet values; mainnet returns env values when set,
  `null` when the contract id / SAC are missing or `!supportsPacts`.
- Default build (no env): `MAINNET.supportsPacts === false`; existing 62-test suite stays green;
  Phase A gating UI still shows on a simulated mainnet network.
- Manual (owner, post-deploy, on a throwaway mainnet contract or testnet-as-mainnet stand-in):
  the full create → bond → deposit → release path against the configured contract.

## 10. Guardrails

- No live real-money Pacts this cycle; default behavior identical to today.
- Contract code frozen (`PRD.md` §8 byte-for-byte); Phase B deploys the same WASM, does not modify
  it. This tool does not deploy and never handles keys.
- Mainnet contract id and USDC SAC are env-sourced, never hardcoded or guessed; both are public.
- KYC gating on commitment actions continues to apply when Pacts are enabled on mainnet.
- No em-dashes in UI copy. Amount conversions unchanged (×/÷ 1e7).
