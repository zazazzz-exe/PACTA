// Labels for assets on Home: issuer domain, verified/unverified, testnet-only.
// A static registry (no network lookups), so the wallet surface keeps depending
// only on ChainAdapter. Duplicate codes are told apart by their issuer:
// "USDC · centre.io" vs "USDC · testnet issuer"; anything unknown is "Unverified".
import { USDC_MAINNET_ISSUER, USDC_TESTNET_ISSUER } from './tokenSac';
import type { AssetBalance, AssetId } from './adapters/ChainAdapter';
import { isFiatLike } from './money';

export interface AssetLabel {
  /** "USD Coin", "Stellar Lumens", or the code when unknown */
  name: string;
  /** "centre.io", "stellar.org", "testnet issuer", or a short issuer key */
  source: string;
  verified: boolean;
  /** A test token with no real-world value (e.g. a testnet PHP) */
  testnetOnly: boolean;
}

interface Known {
  name: string;
  source: string;
  network: 'testnet' | 'public' | 'any';
}

const KNOWN: Record<string, Known> = {
  [`USDC:${USDC_MAINNET_ISSUER}`]: { name: 'USD Coin', source: 'centre.io', network: 'public' },
  [`USDC:${USDC_TESTNET_ISSUER}`]: { name: 'USD Coin', source: 'testnet issuer', network: 'testnet' },
  'EURC:GDHU6WRG4IEQXM5NZ4BMPKOXHW76MZM4Y2IEMFDVXBSDP6SJY4ITNPP2': { name: 'Euro Coin', source: 'circle.com', network: 'public' },
};

const shortKey = (issuer: string) => `${issuer.slice(0, 4)}…${issuer.slice(-4)}`;

export function assetKey(a: AssetId): string {
  return a.issuer ? `${a.code}:${a.issuer}` : a.code;
}

export function labelAsset(asset: AssetId, network: 'testnet' | 'public'): AssetLabel {
  if (!asset.issuer) {
    return { name: 'Stellar Lumens', source: 'stellar.org', verified: true, testnetOnly: false };
  }
  const known = KNOWN[assetKey(asset)];
  if (known) {
    return {
      name: known.name,
      source: known.source,
      verified: true,
      // Test USDC is a stand-in for the real thing; it is not labeled "testnet
      // only" because the whole app shows the testnet badge already.
      testnetOnly: false,
    };
  }
  return {
    name: asset.code,
    source: shortKey(asset.issuer),
    verified: false,
    // A fiat-style code (PHP, USD, ...) from an unknown issuer on testnet is a
    // test token with no real value; say so clearly.
    testnetOnly: network === 'testnet' && isFiatLike(asset.code),
  };
}

// Sort by value in the chosen currency (highest first), then by code; split
// out zero balances so they can collapse under "Show empty assets".
export function arrangeAssets<T extends AssetBalance>(
  balances: T[],
  valueOf: (b: T) => number | undefined,
): { visible: T[]; empty: T[] } {
  const sorted = [...balances].sort((a, b) => {
    const va = valueOf(a) ?? -1;
    const vb = valueOf(b) ?? -1;
    if (vb !== va) return vb - va;
    // No rate on either: larger holdings first, then alphabetical.
    if (a.baseUnits !== b.baseUnits) return a.baseUnits > b.baseUnits ? -1 : 1;
    return a.asset.code.localeCompare(b.asset.code);
  });
  return {
    visible: sorted.filter((b) => b.baseUnits !== 0n),
    empty: sorted.filter((b) => b.baseUnits === 0n),
  };
}
