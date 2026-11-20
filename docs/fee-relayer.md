# Fee relayer (tracker task #20)

PACTA pays the network fees, so users never need XLM. They may still hold and
send XLM; the app shows it as an optional asset.

## How it works

1. The app builds the transaction as usual and the wallet signs it. The user's
   account is the source.
2. The app posts the signed XDR to `POST /api/relay?action=submit`.
3. The relayer checks it against the allowlist, wraps it in a **fee bump** paid
   by the PACTA sponsor account, signs only the fee bump, and submits it through
   Soroban RPC. The inner transaction's fee is never charged, so a wallet with
   0 XLM works.
4. The app gets back the hash and, for contract calls, the return value. If
   the relayer will not or cannot pay (it is off, the allowance is used up, or
   the call is not sponsored), the app falls back to submitting the same signed
   transaction directly, which needs the user's own XLM. A transaction that
   reached the network and failed is never resubmitted.

Code: `api/relay.ts` and `api/_lib/relay/`; frontend `lib/relay.ts`, used by
`StellarAdapter.signAndSubmit` and `contract.ts` (behind the ChainAdapter seam).

## Reserves and storage rent

- **Sponsored activation** (`activate`, then `activate-submit`, wallet session
  required). For a wallet with no account, or no USDC trustline, the relayer
  builds `beginSponsoringFutureReserves -> createAccount(0 XLM) -> changeTrust(USDC)
  -> endSponsoringFutureReserves`, signs as the sponsor, and the wallet adds one
  signature. The sponsor pays the fee and locks the reserves (1 XLM for an
  account, 0.5 XLM for a trustline). Shown on Home as "Set up your wallet for
  free". Only a transaction carrying the sponsor's own signature, for the session
  wallet, is accepted back.
- **Storage rent** (`restore`). If a contract call's simulation says escrow
  storage was archived, the app asks the relayer to restore it. The relayer
  restores only the escrow's own storage and code and the USDC/XLM token
  contracts, and pays the rent itself.
- Normal contract calls already pay their rent and TTL extensions inside the
  resource fee, which the fee bump covers.

## Allowlist

Sponsored:
- escrow write calls: `create_agreement`, `post_bond`, `deposit_capital`,
  `release_milestone`, `complete`, `emergency_refund`, `cancel`, `reclaim_bond`;
  their authorization trees may only call those and the USDC/XLM `transfer`
- USDC transfers: a classic USDC payment, or the USDC contract's `transfer`
- wallet operations: XLM or USDC payments, XLM <-> USDC path payments, a USDC
  trustline

Refused, before any fee is spent:
- every other operation (setOptions, accountMerge, offers, manageData and so on)
- other assets and other contracts
- contract deployment or upload
- operations whose source is another account
- the sponsor as source
- a missing or invalid source signature
- an existing fee bump
- more than 5 operations
- validity over 15 minutes
- a resource fee over the per-transaction cap

## Limits (env, defaults)

| Setting | Default |
|---|---|
| `RELAYER_MAX_TX_FEE_XLM` (most for one transaction) | 1 |
| `RELAYER_WALLET_DAILY_CAP_XLM` (fees + reserves per wallet per UTC day) | 5 |
| `RELAYER_DAILY_CAP_XLM` (everyone per UTC day) | 100 |
| `RELAYER_WALLET_PER_HOUR` | 30 |
| `RELAYER_IP_PER_HOUR` | 120 |
| `RELAYER_ACTIVATIONS_PER_DAY` / `RELAYER_ACTIVATIONS_PER_IP_PER_DAY` | 50 / 3 |

How limits are enforced:
- **Counting:** caps include in-flight spending. A row is written as `pending`
  with the most the fee can be before submission, then settled with the fee
  actually charged. Reserves count until the activation fails.
- **Concurrency:** parallel requests can overshoot a cap by at most a few
  transactions.
- **Fail closed:** if the log cannot be read or written, nothing is sponsored.

## Logging

- **Database:** table `relay_tx` (migration `0005_fee_relayer.sql`) records
  wallet, kind, contract and function, operations, maximum fee, fee charged,
  reserves, inner and outer hash, status and error.
- **Platform logs:** a JSON line per event (`{"tag":"relay", ...}`).
- **PII:** addresses and hashes are public chain data. Only a keyed hash of the
  client IP is stored.

## Security

- **Sponsor secret:** `RELAYER_SECRET_KEY` lives only in the server
  environment. Without it, or with `RELAYER_DISABLED=true`, the relayer is off
  and the app falls back to user-paid fees.
- **What PACTA signs:** the sponsor signs only fee bumps and transactions it
  built itself (activations and restores). A user transaction never gets the
  sponsor's signature on an operation.
- **Network:** testnet only. A mainnet relayer needs a funded mainnet sponsor,
  a mainnet escrow id, real USDC and its own limits.
