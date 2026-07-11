import { Keypair } from '@stellar/stellar-sdk';
import { createHash } from 'crypto';

// Verify that `signatureB64` is a valid ed25519 signature over `message` by the
// key behind Stellar `address`. Modern Freighter (and SEP-53 wallets) sign
// SHA256("Stellar Signed Message:\n" + message); we try that first, then a couple
// of legacy encodings as fallbacks, and report which matched. A Stellar public
// key IS the ed25519 public key, so we verify directly with Keypair.verify.

export interface VerifyResult {
  ok: boolean;
  encoding?: 'sep53' | 'utf8' | 'sha256-utf8';
}

// SEP-53 domain-separation prefix used by Freighter's signMessage.
const SEP53_PREFIX = 'Stellar Signed Message:\n';

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

  const msgBytes = Buffer.from(message, 'utf8');

  // SEP-53: SHA256(prefix || message). This is what current Freighter signs.
  const sep53 = createHash('sha256')
    .update(Buffer.concat([Buffer.from(SEP53_PREFIX, 'utf8'), msgBytes]))
    .digest();
  if (safeVerify(kp, sep53, sig)) return { ok: true, encoding: 'sep53' };

  // Fallbacks for other/older wallets: raw bytes, or plain SHA256(message).
  if (safeVerify(kp, msgBytes, sig)) return { ok: true, encoding: 'utf8' };
  const plainHash = createHash('sha256').update(msgBytes).digest();
  if (safeVerify(kp, plainHash, sig)) return { ok: true, encoding: 'sha256-utf8' };

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
