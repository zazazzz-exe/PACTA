import { Asset } from '@stellar/stellar-sdk';
import type { AssetId } from './ChainAdapter';

// Turn our chain-agnostic AssetId into a Stellar SDK Asset. Native XLM has no
// issuer; every other asset requires one.
export function assetFromId(asset: AssetId): Asset {
  if (asset.code === 'XLM' && !asset.issuer) return Asset.native();
  if (!asset.issuer) {
    throw new Error(`Asset ${asset.code} needs an issuer`);
  }
  return new Asset(asset.code, asset.issuer);
}
