// Maps known Stellar assets to their Soroban Asset Contract (SAC) addresses per
// network. The escrow contract is token-agnostic: it accepts any token SAC at
// create_agreement time. This lookup resolves a human-selected asset (code +
// optional issuer) to the contract address the escrow needs.

import { getActiveNetwork } from './activeNetwork';
import { TOKEN_ADDRESS } from './config';

export interface AssetKey {
  code: string;
  issuer?: string;
}

// Testnet SAC addresses for known assets.
// XLM native SAC on testnet (the wrapped native asset).
const TESTNET_SACS: Record<string, string> = {
  'XLM:native': TOKEN_ADDRESS, // CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC
  'USDC:GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5':
    'CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA',
};

// Mainnet SAC addresses. USDC SAC on mainnet is the env-provided settlement SAC
// (same one used as the default). XLM native SAC on mainnet is well-known.
function getMainnetSacs(): Record<string, string> {
  const env = import.meta.env as Record<string, string | undefined>;
  return {
    'XLM:native': 'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC',
    'USDC:GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN':
      env.VITE_MAINNET_SETTLEMENT_SAC ?? '',
  };
}

function assetToKey(asset: AssetKey): string {
  return `${asset.code}:${asset.issuer ?? 'native'}`;
}

// Resolve an asset to its SAC address on the active network.
// Returns null if the asset is not known (caller should fall back to the default
// settlementSac from escrow config, or show an unsupported-asset message).
export function resolveTokenSac(asset: AssetKey): string | null {
  const net = getActiveNetwork();
  const key = assetToKey(asset);
  const map = net.key === 'public' ? getMainnetSacs() : TESTNET_SACS;
  return map[key] || null;
}
