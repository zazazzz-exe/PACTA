import { StrictMode, useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { Buffer } from 'buffer';
import '@fontsource/hanken-grotesk/400.css';
import '@fontsource/hanken-grotesk/500.css';
import '@fontsource/hanken-grotesk/600.css';
import '@fontsource/jetbrains-mono/400.css';
import '@fontsource/jetbrains-mono/500.css';
import './index.css';
import App from './App';
import { TourProvider } from './components/Tour';
import { WalletContext, type WalletState } from './hooks/useWallet';
import { connectWallet, getWalletNetworkPassphrase, kit } from './lib/wallet';
import { navigate } from './lib/router';
import { proveOwnership, fetchKycStatus, type KycStatus } from './lib/kycClient';
import { friendlyError } from './lib/errors';
import { NETWORK_PASSPHRASE } from './lib/config';

// Some @stellar/stellar-sdk code paths expect a global Buffer in the browser.
(globalThis as unknown as { Buffer: typeof Buffer }).Buffer =
  (globalThis as unknown as { Buffer?: typeof Buffer }).Buffer || Buffer;

// Auto-lock the session after this much inactivity (security on shared phones).
const IDLE_LIMIT_MS = 15 * 60 * 1000;

function WalletProvider({ children }: { children: ReactNode }) {
  const [address, setAddress] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [network, setNetwork] = useState<string | null>(null);
  const [lockNotice, setLockNotice] = useState<string | null>(null);
  const [kycStatus, setKycStatus] = useState<KycStatus>('unknown');
  const [kycLoading, setKycLoading] = useState(false);
  const idleTimer = useRef<number | undefined>(undefined);

  const disconnect = useCallback(() => {
    try {
      void kit.disconnect();
    } catch {
      /* noop */
    }
    setAddress(null);
    setNetwork(null);
    setKycStatus('unknown');
    setKycLoading(false);
  }, []);

  const connect = useCallback(async () => {
    setConnecting(true);
    setLockNotice(null);
    try {
      const addr = await connectWallet();
      setAddress(addr);
      navigate('/home');
      setNetwork(await getWalletNetworkPassphrase());
      // Prove wallet ownership for the KYC layer, then load status. A failure
      // here (backend not configured, or the user declines the signature) must
      // not break the connection: the app stays usable and only money actions
      // gate on 'verified'.
      setKycLoading(true);
      try {
        setKycStatus(await proveOwnership(addr));
      } catch (e) {
        console.warn('KYC unavailable:', friendlyError(e));
        setKycStatus('unknown');
      } finally {
        setKycLoading(false);
      }
    } catch (e) {
      console.warn('Wallet connect:', friendlyError(e));
    } finally {
      setConnecting(false);
    }
  }, []);

  const refreshKyc = useCallback(async () => {
    setKycLoading(true);
    try {
      setKycStatus((await fetchKycStatus()).kycStatus);
    } catch (e) {
      console.warn('KYC status:', friendlyError(e));
    } finally {
      setKycLoading(false);
    }
  }, []);

  // Inactivity auto-lock. Any user activity resets the countdown.
  useEffect(() => {
    if (!address) return;
    const reset = () => {
      window.clearTimeout(idleTimer.current);
      idleTimer.current = window.setTimeout(() => {
        disconnect();
        setLockNotice('Disconnected after 15 minutes of inactivity to keep your wallet safe.');
      }, IDLE_LIMIT_MS);
    };
    const events: (keyof WindowEventMap)[] = ['pointerdown', 'keydown', 'scroll', 'touchstart'];
    events.forEach((ev) => window.addEventListener(ev, reset, { passive: true }));
    reset();
    return () => {
      window.clearTimeout(idleTimer.current);
      events.forEach((ev) => window.removeEventListener(ev, reset));
    };
  }, [address, disconnect]);

  const networkOk = network == null || network === NETWORK_PASSPHRASE;

  const value: WalletState = {
    address,
    network,
    networkOk,
    connecting,
    connect,
    disconnect,
    lockNotice,
    clearLockNotice: () => setLockNotice(null),
    kycStatus,
    kycLoading,
    refreshKyc,
  };
  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <WalletProvider>
      <TourProvider>
        <App />
      </TourProvider>
    </WalletProvider>
  </StrictMode>,
);
