import { createContext, useContext } from 'react';
import type { KycStatus } from '../lib/kycClient';

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
  /** KYC status of the connected wallet; 'unknown' until established this session. */
  kycStatus: KycStatus;
  /** True while proving ownership / loading status. */
  kycLoading: boolean;
  /** Re-read KYC status using the existing session cookie. */
  refreshKyc: () => Promise<void>;
}

export const WalletContext = createContext<WalletState | null>(null);

export function useWallet(): WalletState {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error('useWallet must be used within WalletProvider');
  return ctx;
}
