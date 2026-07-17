// Deployed PACTA escrow on Stellar testnet (captured in Phase 2).
// The contract is token-agnostic; the demo settles in the native XLM SAC.
export const CONTRACT_ID = 'CBLSIW2L5BV2KOM73EGXPZBO7DCVVW5TF2ROMYJZSZUTMSMGIFFEL3HL';
export const TOKEN_ADDRESS = 'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC';

export const RPC_URL = 'https://soroban-testnet.stellar.org';
export const NETWORK_PASSPHRASE = 'Test SDF Network ; September 2015';

// Horizon (classic Stellar API) for reading account balances. Separate from the
// Soroban RPC_URL used for contract calls.
export const HORIZON_URL = 'https://horizon-testnet.stellar.org';

// Read-only simulations still need an existing, funded source account (the RPC
// loads its entry for the sequence number). When no wallet is connected we fall
// back to the contract admin, which is funded and always exists on testnet.
export const READ_SOURCE = 'GCO474RPUM4AOF5T4JA55YIFJKP5B3743F6AXD5M65WBB4SNLFTL43PS';

// Token display (native XLM SAC has 7 decimals).
export const TOKEN_SYMBOL = 'XLM';
export const TOKEN_DECIMALS = 7;

// Display-only anchor so non-crypto users see a familiar peso estimate next to
// XLM (DESIGN §6.4). Approximate, static; not used in any contract call.
export const PHP_PER_XLM = 22;

export const STELLAR_EXPERT = 'https://stellar.expert/explorer/testnet';
export const contractExplorerUrl = () => `${STELLAR_EXPERT}/contract/${CONTRACT_ID}`;
export const txExplorerUrl = (hash: string) => `${STELLAR_EXPERT}/tx/${hash}`;

// Static, display-only PHP rates by asset code (approximate; never used in a
// contract call). Unknown assets show their amount only, no peso estimate.
export const PHP_RATES: Record<string, number> = {
  XLM: PHP_PER_XLM, // reuse the existing anchor (22)
  USDC: 56,
  EURC: 60,
};

// Circle USDC on Stellar testnet (confirmed against Circle/Stellar docs).
export const USDC_TESTNET_ISSUER = 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5';

// Assets offered as Convert destinations even when the user holds no balance/
// trustline for them yet. XLM (native) plus testnet USDC. EURC is omitted until
// its testnet issuer is confirmed.
export const KNOWN_ASSETS: { code: string; issuer?: string }[] = [
  { code: 'XLM' },
  { code: 'USDC', issuer: USDC_TESTNET_ISSUER },
];
