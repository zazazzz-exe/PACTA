// Shared helpers for the KYC Node functions. Underscore-prefixed dir, so Vercel
// does not route it as an endpoint.

export function json(
  body: unknown,
  status = 200,
  extraHeaders?: Record<string, string>,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', ...(extraHeaders || {}) },
  });
}

const G_ADDRESS = /^G[A-Z2-7]{55}$/;

export function isValidAddress(a: unknown): a is string {
  return typeof a === 'string' && G_ADDRESS.test(a);
}

// Log an error without leaking PII. Never pass user media, names, ID numbers,
// signatures, or full request bodies here — only a tag and the error itself.
export function logError(tag: string, e: unknown): void {
  const msg = e instanceof Error ? e.message : String(e);
  console.error(`[${tag}] ${msg}`);
}

// Best-effort client IP for rate limiting. On Vercel, `x-forwarded-for` and
// `x-real-ip` are set by the platform (client-supplied values are overwritten),
// so the first `x-forwarded-for` entry is the caller. Returns null when unknown.
export function clientIp(req: Request): string | null {
  const xff = req.headers.get('x-forwarded-for');
  const first = xff?.split(',')[0]?.trim();
  if (first) return first;
  const real = req.headers.get('x-real-ip')?.trim();
  return real || null;
}
