import { describe, it, expect } from 'vitest';
import { createClient } from '@supabase/supabase-js';

// Deny-by-default RLS smoke test. Runs only when a real Supabase project + anon
// key are configured (skipped in normal CI). Proves that the anon key — the only
// key that could ever reach a browser — reads nothing from the KYC tables.
const url = process.env.SUPABASE_URL;
const anon = process.env.SUPABASE_ANON_KEY;

describe.skipIf(!url || !anon)('RLS deny-by-default (integration)', () => {
  for (const table of ['kyc_profile', 'kyc_challenge', 'kyc_consent', 'kyc_event']) {
    it(`anon cannot read ${table}`, async () => {
      const supa = createClient(url!, anon!, { auth: { persistSession: false } });
      const { data, error } = await supa.from(table).select('*').limit(1);
      // With RLS on and no policies, anon gets an empty set (or a denied error).
      expect(Boolean(error) || (Array.isArray(data) && data.length === 0)).toBe(true);
    });
  }
});
