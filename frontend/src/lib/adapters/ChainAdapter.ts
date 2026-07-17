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
