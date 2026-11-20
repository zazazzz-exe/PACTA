import {
  Account,
  Address,
  BASE_FEE,
  Operation,
  SorobanDataBuilder,
  Transaction,
  TransactionBuilder,
  type xdr,
} from '@stellar/stellar-sdk';
import type { RelayConfig } from './config';
import { bytesEqual, signedBy } from './xdrUtil';

// Transactions the sponsor account is the source of: sponsored activations
// (reserves) and footprint restores (contract storage rent). Pure builders and
// checks; the endpoint loads accounts and submits.

export const ACTIVATION_TIMEOUT = 300;

export interface ActivationNeeds {
  account: boolean; // the wallet has no account on chain yet
  trustline: boolean; // the wallet has no USDC trustline yet
}

// begin sponsoring -> [create account with 0 XLM] -> [USDC trustline] -> end.
// The sponsor pays the fee and every reserve, so the wallet holds no XLM.
export function buildActivation(sponsorAccount: Account, user: string, needs: ActivationNeeds, cfg: RelayConfig): Transaction {
  if (!needs.account && !needs.trustline) throw new Error('nothing_to_activate');
  const b = new TransactionBuilder(sponsorAccount, { fee: BASE_FEE, networkPassphrase: cfg.passphrase }).addOperation(
    Operation.beginSponsoringFutureReserves({ sponsoredId: user }),
  );
  if (needs.account) b.addOperation(Operation.createAccount({ destination: user, startingBalance: '0' }));
  if (needs.trustline) b.addOperation(Operation.changeTrust({ asset: cfg.usdc, source: user }));
  b.addOperation(Operation.endSponsoringFutureReserves({ source: user }));
  return b.setTimeout(ACTIVATION_TIMEOUT).build();
}

// The wallet sends back the activation it signed. It must still carry the
// sponsor's signature (so it is byte-for-byte what we built), be for the
// session wallet, and be signed by that wallet.
export function checkActivation(signedXdr: string, wallet: string, cfg: RelayConfig): { ok: true; tx: Transaction } | { ok: false; reason: string } {
  let tx: Transaction;
  try {
    const parsed = TransactionBuilder.fromXDR(signedXdr, cfg.passphrase);
    if (!(parsed instanceof Transaction)) return { ok: false, reason: 'bad_xdr' };
    tx = parsed;
  } catch {
    return { ok: false, reason: 'bad_xdr' };
  }
  if (!cfg.sponsor || tx.source !== cfg.sponsor.publicKey()) return { ok: false, reason: 'not_an_activation' };
  if (!signedBy(tx, cfg.sponsor.publicKey())) return { ok: false, reason: 'not_built_by_relayer' };
  const first = tx.operations[0];
  if (first?.type !== 'beginSponsoringFutureReserves' || first.sponsoredId !== wallet) return { ok: false, reason: 'not_for_this_wallet' };
  if (!signedBy(tx, wallet)) return { ok: false, reason: 'not_signed_by_wallet' };
  return { ok: true, tx };
}

// ---------------------------------------------------------------- restore

// Contract storage rent: an archived entry must be restored before the call
// can run. The relayer restores only our escrow's own storage (and its code)
// and the token contracts it uses, paying the rent itself.
export function checkRestoreFootprint(
  data: xdr.SorobanTransactionData,
  cfg: RelayConfig,
  escrowWasmHash: Uint8Array | null,
): string | null {
  const allowed = new Set([cfg.escrowId, cfg.usdcSac, cfg.xlmSac]);
  const fp = data.resources.footprint;
  const keys = [...fp.readOnly, ...fp.readWrite];
  if (keys.length === 0 || keys.length > 20) return 'footprint_size';
  for (const k of keys) {
    if (k.type === 'contractData') {
      const contract = Address.fromScAddress(k.contractData.contract).toString();
      if (!allowed.has(contract)) return 'restore_not_allowed';
    } else if (k.type === 'contractCode') {
      if (!escrowWasmHash || !bytesEqual(k.contractCode.hash.value, escrowWasmHash)) return 'restore_not_allowed';
    } else {
      return 'restore_not_allowed';
    }
  }
  if (BigInt(data.resourceFee) > BigInt(cfg.maxTxFee)) return 'resource_fee_too_high';
  return null;
}

export function buildRestore(sponsorAccount: Account, data: xdr.SorobanTransactionData, cfg: RelayConfig): Transaction {
  const fee = (BigInt(BASE_FEE) + BigInt(data.resourceFee)).toString();
  return new TransactionBuilder(sponsorAccount, { fee, networkPassphrase: cfg.passphrase })
    .setSorobanData(new SorobanDataBuilder(data.toXdr('base64')).build())
    .addOperation(Operation.restoreFootprint({}))
    .setTimeout(60)
    .build();
}
