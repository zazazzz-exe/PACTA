// Build-time guard: the Content-Security-Policy in ../vercel.json only allows
// network calls to known hosts. If VITE_MAINNET_RPC_URL points somewhere else,
// the browser would silently block every mainnet RPC call. The Vite build calls
// this and fails loudly instead (see vite.config.ts).

// Returns an error message when `rpcUrl` is set but its origin is not allowed by
// the CSP's connect-src, otherwise null.
export function rpcCspError(rpcUrl: string | undefined, csp: string): string | null {
  const value = (rpcUrl ?? '').trim();
  if (!value) return null; // unset: the app uses the default host, which is allowed

  let origin: string;
  try {
    origin = new URL(value).origin;
  } catch {
    return `VITE_MAINNET_RPC_URL is not a valid URL: ${value}`;
  }

  const connect = csp
    .split(';')
    .map((d) => d.trim())
    .find((d) => d.startsWith('connect-src '));
  if (!connect) return 'vercel.json CSP has no connect-src directive';

  const sources = connect.split(/\s+/).slice(1);
  if (sources.includes(origin)) return null;

  return (
    `VITE_MAINNET_RPC_URL (${origin}) is not allowed by the Content-Security-Policy ` +
    `connect-src in vercel.json. Add "${origin}" to connect-src, or the browser will ` +
    `block every mainnet RPC call.`
  );
}
