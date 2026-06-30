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

// Surface a readable message from whatever the SDK/host threw.
export function friendlyError(e: unknown): string {
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
