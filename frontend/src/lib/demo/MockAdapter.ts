// A ChainAdapter that simulates the wallet against the demo store. No SDK import
// (keeps the adapter-seam invariant). Small delays + fake tx hashes make it feel
// real. Only used when isDemo() is true.
import {
  type ChainAdapter,
  type AssetBalance,
  type SendParams,
  type QuoteParams,
  type Quote,
  type TxResult,
  baseUnitsToHuman,
  humanToBaseUnits,
} from '../adapters/ChainAdapter';
import type { ActivityItem } from '../activity';
import { txExplorerUrl, PHP_RATES } from '../config';
import {
  demoBalances,
  demoActivity,
  demoFakeHash,
  demoRecordSend,
  demoRecordSwap,
} from './store';

const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export class MockAdapter implements ChainAdapter {
  readonly chainId = 'stellar:testnet';

  async getBalances(): Promise<AssetBalance[]> {
    await delay(280);
    return demoBalances();
  }

  async getActivity(): Promise<ActivityItem[]> {
    await delay(280);
    return demoActivity();
  }

  async send({ to, asset, amount }: SendParams): Promise<TxResult> {
    await delay(900);
    const hash = demoFakeHash();
    demoRecordSend(asset.code, asset.issuer, amount, to, hash, new Date().toISOString());
    return { hash, explorerUrl: txExplorerUrl(hash), status: 'success' };
  }

  async getQuote({ from, to, amount, slippageBps }: QuoteParams): Promise<Quote> {
    await delay(450);
    // Rate derived from the static PHP anchors, so XLM<->USDC looks sensible.
    const rate = (PHP_RATES[from.code] ?? 1) / (PHP_RATES[to.code] ?? 1);
    const outBase = (humanToBaseUnits(amount) * BigInt(Math.round(rate * 1e7))) / 10_000_000n;
    const bps = slippageBps ?? 50;
    const minBase = (outBase * BigInt(10_000 - bps)) / 10_000n;
    return {
      from,
      to,
      amountIn: amount,
      amountOut: baseUnitsToHuman(outBase),
      minReceived: baseUnitsToHuman(minBase),
      path: [],
      raw: null,
    };
  }

  async swap(quote: Quote): Promise<TxResult> {
    await delay(900);
    const hash = demoFakeHash();
    demoRecordSwap(quote.from, quote.to, quote.amountIn, quote.amountOut, hash, new Date().toISOString());
    return { hash, explorerUrl: txExplorerUrl(hash), status: 'success' };
  }

  async signAndSubmit(): Promise<TxResult> {
    await delay(600);
    const hash = demoFakeHash();
    return { hash, explorerUrl: txExplorerUrl(hash), status: 'success' };
  }
}
