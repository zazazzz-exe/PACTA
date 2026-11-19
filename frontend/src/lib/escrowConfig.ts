import { type NetworkInfo, TESTNET, MAINNET } from './networks';
import { CONTRACT_ID, TOKEN_ADDRESS, READ_SOURCE } from './config';
import { getActiveNetwork } from './activeNetwork';

// Everything the escrow (Pact) layer needs to talk to the contract on the active
// network. Returns null when Pacts are not supported/configured for that network,
// so contract.ts never targets a non-existent contract.
export interface EscrowConfig {
  contractId: string;
  rpcUrl: string;
  passphrase: string;
  settlementSac: string; // token address passed to create_agreement
  readSource: string; // funded account for read simulation when disconnected
}

// Shortest Pact `duration` (seconds) the escrow accepts, mirroring the contract's
// compiled MIN_DURATION (PRD §8.2): the testnet build uses the `testnet` cargo
// feature (60 s, for live demos); the mainnet build uses the default (1 day).
// The contract enforces this on-chain (error 12); the UI checks it first.
export const MIN_PACT_DURATION_SECS: Record<'testnet' | 'mainnet', number> = {
  testnet: 60,
  mainnet: 86_400,
};

export function minPactDuration(netKey: string): number {
  return netKey === 'testnet' ? MIN_PACT_DURATION_SECS.testnet : MIN_PACT_DURATION_SECS.mainnet;
}

function str(v: unknown): string {
  return typeof v === 'string' ? v : '';
}

// The escrow contract id for the network the wallet is on, for display (the
// proof panel, explorer links). Every caller sits behind a supportsPacts gate,
// so the fallback is only reached if a surface is ever rendered ungated.
export function activeContractId(): string {
  return escrowConfigFor(getActiveNetwork())?.contractId ?? CONTRACT_ID;
}

export function escrowConfigFor(
  net: NetworkInfo,
  env: Record<string, unknown> = import.meta.env as Record<string, unknown>,
): EscrowConfig | null {
  if (!net.supportsPacts) return null;

  if (net.key === 'testnet') {
    return {
      contractId: CONTRACT_ID,
      rpcUrl: TESTNET.rpcUrl,
      passphrase: TESTNET.passphrase,
      settlementSac: TOKEN_ADDRESS,
      readSource: READ_SOURCE,
    };
  }

  // net.key === 'public' (mainnet): all escrow values come from env.
  const contractId = str(env.VITE_MAINNET_ESCROW_CONTRACT_ID);
  const settlementSac = str(env.VITE_MAINNET_SETTLEMENT_SAC);
  const readSource = str(env.VITE_MAINNET_READ_SOURCE);
  // Defense in depth: same requirement as computeMainnetSupportsPacts, enforced
  // again here so a hand-built NetworkInfo cannot slip through with half a config.
  if (!contractId || !settlementSac || !readSource) return null;
  return {
    contractId,
    rpcUrl: MAINNET.rpcUrl,
    passphrase: MAINNET.passphrase,
    settlementSac,
    readSource,
  };
}
