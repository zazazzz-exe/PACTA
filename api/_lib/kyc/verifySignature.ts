import { Keypair } from '@stellar/stellar-sdk';
import { createHash } from 'crypto';

// Verify that `signatureB64` is a valid ed25519 signature over `message` by the
// key behind Stellar `address`. Freighter has, across versions, signed either
// the raw UTF-8 message bytes or the SHA-256 of those bytes, so we try both and
// report which matched (useful for pinning the encoding against the installed
// extension). A Stellar public key IS the ed25519 public key, so we verify
// directly with Keypair.verify.

export interface VerifyResult {
  ok: boolean;
  encoding?: 'utf8' | 'sha256-utf8';
}

export function verifyWalletSignature(
  address: string,
  message: string,
  signatureB64: string,
): VerifyResult {
  let kp: Keypair;
  try {
    kp = Keypair.fromPublicKey(address);
  } catch {
    return { ok: false };
  }

  const sig = decodeSignature(signatureB64);
  if (!sig || sig.length !== 64) return { ok: false };

  const utf8 = Buffer.from(message, 'utf8');
  if (safeVerify(kp, utf8, sig)) return { ok: true, encoding: 'utf8' };

  const hashed = createHash('sha256').update(utf8).digest();
  if (safeVerify(kp, hashed, sig)) return { ok: true, encoding: 'sha256-utf8' };

  return { ok: false };
}

function safeVerify(kp: Keypair, data: Buffer, sig: Buffer): boolean {
  try {
    return kp.verify(data, sig);
  } catch {
    return false;
  }
}

// Accept base64 (the wrapper's normal form) or hex; both must decode to 64 bytes.
function decodeSignature(s: string): Buffer | null {
  const b64 = Buffer.from(s, 'base64');
  if (b64.length === 64) return b64;
  const hex = Buffer.from(s.replace(/^0x/, ''), 'hex');
  if (hex.length === 64) return hex;
  return b64.length ? b64 : null;
}
