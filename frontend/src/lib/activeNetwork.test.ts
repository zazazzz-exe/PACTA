import { describe, it, expect, beforeEach } from 'vitest';
import { TESTNET, MAINNET } from './networks';
import {
  getActiveNetwork,
  setActiveNetworkFromPassphrase,
  isSupportedNetwork,
} from './activeNetwork';

describe('activeNetwork store', () => {
  beforeEach(() => {
    setActiveNetworkFromPassphrase(TESTNET.passphrase); // reset to a known state
  });

  it('defaults to testnet', () => {
    expect(getActiveNetwork()).toBe(TESTNET);
  });
  it('switches to mainnet on the public passphrase', () => {
    setActiveNetworkFromPassphrase(MAINNET.passphrase);
    expect(getActiveNetwork()).toBe(MAINNET);
  });
  it('keeps the last supported network when given an unsupported passphrase', () => {
    setActiveNetworkFromPassphrase(MAINNET.passphrase);
    setActiveNetworkFromPassphrase('Test SDF Future Network ; October 2022');
    expect(getActiveNetwork()).toBe(MAINNET);
  });
  it('keeps the last supported network when given null', () => {
    setActiveNetworkFromPassphrase(MAINNET.passphrase);
    setActiveNetworkFromPassphrase(null);
    expect(getActiveNetwork()).toBe(MAINNET);
  });
  it('isSupportedNetwork is true only for the two known passphrases', () => {
    expect(isSupportedNetwork(TESTNET.passphrase)).toBe(true);
    expect(isSupportedNetwork(MAINNET.passphrase)).toBe(true);
    expect(isSupportedNetwork('Test SDF Future Network ; October 2022')).toBe(false);
    expect(isSupportedNetwork(null)).toBe(false);
  });
});
