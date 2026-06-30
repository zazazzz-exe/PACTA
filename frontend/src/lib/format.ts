import { TOKEN_DECIMALS, TOKEN_SYMBOL, PHP_PER_XLM } from './config';

const SCALE = 10 ** TOKEN_DECIMALS; // 1e7

// Convert human amounts to/from base units at the UI boundary (PRD guardrail).
export const toBaseUnits = (human: number): bigint =>
  BigInt(Math.round(human * SCALE));

export const fromBaseUnits = (base: bigint): number => Number(base) / SCALE;

// Human-facing amount: rounded for display, thousands separators, trailing
// zeros trimmed (DESIGN §10). e.g. 75 XLM, 1,250.5 XLM.
export function formatAmount(base: bigint, withSymbol = true): string {
  const v = fromBaseUnits(base);
  const s = v.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 4,
  });
  return withSymbol ? `${s} ${TOKEN_SYMBOL}` : s;
}

// Full 7-decimal precision, for the instrument-grade proof panel only.
export function formatXlmFull(base: bigint): string {
  return fromBaseUnits(base).toFixed(TOKEN_DECIMALS);
}

// Local-currency anchor, e.g. "≈ ₱4,200" (DESIGN §6.4). Display only.
export function formatPhp(base: bigint): string {
  const php = Math.round(fromBaseUnits(base) * PHP_PER_XLM);
  return `≈ ₱${php.toLocaleString()}`;
}

// Truncate a Stellar address for display: GABC...WXYZ
export function shortAddr(addr: string, lead = 4, tail = 4): string {
  if (!addr || addr.length <= lead + tail + 1) return addr;
  return `${addr.slice(0, lead)}...${addr.slice(-tail)}`;
}

// Truncate a tx hash for the proof panel: 9f3a…b1c4
export function shortHash(hash: string, lead = 4, tail = 4): string {
  if (!hash || hash.length <= lead + tail + 1) return hash;
  return `${hash.slice(0, lead)}…${hash.slice(-tail)}`;
}

// Two-letter initials from an address for the avatar.
export function initials(addr: string): string {
  if (!addr) return '??';
  return (addr.slice(1, 2) + addr.slice(-1)).toUpperCase();
}

// u64 ledger timestamp (seconds) -> Date
export const fromTimestamp = (ts: bigint | number): Date =>
  new Date(Number(ts) * 1000);

// Compact countdown string from now until a unix-seconds deadline.
export function countdown(deadlineSec: number, nowSec: number): string {
  let s = deadlineSec - nowSec;
  if (s <= 0) return 'Deadline reached';
  const d = Math.floor(s / 86400);
  s -= d * 86400;
  const h = Math.floor(s / 3600);
  s -= h * 3600;
  const m = Math.floor(s / 60);
  s -= m * 60;
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}
