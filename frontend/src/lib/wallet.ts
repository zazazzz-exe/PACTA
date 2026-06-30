import {
  StellarWalletsKit,
  WalletNetwork,
  FREIGHTER_ID,
  FreighterModule,
  type ISupportedWallet,
} from '@creit.tech/stellar-wallets-kit';
import { NETWORK_PASSPHRASE } from './config';

// Freighter only — the kit modal lists just Freighter (and an install prompt if
// the extension is missing).
export const kit = new StellarWalletsKit({
  network: WalletNetwork.TESTNET,
  selectedWalletId: FREIGHTER_ID,
  modules: [new FreighterModule()],
});

export async function connectWallet(): Promise<string> {
  return new Promise((resolve, reject) => {
    kit.openModal({
      onWalletSelected: async (option: ISupportedWallet) => {
        try {
          kit.setWallet(option.id);
          const { address } = await kit.getAddress();
          resolve(address);
        } catch (e) {
          reject(e);
        }
      },
      onClosed: (err?: Error) => {
        if (err) reject(err);
      },
    });
  });
}

// Best-effort read of the wallet's current network passphrase. Returns null if
// the connected wallet/module does not expose it, so callers can treat unknown
// as "do not block" rather than failing closed.
export async function getWalletNetworkPassphrase(): Promise<string | null> {
  try {
    const n = (await kit.getNetwork()) as { networkPassphrase?: string } | undefined;
    return n?.networkPassphrase ?? null;
  } catch {
    return null;
  }
}

// Adapter consumed by the generated bindings' `signTransaction` option.
export async function signTransaction(
  xdr: string,
  opts?: { networkPassphrase?: string; address?: string },
) {
  const { signedTxXdr, signerAddress } = await kit.signTransaction(xdr, {
    networkPassphrase: opts?.networkPassphrase ?? NETWORK_PASSPHRASE,
    address: opts?.address,
  });
  return { signedTxXdr, signerAddress };
}
