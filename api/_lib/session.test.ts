import { describe, it, expect, beforeAll } from 'vitest';
import { issueSessionToken, readSession, sessionCookie, clearSessionCookie } from './session';
import { isValidAddress, json } from './http';

beforeAll(() => {
  process.env.SESSION_JWT_SECRET = 'test-secret-at-least-32-bytes-long-xxxxx';
});

const ADDR = 'G' + 'A'.repeat(55);

function reqWithCookie(cookie?: string): Request {
  return new Request('http://localhost/api/x', {
    headers: cookie ? { cookie } : {},
  });
}

describe('session', () => {
  it('round-trips a wallet address through the session cookie', () => {
    const token = issueSessionToken(ADDR);
    const cookie = sessionCookie(token);
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('Secure');
    expect(cookie).toContain('SameSite=Strict');
    expect(readSession(reqWithCookie(`pacta_sess=${token}`))).toBe(ADDR);
  });

  it('returns null when no cookie is present', () => {
    expect(readSession(reqWithCookie())).toBeNull();
  });

  it('returns null for a tampered token', () => {
    const token = issueSessionToken(ADDR);
    expect(readSession(reqWithCookie(`pacta_sess=${token}x`))).toBeNull();
  });

  it('ignores an unrelated cookie', () => {
    expect(readSession(reqWithCookie('other=value; another=1'))).toBeNull();
  });

  it('clearSessionCookie expires the cookie', () => {
    expect(clearSessionCookie()).toContain('Max-Age=0');
  });
});

describe('http helpers', () => {
  it('validates Stellar G-addresses', () => {
    expect(isValidAddress(ADDR)).toBe(true);
    expect(isValidAddress('GABC')).toBe(false);
    expect(isValidAddress(123)).toBe(false);
    expect(isValidAddress(undefined)).toBe(false);
  });

  it('json() sets status and content-type', async () => {
    const r = json({ a: 1 }, 201, { 'set-cookie': 'x=1' });
    expect(r.status).toBe(201);
    expect(r.headers.get('content-type')).toBe('application/json');
    expect(r.headers.get('set-cookie')).toBe('x=1');
    expect(await r.json()).toEqual({ a: 1 });
  });
});
