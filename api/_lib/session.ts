import jwt from 'jsonwebtoken';

// Short-lived session issued after wallet-ownership proof. The cookie is the
// ONLY thing the browser holds — it authenticates the wallet to the KYC
// endpoints. It carries no KYC status: money-action gating always re-reads the
// DB, so a stale cookie can never assert "verified".

const COOKIE = 'pacta_sess';
const TTL_SECONDS = 30 * 60;

function secret(): string {
  const s = process.env.SESSION_JWT_SECRET;
  if (!s) throw new Error('session_secret_not_configured');
  return s;
}

export function issueSessionToken(address: string): string {
  return jwt.sign({ sub: address }, secret(), {
    algorithm: 'HS256',
    expiresIn: TTL_SECONDS,
  });
}

export function sessionCookie(token: string): string {
  return `${COOKIE}=${token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${TTL_SECONDS}`;
}

export function clearSessionCookie(): string {
  return `${COOKIE}=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0`;
}

// Returns the verified wallet address from the session cookie, or null when the
// cookie is absent, malformed, expired, or tampered.
export function readSession(req: Request): string | null {
  const header = req.headers.get('cookie');
  if (!header) return null;
  const token = readCookie(header, COOKIE);
  if (!token) return null;
  try {
    const payload = jwt.verify(token, secret(), { algorithms: ['HS256'] }) as {
      sub?: unknown;
    };
    return typeof payload.sub === 'string' ? payload.sub : null;
  } catch {
    return null;
  }
}

function readCookie(header: string, name: string): string | null {
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    if (part.slice(0, idx).trim() === name) {
      return decodeURIComponent(part.slice(idx + 1).trim());
    }
  }
  return null;
}
