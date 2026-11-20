import type { SupabaseClient } from '@supabase/supabase-js';
import { overLimit } from '../ratelimit.js';
import type { RelayConfig } from './config.js';

// Spend tracking, limits and the relay log (table relay_tx, migration 0005).
// A row is written as 'pending' with the most the relayer could pay BEFORE the
// transaction is submitted, then settled with the fee actually charged, so the
// caps count in-flight spending. Fails CLOSED: if the log cannot be read or
// written, nothing is sponsored.

export type RelayKind = 'classic' | 'soroban' | 'activation' | 'restore';

const HOUR = 60 * 60 * 1000;

export function utcDayStart(now = Date.now()): string {
  const d = new Date(now);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())).toISOString();
}

async function spentSince(supa: SupabaseClient, since: string, wallet?: string): Promise<number> {
  let q = supa.from('relay_tx').select('fee_max, fee_charged, reserves, status').gte('created_at', since);
  if (wallet) q = q.eq('wallet_address', wallet);
  const { data, error } = await q;
  if (error) throw error;
  let sum = 0;
  for (const r of (data ?? []) as { fee_max: number; fee_charged: number | null; reserves: number | null; status: string }[]) {
    if (r.status === 'refused') continue;
    // Fees paid (or still reserved), plus any reserves the sponsor locked.
    sum += Number(r.fee_charged ?? r.fee_max ?? 0) + Number(r.reserves ?? 0);
  }
  return sum;
}

export type LimitResult = { ok: true } | { ok: false; reason: 'rate_limited' | 'wallet_cap' | 'daily_cap' | 'activation_cap' };

export async function checkLimits(
  supa: SupabaseClient,
  cfg: RelayConfig,
  p: { wallet: string; ipHash: string | null; feeMax: number; reserves?: number; kind: RelayKind },
  now = Date.now(),
): Promise<LimitResult> {
  const day = utcDayStart(now);

  if (p.kind === 'activation') {
    if (await overLimit(supa, 'relay_tx', { kind: 'activation' }, now - Date.parse(day), cfg.activationsPerDay)) return { ok: false, reason: 'activation_cap' };
    if (p.ipHash && (await overLimit(supa, 'relay_tx', { kind: 'activation', ip_hash: p.ipHash }, now - Date.parse(day), cfg.activationsPerIpPerDay))) {
      return { ok: false, reason: 'activation_cap' };
    }
  } else {
    if (await overLimit(supa, 'relay_tx', { wallet_address: p.wallet }, HOUR, cfg.walletPerHour)) return { ok: false, reason: 'rate_limited' };
  }
  if (p.ipHash && (await overLimit(supa, 'relay_tx', { ip_hash: p.ipHash }, HOUR, cfg.ipPerHour))) return { ok: false, reason: 'rate_limited' };

  const cost = p.feeMax + (p.reserves ?? 0);
  if ((await spentSince(supa, day)) + cost > cfg.globalDailyCap) return { ok: false, reason: 'daily_cap' };
  if (p.kind !== 'restore' && (await spentSince(supa, day, p.wallet)) + cost > cfg.walletDailyCap) {
    return { ok: false, reason: 'wallet_cap' };
  }
  return { ok: true };
}

export interface LogRow {
  wallet: string;
  ipHash: string | null;
  kind: RelayKind;
  contract?: string;
  fn?: string;
  ops: string[];
  feeMax: number;
  reserves?: number; // XLM the sponsor locks as account / trustline reserves
  innerHash: string;
}

// Reserve: write the pending row and return its id.
export type RelayRowId = string | number;

export async function logPending(supa: SupabaseClient, r: LogRow): Promise<RelayRowId> {
  const { data, error } = await supa
    .from('relay_tx')
    .insert({
      wallet_address: r.wallet,
      ip_hash: r.ipHash,
      kind: r.kind,
      contract_id: r.contract ?? null,
      fn: r.fn ?? null,
      ops: r.ops,
      fee_max: r.feeMax,
      reserves: r.reserves ?? 0,
      inner_hash: r.innerHash,
      status: 'pending',
    })
    .select('id')
    .single();
  if (error) throw error;
  return data.id as RelayRowId;
}

export async function logSettled(
  supa: SupabaseClient,
  id: RelayRowId,
  s: { status: 'success' | 'failed' | 'rejected' | 'pending'; hash?: string; feeCharged?: number | null; error?: string },
): Promise<void> {
  const { error } = await supa
    .from('relay_tx')
    .update({
      status: s.status,
      hash: s.hash ?? null,
      // A transaction the network rejected before inclusion costs nothing.
      fee_charged: s.status === 'rejected' ? 0 : (s.feeCharged ?? null),
      // Reserves are locked only when the transaction succeeded.
      ...(s.status === 'rejected' || s.status === 'failed' ? { reserves: 0 } : {}),
      error: s.error ?? null,
      settled_at: new Date().toISOString(),
    })
    .eq('id', id);
  if (error) throw error;
}

// Structured, PII-free log line for the platform logs (addresses are public chain data).
export function logLine(event: string, fields: Record<string, unknown>): void {
  console.info(JSON.stringify({ tag: 'relay', event, ...fields }));
}
