import type { AssetId } from './adapters/ChainAdapter';

// A SEP-7 payment request ("web+stellar:pay?..."), the standard Stellar
// wallets read from a QR code. Without an amount the QR is the plain address.
export function paymentRequest(address: string, amount: string, asset?: AssetId): string {
  if (!(Number(amount) > 0)) return address;
  const q = new URLSearchParams({ destination: address, amount });
  if (asset && asset.issuer) {
    q.set('asset_code', asset.code);
    q.set('asset_issuer', asset.issuer);
  }
  return `web+stellar:pay?${q.toString()}`;
}
