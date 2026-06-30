import { AlertTriangle } from 'lucide-react';
import { useWallet } from '../hooks/useWallet';

// Warns when the connected wallet is not on testnet, so the user does not sign
// against the wrong network. Best-effort: if the network can't be read, no warning.
export function NetworkGuard() {
  const { address, networkOk } = useWallet();
  if (!address || networkOk) return null;

  return (
    <div className="bg-deadline-tint border-b border-deadline/30">
      <div className="mx-auto max-w-6xl px-5 py-2.5 flex items-center gap-2 text-[13px] text-deadline-deep">
        <AlertTriangle size={16} aria-hidden />
        <span>
          Your wallet is not on testnet. Switch it to the Stellar test network before signing.
        </span>
      </div>
    </div>
  );
}
