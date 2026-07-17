import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { useWallet } from '../hooks/useWallet';
import { CopyButton } from '../components/CopyButton';
import { ConnectButton } from '../components/ConnectButton';

export function Receive() {
  const { address } = useWallet();
  const [qr, setQr] = useState<string>('');

  useEffect(() => {
    let ignore = false;
    setQr('');
    if (!address) return;
    QRCode.toDataURL(address, { margin: 1, width: 220 })
      .then((url) => { if (!ignore) setQr(url); })
      .catch(() => { if (!ignore) setQr(''); });
    return () => { ignore = true; };
  }, [address]);

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

  return (
    <div className="mx-auto max-w-app space-y-5 px-1">
      <div>
        <h1 className="text-[22px] font-semibold tracking-tight text-ink">Receive</h1>
        <p className="mt-1 text-[14px] text-slate">
          Share this address or QR to receive any Stellar asset.
        </p>
      </div>

      <div className="rounded-card border border-hairline bg-paper px-5 py-6 text-center shadow-card">
        {qr ? (
          <img src={qr} alt="Your wallet address as a QR code" className="mx-auto h-[220px] w-[220px]" />
        ) : (
          <div className="mx-auto h-[220px] w-[220px] animate-pulse rounded-card bg-mist" />
        )}
        <div className="mono mt-5 break-all rounded-control bg-mist px-3 py-3 text-[13px] text-ink">
          {address}
        </div>
        <div className="mt-3 flex justify-center">
          <CopyButton value={address} />
        </div>
      </div>
    </div>
  );
}
