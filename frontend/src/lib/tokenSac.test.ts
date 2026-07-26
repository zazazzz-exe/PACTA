import { describe, it, expect } from 'vitest';
import { Asset, Networks } from '@stellar/stellar-sdk';
import { TESTNET, MAINNET } from './networks';
import { setActiveNetworkFromPassphrase } from './activeNetwork';
import {
  TESTNET_SACS,
  MAINNET_SACS,
  sacsForNetwork,
  resolveTokenSac,
  USDC_TESTNET_ISSUER,
  USDC_MAINNET_ISSUER,
} from './tokenSac';

// SAC addresses are derived from the asset AND the network passphrase, so the
// same asset differs per network. Deriving them here rather than trusting the
// literals catches a testnet address pasted into the mainnet map, which would
// point a real Pact at the wrong contract.
const derive = (asset: Asset, passphrase: string) => asset.contractId(passphrase);

describe('token SAC maps', () => {
  it('testnet addresses match the derived SACs for the testnet passphrase', () => {
    expect(TESTNET_SACS['XLM:native']).toBe(derive(Asset.native(), Networks.TESTNET));
    expect(TESTNET_SACS[`USDC:${USDC_TESTNET_ISSUER}`]).toBe(
      derive(new Asset('USDC', USDC_TESTNET_ISSUER), Networks.TESTNET),
    );
  });

  it('mainnet addresses match the derived SACs for the public passphrase', () => {
    expect(MAINNET_SACS['XLM:native']).toBe(derive(Asset.native(), Networks.PUBLIC));
    expect(MAINNET_SACS[`USDC:${USDC_MAINNET_ISSUER}`]).toBe(
      derive(new Asset('USDC', USDC_MAINNET_ISSUER), Networks.PUBLIC),
    );
  });

  it('never reuses a testnet address on mainnet', () => {
    const testnetAddresses = new Set(Object.values(TESTNET_SACS));
    for (const address of Object.values(MAINNET_SACS)) {
      expect(testnetAddresses.has(address)).toBe(false);
    }
  });

  it('selects the map by network key', () => {
    expect(sacsForNetwork('testnet')).toBe(TESTNET_SACS);
    expect(sacsForNetwork('public')).toBe(MAINNET_SACS);
  });
});

describe('resolveTokenSac', () => {
  it('resolves against the active network', () => {
    setActiveNetworkFromPassphrase(TESTNET.passphrase);
    expect(resolveTokenSac({ code: 'XLM' })).toBe(TESTNET_SACS['XLM:native']);

    setActiveNetworkFromPassphrase(MAINNET.passphrase);
    expect(resolveTokenSac({ code: 'XLM' })).toBe(MAINNET_SACS['XLM:native']);
    expect(resolveTokenSac({ code: 'USDC', issuer: USDC_MAINNET_ISSUER })).toBe(
      MAINNET_SACS[`USDC:${USDC_MAINNET_ISSUER}`],
    );

    setActiveNetworkFromPassphrase(TESTNET.passphrase); // restore
  });

  it('returns null for an unknown asset, and for a known asset on the wrong network', () => {
    setActiveNetworkFromPassphrase(TESTNET.passphrase);
    expect(resolveTokenSac({ code: 'DOGE' })).toBeNull();
    // Mainnet USDC is not a testnet asset, so it must not silently resolve.
    expect(resolveTokenSac({ code: 'USDC', issuer: USDC_MAINNET_ISSUER })).toBeNull();
  });
});
