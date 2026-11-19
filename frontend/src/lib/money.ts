// Display formatting for amounts and currencies (UI boundary only).
// Amounts arrive as human decimal strings (Horizon "100.0000000") or base-unit
// bigints (contract i128, /1e7); values are computed in code from live reads and
// the indicative rates in config.ts. PHP is always an estimate.
import { PHP_RATES } from './config';
import { fromBaseUnits } from './format';
import type { AssetBalance } from './adapters/ChainAdapter';

export type DisplayCurrency = 'USD' | 'PHP';

// Assets that behave like fiat money: shown with exactly 2 decimals.
const FIAT_LIKE = new Set(['USDC', 'USDT', 'EURC', 'PYUSD', 'PHP', 'PHPC', 'USD', 'EUR', 'GBP', 'SGD']);

export function isFiatLike(code: string): boolean {
  return FIAT_LIKE.has(code.toUpperCase());
}

function fractionDigits(code: string): { min: number; max: number } {
  if (isFiatLike(code)) return { min: 2, max: 2 };
  if (code.toUpperCase() === 'XLM') return { min: 2, max: 4 };
  return { min: 0, max: 4 };
}

function trimZeros(s: string): string {
  return s.includes('.') ? s.replace(/\.?0+$/, '') : s;
}

export interface FormattedAmount {
  /** Rounded for the screen, with locale separators: "1,240.50" */
  display: string;
  /** Exact value for a tooltip: "1240.5012345 XLM" */
  full: string;
}

// Format a human decimal amount for an asset code.
export function formatAssetAmount(amount: string | number, code: string, locale?: string): FormattedAmount {
  const str = typeof amount === 'number' ? String(amount) : amount.trim();
  const n = Number(str);
  const full = `${trimZeros(str)} ${code}`;
  if (!Number.isFinite(n)) return { display: str, full };
  const { min, max } = fractionDigits(code);
  const smallest = 10 ** -max;
  if (n !== 0 && Math.abs(n) < smallest) {
    const tiny = new Intl.NumberFormat(locale, { minimumFractionDigits: max, maximumFractionDigits: max }).format(smallest);
    return { display: `${n < 0 ? '>-' : '<'}${tiny}`, full };
  }
  const display = new Intl.NumberFormat(locale, { minimumFractionDigits: min, maximumFractionDigits: max }).format(n);
  return { display, full };
}

// Same, for contract base units (i128 with 7 decimals).
export function formatBaseUnits(base: bigint, code: string, locale?: string): FormattedAmount {
  // Keep full precision for the tooltip: integer + 7-digit fraction.
  const neg = base < 0n;
  const abs = neg ? -base : base;
  const whole = abs / 10_000_000n;
  const frac = (abs % 10_000_000n).toString().padStart(7, '0');
  const exact = `${neg ? '-' : ''}${whole}.${frac}`;
  return formatAssetAmount(exact, code, locale);
}

// USD per PHP comes from the USDC rate: USDC is a dollar stablecoin, so
// PHP_RATES.USDC is the indicative pesos-per-dollar rate.
export function phpPerUsd(rates: Record<string, number> = PHP_RATES): number | undefined {
  const r = rates.USDC;
  return r && r > 0 ? r : undefined;
}

// Value of one balance in the chosen display currency, or undefined if no rate.
export function balanceValue(
  b: AssetBalance,
  currency: DisplayCurrency,
  rates: Record<string, number> = PHP_RATES,
): number | undefined {
  const php = b.displayValuePhp ?? (rates[b.asset.code] !== undefined ? fromBaseUnits(b.baseUnits) * rates[b.asset.code] : undefined);
  if (php === undefined) return undefined;
  if (currency === 'PHP') return php;
  const perUsd = phpPerUsd(rates);
  return perUsd ? php / perUsd : undefined;
}

export function totalValue(
  balances: AssetBalance[],
  currency: DisplayCurrency,
  rates: Record<string, number> = PHP_RATES,
): number {
  return balances.reduce((sum, b) => sum + (balanceValue(b, currency, rates) ?? 0), 0);
}

// "$1,250.00" or "≈ ₱72,812.50". PHP always carries the approximate sign; the
// UI adds the word "estimate" next to it.
export function formatFiat(value: number, currency: DisplayCurrency, locale?: string): string {
  const s = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    currencyDisplay: 'narrowSymbol',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
  return currency === 'PHP' ? `≈ ${s}` : s;
}

// "2 min ago", "yesterday", "3 days ago" for an ISO timestamp.
export function relativeTime(iso: string, now: Date = new Date(), locale?: string): string {
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return '';
  const diffSec = Math.round((then - now.getTime()) / 1000);
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
  const abs = Math.abs(diffSec);
  if (abs < 45) return rtf.format(0, 'second');
  if (abs < 3600) return rtf.format(Math.round(diffSec / 60), 'minute');
  if (abs < 86_400) return rtf.format(Math.round(diffSec / 3600), 'hour');
  if (abs < 7 * 86_400) return rtf.format(Math.round(diffSec / 86_400), 'day');
  return new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric' }).format(new Date(then));
}

// Value of a human amount of an asset in the display currency, or undefined
// when there is no indicative rate for it.
export function amountValue(
  code: string,
  amount: number,
  currency: DisplayCurrency,
  rates: Record<string, number> = PHP_RATES,
): number | undefined {
  const rate = rates[code];
  if (rate === undefined || !Number.isFinite(amount)) return undefined;
  const php = amount * rate;
  if (currency === 'PHP') return php;
  const perUsd = phpPerUsd(rates);
  return perUsd ? php / perUsd : undefined;
}
