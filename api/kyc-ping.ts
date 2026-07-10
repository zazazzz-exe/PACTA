// Diagnostic endpoint: zero imports, zero dependencies. If this returns 200 but
// the other KYC functions 500, the problem is a dependency (supabase/jwt/stellar)
// failing to load — not the handler format. Safe to delete later.
async function handler(_req: Request): Promise<Response> {
  return new Response(JSON.stringify({ ok: true }), {
    headers: { 'content-type': 'application/json' },
  });
}

export default { fetch: handler };
