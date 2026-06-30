import {
  StellarWalletsKit,
  WalletNetwork,
  FREIGHTER_ID,
  FreighterModule,
  xBullModule,
  AlbedoModule,
  type ISupportedWallet,
} from '@creit.tech/stellar-wallets-kit';
import { NETWORK_PASSPHRASE } from './config';

export const kit = new StellarWalletsKit({
  network: WalletNetwork.TESTNET,
  selectedWalletId: FREIGHTER_ID,
  modules: [new FreighterModule(), new xBullModule(), new AlbedoModule()],
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
