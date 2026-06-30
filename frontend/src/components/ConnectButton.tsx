import { Wallet } from 'lucide-react';
import { useWallet } from '../hooks/useWallet';
import { shortAddr } from '../lib/format';
import { Button } from './Button';

export function ConnectButton() {
  const { address, connecting, connect, disconnect } = useWallet();

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
    <Button variant="secondary" className="h-11 px-4 text-[13px]" onClick={connect} disabled={connecting}>
      <Wallet size={16} aria-hidden />
      {connecting ? 'Connecting' : 'Connect wallet'}
    </Button>
  );
}
