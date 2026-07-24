import { useEffect, useState } from 'react';
import { type NetworkInfo, DEFAULT_NETWORK, networkForPassphrase } from './networks';

// Subscribable store for the network the app currently operates on. Resolved
// from the connected wallet's reported passphrase (follow-the-wallet). Same
// module-singleton + subscriber pattern as outbox.ts.

let active: NetworkInfo = DEFAULT_NETWORK;
const subs = new Set<() => void>();

export function getActiveNetwork(): NetworkInfo {
  return active;
}

// Set the active network from a wallet-reported passphrase. A supported
// passphrase becomes active; an unsupported/unknown one leaves the last
// supported network in place (so consumers always have a valid network) while
// isSupportedNetwork() reports false so the guard can block actions.
export function setActiveNetworkFromPassphrase(p: string | null): void {
  const next = networkForPassphrase(p);
  if (next && next !== active) {
    active = next;
    subs.forEach((f) => f());
  }
}

export function isSupportedNetwork(p: string | null): boolean {
  return networkForPassphrase(p) !== null;
}

export function useActiveNetwork(): NetworkInfo {
  const [net, setNet] = useState<NetworkInfo>(active);
  useEffect(() => {
    const update = () => setNet(active);
    subs.add(update);
    update();
    return () => {
      subs.delete(update);
    };
  }, []);
  return net;
}
