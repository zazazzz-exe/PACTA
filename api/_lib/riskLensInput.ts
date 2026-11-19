// Strict validation of the Risk Lens request body before anything reaches the
// model. The body must be exactly { stats: TraderStats } as computed by
// frontend/src/lib/riskStats.ts (computeTraderStats): known fields only, each a
// bounded number / boolean / null, so the prompt cannot be stuffed with free
// text and the request cannot be oversized.

export const MAX_BODY_BYTES = 4096;

export interface TraderStats {
  address: string;
  hasHistory: boolean;
  totalAgreements: number;
  completed: number;
  refunded: number;
  active: number;
  pending: number;
  cancelled: number;
  completionRate: number | null;
  totalVolumeXlm: number;
  avgDealXlm: number | null;
  largestDealXlm: number | null;
  refundsRecent: number;
  daysSinceLastActivity: number | null;
  contemplatedCapitalXlm: number | null;
  dealVsLargestRatio: number | null;
}

const MAX_COUNT = 1_000_000;
const MAX_AMOUNT = 1e15; // far above any real Pact, still finite
const MAX_DAYS = 100_000;
const MAX_RATIO = 1e9;

// Stellar account (G...) or contract (C..., e.g. a future smart wallet).
const STELLAR_ADDRESS = /^[GC][A-Z2-7]{55}$/;

type Check = (v: unknown) => boolean;
const isInt = (max: number): Check => (v) =>
  typeof v === 'number' && Number.isInteger(v) && v >= 0 && v <= max;
const isNum = (max: number): Check => (v) =>
  typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= max;
const nullable = (c: Check): Check => (v) => v === null || c(v);

const FIELDS: Record<keyof TraderStats, Check> = {
  address: (v) => typeof v === 'string' && STELLAR_ADDRESS.test(v),
  hasHistory: (v) => typeof v === 'boolean',
  totalAgreements: isInt(MAX_COUNT),
  completed: isInt(MAX_COUNT),
  refunded: isInt(MAX_COUNT),
  active: isInt(MAX_COUNT),
  pending: isInt(MAX_COUNT),
  cancelled: isInt(MAX_COUNT),
  completionRate: nullable((v) => typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 1),
  totalVolumeXlm: isNum(MAX_AMOUNT),
  avgDealXlm: nullable(isNum(MAX_AMOUNT)),
  largestDealXlm: nullable(isNum(MAX_AMOUNT)),
  refundsRecent: isInt(MAX_COUNT),
  // Can be -1 when the client clock is slightly behind the ledger.
  daysSinceLastActivity: nullable(
    (v) => typeof v === 'number' && Number.isInteger(v) && v >= -1 && v <= MAX_DAYS,
  ),
  contemplatedCapitalXlm: nullable(isNum(MAX_AMOUNT)),
  dealVsLargestRatio: nullable(isNum(MAX_RATIO)),
};

export type ValidationResult =
  | { ok: true; stats: TraderStats }
  | { ok: false; error: 'too_large' | 'bad_json' | 'invalid_stats'; field?: string };

export function validateRiskLensBody(rawBody: string): ValidationResult {
  if (new TextEncoder().encode(rawBody).length > MAX_BODY_BYTES) return { ok: false, error: 'too_large' };

  let body: unknown;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return { ok: false, error: 'bad_json' };
  }
  if (!isPlainObject(body) || Object.keys(body).length !== 1 || !('stats' in body)) {
    return { ok: false, error: 'invalid_stats' };
  }
  const stats = (body as { stats: unknown }).stats;
  if (!isPlainObject(stats)) return { ok: false, error: 'invalid_stats' };

  const expected = Object.keys(FIELDS);
  for (const k of Object.keys(stats)) {
    if (!(k in FIELDS)) return { ok: false, error: 'invalid_stats', field: k };
  }
  for (const k of expected) {
    if (!(k in stats) || !FIELDS[k as keyof TraderStats]((stats as Record<string, unknown>)[k])) {
      return { ok: false, error: 'invalid_stats', field: k };
    }
  }
  const s = stats as unknown as TraderStats;
  // Internal consistency: the parts cannot exceed the whole.
  if (s.completed + s.refunded + s.active + s.pending + s.cancelled > s.totalAgreements) {
    return { ok: false, error: 'invalid_stats', field: 'totalAgreements' };
  }
  if (s.refundsRecent > s.refunded) return { ok: false, error: 'invalid_stats', field: 'refundsRecent' };
  if (s.hasHistory !== s.totalAgreements > 0) return { ok: false, error: 'invalid_stats', field: 'hasHistory' };

  // Rebuild from the known fields only, so nothing unexpected reaches the prompt.
  const clean = {} as Record<string, unknown>;
  for (const k of expected) clean[k] = (stats as Record<string, unknown>)[k];
  return { ok: true, stats: clean as unknown as TraderStats };
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}
