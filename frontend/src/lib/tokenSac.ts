// Maps known Stellar assets to their Soroban Asset Contract (SAC) addresses per
// network. The escrow contract is token-agnostic: it accepts any token SAC at
// create_agreement time. This lookup resolves a human-selected asset (code +
// optional issuer) to the contract address the escrow needs.
//
// SAC addresses are deterministic: they derive from the asset plus the network
// passphrase, so the same asset has DIFFERENT addresses on testnet and mainnet.
// Every value below is checked against Asset.contractId() in tokenSac.test.ts,
// because a wrong address here would point a real Pact at the wrong contract.

import { getActiveNetwork } from './activeNetwork';
import { TOKEN_ADDRESS } from './config';
import type { NetworkKey } from './networks';

export interface AssetKey {
  code: string;
  issuer?: string;
}

export const USDC_TESTNET_ISSUER = 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5';
export const USDC_MAINNET_ISSUER = 'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN';

// Testnet SAC addresses for known assets.
export const TESTNET_SACS: Record<string, string> = {
  'XLM:native': TOKEN_ADDRESS, // CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC
  [`USDC:${USDC_TESTNET_ISSUER}`]: 'CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA',
};

// Mainnet SAC addresses. These are derived from the public network passphrase,
// NOT the testnet ones, and are fixed by the protocol rather than by our deploy.
export const MAINNET_SACS: Record<string, string> = {
  'XLM:native': 'CAS3J7GYLGXMF6TDJBBYYSE3HQ6BBSMLNUQ34T6TZMYMW2EVH34XOWMA',
  [`USDC:${USDC_MAINNET_ISSUER}`]: 'CCW67TSZV3SSS2HXMBQ5JFGCKJNXKZM7UQUWUZPUTHXSTZLEO7SJMI75',
};

export function sacsForNetwork(key: NetworkKey): Record<string, string> {
  return key === 'public' ? MAINNET_SACS : TESTNET_SACS;
}

function assetToKey(asset: AssetKey): string {
  return `${asset.code}:${asset.issuer ?? 'native'}`;
}

// Resolve an asset to its SAC address on the active network.
// Returns null if the asset is not known (caller should fall back to the default
// settlementSac from escrow config, or show an unsupported-asset message).
export function resolveTokenSac(asset: AssetKey): string | null {
  return sacsForNetwork(getActiveNetwork().key)[assetToKey(asset)] || null;
}
