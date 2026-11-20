import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';

// Guards the security headers in vercel.json (served on every route) and the
// removal of the old diagnostic endpoints.

const root = (p: string) => fileURLToPath(new URL(`../../${p}`, import.meta.url));
const cfg = JSON.parse(readFileSync(root('vercel.json'), 'utf8')) as {
  headers: Array<{ source: string; headers: Array<{ key: string; value: string }> }>;
};
const global = cfg.headers.find((h) => h.source === '/(.*)');
const header = (k: string) => global?.headers.find((h) => h.key.toLowerCase() === k.toLowerCase())?.value;

describe('vercel.json security headers', () => {
  it('applies to every route', () => {
    expect(global).toBeDefined();
  });

  it('sets a restrictive Content-Security-Policy', () => {
    const csp = header('Content-Security-Policy') ?? '';
    const directive = (name: string) =>
      csp
        .split(';')
        .map((d) => d.trim())
        .find((d) => d.startsWith(`${name} `));
    expect(directive('frame-ancestors')).toBe("frame-ancestors 'none'");
    expect(directive('default-src')).toBe("default-src 'self'");
    expect(directive('object-src')).toBe("object-src 'none'");
    expect(directive('base-uri')).toBe("base-uri 'self'");
    const scripts = directive('script-src') ?? '';
    expect(scripts).not.toContain('unsafe-inline');
    expect(scripts).not.toContain('unsafe-eval');
    // The app's own network calls must stay allowed.
    const connect = directive('connect-src') ?? '';
    for (const host of [
      'https://horizon.stellar.org',
      'https://horizon-testnet.stellar.org',
      'https://soroban-testnet.stellar.org',
      'https://mainnet.sorobanrpc.com',
    ]) {
      expect(connect).toContain(host);
    }
  });

  it('sets nosniff, a referrer policy, and HSTS', () => {
    expect(header('X-Content-Type-Options')).toBe('nosniff');
    expect(header('Referrer-Policy')).toBe('strict-origin-when-cross-origin');
    const hsts = header('Strict-Transport-Security') ?? '';
    expect(Number(/max-age=(\d+)/.exec(hsts)?.[1])).toBeGreaterThanOrEqual(31536000);
    expect(hsts).toContain('includeSubDomains');
  });

  it('blocks framing in older browsers and limits powerful features', () => {
    expect(header('X-Frame-Options')).toBe('DENY');
    const pp = header('Permissions-Policy') ?? '';
    expect(pp).toContain('camera=(self)'); // KYC liveness capture needs the camera
    expect(pp).toContain('microphone=()');
    expect(pp).toContain('geolocation=()');
  });

  it('does not enable HSTS preload (hard to undo; opt in deliberately)', () => {
    expect(header('Strict-Transport-Security')).not.toContain('preload');
  });

  it('keeps the service worker and manifest cache rules', () => {
    expect(cfg.headers.some((h) => h.source === '/sw.js')).toBe(true);
    expect(cfg.headers.some((h) => h.source === '/manifest.webmanifest')).toBe(true);
  });
});

describe('diagnostic endpoints are removed', () => {
  it.each(['api/healthz.ts', 'api/kyc-ping.ts'])('%s does not exist', (p) => {
    expect(existsSync(root(p))).toBe(false);
  });
});

// Vercel turns every file directly under api/ (outside _-prefixed folders) into
// a Serverless Function, and the Hobby plan allows at most 12 per deployment.
// Tests and helpers must live in api/_tests or api/_lib.
describe('serverless function budget', () => {
  it('ships at most 12 functions and no test files as functions', async () => {
    const { readdirSync } = await import('fs');
    const files = readdirSync(root('api'), { withFileTypes: true })
      .filter((d) => d.isFile() && !d.name.startsWith('_') && /\.(ts|js|mjs|cjs)$/.test(d.name))
      .map((d) => d.name);
    expect(files.filter((f) => /\.test\./.test(f))).toEqual([]);
    expect(files.length).toBeLessThanOrEqual(12);
  });
});
