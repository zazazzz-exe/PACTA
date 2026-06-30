import { useWallet } from '../hooks/useWallet';
import { shortAddr } from '../lib/format';

export function ConnectButton() {
  const { address, connecting, connect, disconnect } = useWallet();

  if (address) {
    return (
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center gap-2 rounded-xl border border-hairline bg-surface px-3 py-2">
          <span className="h-2 w-2 rounded-full bg-accent shadow-glow" />
          <span className="mono text-xs text-ink">{shortAddr(address, 5, 5)}</span>
          <span className="rounded-md bg-accent-soft px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-accent">
            testnet
          </span>
        </span>
        <button className="btn-ghost px-3 py-2" onClick={disconnect} title="Disconnect">
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <button className="btn-primary" onClick={connect} disabled={connecting}>
      {connecting ? 'Connecting...' : 'Connect Wallet'}
    </button>
  );
}
