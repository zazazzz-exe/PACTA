import { Client, type Agreement, type Reputation } from 'pacta';
import { signTransaction } from './wallet';
import { getActiveNetwork } from './activeNetwork';
import { escrowConfigFor } from './escrowConfig';

export { Status } from 'pacta';
export type { Agreement, Reputation };

// Resolve the escrow config for the network the wallet is on. Every UI path that
// reaches this module is gated on supportsPacts, so a null here should be
// unreachable; throw a clear message rather than silently target the wrong chain.
function activeEscrow() {
  const cfg = escrowConfigFor(getActiveNetwork());
  if (!cfg) throw new Error('Protected payments are not available on this network.');
  return cfg;
}

export function getContract(publicKey?: string) {
  const { contractId, rpcUrl, passphrase, readSource } = activeEscrow();
  return new Client({
    contractId,
    networkPassphrase: passphrase,
    rpcUrl,
    publicKey: publicKey ?? readSource,
    signTransaction,
  });
}

export interface WriteResult<T> {
  result: T;
  hash: string | undefined;
}

// ---------- reads (free simulation, no signing) ----------
export async function getCount(publicKey?: string): Promise<bigint> {
  const tx = await getContract(publicKey).get_count();
  return tx.result;
}

export async function getAgreement(id: bigint, publicKey?: string): Promise<Agreement> {
  const tx = await getContract(publicKey).get_agreement({ agreement_id: id });
  return tx.result.unwrap();
}

export async function getReputation(trader: string, publicKey?: string): Promise<Reputation> {
  const tx = await getContract(publicKey).get_reputation({ trader });
  return tx.result;
}

export async function getAllAgreements(publicKey?: string): Promise<Agreement[]> {
  const count = await getCount(publicKey);
  const ids: bigint[] = [];
  for (let i = 1n; i <= count; i++) ids.push(i);
  const settled = await Promise.allSettled(ids.map((id) => getAgreement(id, publicKey)));
  return settled
    .filter((r): r is PromiseFulfilledResult<Agreement> => r.status === 'fulfilled')
    .map((r) => r.value);
}

// ---------- writes (wallet-signed) ----------
async function send<T>(tx: { signAndSend: () => Promise<any> }): Promise<WriteResult<T>> {
  const sent = await tx.signAndSend();
  const result = sent.result?.unwrap ? sent.result.unwrap() : sent.result;
  const hash =
    sent.sendTransactionResponse?.hash ?? sent.getTransactionResponse?.txHash ?? undefined;
  return { result: result as T, hash };
}

export interface CreateArgs {
  investor: string;
  trader: string;
  capital: bigint;
  bond: bigint;
  milestones: number;
  profit_share_bps: number;
  duration: bigint;
}

export async function createAgreement(
  publicKey: string,
  args: CreateArgs,
): Promise<WriteResult<bigint>> {
  const tx = await getContract(publicKey).create_agreement({
    investor: args.investor,
    trader: args.trader,
    token: activeEscrow().settlementSac,
    capital: args.capital,
    bond: args.bond,
    milestones: args.milestones,
    profit_share_bps: args.profit_share_bps,
    duration: args.duration,
  });
  return send<bigint>(tx);
}

export async function postBond(publicKey: string, id: bigint): Promise<WriteResult<void>> {
  return send<void>(await getContract(publicKey).post_bond({ agreement_id: id }));
}

export async function depositCapital(publicKey: string, id: bigint): Promise<WriteResult<void>> {
  return send<void>(await getContract(publicKey).deposit_capital({ agreement_id: id }));
}

export async function releaseMilestone(publicKey: string, id: bigint): Promise<WriteResult<bigint>> {
  return send<bigint>(await getContract(publicKey).release_milestone({ agreement_id: id }));
}

export async function complete(publicKey: string, id: bigint): Promise<WriteResult<void>> {
  return send<void>(await getContract(publicKey).complete({ agreement_id: id }));
}

export async function emergencyRefund(publicKey: string, id: bigint): Promise<WriteResult<void>> {
  return send<void>(await getContract(publicKey).emergency_refund({ agreement_id: id }));
}

export async function cancel(publicKey: string, id: bigint): Promise<WriteResult<void>> {
  return send<void>(await getContract(publicKey).cancel({ agreement_id: id }));
}
