// Source of truth for network-varying values. Resolved from the connected
// wallet's reported passphrase by activeNetwork.ts. The escrow (Pact) contract
// is deployed only on testnet, so supportsPacts is true only there.

const nonEmpty = (v: unknown): v is string => typeof v === 'string' && v.length > 0;

// Mainnet Pacts (Phase B) are OFF unless the owner has, after an audit + mainnet
// deploy, set all four env values. All are public, non-secret (contract ids,
// asset SAC addresses and account ids are on-chain public), hence VITE_-prefixed.
// The read source is required, not optional: reads simulate against a funded
// account, so without one every Pact read fails the moment no wallet is
// connected. Better to keep the gate shut than to enable a half-working layer.
export function computeMainnetSupportsPacts(env: Record<string, unknown>): boolean {
  return (
    env.VITE_MAINNET_PACTS_ENABLED === 'true' &&
    nonEmpty(env.VITE_MAINNET_ESCROW_CONTRACT_ID) &&
    nonEmpty(env.VITE_MAINNET_SETTLEMENT_SAC) &&
    nonEmpty(env.VITE_MAINNET_READ_SOURCE)
  );
}

// Soroban RPC for mainnet. There is no free, SLA-backed public mainnet RPC, so
// this must be pointed at a provider endpoint in production. The default below
// is a community endpoint: fine for a first look, not for real traffic.
export const DEFAULT_MAINNET_RPC_URL = 'https://mainnet.sorobanrpc.com';

export function mainnetRpcUrl(env: Record<string, unknown>): string {
  const configured = env.VITE_MAINNET_RPC_URL;
  return nonEmpty(configured) ? configured : DEFAULT_MAINNET_RPC_URL;
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
  rpcUrl: mainnetRpcUrl(import.meta.env as Record<string, unknown>),
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
