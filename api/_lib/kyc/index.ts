import type { KycProvider } from './types';
import { mockProvider } from './mock';
import { diditProvider } from './didit';

// Provider factory. Add a real vendor as `case '<id>': return <vendor>Provider;`
// and set KYC_PROVIDER=<id>. No endpoint, schema, or frontend change needed.
export function getProvider(): KycProvider {
  const id = process.env.KYC_PROVIDER || 'mock';
  switch (id) {
    case 'mock':
      return mockProvider;
    case 'didit':
      return diditProvider;
    default:
      throw new Error(`unknown_kyc_provider:${id}`);
  }
}
