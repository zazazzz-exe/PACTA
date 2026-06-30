import { StrictMode, useCallback, useState, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { Buffer } from 'buffer';
import './index.css';
import App from './App';
import { WalletContext, type WalletState } from './hooks/useWallet';
import { connectWallet, kit } from './lib/wallet';
import { friendlyError } from './lib/errors';

// Some @stellar/stellar-sdk code paths expect a global Buffer in the browser.
(globalThis as unknown as { Buffer: typeof Buffer }).Buffer =
  (globalThis as unknown as { Buffer?: typeof Buffer }).Buffer || Buffer;

function WalletProvider({ children }: { children: ReactNode }) {
  const [address, setAddress] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);

  const connect = useCallback(async () => {
    setConnecting(true);
    try {
      setAddress(await connectWallet());
    } catch (e) {
      console.warn('Wallet connect:', friendlyError(e));
    } finally {
      setConnecting(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    try {
      void kit.disconnect();
    } catch {
      /* noop */
    }
    setAddress(null);
  }, []);

  const value: WalletState = { address, connecting, connect, disconnect };
  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <WalletProvider>
      <App />
    </WalletProvider>
  </StrictMode>,
);
