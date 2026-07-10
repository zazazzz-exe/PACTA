import type { SupabaseClient } from '@supabase/supabase-js';

// Lightweight DB-backed rate limit: is the count of recent rows in `table`
// matching `filters` within `windowMs` at or above `max`? Keyed by wallet
// address, so it is a basic abuse brake, not DDoS protection — the production
// edge layer (Vercel WAF / IP rate limits) is the real control. Fails OPEN so a
// limiter hiccup never locks out legitimate users.
export async function overLimit(
  supa: SupabaseClient,
  table: string,
  filters: Record<string, string>,
  windowMs: number,
  max: number,
): Promise<boolean> {
  const since = new Date(Date.now() - windowMs).toISOString();
  let q = supa.from(table).select('*', { count: 'exact', head: true }).gte('created_at', since);
  for (const [k, v] of Object.entries(filters)) q = q.eq(k, v);
  const { count, error } = await q;
  if (error) return false;
  return (count ?? 0) >= max;
}
