# ChainAdapter — the wallet layer's one seam

> **Status:** design contract for Phase 1 (see `PRD.md` §5.1, §7.2). Frozen enough to build against; extend it only by updating this file first.

## Why this exists

PACTA's wallet layer (Wallet Home, Send, Receive, Convert, Activity) must not depend on `@stellar/stellar-sdk`, Horizon, or the generated escrow bindings directly. Every one of those surfaces talks to a single interface, **`ChainAdapter`**. There is exactly one implementation this cycle, `StellarAdapter`. The multi-chain vision (Stellar + EVM, a later sub-project) becomes an `EvmAdapter` that satisfies the same interface, so no screen changes when it lands. This one seam is the entire cost of "architect for later"; keep it thin and honest.

**Non-goals.** The adapter is not a wallet, not custody, and not a new on-chain protocol. It reads balances the user already owns and submits transactions the user signs. It never holds keys or funds.

## What the adapter does and does not own

| Concern | Through the adapter? | Notes |
|---|---|---|
| Read balances / trustlines | **Yes** | `getBalances` |
| Plain payment ("Send now") | **Yes** | `send` |
| Convert quote + swap | **Yes** | `getQuote`, `swap` |
| Sign + submit any tx | **Yes** | `signAndSubmit` (shared by all write paths) |
| **Send protected (a Pact)** | **No** | Calls the frozen escrow via the existing generated bindings (`lib/contract.ts`). The Pact path is deliberately outside the adapter so the escrow stays untouched. |
| KYC / Risk Lens | No | Same-origin `/api/*` calls, unrelated to the chain adapter. |

## The interface

TypeScript shape (illustrative; the implementer confirms exact bindings/SDK signatures during Phase 1):

```ts
// frontend/src/lib/adapters/ChainAdapter.ts

export interface AssetId {
  code: string;            // "XLM", "USDC", "EURC", ...
  issuer?: string;         // undefined for native XLM; contract/issuer for others
}

export interface AssetBalance {
  asset: AssetId;
  amount: string;          // human amount as a decimal string ("12.5000000")
  baseUnits: bigint;       // raw 7-decimal base units
  displayValue?: number;   // value in the user's display currency (computed in code, never by the model)
}

export interface ActivityItem {
  id: string;
  kind: 'sent' | 'received';
  counterparty: string;
  assetCode: string;
  amount: string;          // human decimal string as Horizon returns it
  createdAt: string;       // ISO timestamp
  hash: string;            // transaction hash
}

export interface Quote {
  from: AssetId;
  to: AssetId;
  amountIn: string;        // human
  amountOut: string;       // human, estimated
  minReceived: string;     // human, after slippage tolerance
  path: AssetId[];         // path-payment hops (may be empty for a direct pair)
  raw: unknown;            // adapter-specific payload passed back into swap()
  sender?: string;         // account performing the swap; the caller sets this before swap()
}

export interface TxResult {
  hash: string;
  explorerUrl: string;     // deep link (Stellar Expert for StellarAdapter)
  status: 'success' | 'pending';
}

export interface SendParams {
  from: string;             // sender address (source account); needed to build the tx
  to: string;               // recipient address
  asset: AssetId;
  amount: string;           // human
}

export interface QuoteParams {
  from: AssetId;
  to: AssetId;
  amount: string;          // human, interpreted as amount-in (strict-send)
  slippageBps?: number;    // default a sane constant, e.g. 50 (0.5%)
}

export interface ChainAdapter {
  readonly chainId: string;              // "stellar:testnet"
  getBalances(address: string): Promise<AssetBalance[]>;
  getActivity(address: string, limit?: number): Promise<ActivityItem[]>;
  send(params: SendParams): Promise<TxResult>;
  getQuote(params: QuoteParams): Promise<Quote>;
  swap(quote: Quote): Promise<TxResult>;
  signAndSubmit(xdrOrTx: string): Promise<TxResult>;
}
```

### Method contracts

- **`getBalances(address)`** — returns every asset the account holds, including native XLM and each trustline, with both a human `amount` and raw `baseUnits`. `displayValue` is filled from a deterministic price lookup (`lib/prices.ts`); if a price is unknown, leave it `undefined` and the UI shows the asset amount only. Never invent a value.
- **`getActivity(address, limit?)`** — returns the account's recent payment history (sent/received, newest first), mapped to a chain-agnostic `ActivityItem`. `StellarAdapter` reads Horizon's `payments().forAccount()` endpoint; the Soroban escrow has no history method, so protected-payment steps appear only as their underlying payments.
- **`send(params)`** — builds a Stellar payment (or path-payment for a cross-asset direct send) and routes through `signAndSubmit`. This is the "Send now" path only. Takes `{ from, to, asset, amount }`, where `from` is the connected sender's address (the source account whose sequence number the tx uses).
- **`getQuote(params)`** — strict-send path finding for Convert. Returns `minReceived` after `slippageBps`. If no path exists, throw a typed `NoRouteError` the UI can render as "no route for this pair".
- **`swap(quote)`** — submits the path-payment described by `quote.raw`, through `signAndSubmit`. Re-quote if the quote is stale. The caller sets `quote.sender` (the source account) before calling `swap`; `getQuote` leaves it undefined because path finding does not need an account.
- **`signAndSubmit(xdr)`** — the single signing chokepoint: hands the XDR to Stellar Wallets Kit for the user's signature, submits to RPC, and returns the hash + explorer URL. Every write path (send, swap) funnels here so confirmation UX and error mapping live in one place.

## StellarAdapter (the only implementation this cycle)

- **Balances:** read the account from Horizon / RPC via `@stellar/stellar-sdk`.
- **Send:** `Operation.payment` (native or issued asset), or `pathPaymentStrictSend` when sending across assets in one step.
- **Convert:** `getQuote` via strict-send path finding; `swap` via `pathPaymentStrictSend` with `destMin = minReceived`.
- **Signing:** reuse `lib/wallet.ts` (Stellar Wallets Kit) exactly as the escrow path already does; do not fork signing logic.
- **Explorer:** Stellar Expert testnet links.

Everything above uses assets the user already holds and transactions the user signs. No custody is introduced.

## EvmAdapter (later sub-project, NOT this cycle)

Named here only to prove the seam is enough. A future `EvmAdapter` implements the same interface over an EVM chain: `getBalances` via an RPC/indexer, `send` via an ERC-20/native transfer, `getQuote`/`swap` via a DEX or cross-chain aggregator, `signAndSubmit` via an EVM wallet connector. Wallet surfaces stay unchanged because they only know `ChainAdapter`. The Soroban escrow remains Stellar-only regardless, so "Send protected" is only offered when the active adapter is Stellar.

## Rules for anyone building on this

1. Wallet surfaces import the `ChainAdapter` interface, never `@stellar/stellar-sdk` or Horizon directly.
2. The protected-send path is the one sanctioned exception: it calls `lib/contract.ts` (the frozen escrow bindings), not the adapter.
3. Display values and quotes are computed in code from live reads. The AI touches only Risk Lens text.
4. Amounts cross the boundary as human strings for display and `bigint` base units for on-chain calls (×/÷ 1e7 for 7-decimal assets).
5. Extending the interface means updating this file first, then the implementations.
