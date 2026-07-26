import { Wallet } from 'lucide-react';
import { useWallet } from '../hooks/useWallet';
import { shortAddr } from '../lib/format';
import { Button } from './Button';

export function ConnectButton() {
  const { address, connecting, connect, disconnect, connectError, clearConnectError } = useWallet();

  if (address) {
    return (
      <button
        onClick={disconnect}
        title="Disconnect"
        className="inline-flex items-center gap-2 h-11 px-3.5 rounded-pill bg-paper border border-hairline text-ink hover:bg-mist focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
      >
        <span className="h-2 w-2 rounded-pill bg-accent" aria-hidden />
        <span className="mono text-[13px]">{shortAddr(address, 4, 4)}</span>
      </button>
    );
  }

  return (
    <div className="relative inline-block">
      <Button variant="secondary" className="h-11 px-4 text-[13px]" onClick={connect} disabled={connecting}>
        <Wallet size={16} aria-hidden />
        {connecting ? (
          'Connecting'
        ) : (
          <span>
            Connect<span className="hidden sm:inline">&nbsp;wallet</span>
          </span>
        )}
      </Button>
      {connectError && (
        <div className="absolute left-1/2 top-full z-10 mt-2 w-64 -translate-x-1/2 rounded-card border border-refund/40 bg-refund-tint px-3 py-2 text-left text-[12px] text-refund-deep shadow-card">
          <p>{connectError}</p>
          <button onClick={clearConnectError} className="mt-1 font-medium underline">
            Dismiss
          </button>
        </div>
      )}
    </div>
  );
}
