import { AlertTriangle } from 'lucide-react';
import { useWallet } from '../hooks/useWallet';

// Warns only when the connected wallet is on a network PACTA does not support
// (not testnet and not mainnet), so the user does not sign against an unknown
// network. Mainnet and testnet are both supported and get no warning.
// Best-effort: if the network can't be read (networkOk stays true), no warning.
export function NetworkGuard() {
  const { address, networkOk } = useWallet();
  if (!address || networkOk) return null;

  return (
    <div className="bg-deadline-tint border-b border-deadline/30">
      <div className="mx-auto max-w-6xl px-5 py-2.5 flex items-center gap-2 text-[13px] text-deadline-deep">
        <AlertTriangle size={16} aria-hidden />
        <span>
          Your wallet is on an unsupported network. Switch it to Stellar mainnet or testnet.
        </span>
      </div>
    </div>
  );
}
