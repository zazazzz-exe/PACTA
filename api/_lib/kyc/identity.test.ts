import { describe, it, expect, afterEach } from 'vitest';
import { effectiveRow } from './identity';

const row = { status: 'verified' as const, provider: 'mock', masked_name: 'J** D**', doc_expiry: '2030-01-01' };
const saved = { ...process.env };
afterEach(() => {
  process.env = { ...saved };
});

describe('sandbox results never count in production', () => {
  it('reads a mock verification as unverified on Vercel production', () => {
    process.env.VERCEL_ENV = 'production';
    expect(effectiveRow(row)).toMatchObject({ status: 'unverified', masked_name: null, doc_expiry: null });
  });
  it('keeps a mock verification on previews and in dev', () => {
    process.env.VERCEL_ENV = 'preview';
    process.env.NODE_ENV = 'production';
    expect(effectiveRow(row).status).toBe('verified');
    delete process.env.VERCEL_ENV;
    process.env.NODE_ENV = 'development';
    expect(effectiveRow(row).status).toBe('verified');
  });
  it('keeps a real provider verification in production', () => {
    process.env.VERCEL_ENV = 'production';
    expect(effectiveRow({ ...row, provider: 'didit' }).status).toBe('verified');
  });
});
