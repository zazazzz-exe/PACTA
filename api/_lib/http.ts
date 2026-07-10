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
