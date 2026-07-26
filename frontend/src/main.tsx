import { StrictMode, useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/react';
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
import { connectWallet, getWalletNetworkPassphrase, getKit } from './lib/wallet';
import { navigate } from './lib/router';
import { proveOwnership, fetchKycStatus, type KycStatus } from './lib/kycClient';
import { friendlyError } from './lib/errors';
import { setActiveNetworkFromPassphrase, isSupportedNetwork } from './lib/activeNetwork';

// Some @stellar/stellar-sdk code paths expect a global Buffer in the browser.
(globalThis as unknown as { Buffer: typeof Buffer }).Buffer =
  (globalThis as unknown as { Buffer?: typeof Buffer }).Buffer || Buffer;

// Auto-lock the session after this much inactivity (security on shared phones).
const IDLE_LIMIT_MS = 15 * 60 * 1000;

// How often to re-read the wallet's network while connected. Wallets have their
// own network picker and emit no event we can subscribe to, so the only way to
// notice a mid-session switch is to ask.
const NETWORK_POLL_MS = 10 * 1000;

function WalletProvider({ children }: { children: ReactNode }) {
  const [address, setAddress] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [network, setNetwork] = useState<string | null>(null);
  const [connectError, setConnectError] = useState<string | null>(null);
  const [lockNotice, setLockNotice] = useState<string | null>(null);
  const [kycStatus, setKycStatus] = useState<KycStatus>('unknown');
  const [kycLoading, setKycLoading] = useState(false);
  const idleTimer = useRef<number | undefined>(undefined);

  const disconnect = useCallback(() => {
    try {
      void getKit().disconnect();
    } catch {
      /* noop */
    }
    setAddress(null);
    setNetwork(null);
    setConnectError(null);
    setKycStatus('unknown');
    setKycLoading(false);
  }, []);

  const connect = useCallback(async () => {
    setConnecting(true);
    setLockNotice(null);
    setConnectError(null);
    try {
      const addr = await connectWallet();
      const passphrase = await getWalletNetworkPassphrase();
      setActiveNetworkFromPassphrase(passphrase);
      setAddress(addr);
      setNetwork(passphrase);
      navigate('/home');
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
      // Surface the failure so the user knows why the connection did not
      // complete (e.g. the wallet extension is not reachable or was declined),
      // instead of silently doing nothing.
      const msg = friendlyError(e);
      console.warn('Wallet connect:', msg);
      setConnectError(msg);
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

  // Follow the wallet if it changes network mid-session. Without this the app
  // keeps using the network read at connect time, so a user who switches to
  // mainnet in their extension would still be pointed at testnet Horizon and
  // sign with the testnet passphrase. Everything network-dependent (balances,
  // activity, the adapter, the signing passphrase, the Pact gate) reads the
  // active network, so updating it here repoints the whole app.
  useEffect(() => {
    if (!address) return;
    let cancelled = false;

    const check = async () => {
      if (cancelled || document.hidden) return;
      const passphrase = await getWalletNetworkPassphrase();
      // null means the wallet would not tell us. Treat unknown as "no change"
      // rather than dropping back to the default network.
      if (cancelled || passphrase == null) return;
      setActiveNetworkFromPassphrase(passphrase);
      setNetwork((prev) => (prev === passphrase ? prev : passphrase));
    };

    const id = window.setInterval(check, NETWORK_POLL_MS);
    const onWake = () => void check();
    window.addEventListener('focus', onWake);
    document.addEventListener('visibilitychange', onWake);
    return () => {
      cancelled = true;
      window.clearInterval(id);
      window.removeEventListener('focus', onWake);
      document.removeEventListener('visibilitychange', onWake);
    };
  }, [address]);

  const networkOk = network == null || isSupportedNetwork(network);

  const value: WalletState = {
    address,
    network,
    networkOk,
    connecting,
    connect,
    disconnect,
    connectError,
    clearConnectError: () => setConnectError(null),
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
    <Analytics />
    <SpeedInsights />
  </StrictMode>,
);
