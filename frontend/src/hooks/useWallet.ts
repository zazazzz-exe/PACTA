import { createContext, useContext } from 'react';

export interface WalletState {
  address: string | null;
  /** Wallet-reported network passphrase, or null if it could not be determined. */
  network: string | null;
  /** True when the wallet is on testnet, or when the network is unknown. */
  networkOk: boolean;
  connecting: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
  /** Set when the session was auto-locked for inactivity; shown as a notice. */
  lockNotice: string | null;
  clearLockNotice: () => void;
}

export const WalletContext = createContext<WalletState | null>(null);

export function useWallet(): WalletState {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error('useWallet must be used within WalletProvider');
  return ctx;
}
