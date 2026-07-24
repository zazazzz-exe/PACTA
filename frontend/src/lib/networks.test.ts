import { describe, it, expect } from 'vitest';
import { TESTNET, MAINNET, DEFAULT_NETWORK, networkForPassphrase } from './networks';

describe('network registry', () => {
  it('testnet supports Pacts, mainnet does not', () => {
    expect(TESTNET.supportsPacts).toBe(true);
    expect(MAINNET.supportsPacts).toBe(false);
  });
  it('has correct labels and keys', () => {
    expect(TESTNET.label).toBe('testnet');
    expect(MAINNET.label).toBe('mainnet');
    expect(MAINNET.key).toBe('public');
  });
  it('mainnet uses public Horizon and the confirmed USDC issuer', () => {
    expect(MAINNET.horizonUrl).toBe('https://horizon.stellar.org');
    const usdc = MAINNET.knownAssets.find((a) => a.code === 'USDC');
    expect(usdc?.issuer).toBe('GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN');
  });
  it('default network is testnet', () => {
    expect(DEFAULT_NETWORK).toBe(TESTNET);
  });
  it('resolves known passphrases and returns null for unknown', () => {
    expect(networkForPassphrase('Test SDF Network ; September 2015')).toBe(TESTNET);
    expect(networkForPassphrase('Public Global Stellar Network ; September 2015')).toBe(MAINNET);
    expect(networkForPassphrase('Test SDF Future Network ; October 2022')).toBeNull();
    expect(networkForPassphrase(null)).toBeNull();
  });
});
