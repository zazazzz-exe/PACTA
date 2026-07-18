// Simulated KYC state for demo mode: a verified identity with linked wallets.
import { DEMO_ADDRESS, DEMO_LINKED } from './index';
import type { KycStatusRead, LinkedWallet } from '../kycClient';

let wallets: string[] = [DEMO_ADDRESS, DEMO_LINKED];
const POOL = [
  'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5',
  'GDCOP33NLUKXJXALCJCPTXJUGS42GZRM5YOYLS5RTKMLZNPORM2Z76GI',
];
let poolIdx = 0;

function linked(): LinkedWallet[] {
  return wallets.map((address, i) => ({
    address,
    isVerifier: i === 0,
    isCurrent: address === DEMO_ADDRESS,
  }));
}

export function demoStatus(): KycStatusRead {
  return {
    kycStatus: 'verified',
    maskedName: 'J** D** C**',
    docType: 'passport',
    docCountry: 'PH',
    docExpiry: '2030-01-01',
    updatedAt: new Date().toISOString(),
    providerMode: 'capture',
    linkedWallets: linked(),
  };
}

export function demoLink(): { linked: boolean; wallets: LinkedWallet[] } {
  const next = POOL[poolIdx % POOL.length];
  poolIdx += 1;
  if (!wallets.includes(next)) wallets.push(next);
  return { linked: true, wallets: linked() };
}

export function demoUnlink(address: string): {
  unlinked?: boolean;
  erased?: boolean;
  wallets?: LinkedWallet[];
} {
  if (address === DEMO_ADDRESS) return { erased: true };
  wallets = wallets.filter((w) => w !== address);
  return { unlinked: true, wallets: linked() };
}
