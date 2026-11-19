import { useEffect, useMemo, useState } from 'react';
import QRCode from 'qrcode';
import { Check, Copy, Share2 } from 'lucide-react';
import { useWallet } from '../hooks/useWallet';
import { useBalances } from '../hooks/useBalances';
import type { AssetBalance } from '../lib/adapters/ChainAdapter';
import { ConnectButton } from '../components/ConnectButton';
import { TokenIcon } from '../components/TokenIcon';
import { shortAddr } from '../lib/format';
import { useActiveNetwork } from '../lib/activeNetwork';

const keyOf = (b: AssetBalance) => `${b.asset.code}:${b.asset.issuer ?? 'native'}`;

// A SEP-7 payment request ("web+stellar:pay?..."), the standard Stellar
// wallets read from a QR code. Without an amount the QR is the plain address.
export function paymentRequest(address: string, amount: string, asset?: AssetBalance['asset']): string {
  if (!(Number(amount) > 0)) return address;
  const q = new URLSearchParams({ destination: address, amount });
  if (asset && asset.issuer) {
    q.set('asset_code', asset.code);
    q.set('asset_issuer', asset.issuer);
  }
  return `web+stellar:pay?${q.toString()}`;
}

// `embedded`: rendered inside the Home bottom sheet, which shows the title.
export function Receive({ embedded = false }: { embedded?: boolean } = {}) {
  const { address } = useWallet();
  const { balances } = useBalances(address);
  const net = useActiveNetwork();
  const [qr, setQr] = useState<string>('');
  const [assetKey, setAssetKey] = useState('');
  const [amount, setAmount] = useState('');
  const [shared, setShared] = useState(false);
  const [copied, setCopied] = useState(false);

  const selected = useMemo(() => balances.find((b) => keyOf(b) === assetKey) ?? balances[0], [balances, assetKey]);
  const payload = address ? paymentRequest(address, amount, selected?.asset) : '';

  useEffect(() => {
    let ignore = false;
    setQr('');
    if (!payload) return;
    QRCode.toDataURL(payload, { margin: 1, width: 440 })
      .then((url) => {
        if (!ignore) setQr(url);
      })
      .catch(() => {
        if (!ignore) setQr('');
      });
    return () => {
      ignore = true;
    };
  }, [payload]);

  if (!address) {
    return (
      <div className="mx-auto max-w-app px-1 py-16 text-center">
        <p className="text-[14px] text-slate">Connect a wallet to see your receive address.</p>
        <div className="mt-6 flex justify-center">
          <ConnectButton />
        </div>
      </div>
    );
  }

  const canShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';
  async function share() {
    try {
      await navigator.share({ title: 'My PACTA address', text: payload });
      setShared(true);
    } catch {
      /* dismissed */
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(address!);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable */
    }
  }

  const code = selected?.asset.code;
  return (
    <div className="mx-auto max-w-app space-y-4 px-1">
      <div>
        {!embedded && <h1 className="text-[22px] font-bold tracking-tight text-ink">Receive</h1>}
        <p className="mt-1 text-[14px] text-slate">Show this QR code or share your address to get paid on Stellar {net.label}.</p>
      </div>

      <section className="relative isolate overflow-hidden rounded-card border border-card bg-paper p-5 text-center shadow-card">
        <span aria-hidden className="pointer-events-none absolute inset-0 -z-10 bg-balance-glow" />
        <div className="mx-auto w-fit rounded-[20px] bg-white p-3 shadow-pop">
          {qr ? (
            <img
              src={qr}
              alt={Number(amount) > 0 ? `QR code requesting ${amount} ${code ?? ''}` : 'Your wallet address as a QR code'}
              className="h-[208px] w-[208px]"
            />
          ) : (
            <div className="h-[208px] w-[208px] animate-pulse rounded-tile bg-mist" />
          )}
        </div>
        {Number(amount) > 0 && (
          <p className="mono mt-3 text-[15px] font-bold text-ink">
            Requesting {amount} {code}
          </p>
        )}

        <div className="mt-4 rounded-tile border border-card bg-deep px-3 py-3 text-left">
          <p className="text-[12px] font-semibold text-slate">Your wallet address</p>
          <p className="mono mt-1 break-all text-[13px] text-ink">{address}</p>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={copy}
            className="inline-flex min-h-tap items-center justify-center gap-2 rounded-pill bg-accent-tint text-[14px] font-bold text-accent transition active:scale-[0.96] focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            {copied ? <Check size={16} aria-hidden /> : <Copy size={16} aria-hidden />}
            <span aria-live="polite">{copied ? 'Copied' : 'Copy address'}</span>
          </button>
          {canShare ? (
            <button
              type="button"
              onClick={share}
              className="inline-flex min-h-tap items-center justify-center gap-2 rounded-pill bg-accent text-[14px] font-bold text-on-accent shadow-glow transition hover:bg-accent-deep active:scale-[0.96] focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
            >
              <Share2 size={16} aria-hidden /> {shared ? 'Shared' : 'Share'}
            </button>
          ) : (
            <div className="grid min-h-tap place-items-center rounded-pill bg-mist px-2 text-[12px] text-slate">
              <span className="mono">{shortAddr(address, 6, 6)}</span>
            </div>
          )}
        </div>
      </section>

      <section className="rounded-card border border-card bg-paper p-4 shadow-card sm:p-5" aria-labelledby="receive-request">
        <h2 id="receive-request" className="text-[15px] font-bold text-ink">
          Request an amount <span className="text-[13px] font-medium text-slate">(optional)</span>
        </h2>
        <p className="mt-0.5 text-[13px] text-slate">Adds the asset and amount to the QR code so the sender&apos;s wallet fills them in.</p>
        {balances.length > 0 && (
          <div role="radiogroup" aria-label="Asset" className="mt-3 flex flex-wrap gap-2">
            {balances.map((b) => {
              const on = selected && keyOf(b) === keyOf(selected);
              return (
                <button
                  key={keyOf(b)}
                  type="button"
                  role="radio"
                  aria-checked={!!on}
                  onClick={() => setAssetKey(keyOf(b))}
                  className={`inline-flex min-h-tap items-center gap-2 rounded-pill border py-1 pl-1 pr-3.5 text-[14px] font-bold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                    on ? 'border-accent bg-accent-tint text-ink' : 'border-card bg-deep text-slate hover:text-ink'
                  }`}
                >
                  <TokenIcon code={b.asset.code} seed={keyOf(b)} size={30} />
                  {b.asset.code}
                </button>
              );
            })}
          </div>
        )}
        <label className="mt-3 flex items-center gap-2 rounded-tile border border-card bg-deep px-3.5 focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/20">
          <span className="sr-only">Requested amount</span>
          <input
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ''))}
            inputMode="decimal"
            placeholder="0.00"
            className="mono h-12 min-w-0 flex-1 bg-transparent text-[16px] text-ink placeholder:text-fog focus:outline-none"
          />
          <span className="text-[14px] font-bold text-slate">{code}</span>
        </label>
      </section>
    </div>
  );
}
