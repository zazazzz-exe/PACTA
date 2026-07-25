// Source of truth for network-varying values. Resolved from the connected
// wallet's reported passphrase by activeNetwork.ts. The escrow (Pact) contract
// is deployed only on testnet, so supportsPacts is true only there.

// Mainnet Pacts (Phase B) are OFF unless the owner has, after an audit + mainnet
// deploy, set all three env values. All are public, non-secret (contract ids and
// asset SAC addresses are on-chain public), hence VITE_-prefixed.
export function computeMainnetSupportsPacts(env: Record<string, unknown>): boolean {
  const nonEmpty = (v: unknown): v is string => typeof v === 'string' && v.length > 0;
  return (
    env.VITE_MAINNET_PACTS_ENABLED === 'true' &&
    nonEmpty(env.VITE_MAINNET_ESCROW_CONTRACT_ID) &&
    nonEmpty(env.VITE_MAINNET_SETTLEMENT_SAC)
  );
}

export type NetworkKey = 'testnet' | 'public';

export interface NetworkInfo {
  key: NetworkKey;
  label: string; // UI copy: 'testnet' | 'mainnet'
  passphrase: string;
  horizonUrl: string;
  rpcUrl: string; // used only by the testnet escrow layer; not exercised on mainnet
  explorerBase: string; // stellar.expert explorer base for this network
  knownAssets: { code: string; issuer?: string }[];
  supportsPacts: boolean;
}

export const TESTNET: NetworkInfo = {
  key: 'testnet',
  label: 'testnet',
  passphrase: 'Test SDF Network ; September 2015',
  horizonUrl: 'https://horizon-testnet.stellar.org',
  rpcUrl: 'https://soroban-testnet.stellar.org',
  explorerBase: 'https://stellar.expert/explorer/testnet',
  knownAssets: [
    { code: 'XLM' },
    { code: 'USDC', issuer: 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5' },
  ],
  supportsPacts: true,
};

export const MAINNET: NetworkInfo = {
  key: 'public',
  label: 'mainnet',
  passphrase: 'Public Global Stellar Network ; September 2015',
  horizonUrl: 'https://horizon.stellar.org',
  rpcUrl: 'https://mainnet.sorobanrpc.com',
  explorerBase: 'https://stellar.expert/explorer/public',
  knownAssets: [
    { code: 'XLM' },
    { code: 'USDC', issuer: 'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN' },
  ],
  supportsPacts: computeMainnetSupportsPacts(import.meta.env as Record<string, unknown>),
};

// Pre-connect / fallback network.
export const DEFAULT_NETWORK: NetworkInfo = TESTNET;

const SUPPORTED = [TESTNET, MAINNET];

// Resolve a wallet-reported passphrase to a supported network, or null if the
// network is not one we support (e.g. futurenet or a custom network).
export function networkForPassphrase(p: string | null): NetworkInfo | null {
  return SUPPORTED.find((n) => n.passphrase === p) ?? null;
}
