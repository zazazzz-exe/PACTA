import { describe, it, expect, vi, afterEach } from 'vitest';
import { getProvider, isProduction, kycConfigError, kycUnavailable } from './index';

const PROD_VERCEL = { VERCEL_ENV: 'production' };
const PROD_NODE = { NODE_ENV: 'production' };

afterEach(() => vi.restoreAllMocks());

describe('isProduction', () => {
  it('is true on a Vercel production deployment or NODE_ENV=production', () => {
    expect(isProduction(PROD_VERCEL)).toBe(true);
    expect(isProduction(PROD_NODE)).toBe(true);
  });
  it('is false in development and tests', () => {
    expect(isProduction({})).toBe(false);
    expect(isProduction({ NODE_ENV: 'development', VERCEL_ENV: 'development' })).toBe(false);
    expect(isProduction({ NODE_ENV: 'test' })).toBe(false);
  });
  it('is false on Vercel preview deployments, which also set NODE_ENV=production', () => {
    expect(isProduction({ VERCEL_ENV: 'preview', NODE_ENV: 'production' })).toBe(false);
    expect(kycConfigError({ VERCEL_ENV: 'preview', NODE_ENV: 'production', KYC_PROVIDER: 'mock' })).toBeNull();
    expect(kycConfigError({ VERCEL_ENV: 'preview', NODE_ENV: 'production' })).toBeNull();
  });
  it('still fails closed on Vercel production', () => {
    expect(kycConfigError({ VERCEL_ENV: 'production', NODE_ENV: 'production', KYC_PROVIDER: 'mock' })).toBe(
      'kyc_provider_mock_in_production',
    );
  });
});

describe('KYC fails closed in production', () => {
  for (const [name, prod] of [['VERCEL_ENV', PROD_VERCEL], ['NODE_ENV', PROD_NODE]] as const) {
    it(`refuses an unset provider (${name})`, () => {
      expect(kycConfigError({ ...prod })).toBe('kyc_provider_unset');
      expect(kycConfigError({ ...prod, KYC_PROVIDER: '  ' })).toBe('kyc_provider_unset');
      expect(() => getProvider({ ...prod })).toThrow('kyc_provider_unset');
    });
    it(`refuses the mock provider (${name})`, () => {
      expect(kycConfigError({ ...prod, KYC_PROVIDER: 'mock' })).toBe('kyc_provider_mock_in_production');
      expect(() => getProvider({ ...prod, KYC_PROVIDER: 'mock' })).toThrow('kyc_provider_mock_in_production');
    });
  }

  it('accepts a real provider in production', () => {
    expect(kycConfigError({ ...PROD_VERCEL, KYC_PROVIDER: 'didit' })).toBeNull();
    expect(getProvider({ ...PROD_VERCEL, KYC_PROVIDER: 'didit' }).id).toBe('didit');
  });

  it('kycUnavailable returns a 503 with a clear, PII-free error', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    const res = kycUnavailable({ ...PROD_VERCEL, KYC_PROVIDER: 'mock' });
    expect(res).not.toBeNull();
    expect(res!.status).toBe(503);
    expect(await res!.json()).toEqual({ error: 'kyc_not_configured' });
    expect(log).toHaveBeenCalledOnce();
  });

  it('kycUnavailable is null when the configuration is fine', () => {
    expect(kycUnavailable({ ...PROD_VERCEL, KYC_PROVIDER: 'didit' })).toBeNull();
    expect(kycUnavailable({})).toBeNull();
  });
});

describe('development keeps mock as the default', () => {
  it('unset provider resolves to mock outside production', () => {
    expect(getProvider({}).id).toBe('mock');
    expect(getProvider({ KYC_PROVIDER: 'mock' }).id).toBe('mock');
  });
  it('still rejects unknown providers', () => {
    expect(() => getProvider({ KYC_PROVIDER: 'acme' })).toThrow('unknown_kyc_provider:acme');
  });
});
