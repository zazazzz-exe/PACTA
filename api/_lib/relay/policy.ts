import {
  Address,
  Asset,
  FeeBumpTransaction,
  Transaction,
  TransactionBuilder,
  type xdr,
  type OperationRecord,
} from '@stellar/stellar-sdk';
import { ESCROW_FUNCTIONS, type RelayConfig } from './config.js';
import { signedBy, resourceFee } from './xdrUtil.js';

export { resourceFee };

// What the relayer agrees to pay fees for. Pure: no network, no database.
//   - our escrow's write calls (and the token transfers they authorize)
//   - USDC transfers (classic payment, or the USDC contract's transfer)
//   - wallet operations: XLM / USDC payments, XLM <-> USDC path payments,
//     a USDC trustline
// Everything else is refused before any fee is spent.

export const MAX_OPS = 5;
export const MAX_VALIDITY_SECONDS = 15 * 60;

export type PolicyResult =
  | { ok: true; tx: Transaction; kind: 'classic' | 'soroban'; source: string; contract?: string; fn?: string; ops: string[] }
  | { ok: false; reason: string };

const no = (reason: string): PolicyResult => ({ ok: false, reason });

function allowedAsset(a: Asset, cfg: RelayConfig): boolean {
  return a.isNative() || (a.getCode() === cfg.usdc.getCode() && a.getIssuer() === cfg.usdc.getIssuer());
}

// A contract call is allowed if it is one of our escrow's write functions, or a
// token transfer on the USDC or XLM contracts (the escrow's deposits and bonds
// authorize those as sub-calls).
function allowedCall(contract: string, fn: string, cfg: RelayConfig, root: boolean): boolean {
  if (contract === cfg.escrowId) return (ESCROW_FUNCTIONS as readonly string[]).includes(fn);
  if (contract === cfg.usdcSac) return fn === 'transfer';
  if (contract === cfg.xlmSac) return !root && fn === 'transfer'; // only inside an escrow call
  return false;
}

function checkInvocation(inv: xdr.SorobanAuthorizedInvocation, cfg: RelayConfig, root: boolean): string | null {
  const f = inv.function;
  if (f.type !== 'sorobanAuthorizedFunctionTypeContractFn') return 'auth_not_contract_call';
  const args = f.contractFn;
  const contract = Address.fromScAddress(args.contractAddress).toString();
  const fn = args.functionName.toString();
  if (!allowedCall(contract, fn, cfg, root)) return 'auth_call_not_allowed';
  for (const sub of inv.subInvocations) {
    const r = checkInvocation(sub, cfg, false);
    if (r) return r;
  }
  return null;
}

export function checkUserTx(signedXdr: string, cfg: RelayConfig, nowSec = Math.floor(Date.now() / 1000)): PolicyResult {
  let parsed: Transaction | FeeBumpTransaction;
  try {
    parsed = TransactionBuilder.fromXDR(signedXdr, cfg.passphrase);
  } catch {
    return no('bad_xdr');
  }
  if (parsed instanceof FeeBumpTransaction) return no('already_fee_bumped');
  const tx = parsed;
  const source = tx.source;
  if (cfg.sponsor && source === cfg.sponsor.publicKey()) return no('sponsor_as_source');
  if (!signedBy(tx, source)) return no('not_signed_by_source');

  const max = Number(tx.timeBounds?.maxTime ?? 0);
  if (!max || max - nowSec > MAX_VALIDITY_SECONDS) return no('validity_too_long');
  if (max < nowSec) return no('expired');

  const ops = tx.operations as OperationRecord[];
  if (ops.length === 0 || ops.length > MAX_OPS) return no('op_count');
  for (const op of ops) {
    if (op.source && op.source !== source) return no('foreign_op_source');
  }

  const names = ops.map((o) => o.type);
  if (names.includes('invokeHostFunction')) {
    if (ops.length !== 1) return no('soroban_single_op');
    const op = ops[0];
    if (op.type !== 'invokeHostFunction') return no('soroban_single_op');
    const func = op.func;
    if (func.type !== 'hostFunctionTypeInvokeContract') return no('host_function_not_allowed');
    const args = func.invokeContract;
    const contract = Address.fromScAddress(args.contractAddress).toString();
    const fn = args.functionName.toString();
    if (!allowedCall(contract, fn, cfg, true)) return no('call_not_allowed');
    for (const entry of op.auth ?? []) {
      const r = checkInvocation(entry.rootInvocation, cfg, true);
      if (r) return no(r);
    }
    if (resourceFee(tx) > BigInt(cfg.maxTxFee)) return no('resource_fee_too_high');
    return { ok: true, tx, kind: 'soroban', source, contract, fn, ops: names };
  }

  for (const op of ops) {
    switch (op.type) {
      case 'payment':
        if (!allowedAsset(op.asset, cfg)) return no('asset_not_allowed');
        break;
      case 'pathPaymentStrictSend':
      case 'pathPaymentStrictReceive':
        if (![op.sendAsset, op.destAsset, ...op.path].every((a) => allowedAsset(a, cfg))) return no('asset_not_allowed');
        break;
      case 'changeTrust':
        if (!(op.line instanceof Asset) || op.line.isNative() || !allowedAsset(op.line, cfg)) return no('asset_not_allowed');
        break;
      default:
        return no(`op_not_allowed:${op.type}`);
    }
  }
  return { ok: true, tx, kind: 'classic', source, ops: names };
}
