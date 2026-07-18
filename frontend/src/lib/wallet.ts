import {
  StellarWalletsKit,
  WalletNetwork,
  FREIGHTER_ID,
  FreighterModule,
  AlbedoModule,
  xBullModule,
  LobstrModule,
  RabetModule,
  type ISupportedWallet,
} from '@creit.tech/stellar-wallets-kit';
import { NETWORK_PASSPHRASE } from './config';

// The kit modal lists these Stellar wallets. Albedo and xBull are web-based (no
// extension install), which makes them the easy choice for connecting a SECOND
// wallet to test linked identity. Freighter is the default selection.
//
// Lazily constructed: the StellarWalletsKit constructor touches browser-only
// globals (`window`), which is a hazard at module-import time in tests/SSR.
// Construct it on first use instead of at module scope.
let _kit: StellarWalletsKit | null = null;
export function getKit(): StellarWalletsKit {
  if (!_kit) {
    _kit = new StellarWalletsKit({
      network: WalletNetwork.TESTNET,
      selectedWalletId: FREIGHTER_ID,
      modules: [
        new FreighterModule(),
        new AlbedoModule(),
        new xBullModule(),
        new LobstrModule(),
        new RabetModule(),
      ],
    });
  }
  return _kit;
}

// The wallet id the app is currently connected/acting as, so the link flow can
// temporarily switch to another wallet and then restore this one.
let _selectedWalletId: string = FREIGHTER_ID;

export async function connectWallet(): Promise<string> {
  return new Promise((resolve, reject) => {
    getKit().openModal({
      onWalletSelected: async (option: ISupportedWallet) => {
        try {
          getKit().setWallet(option.id);
          _selectedWalletId = option.id;
          const { address } = await getKit().getAddress();
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

// The wallet id currently selected in the kit (the connected wallet).
export function currentSelectedWalletId(): string {
  return _selectedWalletId;
}

// Open the wallet picker to choose a DIFFERENT wallet to link, returning its id
// + address. This switches the kit's active wallet to the chosen one so the
// caller can sign with it; the caller MUST call restoreSelectedWallet afterward
// to switch back to the connected wallet. Rejects if the user closes the modal.
export async function pickWalletForLink(): Promise<{ id: string; address: string }> {
  return new Promise((resolve, reject) => {
    let settled = false;
    getKit().openModal({
      onWalletSelected: async (option: ISupportedWallet) => {
        settled = true;
        try {
          getKit().setWallet(option.id);
          const { address } = await getKit().getAddress();
          resolve({ id: option.id, address });
        } catch (e) {
          reject(e);
        }
      },
      onClosed: (err?: Error) => {
        if (!settled) reject(err ?? new Error('cancelled'));
      },
    });
  });
}

// Switch the kit back to a previously-selected wallet (after a link temporarily
// selected another). Does not change _selectedWalletId, which still tracks the
// connected wallet.
export function restoreSelectedWallet(id: string): void {
  getKit().setWallet(id);
}

// Best-effort read of the wallet's current network passphrase. Returns null if
// the connected wallet/module does not expose it, so callers can treat unknown
// as "do not block" rather than failing closed.
export async function getWalletNetworkPassphrase(): Promise<string | null> {
  try {
    const n = (await getKit().getNetwork()) as { networkPassphrase?: string } | undefined;
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
  const { signedTxXdr, signerAddress } = await getKit().signTransaction(xdr, {
    networkPassphrase: opts?.networkPassphrase ?? NETWORK_PASSPHRASE,
    address: opts?.address,
  });
  return { signedTxXdr, signerAddress };
}

// Sign an arbitrary message to prove wallet ownership for the KYC layer. This is
// NOT a transaction: it authorizes nothing and moves no funds. The server issues
// the exact message (a one-time challenge) and verifies the returned signature
// against `address`. Freighter has returned the signature as a base64 string in
// some versions and as raw bytes in others, so we normalize to base64 here.
export async function signMessage(
  message: string,
  opts?: { address?: string },
): Promise<{ signedMessage: string; signerAddress?: string }> {
  const res = (await getKit().signMessage(message, {
    networkPassphrase: NETWORK_PASSPHRASE,
    address: opts?.address,
  })) as { signedMessage: unknown; signerAddress?: string };
  return {
    signedMessage: toBase64(res.signedMessage),
    signerAddress: res.signerAddress,
  };
}

// Normalize a signature the wallet may hand back as a base64 string, a
// Uint8Array/Buffer, an ArrayBuffer, or a plain byte array — always to base64.
function toBase64(value: unknown): string {
  if (typeof value === 'string') return value; // already base64 from the wallet
  let bytes: Uint8Array | null = null;
  if (value instanceof Uint8Array) bytes = value;
  else if (value instanceof ArrayBuffer) bytes = new Uint8Array(value);
  else if (Array.isArray(value)) bytes = Uint8Array.from(value as number[]);
  else if (value && typeof value === 'object' && Array.isArray((value as { data?: number[] }).data)) {
    bytes = Uint8Array.from((value as { data: number[] }).data);
  }
  if (!bytes) throw new Error('Unrecognized signature format from wallet');
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}
