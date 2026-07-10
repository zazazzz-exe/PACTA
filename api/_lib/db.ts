import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Service-role Supabase client. SERVER-ONLY — never import from frontend code.
// The service role bypasses RLS; every KYC table is deny-by-default (RLS on, no
// policies), so this is the sole path that can read or write them.
let client: SupabaseClient | null = null;

export function db(): SupabaseClient {
  if (client) return client;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    // Surfaced as a 500 by callers; the #1 cause of KYC endpoints failing.
    throw new Error('supabase_not_configured');
  }
  client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return client;
}
