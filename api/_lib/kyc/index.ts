import type { KycProvider } from './types.js';
import { mockProvider } from './mock.js';
import { diditProvider } from './didit.js';
import { json, logError } from '../http.js';

type Env = Record<string, string | undefined>;

// "Production" is the Vercel production deployment, or a self-hosted build with
// NODE_ENV=production. Vercel preview deployments also run with
// NODE_ENV=production, so on Vercel only VERCEL_ENV decides: previews and local
// dev may use the sandbox provider. A sandbox result never counts in production
// (see identity.ts), so a preview cannot verify a wallet for the live app.
export function isProduction(env: Env = process.env): boolean {
  if (env.VERCEL_ENV) return env.VERCEL_ENV === 'production';
  return env.NODE_ENV === 'production';
}

// Fail closed: in production KYC must run against a real provider. Returns the
// reason KYC is unavailable, or null when the configuration is acceptable. The
// mock provider stays the default only in development.
export function kycConfigError(env: Env = process.env): string | null {
  if (!isProduction(env)) return null;
  const id = (env.KYC_PROVIDER || '').trim();
  if (!id) return 'kyc_provider_unset';
  if (id === 'mock') return 'kyc_provider_mock_in_production';
  return null;
}

// Endpoint guard. Returns a 503 response when KYC is misconfigured for this
// environment, otherwise null. Call it first in every endpoint that reads or
// changes verification state.
export function kycUnavailable(env: Env = process.env): Response | null {
  const reason = kycConfigError(env);
  if (!reason) return null;
  logError('kyc-config', new Error(`${reason}: set KYC_PROVIDER to a real provider (e.g. didit)`));
  return json({ error: 'kyc_not_configured' }, 503);
}

// Provider factory. Add a real vendor as `case '<id>': return <vendor>Provider;`
// and set KYC_PROVIDER=<id>. No endpoint, schema, or frontend change needed.
export function getProvider(env: Env = process.env): KycProvider {
  const reason = kycConfigError(env);
  if (reason) throw new Error(reason); // defense in depth behind kycUnavailable()
  const id = env.KYC_PROVIDER || 'mock';
  switch (id) {
    case 'mock':
      return mockProvider;
    case 'didit':
      return diditProvider;
    default:
      throw new Error(`unknown_kyc_provider:${id}`);
  }
}
