import { describe, it, expect } from 'vitest';
import { Keypair } from '@stellar/stellar-sdk';
import { createHash } from 'crypto';
import { verifyWalletSignature } from './verifySignature';

describe('verifyWalletSignature', () => {
  const kp = Keypair.random();
  const addr = kp.publicKey();
  const msg = `Pacta ownership\nAddress: ${addr}\nNonce: xyz789`;

  it('accepts a valid utf8 signature (base64)', () => {
    const sig = kp.sign(Buffer.from(msg, 'utf8')).toString('base64');
    const r = verifyWalletSignature(addr, msg, sig);
    expect(r.ok).toBe(true);
    expect(r.encoding).toBe('utf8');
  });

  it('accepts a valid sha256-utf8 signature (Freighter encoding variant)', () => {
    const sig = kp
      .sign(createHash('sha256').update(Buffer.from(msg, 'utf8')).digest())
      .toString('base64');
    const r = verifyWalletSignature(addr, msg, sig);
    expect(r.ok).toBe(true);
    expect(r.encoding).toBe('sha256-utf8');
  });

  it('accepts a hex-encoded signature', () => {
    const sig = kp.sign(Buffer.from(msg, 'utf8')).toString('hex');
    expect(verifyWalletSignature(addr, msg, sig).ok).toBe(true);
  });

  it('rejects the wrong address', () => {
    const sig = kp.sign(Buffer.from(msg, 'utf8')).toString('base64');
    expect(verifyWalletSignature(Keypair.random().publicKey(), msg, sig).ok).toBe(false);
  });

  it('rejects a tampered message', () => {
    const sig = kp.sign(Buffer.from(msg, 'utf8')).toString('base64');
    expect(verifyWalletSignature(addr, msg + 'x', sig).ok).toBe(false);
  });

  it('rejects a malformed address', () => {
    const sig = kp.sign(Buffer.from(msg, 'utf8')).toString('base64');
    expect(verifyWalletSignature('not-an-address', msg, sig).ok).toBe(false);
  });

  it('rejects a bad-length signature', () => {
    expect(verifyWalletSignature(addr, msg, 'AAAA').ok).toBe(false);
  });
});
