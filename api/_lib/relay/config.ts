import { Asset, Keypair, Networks } from '@stellar/stellar-sdk';

// Fee relayer configuration (docs/fee-relayer.md). Testnet only for now: the
// relayer refuses to run on any other network until the owner funds and
// enables a mainnet sponsor.

export const RELAY_PASSPHRASE = Networks.TESTNET;
const TESTNET_RPC = 'https://soroban-testnet.stellar.org';
const TESTNET_ESCROW = 'CDES4GTFPX3QLQYGNK3MEE2HKXSNS23KR5UDDURSBE4TJKAZYJP4BPI5';
const TESTNET_USDC_ISSUER = 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5';

const STROOPS = 10_000_000;
const xlm = (v: string | undefined, def: number) => {
  const n = Number(v);
  return Math.round((Number.isFinite(n) && n > 0 ? n : def) * STROOPS);
};
const int = (v: string | undefined, def: number) => {
  const n = Number(v);
  return Number.isInteger(n) && n > 0 ? n : def;
};

// Escrow write calls the relayer sponsors. Reads are simulations and never
// reach the relayer.
export const ESCROW_FUNCTIONS = [
  'create_agreement',
  'post_bond',
  'deposit_capital',
  'release_milestone',
  'complete',
  'emergency_refund',
  'cancel',
  'reclaim_bond',
] as const;

export interface RelayConfig {
  enabled: boolean;
  // Why the relayer is off, safe to show (never the key): null when enabled.
  offReason: 'no_secret' | 'invalid_secret' | 'not_a_secret_key' | 'disabled' | null;
  sponsor: Keypair | null;
  rpcUrl: string;
  passphrase: string;
  escrowId: string;
  usdc: Asset;
  usdcSac: string;
  xlmSac: string;
  // limits (stroops / counts)
  maxTxFee: number; // most the relayer will pay for one transaction
  walletDailyCap: number; // fees paid for one wallet per UTC day
  globalDailyCap: number; // fees paid for everyone per UTC day
  walletPerHour: number; // sponsored transactions per wallet per hour
  ipPerHour: number; // sponsored transactions per client IP per hour
  activationsPerDay: number; // sponsored new accounts per UTC day, everyone
  activationsPerIpPerDay: number;
}

export function relayConfig(env: Record<string, string | undefined> = process.env): RelayConfig {
  const secret = (env.RELAYER_SECRET_KEY ?? '').trim().replace(/^['"]+|['"]+$/g, '').trim();
  let sponsor: Keypair | null = null;
  try {
    sponsor = secret ? Keypair.fromSecret(secret) : null;
  } catch {
    sponsor = null; // malformed secret: fail closed
  }
  const usdc = new Asset('USDC', env.RELAYER_USDC_ISSUER || TESTNET_USDC_ISSUER);
  return {
    enabled: sponsor !== null && env.RELAYER_DISABLED !== 'true',
    offReason: env.RELAYER_DISABLED === 'true'
      ? 'disabled'
      : sponsor
        ? null
        : !secret
          ? 'no_secret'
          : secret.startsWith('G')
            ? 'not_a_secret_key' // the public key was pasted instead of the S... secret
            : 'invalid_secret',
    sponsor,
    rpcUrl: env.RELAYER_RPC_URL || TESTNET_RPC,
    passphrase: RELAY_PASSPHRASE,
    escrowId: env.RELAYER_ESCROW_CONTRACT_ID || TESTNET_ESCROW,
    usdc,
    usdcSac: usdc.contractId(RELAY_PASSPHRASE),
    xlmSac: Asset.native().contractId(RELAY_PASSPHRASE),
    maxTxFee: xlm(env.RELAYER_MAX_TX_FEE_XLM, 1),
    walletDailyCap: xlm(env.RELAYER_WALLET_DAILY_CAP_XLM, 5),
    globalDailyCap: xlm(env.RELAYER_DAILY_CAP_XLM, 100),
    walletPerHour: int(env.RELAYER_WALLET_PER_HOUR, 30),
    ipPerHour: int(env.RELAYER_IP_PER_HOUR, 120),
    activationsPerDay: int(env.RELAYER_ACTIVATIONS_PER_DAY, 50),
    activationsPerIpPerDay: int(env.RELAYER_ACTIVATIONS_PER_IP_PER_DAY, 3),
  };
}
