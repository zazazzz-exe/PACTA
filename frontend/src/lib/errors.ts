// Map contract Error codes (PRD §8.4) to friendly, OFW-friendly UI messages.
const FRIENDLY: Record<number, string> = {
  1: 'This contract is already initialized.',
  2: 'Agreement not found.',
  3: 'You are not authorized for this action.',
  4: 'This action is not allowed in the agreement current state.',
  5: 'The amount is invalid.',
  6: 'There must be at least one milestone.',
  7: 'The bond has already been posted.',
  8: 'The capital has already been deposited.',
  9: 'All milestones have already been released.',
  10: 'The agreement deadline has not passed yet.',
  11: 'Release all milestones before completing.',
};

// Friendly text for known Horizon submitTransaction result_codes.
const HORIZON_OP_FRIENDLY: Record<string, string> = {
  op_no_destination: 'The recipient account does not exist yet on the network.',
  op_no_trust: 'The recipient cannot receive this asset yet (they need a trustline for it).',
  op_underfunded: 'You do not have enough balance to send this amount.',
  op_line_full: 'The recipient cannot receive more of this asset right now.',
  op_too_few_offers:
    'There are not enough offers on the network to convert this amount right now. Try a smaller amount.',
  op_under_dest_min:
    'The price moved past your slippage limit. Get a fresh quote and try again.',
  op_over_source_max:
    'The price moved past your limit. Get a fresh quote and try again.',
  op_no_issuer: 'The destination asset issuer was not found on the network.',
  op_low_reserve:
    'You need a little more XLM to add this asset (each asset needs a small reserve).',
};
const HORIZON_TX_FRIENDLY: Record<string, string> = {
  tx_insufficient_balance:
    'Not enough balance to cover the amount plus the network fee and the minimum reserve.',
  tx_bad_seq: 'That transaction was out of date. Please try again.',
  tx_insufficient_fee: 'The network fee was too low. Please try again.',
};

// Safely read Horizon's `error.response.data.extras.result_codes` shape, if present.
export function horizonResultCodes(
  e: unknown
): { transaction?: string; operations?: string[] } | null {
  if (typeof e !== 'object' || e === null) return null;
  const response = (e as Record<string, unknown>).response;
  if (typeof response !== 'object' || response === null) return null;
  const data = (response as Record<string, unknown>).data;
  if (typeof data !== 'object' || data === null) return null;
  const extras = (data as Record<string, unknown>).extras;
  if (typeof extras !== 'object' || extras === null) return null;
  const resultCodes = (extras as Record<string, unknown>).result_codes;
  if (typeof resultCodes !== 'object' || resultCodes === null) return null;

  const codes = resultCodes as { transaction?: unknown; operations?: unknown };
  const transaction = typeof codes.transaction === 'string' ? codes.transaction : undefined;
  const operations = Array.isArray(codes.operations)
    ? codes.operations.filter((o): o is string => typeof o === 'string')
    : undefined;

  if (transaction === undefined && (operations === undefined || operations.length === 0)) {
    return null;
  }
  return { transaction, operations };
}

// Surface a readable message from whatever the SDK/host threw.
export function friendlyError(e: unknown): string {
  const horizonCodes = horizonResultCodes(e);
  if (horizonCodes) {
    const op = horizonCodes.operations?.find((code) => code in HORIZON_OP_FRIENDLY);
    if (op) return HORIZON_OP_FRIENDLY[op];
    if (horizonCodes.transaction && HORIZON_TX_FRIENDLY[horizonCodes.transaction]) {
      return HORIZON_TX_FRIENDLY[horizonCodes.transaction];
    }
    const fallbackCode = horizonCodes.operations?.[0] ?? horizonCodes.transaction;
    return `Transaction failed (${fallbackCode}).`;
  }

  const raw =
    typeof e === 'string'
      ? e
      : e instanceof Error
        ? e.message
        : (() => {
            try {
              return JSON.stringify(e);
            } catch {
              return String(e);
            }
          })();

  // Host errors look like: Error(Contract, #10)
  const m = raw.match(/Error\((?:Contract|Auth|Value|[^,]+),\s*#?(\d+)\)/i);
  if (m) {
    const code = Number(m[1]);
    if (FRIENDLY[code]) return FRIENDLY[code];
  }
  // Bare numeric code fallback.
  const n = raw.match(/#(\d{1,2})\b/);
  if (n && FRIENDLY[Number(n[1])]) return FRIENDLY[Number(n[1])];

  if (/User (declined|rejected)|cancell?ed/i.test(raw)) {
    return 'You cancelled the request in your wallet.';
  }
  if (/insufficient/i.test(raw)) {
    return 'Insufficient balance for this transaction.';
  }
  return raw.length > 160 ? raw.slice(0, 157) + '...' : raw;
}
