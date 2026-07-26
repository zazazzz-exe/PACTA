# PACTA Mainnet Runbook

Step-by-step to take PACTA from testnet to Stellar mainnet. Everything here is an
**owner action**: it needs your funded mainnet key and spends real XLM. Claude
does not run these steps and never handles keys or seeds.

> **Do not proceed past Step 0 until the independent security audit is complete.**
> The escrow contract custodies real funds. See `docs/PRE_AUDIT_REVIEW.md` for the
> internal review and the open findings that must be resolved or explicitly accepted first.

---

## Step 0 — Gate: security audit (blocker)

- [ ] Independent Soroban security audit of `contracts/pacta-escrow` complete.
- [ ] Findings from the audit (and from `docs/PRE_AUDIT_REVIEW.md`) are either fixed
      or explicitly accepted by the owner in writing.
- [ ] Decision recorded: the contract is FROZEN (`PRD.md` §8) and already deployed to
      testnet. If the audit requires a code change, that reopens the freeze — update
      `PRD.md` §8, rebuild, regenerate bindings, and re-audit before mainnet.

## Step 1 — Prerequisites (local, one time)

- [ ] `stellar` CLI v26+ installed (`stellar version`).
- [ ] Rust wasm target: `rustup target add wasm32v1-none`.
- [ ] Run from **bash** (WSL on Windows), not PowerShell — the deploy script is bash.

## Step 2 — Fund a mainnet account (real XLM)

- [ ] Acquire a mainnet Stellar account funded with real XLM (enough for the deploy +
      a buffer; there is no friendbot on mainnet).
- [ ] Import it as a CLI identity:
      `stellar keys add pacta_mainnet --secret-key`  (paste your funded `S...` key).
- [ ] **Never** paste that secret key anywhere else, and never into a chat.

## Step 3 — Choose the settlement asset

The contract is token-agnostic and PACTA supports **both XLM and USDC** on mainnet
(the per-asset SAC is chosen at Pact-create time; see `frontend/src/lib/tokenSac.ts`).
`VITE_MAINNET_SETTLEMENT_SAC` is only the *default* when a Pact does not specify a token.

- [ ] Confirm the default settlement asset. The deploy script defaults it to Circle
      **USDC** (`USDC:GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN`). To
      default to native XLM instead, set `USDC_ASSET` accordingly before running, or
      override `VITE_MAINNET_SETTLEMENT_SAC` in Step 5.

## Step 4 — Deploy (spends real XLM, key-signed)

- [ ] Run from the repo root:
      `DEPLOYER=pacta_mainnet bash scripts/deploy-mainnet.sh`
- [ ] Type `DEPLOY MAINNET` at the confirmation prompt.
- [ ] The script builds, runs the contract test gate, deploys, and prints four values.
      **Copy them.**

## Step 5 — Configure Vercel (Production) and redeploy

Set these in Vercel > Project Settings > Environment Variables, **Production** scope.
All are public, non-secret config.

- [ ] `VITE_MAINNET_PACTS_ENABLED = true`
- [ ] `VITE_MAINNET_ESCROW_CONTRACT_ID = <from deploy output>`
- [ ] `VITE_MAINNET_SETTLEMENT_SAC = <from deploy output>`
- [ ] `VITE_MAINNET_READ_SOURCE = <from deploy output>` (the deployer/admin address)
- [ ] `VITE_MAINNET_RPC_URL = <your provider mainnet Soroban RPC>` — **required for real
      traffic.** The deploy script does not print this. Left unset, the app falls back to
      a community endpoint (`mainnet.sorobanrpc.com`) that is fine for a first look only,
      not for production.
- [ ] Redeploy the site (env changes need a fresh build; `VITE_` values are baked in).

All four of `PACTS_ENABLED=true`, `ESCROW_CONTRACT_ID`, `SETTLEMENT_SAC`, `READ_SOURCE`
must be present or the mainnet Pacts gate stays OFF by design (see
`computeMainnetSupportsPacts` in `frontend/src/lib/networks.ts`).

## Step 6 — Verify on mainnet

- [ ] Confirm the contract on Stellar Expert (public):
      `https://stellar.expert/explorer/public/contract/<CONTRACT_ID>`
- [ ] In the live app on a **mainnet** wallet: header badge reads "mainnet"; real
      balances load; Send now / Receive / Convert work.
- [ ] "Send protected" is now enabled on mainnet. Run one small real cycle end to end:
      create → post bond → deposit → release milestone(s) → complete. Verify balances
      move as expected and the proof panel / explorer links resolve on the public network.
- [ ] Sanity-check the deadline: a real Pact must NOT default to the 1-minute demo
      value (it defaults to 1 week on mainnet; the 1-minute preset is testnet-only).

## Rollback / kill switch

To disable mainnet Pacts without redeploying the contract: set
`VITE_MAINNET_PACTS_ENABLED = false` in Vercel Production and redeploy. The wallet
layer (portfolio, Send now, Receive, Convert) keeps working on mainnet; only the
protected-payment (Pact) surfaces go back to the "not available" state.
