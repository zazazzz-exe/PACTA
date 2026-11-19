import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { rpcCspError } from './cspGuard';
import { DEFAULT_MAINNET_RPC_URL } from './networks';

const CSP = "default-src 'self'; connect-src 'self' https://mainnet.sorobanrpc.com https://rpc.example.com";

describe('rpcCspError', () => {
  it('passes when the variable is unset or empty (default host is used)', () => {
    expect(rpcCspError(undefined, CSP)).toBeNull();
    expect(rpcCspError('  ', CSP)).toBeNull();
  });

  it('passes when the host is in connect-src, ignoring the path', () => {
    expect(rpcCspError('https://rpc.example.com/soroban/v1?key=x', CSP)).toBeNull();
  });

  it('fails with a clear message for a host missing from connect-src', () => {
    expect(rpcCspError('https://rpc.other.io', CSP)).toContain('Add "https://rpc.other.io" to connect-src');
  });

  it('fails for an invalid URL or a CSP without connect-src', () => {
    expect(rpcCspError('not a url', CSP)).toContain('not a valid URL');
    expect(rpcCspError('https://rpc.example.com', "default-src 'self'")).toContain('no connect-src');
  });

  it('the real vercel.json allows the default mainnet RPC host', () => {
    const cfg = JSON.parse(
      readFileSync(fileURLToPath(new URL('../../../vercel.json', import.meta.url)), 'utf8'),
    ) as { headers: Array<{ source: string; headers: Array<{ key: string; value: string }> }> };
    const csp =
      cfg.headers
        .find((h) => h.source === '/(.*)')
        ?.headers.find((h) => h.key === 'Content-Security-Policy')?.value ?? '';
    expect(rpcCspError(DEFAULT_MAINNET_RPC_URL, csp)).toBeNull();
  });
});
