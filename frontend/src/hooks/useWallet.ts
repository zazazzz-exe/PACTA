import { createContext, useContext } from 'react';

export interface WalletState {
  address: string | null;
  connecting: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
}

export const WalletContext = createContext<WalletState | null>(null);

export function useWallet(): WalletState {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error('useWallet must be used within WalletProvider');
  return ctx;
}
