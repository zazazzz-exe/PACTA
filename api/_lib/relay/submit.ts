import { rpc, type xdr, type FeeBumpTransaction, type Transaction } from '@stellar/stellar-sdk';

// Submit through Soroban RPC (it accepts classic and Soroban transactions) and
// wait briefly for the result.

export interface SubmitOutcome {
  status: 'success' | 'failed' | 'rejected' | 'pending';
  hash: string;
  feeCharged: number | null;
  returnValue?: string; // base64 ScVal, Soroban only
  error?: string;
}

export interface RpcLike {
  sendTransaction(tx: Transaction | FeeBumpTransaction): Promise<rpc.Api.SendTransactionResponse>;
  getTransaction(hash: string): Promise<rpc.Api.GetTransactionResponse>;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function feeCharged(result: xdr.TransactionResult | undefined): number | null {
  return result ? Number(result.feeCharged) : null;
}

function errorName(result: xdr.TransactionResult | undefined): string {
  if (!result) return 'unknown';
  const r = result.result;
  if (r.type === 'txFeeBumpInnerFailed' || r.type === 'txFeeBumpInnerSuccess') {
    return r.type + ':' + r.innerResultPair.result.result.type;
  }
  return r.type;
}

export async function submitAndWait(server: RpcLike, tx: Transaction | FeeBumpTransaction, waitMs = 20_000, pollMs = 1_000): Promise<SubmitOutcome> {
  const sent = await server.sendTransaction(tx);
  const hash = sent.hash;
  if (sent.status === 'ERROR') return { status: 'rejected', hash, feeCharged: 0, error: errorName(sent.errorResult) };
  if (sent.status === 'TRY_AGAIN_LATER') return { status: 'rejected', hash, feeCharged: 0, error: 'try_again_later' };

  for (let waited = 0; waited < waitMs; waited += pollMs) {
    await sleep(pollMs);
    const got = await server.getTransaction(hash);
    if (got.status === rpc.Api.GetTransactionStatus.SUCCESS) {
      return {
        status: 'success',
        hash,
        feeCharged: feeCharged(got.resultXdr),
        returnValue: got.returnValue ? got.returnValue.toXdr('base64') : undefined,
      };
    }
    if (got.status === rpc.Api.GetTransactionStatus.FAILED) {
      return { status: 'failed', hash, feeCharged: feeCharged(got.resultXdr), error: errorName(got.resultXdr) };
    }
  }
  return { status: 'pending', hash, feeCharged: null };
}
