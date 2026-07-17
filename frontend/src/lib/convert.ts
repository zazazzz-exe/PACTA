// Pure Convert helpers. No SDK import: this file is a wallet surface and must
// stay chain-agnostic (only StellarAdapter/stellarAssets touch @stellar/stellar-sdk).
import type { AssetId, AssetBalance, Quote } from './adapters/ChainAdapter';
import { humanToBaseUnits, baseUnitsToHuman } from './adapters/ChainAdapter';

export const DEFAULT_SLIPPAGE_BPS = 50; // 0.5%

// Minimal shape of a Horizon strict-send path record, mirrored so this file
// needs no SDK types. StellarAdapter passes the real records in.
export interface PathHop {
  asset_type: string;
  asset_code?: string;
  asset_issuer?: string;
}
export interface PathRecord {
  destination_amount: string;
  path: PathHop[];
}

// Reduce an out-amount by the slippage tolerance, in exact base units.
export function applySlippage(amountOutBase: bigint, bps: number): bigint {
  return (amountOutBase * BigInt(10_000 - bps)) / 10_000n;
}

export function assetKey(a: AssetId): string {
  return `${a.code}:${a.issuer ?? 'native'}`;
}

export function sameAsset(a: AssetId, b: AssetId): boolean {
  return assetKey(a) === assetKey(b);
}

// Native XLM never needs a trustline; an issued asset needs one that the
// account already holds (a zero-balance trustline still counts).
export function hasTrustline(balances: AssetBalance[], to: AssetId): boolean {
  if (to.code === 'XLM' && !to.issuer) return true;
  return balances.some((b) => sameAsset(b.asset, to));
}

// Destination options = curated known assets ∪ assets the user already holds,
// minus the from-asset, de-duped (held asset wins on identical key).
export function mergeToAssets(
  known: AssetId[],
  balances: AssetBalance[],
  from: AssetId,
): AssetId[] {
  const map = new Map<string, AssetId>();
  for (const a of known) map.set(assetKey(a), a);
  for (const b of balances) map.set(assetKey(b.asset), b.asset);
  map.delete(assetKey(from));
  return [...map.values()];
}

export function assetIdFromHop(hop: PathHop): AssetId {
  if (hop.asset_type === 'native') return { code: 'XLM' };
  return { code: hop.asset_code as string, issuer: hop.asset_issuer as string };
}

// Turn one chosen path record into a Quote. min-received is the estimated
// out-amount reduced by slippage, in exact base units then back to a string.
export function buildQuote(
  from: AssetId,
  to: AssetId,
  amountIn: string,
  record: PathRecord,
  bps: number,
): Quote {
  const outBase = humanToBaseUnits(record.destination_amount);
  const minBase = applySlippage(outBase, bps);
  return {
    from,
    to,
    amountIn,
    amountOut: record.destination_amount,
    minReceived: baseUnitsToHuman(minBase),
    path: record.path.map(assetIdFromHop),
    raw: record,
  };
}
