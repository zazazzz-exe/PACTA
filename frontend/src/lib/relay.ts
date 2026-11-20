import { rpc } from '@stellar/stellar-sdk';
import { getActiveNetwork } from './activeNetwork';
import { signTransaction } from './wallet';

// Client for the PACTA fee relayer (api/relay.ts, docs/fee-relayer.md). The
// wallet signs its own transaction; the relayer pays the network fee with a
// fee bump. Testnet only for now. When the relayer cannot cover a fee (off,
// daily allowance used, or a call it does not sponsor) the caller falls back
// to submitting directly, which needs the user's own XLM.

export interface RelayStatus {
  enabled: boolean;
  sponsor: string | null;
  maxTxFeeXlm: number;
  walletDailyCapXlm: number;
}

export class RelayError extends Error {
  constructor(
    public code: string,
    public reason?: string,
    public hash?: string,
  ) {
    super(reason ? `${code}:${reason}` : code);
  }
  // The relayer would not or could not pay: the user may still pay themselves.
  get canFallBack(): boolean {
    return ['relay_unavailable', 'not_sponsored', 'wallet_cap', 'daily_cap', 'rate_limited', 'network'].includes(this.code);
  }
}

let statusPromise: Promise<RelayStatus | null> | null = null;

export function relayStatus(): Promise<RelayStatus | null> {
  statusPromise ??= fetch('/api/relay?action=status')
    .then((r) => (r.ok ? (r.json() as Promise<RelayStatus>) : null))
    .catch(() => null);
  return statusPromise;
}

// The relayer only runs on testnet.
export async function relayUsable(): Promise<boolean> {
  if (getActiveNetwork().key !== 'testnet') return false;
  return (await relayStatus())?.enabled === true;
}

export interface RelayResult {
  hash: string;
  returnValue: string | null; // base64 ScVal (contract calls)
}

async function post(action: string, body?: unknown): Promise<Response> {
  try {
    return await fetch(`/api/relay?action=${action}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new RelayError('network');
  }
}

// If the relayer returned before the network confirmed, keep watching.
async function waitForResult(hash: string): Promise<RelayResult> {
  const server = new rpc.Server(getActiveNetwork().rpcUrl);
  for (let i = 0; i < 30; i++) {
    await new Promise((r) => setTimeout(r, 1500));
    const got = await server.getTransaction(hash);
    if (got.status === rpc.Api.GetTransactionStatus.SUCCESS) {
      return { hash, returnValue: got.returnValue ? got.returnValue.toXdr('base64') : null };
    }
    if (got.status === rpc.Api.GetTransactionStatus.FAILED) throw new RelayError('failed', 'tx_failed', hash);
  }
  throw new RelayError('failed', 'timeout', hash);
}

// Submit a wallet-signed transaction with PACTA paying the fee.
export async function relaySubmit(signedXdr: string): Promise<RelayResult> {
  const res = await post('submit', { xdr: signedXdr });
  const body = (await res.json().catch(() => ({}))) as { status?: string; hash?: string; returnValue?: string | null; error?: string; reason?: string };
  if (res.ok && body.status === 'success') return { hash: body.hash!, returnValue: body.returnValue ?? null };
  if (res.ok && body.status === 'pending') return waitForResult(body.hash!);
  if (res.status === 422) throw new RelayError('failed', body.error ?? undefined, body.hash); // on chain, but failed
  throw new RelayError(body.error ?? (res.status >= 500 ? 'relay_unavailable' : 'not_sponsored'), body.reason);
}

// Contract storage rent: ask the relayer to restore archived escrow storage.
export async function relayRestore(transactionDataXdr: string): Promise<void> {
  const res = await post('restore', { transactionData: transactionDataXdr });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string; reason?: string };
    throw new RelayError(body.error ?? 'relay_unavailable', body.reason);
  }
}

// Set up a wallet with no XLM: PACTA creates the account (if needed) and the
// USDC trustline, paying every reserve. One wallet signature. Needs the wallet
// session from connect.
export async function activateWallet(address: string): Promise<'activated' | 'already'> {
  const res = await post('activate');
  const body = (await res.json().catch(() => ({}))) as { activated?: boolean; xdr?: string; networkPassphrase?: string; error?: string };
  if (res.status === 401) throw new RelayError('session');
  if (!res.ok) throw new RelayError(body.error ?? 'relay_unavailable');
  if (body.activated) return 'already';
  const { signedTxXdr } = await signTransaction(body.xdr!, { address, networkPassphrase: body.networkPassphrase });
  const sub = await post('activate-submit', { xdr: signedTxXdr });
  const out = (await sub.json().catch(() => ({}))) as { status?: string; error?: string; reason?: string };
  if (!sub.ok || out.status !== 'success') throw new RelayError(out.error ?? 'failed', out.reason);
  return 'activated';
}
