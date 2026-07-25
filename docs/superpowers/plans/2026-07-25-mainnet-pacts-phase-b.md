# Mainnet Pacts (Phase B) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make protected payments (Pacts) able to run on Stellar mainnet (USDC settlement) fully in code, held behind a three-part env enablement gate that stays OFF until an audited mainnet deploy configures it.

**Architecture:** A pure gate function makes `MAINNET.supportsPacts` computed from env; a per-network `escrowConfig` resolver feeds `contract.ts` the right contract id / RPC / passphrase / settlement SAC / read source; testnet behavior is byte-for-byte unchanged. Nothing goes live: with no env set, mainnet `supportsPacts` is false and the app behaves exactly as today.

**Tech Stack:** Vite 6, React 18, TypeScript, `@stellar/stellar-sdk`, the `pacta` bindings, Vitest 2 (node env).

## Global Constraints

- Do NOT deploy anything, and never handle keys/seeds. This cycle produces code only; enabling is an owner action.
- Contract code is frozen: `PRD.md` §8 stays byte-for-byte unchanged. Phase B deploys the SAME WASM to mainnet later; it does not modify the contract.
- Mainnet contract id and USDC SAC are env-sourced, never hardcoded or guessed. Both are public, non-secret values.
- Enablement requires ALL of: `VITE_MAINNET_PACTS_ENABLED === 'true'`, non-empty `VITE_MAINNET_ESCROW_CONTRACT_ID`, non-empty `VITE_MAINNET_SETTLEMENT_SAC`.
- Default (no env) behavior must be identical to today: mainnet = wallet-only, Pacts testnet-only. The 62-test suite stays green.
- Testnet escrow values are unchanged: contract `CBLSIW2L5BV2KOM73EGXPZBO7DCVVW5TF2ROMYJZSZUTMSMGIFFEL3HL`, settlement `CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC` (testnet XLM SAC), read source `GCO474RPUM4AOF5T4JA55YIFJKP5B3743F6AXD5M65WBB4SNLFTL43PS`.
- No em-dashes in UI copy. Amount conversions unchanged (×/÷ 1e7). Tests live at `frontend/src/**/*.test.ts` (node env).

---

### Task 1: Mainnet enablement gate (`computeMainnetSupportsPacts`)

**Files:**
- Modify: `frontend/src/lib/networks.ts`
- Test: `frontend/src/lib/networks.test.ts`

**Interfaces:**
- Produces: `computeMainnetSupportsPacts(env: Record<string, unknown>): boolean`; `MAINNET.supportsPacts` now computed from `import.meta.env`.
- Consumed by: Task 2 (escrowConfig gates on `net.supportsPacts`).

- [ ] **Step 1: Write the failing tests**

Add to `frontend/src/lib/networks.test.ts` (append inside the file, importing `computeMainnetSupportsPacts`):
```ts
import { computeMainnetSupportsPacts } from './networks';

describe('computeMainnetSupportsPacts', () => {
  const full = {
    VITE_MAINNET_PACTS_ENABLED: 'true',
    VITE_MAINNET_ESCROW_CONTRACT_ID: 'CDMAINNETCONTRACTIDxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
    VITE_MAINNET_SETTLEMENT_SAC: 'CDUSDCSACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
  };
  it('true only when flag is true AND contract id AND settlement SAC are all set', () => {
    expect(computeMainnetSupportsPacts(full)).toBe(true);
  });
  it('false when the flag is not the string "true"', () => {
    expect(computeMainnetSupportsPacts({ ...full, VITE_MAINNET_PACTS_ENABLED: 'false' })).toBe(false);
    expect(computeMainnetSupportsPacts({ ...full, VITE_MAINNET_PACTS_ENABLED: undefined })).toBe(false);
  });
  it('false when the contract id is missing or empty', () => {
    expect(computeMainnetSupportsPacts({ ...full, VITE_MAINNET_ESCROW_CONTRACT_ID: '' })).toBe(false);
    expect(computeMainnetSupportsPacts({ ...full, VITE_MAINNET_ESCROW_CONTRACT_ID: undefined })).toBe(false);
  });
  it('false when the settlement SAC is missing or empty', () => {
    expect(computeMainnetSupportsPacts({ ...full, VITE_MAINNET_SETTLEMENT_SAC: '' })).toBe(false);
  });
  it('false for an empty env (default build)', () => {
    expect(computeMainnetSupportsPacts({})).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd frontend && npx vitest run src/lib/networks.test.ts`
Expected: FAIL — `computeMainnetSupportsPacts` is not exported.

- [ ] **Step 3: Implement the gate in `frontend/src/lib/networks.ts`**

Add this function (place it above the `MAINNET` declaration; it is hoisted, so `MAINNET` can call it):
```ts
// Mainnet Pacts (Phase B) are OFF unless the owner has, after an audit + mainnet
// deploy, set all three env values. All are public, non-secret (contract ids and
// asset SAC addresses are on-chain public), hence VITE_-prefixed.
export function computeMainnetSupportsPacts(env: Record<string, unknown>): boolean {
  const nonEmpty = (v: unknown): v is string => typeof v === 'string' && v.length > 0;
  return (
    env.VITE_MAINNET_PACTS_ENABLED === 'true' &&
    nonEmpty(env.VITE_MAINNET_ESCROW_CONTRACT_ID) &&
    nonEmpty(env.VITE_MAINNET_SETTLEMENT_SAC)
  );
}
```
Then change the `MAINNET` object's `supportsPacts` field from:
```ts
  supportsPacts: false,
```
to:
```ts
  supportsPacts: computeMainnetSupportsPacts(import.meta.env as Record<string, unknown>),
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd frontend && npx vitest run src/lib/networks.test.ts`
Expected: PASS. The existing `'testnet supports Pacts, mainnet does not'` assertion still holds because the test env has no `VITE_MAINNET_*` values, so `MAINNET.supportsPacts` is `false` by default.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/lib/networks.ts frontend/src/lib/networks.test.ts
git commit -m "feat(mainnet-pacts): env enablement gate for mainnet Pacts (default off)"
```

---

### Task 2: Per-network escrow config resolver (`escrowConfig.ts`)

**Files:**
- Create: `frontend/src/lib/escrowConfig.ts`
- Test: `frontend/src/lib/escrowConfig.test.ts`

**Interfaces:**
- Consumes: `NetworkInfo`, `TESTNET`, `MAINNET` from `./networks`; `CONTRACT_ID`, `TOKEN_ADDRESS`, `READ_SOURCE` from `./config`.
- Produces:
  - `interface EscrowConfig { contractId: string; rpcUrl: string; passphrase: string; settlementSac: string; readSource: string }`
  - `escrowConfigFor(net: NetworkInfo, env?: Record<string, unknown>): EscrowConfig | null`

- [ ] **Step 1: Write the failing tests**

Create `frontend/src/lib/escrowConfig.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { TESTNET, MAINNET } from './networks';
import { escrowConfigFor } from './escrowConfig';

const mainnetEnv = {
  VITE_MAINNET_PACTS_ENABLED: 'true',
  VITE_MAINNET_ESCROW_CONTRACT_ID: 'CDMAINNETCONTRACTID',
  VITE_MAINNET_SETTLEMENT_SAC: 'CDUSDCSAC',
  VITE_MAINNET_READ_SOURCE: 'GMAINNETREADSOURCE',
};

describe('escrowConfigFor', () => {
  it('returns the known testnet escrow values', () => {
    const cfg = escrowConfigFor(TESTNET, {});
    expect(cfg).not.toBeNull();
    expect(cfg!.contractId).toBe('CBLSIW2L5BV2KOM73EGXPZBO7DCVVW5TF2ROMYJZSZUTMSMGIFFEL3HL');
    expect(cfg!.passphrase).toBe('Test SDF Network ; September 2015');
    expect(cfg!.rpcUrl).toBe('https://soroban-testnet.stellar.org');
    expect(cfg!.settlementSac).toBe('CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC');
  });
  it('returns null for a mainnet network whose Pacts are not enabled/configured', () => {
    // MAINNET.supportsPacts is false by default (no env in the test build).
    expect(escrowConfigFor(MAINNET, {})).toBeNull();
  });
  it('returns env-sourced mainnet values when supportsPacts and env are set', () => {
    const enabledMainnet = { ...MAINNET, supportsPacts: true };
    const cfg = escrowConfigFor(enabledMainnet, mainnetEnv);
    expect(cfg).not.toBeNull();
    expect(cfg!.contractId).toBe('CDMAINNETCONTRACTID');
    expect(cfg!.settlementSac).toBe('CDUSDCSAC');
    expect(cfg!.passphrase).toBe('Public Global Stellar Network ; September 2015');
    expect(cfg!.readSource).toBe('GMAINNETREADSOURCE');
  });
  it('returns null on mainnet when supportsPacts is true but a required env value is missing', () => {
    const enabledMainnet = { ...MAINNET, supportsPacts: true };
    expect(escrowConfigFor(enabledMainnet, { ...mainnetEnv, VITE_MAINNET_ESCROW_CONTRACT_ID: '' })).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd frontend && npx vitest run src/lib/escrowConfig.test.ts`
Expected: FAIL — cannot find module `./escrowConfig`.

- [ ] **Step 3: Implement `frontend/src/lib/escrowConfig.ts`**

```ts
import { type NetworkInfo, TESTNET, MAINNET } from './networks';
import { CONTRACT_ID, TOKEN_ADDRESS, READ_SOURCE } from './config';

// Everything the escrow (Pact) layer needs to talk to the contract on the active
// network. Returns null when Pacts are not supported/configured for that network,
// so contract.ts never targets a non-existent contract.
export interface EscrowConfig {
  contractId: string;
  rpcUrl: string;
  passphrase: string;
  settlementSac: string; // token address passed to create_agreement
  readSource: string; // funded account for read simulation when disconnected
}

function str(v: unknown): string {
  return typeof v === 'string' ? v : '';
}

export function escrowConfigFor(
  net: NetworkInfo,
  env: Record<string, unknown> = import.meta.env as Record<string, unknown>,
): EscrowConfig | null {
  if (!net.supportsPacts) return null;

  if (net.key === 'testnet') {
    return {
      contractId: CONTRACT_ID,
      rpcUrl: TESTNET.rpcUrl,
      passphrase: TESTNET.passphrase,
      settlementSac: TOKEN_ADDRESS,
      readSource: READ_SOURCE,
    };
  }

  // net.key === 'public' (mainnet): all escrow values come from env.
  const contractId = str(env.VITE_MAINNET_ESCROW_CONTRACT_ID);
  const settlementSac = str(env.VITE_MAINNET_SETTLEMENT_SAC);
  if (!contractId || !settlementSac) return null; // defense in depth
  return {
    contractId,
    rpcUrl: MAINNET.rpcUrl,
    passphrase: MAINNET.passphrase,
    settlementSac,
    readSource: str(env.VITE_MAINNET_READ_SOURCE),
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd frontend && npx vitest run src/lib/escrowConfig.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/lib/escrowConfig.ts frontend/src/lib/escrowConfig.test.ts
git commit -m "feat(mainnet-pacts): per-network escrow config resolver"
```

---

### Task 3: Point `contract.ts` at the active network's escrow config

**Files:**
- Modify: `frontend/src/lib/contract.ts`
- Modify: `frontend/src/lib/config.ts` (remove now-unused `RPC_URL`)

**Interfaces:**
- Consumes: `escrowConfigFor` from `./escrowConfig`, `getActiveNetwork` from `./activeNetwork`.

- [ ] **Step 1: Rewrite the client construction in `frontend/src/lib/contract.ts`**

Replace the top of the file. Current:
```ts
import { Client, networks, type Agreement, type Reputation } from 'pacta';
import { RPC_URL, TOKEN_ADDRESS, READ_SOURCE } from './config';
import { signTransaction } from './wallet';

export { Status } from 'pacta';
export type { Agreement, Reputation };

// Reads still need an existing, funded source account to simulate against. When
// nobody is connected, fall back to a known funded account (READ_SOURCE); a
// random unfunded key fails RPC simulation with "Account not found".
const readSource = (publicKey?: string) => publicKey ?? READ_SOURCE;

export function getContract(publicKey?: string) {
  return new Client({
    ...networks.testnet,
    rpcUrl: RPC_URL,
    publicKey: readSource(publicKey),
    signTransaction,
  });
}
```
New:
```ts
import { Client, type Agreement, type Reputation } from 'pacta';
import { signTransaction } from './wallet';
import { getActiveNetwork } from './activeNetwork';
import { escrowConfigFor } from './escrowConfig';

export { Status } from 'pacta';
export type { Agreement, Reputation };

// Resolve the escrow config for the network the wallet is on. Every UI path that
// reaches this module is gated on supportsPacts, so a null here should be
// unreachable; throw a clear message rather than silently target the wrong chain.
function activeEscrow() {
  const cfg = escrowConfigFor(getActiveNetwork());
  if (!cfg) throw new Error('Protected payments are not available on this network.');
  return cfg;
}

export function getContract(publicKey?: string) {
  const { contractId, rpcUrl, passphrase, readSource } = activeEscrow();
  return new Client({
    contractId,
    networkPassphrase: passphrase,
    rpcUrl,
    publicKey: publicKey ?? readSource,
    signTransaction,
  });
}
```

- [ ] **Step 2: Use the active settlement SAC as the create_agreement token, in `frontend/src/lib/contract.ts`**

In `createAgreement`, the call currently passes `token: TOKEN_ADDRESS`. Replace that single property:
```ts
    token: TOKEN_ADDRESS,
```
with:
```ts
    token: activeEscrow().settlementSac,
```

- [ ] **Step 3: Remove the now-unused `RPC_URL` from `frontend/src/lib/config.ts`**

Delete the `export const RPC_URL = 'https://soroban-testnet.stellar.org';` line (its value now lives in `TESTNET.rpcUrl`, consumed via `escrowConfig`). Keep `CONTRACT_ID`, `TOKEN_ADDRESS`, `READ_SOURCE` (now consumed by `escrowConfig`) and everything else.

- [ ] **Step 4: Typecheck, build, test, and confirm testnet behavior is unchanged**

Run:
```bash
cd frontend && npx tsc -b && npm run build && npm test
```
Expected: exit 0; 62/62 (testnet escrow path is unchanged because `escrowConfigFor(TESTNET)` returns the same contract id / rpc / passphrase / token / read source). Then confirm nothing else imported the removed constant:
```bash
grep -rn "RPC_URL" frontend/src || echo "clean"
```
Expected: `clean`.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/lib/contract.ts frontend/src/lib/config.ts
git commit -m "feat(mainnet-pacts): network-parametrized escrow client and settlement token"
```

---

### Task 4: Env template + governance docs

**Files:**
- Modify: `frontend/.env.example` (create if absent)
- Modify: `.env.example` (repo root)
- Modify: `CLAUDE.md`
- Modify: `PRD.md`

**Interfaces:** none (config + docs).

- [ ] **Step 1: Add the mainnet-Pacts env block to `frontend/.env.example`**

If `frontend/.env.example` does not exist, create it. Append this block (verbatim):
```
# --- Mainnet Pacts (Phase B) --------------------------------------------------
# OFF until the escrow contract is security-audited AND deployed to mainnet by
# the project owner. All three must be set for mainnet Pacts to enable. These are
# PUBLIC, non-secret values (on-chain contract ids / asset SAC addresses), so
# VITE_-prefixing (bundled into the client) is intentional.
VITE_MAINNET_PACTS_ENABLED=false
VITE_MAINNET_ESCROW_CONTRACT_ID=      # set after the audited mainnet deploy
VITE_MAINNET_SETTLEMENT_SAC=          # mainnet USDC SAC (contract id), confirm at deploy
VITE_MAINNET_READ_SOURCE=             # a funded mainnet account for read simulation
```

- [ ] **Step 2: Mirror the note in the repo-root `.env.example`**

Append the same block to `.env.example` at the repo root, under a short header line `# The VITE_ values below are read by the frontend build (see frontend/.env.example).` so the root template documents them too.

- [ ] **Step 3: Amend the CLAUDE.md contract guardrail**

In `CLAUDE.md`, find the guardrail line (in the "Guardrails" section):
```
- **Do not touch the contract.** `PRD.md` §8 is frozen and already deployed.
```
Replace it with:
```
- **Do not touch the contract.** `PRD.md` §8 is frozen and already deployed. Phase B may deploy the SAME WASM to mainnet after a security audit; that is an owner-run, key-signed deploy, gated OFF by default via env (`VITE_MAINNET_PACTS_ENABLED` + mainnet contract id + settlement SAC). Do not modify the contract source or deploy from this tool.
```

- [ ] **Step 4: Add a Phase B note to PRD.md**

Read `PRD.md` and locate section §16 (the build-order / roadmap section). Immediately after that section's heading, add this note (verbatim):
```
> **Phase B — Mainnet Pacts (code-ready, gated off).** The wallet layer runs on mainnet or testnet (Phase A). Protected payments (Pacts) are wired for mainnet USDC settlement but held behind a three-part env gate (`VITE_MAINNET_PACTS_ENABLED` + `VITE_MAINNET_ESCROW_CONTRACT_ID` + `VITE_MAINNET_SETTLEMENT_SAC`) and stay OFF until the escrow contract is security-audited and the owner deploys the same (frozen, §8) WASM to mainnet. Design: `docs/superpowers/specs/2026-07-25-mainnet-pacts-phase-b-design.md`. §8 remains byte-for-byte frozen; Phase B changes no contract code.
```
Do not modify `PRD.md` §8 or any other section.

- [ ] **Step 5: Verify docs build and nothing broke**

Run:
```bash
cd frontend && npx tsc -b && npm test
```
Expected: exit 0, 62/62 (docs/env changes do not affect code). Confirm the env files contain the new keys:
```bash
grep -c "VITE_MAINNET_PACTS_ENABLED" frontend/.env.example .env.example
```
Expected: each path reports `1`.

- [ ] **Step 6: Commit**

```bash
git add frontend/.env.example .env.example CLAUDE.md PRD.md
git commit -m "docs(mainnet-pacts): env template + Phase B guardrail/roadmap notes"
```

---

### Task 5: Final verification (gate-off default)

**Files:** none (verification only).

- [ ] **Step 1: Full typecheck, build, test**

Run:
```bash
cd frontend && npx tsc -b && npm run build && npm test
```
Expected: exit 0; all tests pass (includes the new gate + escrowConfig tests).

- [ ] **Step 2: Confirm the default build keeps mainnet Pacts OFF**

Confirm `MAINNET.supportsPacts` is env-computed (so a default build with no env is false):
```bash
cd frontend && grep -n "supportsPacts: computeMainnetSupportsPacts(import.meta.env" src/lib/networks.ts && echo "MAINNET.supportsPacts is env-computed (false by default)"
```
Expected: the grep matches the computed `MAINNET.supportsPacts` line and prints the confirmation. The actual false-by-default result is exercised by `networks.test.ts` (asserts false for an empty env), which ran green in Step 1.

- [ ] **Step 3: Confirm no hardcoded mainnet contract id / SAC leaked into code**

Run:
```bash
grep -rn "VITE_MAINNET_ESCROW_CONTRACT_ID\|VITE_MAINNET_SETTLEMENT_SAC" frontend/src && echo "env-only, good"
```
Expected: matches appear ONLY in `networks.ts` and `escrowConfig.ts` (reading env), never a literal C-address for mainnet. Manually confirm no 56-char mainnet contract id constant exists in the diff.

- [ ] **Step 4: Manual (owner, post-deploy) note**

Record that live verification requires the owner, after audit + mainnet deploy, to set the three env values and run the create → bond → deposit → release path against the configured mainnet contract. Not performed this cycle.

---

## Self-Review

**Spec coverage:**
- §4 enablement gate → Task 1. §5.1 escrowConfig resolver → Task 2. §5.2 contract.ts parametrized → Task 3. §5.3 no mainnet id in bindings/code → Tasks 2/3 (env-sourced) + Task 5 Step 3. §5.4 USDC settlement via env SAC → Tasks 2/3. §5.5 env template → Task 4 Steps 1-2. §5.6 docs (CLAUDE.md + PRD, §8 untouched) → Task 4 Steps 3-4. §9 testing → Tasks 1, 2 (unit) + Task 5. §10 guardrails: no deploy/keys (whole plan is code-only), §8 frozen (no task edits it), env-sourced public values (Tasks 2/4), default-off behavior (Task 5 Steps 1-2).

**Placeholder scan:** No TBD/TODO. Env values are intentionally empty/false by design (documented), not placeholders. Every code step has full code; every command has an expected result. Task 4 Steps 3-4 give exact find/replace + additive text.

**Type consistency:** `computeMainnetSupportsPacts(env: Record<string, unknown>): boolean` (Task 1) is consumed by `MAINNET.supportsPacts` (Task 1) and mirrored by `escrowConfigFor`'s `env` param (Task 2). `EscrowConfig` fields (`contractId`, `rpcUrl`, `passphrase`, `settlementSac`, `readSource`) defined in Task 2 are consumed with those exact names in Task 3 (`getContract`, `createAgreement`). `escrowConfigFor(net, env?)` signature matches between definition (Task 2) and use (Task 3, one-arg form defaulting to `import.meta.env`).
