import { TOKEN_DECIMALS, TOKEN_SYMBOL } from './config';

const SCALE = 10 ** TOKEN_DECIMALS; // 1e7

// Convert human amounts to/from base units at the UI boundary (PRD guardrail).
export const toBaseUnits = (human: number): bigint =>
  BigInt(Math.round(human * SCALE));

export const fromBaseUnits = (base: bigint): number => Number(base) / SCALE;

// Human-readable amount with the token symbol, e.g. "100.00 XLM".
export function formatAmount(base: bigint, withSymbol = true): string {
  const v = fromBaseUnits(base);
  const s = v.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 7,
  });
  return withSymbol ? `${s} ${TOKEN_SYMBOL}` : s;
}

// Truncate a Stellar address for display: GABC...WXYZ
export function shortAddr(addr: string, lead = 4, tail = 4): string {
  if (!addr || addr.length <= lead + tail + 1) return addr;
  return `${addr.slice(0, lead)}...${addr.slice(-tail)}`;
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
