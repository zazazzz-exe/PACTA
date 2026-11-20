import { useEffect, useState } from 'react';
import { relayUsable } from '../lib/relay';
import { useActiveNetwork } from '../lib/activeNetwork';

// True when the PACTA fee relayer pays network fees on the active network
// (testnet, relayer enabled). Screens use it to say "Paid by PACTA" and to
// show XLM as optional.
export function useFeesCovered(): boolean {
  const net = useActiveNetwork();
  const [covered, setCovered] = useState(false);
  useEffect(() => {
    let live = true;
    void relayUsable().then((v) => live && setCovered(v));
    return () => {
      live = false;
    };
  }, [net.key]);
  return covered;
}
