import { Horizon } from '@stellar/stellar-sdk';
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

  // Implemented in later phases; declared now to satisfy the seam.
  async send(_params: SendParams): Promise<TxResult> {
    throw new NotImplementedError('send'); // Phase 2
  }
  async getQuote(_params: QuoteParams): Promise<Quote> {
    throw new NotImplementedError('getQuote'); // Phase 3
  }
  async swap(_quote: Quote): Promise<TxResult> {
    throw new NotImplementedError('swap'); // Phase 3
  }
  async signAndSubmit(_xdr: string): Promise<TxResult> {
    throw new NotImplementedError('signAndSubmit'); // Phase 2
  }
}

// The single adapter the wallet layer imports. Swapping in an EvmAdapter later
// is a one-line change here.
export const adapter: ChainAdapter = new StellarAdapter();
