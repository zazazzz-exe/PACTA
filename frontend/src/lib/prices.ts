import { PHP_RATES } from './config';
import { fromBaseUnits } from './format';
import type { AssetId, AssetBalance } from './adapters/ChainAdapter';

// PHP per whole unit of the asset, or undefined if we have no rate.
export function priceForAssetPhp(asset: AssetId): number | undefined {
  return PHP_RATES[asset.code];
}

export function displayValuePhp(bal: AssetBalance): number | undefined {
  const rate = priceForAssetPhp(bal.asset);
  if (rate === undefined) return undefined;
  return fromBaseUnits(bal.baseUnits) * rate;
}

export function withDisplayValues(balances: AssetBalance[]): AssetBalance[] {
  return balances.map((b) => ({ ...b, displayValuePhp: displayValuePhp(b) }));
}

export function totalPhp(balances: AssetBalance[]): number {
  return balances.reduce((sum, b) => sum + (b.displayValuePhp ?? 0), 0);
}
