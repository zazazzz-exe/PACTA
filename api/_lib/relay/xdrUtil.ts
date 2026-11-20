import { Keypair, type Transaction, type xdr } from '@stellar/stellar-sdk';

// Small helpers over the stellar-sdk v17 XDR classes (properties, `.type`
// discriminants, byte values in `.value`).

export function bytesEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

export const hex = (b: Uint8Array) => Buffer.from(b).toString('hex');

// True if `pk` produced one of the transaction's signatures.
export function signedBy(tx: Transaction, pk: string): boolean {
  let kp: Keypair;
  try {
    kp = Keypair.fromPublicKey(pk);
  } catch {
    return false; // muxed or contract address: no ed25519 signature to check
  }
  const hash = tx.hash();
  const hint = kp.signatureHint();
  return tx.signatures.some((s: xdr.DecoratedSignature) => bytesEqual(s.hint.value, hint) && kp.verify(hash, s.signature));
}

// The Soroban resource fee a transaction declares (0 for classic).
export function resourceFee(tx: Transaction): bigint {
  const env = tx.toEnvelope();
  if (env.type !== 'envelopeTypeTx') return 0n;
  const ext = env.v1.tx.ext;
  return ext.type === 'sorobanData' ? BigInt(ext.sorobanData.resourceFee) : 0n;
}
