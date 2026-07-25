import {
  Horizon,
  TransactionBuilder,
  Operation,
  BASE_FEE,
  Asset,
  Account,
  Transaction,
} from '@stellar/stellar-sdk';
import { getActiveNetwork } from '../activeNetwork';
import { withDisplayValues } from '../prices';
import {
  type ChainAdapter,
  type AssetBalance,
  type SendParams,
  type QuoteParams,
  type Quote,
  type TxResult,
  parseBalances,
  type RawBalanceLine,
  NoRouteError,
  humanToBaseUnits,
} from './ChainAdapter';
import { assetFromId } from './stellarAssets';
import { parseActivity, type RawPaymentRecord, type ActivityItem } from '../activity';
import { signTransaction } from '../wallet';
import { txExplorerUrl } from '../config';
import { buildQuote, hasTrustline, DEFAULT_SLIPPAGE_BPS, type PathRecord } from '../convert';

export class StellarAdapter implements ChainAdapter {
  get chainId(): string {
    return `stellar:${getActiveNetwork().key === 'public' ? 'mainnet' : 'testnet'}`;
  }
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

  async getBalances(address: string): Promise<AssetBalance[]> {
    try {
      const account = await this.server.loadAccount(address);
      // Horizon balance lines match RawBalanceLine's shape (asset_type/balance/
      // asset_code/asset_issuer). Cast to the decoupled input type for parsing.
      const parsed = parseBalances(account.balances as unknown as RawBalanceLine[]);
      return withDisplayValues(parsed);
    } catch (e: unknown) {
      // A brand-new, unfunded account has no Horizon entry yet: show an empty
      // portfolio rather than an error.
      if (e && typeof e === 'object' && 'response' in e) {
        const status = (e as { response?: { status?: number } }).response?.status;
        if (status === 404) return [];
      }
      throw e;
    }
  }

  async getActivity(address: string, limit = 20): Promise<ActivityItem[]> {
    try {
      const page = await this.server
        .payments()
        .forAccount(address)
        .order('desc')
        .limit(limit)
        .call();
      return parseActivity(page.records as unknown as RawPaymentRecord[], address);
    } catch (e: unknown) {
      // Unfunded/brand-new account has no history yet.
      if (e && typeof e === 'object' && 'response' in e) {
        const status = (e as { response?: { status?: number } }).response?.status;
        if (status === 404) return [];
      }
      throw e;
    }
  }

  async send({ from, to, asset, amount }: SendParams): Promise<TxResult> {
    // Load the sender account for its current sequence number, build a single
    // payment operation, then hand the XDR to the shared signing chokepoint.
    const account = await this.server.loadAccount(from);
    const tx = new TransactionBuilder(account, {
      fee: BASE_FEE,
      networkPassphrase: getActiveNetwork().passphrase,
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

  async getQuote({ from, to, amount, slippageBps }: QuoteParams): Promise<Quote> {
    const bps = slippageBps ?? DEFAULT_SLIPPAGE_BPS;
    const res = await this.server
      .strictSendPaths(assetFromId(from), amount, [assetFromId(to)])
      .call();
    const records = res.records as unknown as PathRecord[];
    if (records.length === 0) throw new NoRouteError();
    // Choose the path that yields the most of the destination asset.
    const best = records.reduce((a, b) =>
      humanToBaseUnits(b.destination_amount) > humanToBaseUnits(a.destination_amount) ? b : a,
    );
    return buildQuote(from, to, amount, best, bps);
  }

  async swap(quote: Quote): Promise<TxResult> {
    const sender = quote.sender;
    if (!sender) throw new Error('swap requires quote.sender (the source account)');
    const account = await this.server.loadAccount(sender);
    // Authoritative trustline check from the freshly loaded account.
    const held = parseBalances(account.balances as unknown as RawBalanceLine[]);
    const addTrust = !hasTrustline(held, quote.to);
    const tx = buildConvertTx(account, {
      sendAsset: assetFromId(quote.from),
      sendAmount: quote.amountIn,
      destination: sender, // self-swap: receive into the same account
      destAsset: assetFromId(quote.to),
      destMin: quote.minReceived,
      path: quote.path.map(assetFromId),
      addTrust,
    });
    return this.signAndSubmit(tx.toXDR());
  }

  // Live account updates via a Horizon payments stream (cursor 'now'), with a
  // polling fallback if streaming is unavailable/errors, paused while the tab is
  // hidden. onChange is a signal ("something changed, refetch"), not data.
  subscribeAccount(address: string, onChange: () => void): () => void {
    let closed = false;
    let stopStream: (() => void) | undefined;
    let pollId: number | undefined;

    const signal = () => {
      if (!closed) onChange();
    };
    const startPolling = () => {
      if (pollId === undefined) pollId = window.setInterval(signal, 12000);
    };
    const stopPolling = () => {
      if (pollId !== undefined) {
        window.clearInterval(pollId);
        pollId = undefined;
      }
    };
    const startStream = () => {
      if (stopStream || closed) return;
      try {
        stopStream = this.server
          .payments()
          .forAccount(address)
          .cursor('now')
          .stream({
            onmessage: () => signal(),
            onerror: () => {
              // Stream dropped: fall back to polling until visibility restarts it.
              stopStream = undefined;
              startPolling();
            },
          });
      } catch {
        startPolling();
      }
    };
    const stopAll = () => {
      stopStream?.();
      stopStream = undefined;
      stopPolling();
    };
    const onVisibility = () => {
      if (document.hidden) {
        stopAll();
      } else {
        startStream();
        signal(); // immediate refresh on return to foreground
      }
    };

    document.addEventListener('visibilitychange', onVisibility);
    if (!document.hidden) startStream();

    return () => {
      closed = true;
      stopAll();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }

  async signAndSubmit(xdr: string): Promise<TxResult> {
    // Single signing chokepoint for every write path. The wallet returns a
    // signed XDR; submit it via Horizon and surface the hash + explorer link.
    const { signedTxXdr } = await signTransaction(xdr);
    const signed = TransactionBuilder.fromXDR(signedTxXdr, getActiveNetwork().passphrase);
    const resp = await this.server.submitTransaction(signed);
    return { hash: resp.hash, explorerUrl: txExplorerUrl(resp.hash), status: 'success' };
  }
}

// Pure: builds the Convert transaction (one path-payment, optionally preceded by
// a changeTrust op). Exported so the operation shape is unit-testable without a
// network round-trip. Signing happens via signAndSubmit, never here.
export function buildConvertTx(
  account: Account,
  opts: {
    sendAsset: Asset;
    sendAmount: string;
    destination: string;
    destAsset: Asset;
    destMin: string;
    path: Asset[];
    addTrust: boolean;
  },
): Transaction {
  const b = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: getActiveNetwork().passphrase,
  });
  if (opts.addTrust) {
    b.addOperation(Operation.changeTrust({ asset: opts.destAsset }));
  }
  b.addOperation(
    Operation.pathPaymentStrictSend({
      sendAsset: opts.sendAsset,
      sendAmount: opts.sendAmount,
      destination: opts.destination,
      destAsset: opts.destAsset,
      destMin: opts.destMin,
      path: opts.path,
    }),
  );
  return b.setTimeout(180).build();
}

// The single adapter the wallet layer imports. Swapping in an EvmAdapter later is
// a one-line change here.
export const adapter: ChainAdapter = new StellarAdapter();
