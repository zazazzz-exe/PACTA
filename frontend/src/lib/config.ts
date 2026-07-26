import { getActiveNetwork } from './activeNetwork';
import { TESTNET } from './networks';

// Deployed PACTA escrow on Stellar testnet (captured in Phase 2).
// The contract is token-agnostic; the demo settles in the native XLM SAC.
export const CONTRACT_ID = 'CBLSIW2L5BV2KOM73EGXPZBO7DCVVW5TF2ROMYJZSZUTMSMGIFFEL3HL';
export const TOKEN_ADDRESS = 'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC';

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

// Built-in indicative rates, PHP per whole unit. These are NOT a price feed:
// they are a rough anchor so a balance reads as money rather than as a token
// count. Every surface that shows them must say "estimate", because on mainnet
// they sit next to real funds. Override without a code change via VITE_PHP_RATES
// (e.g. "XLM:22,USDC:56"); a live feed would replace this wholesale.
const DEFAULT_PHP_RATES: Record<string, number> = {
  XLM: PHP_PER_XLM,
  USDC: 56,
  EURC: 60,
};

// Parse "CODE:RATE,CODE:RATE" into a rate map, ignoring malformed entries so a
// typo in one pair cannot wipe out the whole table.
export function parsePhpRates(
  raw: unknown,
  defaults: Record<string, number> = DEFAULT_PHP_RATES,
): Record<string, number> {
  if (typeof raw !== 'string' || raw.trim() === '') return { ...defaults };
  const parsed: Record<string, number> = { ...defaults };
  for (const pair of raw.split(',')) {
    const [code, value] = pair.split(':');
    const rate = Number(value);
    if (code?.trim() && Number.isFinite(rate) && rate > 0) {
      parsed[code.trim().toUpperCase()] = rate;
    }
  }
  return parsed;
}

// Explorer link for the escrow contract. Resolves to the active network's
// contract ID and explorer so it works on both testnet and mainnet.
export const contractExplorerUrl = () => {
  const net = getActiveNetwork();
  if (net.key === 'public') {
    const mainnetId = (import.meta.env as Record<string, string>).VITE_MAINNET_ESCROW_CONTRACT_ID;
    if (mainnetId) return `${net.explorerBase}/contract/${mainnetId}`;
  }
  // Testnet or mainnet without a configured contract: use the testnet contract.
  return `${TESTNET.explorerBase}/contract/${CONTRACT_ID}`;
};

// Tx hashes belong to whatever network they happened on, so this one follows
// the active network.
export const txExplorerUrl = (hash: string) =>
  `${getActiveNetwork().explorerBase}/tx/${hash}`;

// Display-only PHP rates by asset code (indicative; never used in a contract
// call). Unknown assets show their amount only, no peso estimate.
export const PHP_RATES: Record<string, number> = parsePhpRates(
  (import.meta.env as Record<string, unknown>).VITE_PHP_RATES,
);
