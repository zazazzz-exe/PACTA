import { useStoredState } from './useStoredState';
import type { DisplayCurrency } from './money';

// The app-wide display currency (USD by default, because balances are USDC).
// A display preference only: it never changes token amounts or what is sent
// on chain. Remembered on this device and shared by every screen.
export function useDisplayCurrency(): [DisplayCurrency, (c: DisplayCurrency) => void] {
  return useStoredState<DisplayCurrency>('pacta.home.currency', 'USD');
}
