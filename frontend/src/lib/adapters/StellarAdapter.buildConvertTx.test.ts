import { describe, it, expect, vi } from 'vitest';
import { Account, Asset } from '@stellar/stellar-sdk';

// StellarAdapter.ts imports signTransaction from '../wallet' for its signing
// chokepoint. wallet.ts eagerly constructs a StellarWalletsKit at module scope,
// which touches browser-only globals and a CJS bundle that Vitest's Node
// environment cannot load. buildConvertTx is a pure function that never
// touches signing, so stub the module out to keep this test a network-free,
// browser-free unit test of the transaction shape. (vi.mock calls are hoisted
// above imports by Vitest, so this runs before StellarAdapter.ts is loaded.)
vi.mock('../wallet', () => ({
  signTransaction: vi.fn(),
}));

import { buildConvertTx } from './StellarAdapter';

const SENDER = 'GDCOP33NLUKXJXALCJCPTXJUGS42GZRM5YOYLS5RTKMLZNPORM2Z76GI';
const USDC = new Asset('USDC', 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5');

const base = () => ({
  sendAsset: Asset.native(),
  sendAmount: '100',
  destination: SENDER,
  destAsset: USDC,
  destMin: '4.4775',
  path: [] as Asset[],
});

describe('buildConvertTx', () => {
  it('builds a single path-payment op when the trustline exists', () => {
    const tx = buildConvertTx(new Account(SENDER, '0'), { ...base(), addTrust: false });
    expect(tx.operations).toHaveLength(1);
    expect(tx.operations[0].type).toBe('pathPaymentStrictSend');
  });

  it('prepends changeTrust when a trustline is needed', () => {
    const tx = buildConvertTx(new Account(SENDER, '0'), { ...base(), addTrust: true });
    expect(tx.operations).toHaveLength(2);
    expect(tx.operations[0].type).toBe('changeTrust');
    expect(tx.operations[1].type).toBe('pathPaymentStrictSend');
  });
});
