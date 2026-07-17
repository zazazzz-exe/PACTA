// Pure Activity helpers. No SDK import: this is a wallet-surface support module,
// so it mirrors the Horizon payment-record shape with its own local type.
export interface ActivityItem {
  id: string;
  kind: 'sent' | 'received';
  counterparty: string;
  assetCode: string;
  amount: string; // human decimal string as Horizon returns it
  createdAt: string; // ISO timestamp
  hash: string; // transaction hash
}

// Minimal mirror of the Horizon payments-endpoint records we render. Other
// record types (account_merge, invoke_host_function) are ignored.
export interface RawPaymentRecord {
  id: string;
  type: string;
  created_at: string;
  transaction_hash: string;
  // payment / path payment
  from?: string;
  to?: string;
  amount?: string;
  asset_type?: string;
  asset_code?: string;
  // path payment (strict send/receive) source side
  source_amount?: string;
  source_asset_type?: string;
  source_asset_code?: string;
  // create_account
  account?: string;
  funder?: string;
  starting_balance?: string;
}

const codeOf = (assetType?: string, assetCode?: string): string =>
  assetType === 'native' || !assetType ? 'XLM' : assetCode ?? '???';

// Map raw Horizon payment records (newest-first) for `address` into ActivityItems.
// Unsupported record types are dropped.
export function parseActivity(records: RawPaymentRecord[], address: string): ActivityItem[] {
  const out: ActivityItem[] = [];
  for (const r of records) {
    let item: ActivityItem | null = null;
    if (r.type === 'payment') {
      const received = r.to === address;
      item = {
        id: r.id,
        kind: received ? 'received' : 'sent',
        counterparty: (received ? r.from : r.to) ?? '',
        assetCode: codeOf(r.asset_type, r.asset_code),
        amount: r.amount ?? '0',
        createdAt: r.created_at,
        hash: r.transaction_hash,
      };
    } else if (r.type === 'path_payment_strict_send' || r.type === 'path_payment_strict_receive') {
      const received = r.to === address;
      item = {
        id: r.id,
        kind: received ? 'received' : 'sent',
        counterparty: (received ? r.from : r.to) ?? '',
        // Received: the destination asset/amount. Sent: the source asset/amount.
        assetCode: received
          ? codeOf(r.asset_type, r.asset_code)
          : codeOf(r.source_asset_type, r.source_asset_code),
        amount: (received ? r.amount : r.source_amount) ?? '0',
        createdAt: r.created_at,
        hash: r.transaction_hash,
      };
    } else if (r.type === 'create_account') {
      const received = r.account === address;
      item = {
        id: r.id,
        kind: received ? 'received' : 'sent',
        counterparty: (received ? r.funder : r.account) ?? '',
        assetCode: 'XLM',
        amount: r.starting_balance ?? '0',
        createdAt: r.created_at,
        hash: r.transaction_hash,
      };
    }
    if (item) out.push(item);
  }
  return out;
}

// Compact "time ago" from an ISO timestamp relative to nowMs (passed in for
// deterministic tests). e.g. "just now", "5m", "3h", "2d", or a date.
export function timeAgo(iso: string, nowMs: number): string {
  const then = Date.parse(iso);
  if (Number.isNaN(then)) return '';
  const s = Math.max(0, Math.floor((nowMs - then) / 1000));
  if (s < 45) return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d`;
  return new Date(then).toLocaleDateString();
}
