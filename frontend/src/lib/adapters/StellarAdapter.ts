import { Horizon, TransactionBuilder, Operation, BASE_FEE } from '@stellar/stellar-sdk';
import { HORIZON_URL } from '../config';
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
  NotImplementedError,
} from './ChainAdapter';
import { assetFromId } from './stellarAssets';
import { signTransaction } from '../wallet';
import { NETWORK_PASSPHRASE, txExplorerUrl } from '../config';

export class StellarAdapter implements ChainAdapter {
  readonly chainId = 'stellar:testnet';
  private server = new Horizon.Server(HORIZON_URL);

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

  async send({ from, to, asset, amount }: SendParams): Promise<TxResult> {
    // Load the sender account for its current sequence number, build a single
    // payment operation, then hand the XDR to the shared signing chokepoint.
    const account = await this.server.loadAccount(from);
    const tx = new TransactionBuilder(account, {
      fee: BASE_FEE,
      networkPassphrase: NETWORK_PASSPHRASE,
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

  // Implemented in later phases; declared now to satisfy the seam.
  async getQuote(_params: QuoteParams): Promise<Quote> {
    throw new NotImplementedError('getQuote'); // Phase 3
  }
  async swap(_quote: Quote): Promise<TxResult> {
    throw new NotImplementedError('swap'); // Phase 3
  }

  async signAndSubmit(xdr: string): Promise<TxResult> {
    // Single signing chokepoint for every write path. The wallet returns a
    // signed XDR; submit it via Horizon and surface the hash + explorer link.
    const { signedTxXdr } = await signTransaction(xdr);
    const signed = TransactionBuilder.fromXDR(signedTxXdr, NETWORK_PASSPHRASE);
    const resp = await this.server.submitTransaction(signed);
    return { hash: resp.hash, explorerUrl: txExplorerUrl(resp.hash), status: 'success' };
  }
}

// The single adapter the wallet layer imports. Swapping in an EvmAdapter later
// is a one-line change here.
export const adapter: ChainAdapter = new StellarAdapter();
