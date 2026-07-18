import { ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import { useWallet } from '../hooks/useWallet';
import { useActivity } from '../hooks/useActivity';
import type { ActivityItem } from '../lib/activity';
import { timeAgo, groupByDay } from '../lib/activity';
import { shortAddr } from '../lib/format';
import { txExplorerUrl } from '../lib/config';
import { ConnectButton } from '../components/ConnectButton';

// A small colored asset chip, matching the wallet's asset styling.
function assetTone(code: string): string {
  if (code === 'XLM') return 'bg-accent text-white';
  if (code === 'USDC') return 'bg-accent-deep text-white';
  return 'bg-mist text-slate';
}

function Row({ item, now }: { item: ActivityItem; now: number }) {
  const received = item.kind === 'received';
  return (
    <a
      href={txExplorerUrl(item.hash)}
      target="_blank"
      rel="noreferrer"
      className="flex items-center gap-3 rounded-card border border-hairline bg-paper p-3.5 transition hover:border-accent/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
    >
      <span className="relative shrink-0">
        <span
          className={`grid h-9 w-9 place-items-center rounded-pill text-[11px] font-semibold ${assetTone(item.assetCode)}`}
        >
          {item.assetCode.slice(0, 2)}
        </span>
        <span
          className={`absolute -bottom-1 -right-1 grid h-4 w-4 place-items-center rounded-pill border-2 border-paper ${
            received ? 'bg-accent text-white' : 'bg-slate text-white'
          }`}
        >
          {received ? <ArrowDownLeft size={9} aria-hidden /> : <ArrowUpRight size={9} aria-hidden />}
        </span>
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-medium text-ink">
          {received ? 'Received' : 'Sent'} {item.assetCode}
        </span>
        <span className="mono block truncate text-[12px] text-slate">
          {received ? 'from' : 'to'} {shortAddr(item.counterparty)}
        </span>
      </span>
      <span className="shrink-0 text-right">
        <span className={`mono block text-[15px] ${received ? 'text-accent-deep' : 'text-ink'}`}>
          {received ? '+' : '-'}
          {item.amount} {item.assetCode}
        </span>
        <span className="block text-[12px] text-slate">{timeAgo(item.createdAt, now)}</span>
      </span>
    </a>
  );
}

export function Activity() {
  const { address } = useWallet();
  const { items, loading, error } = useActivity(address);
  const now = Date.now();
  const groups = groupByDay(items, now);

  if (!address) {
    return (
      <div className="mx-auto max-w-app px-1 py-16 text-center">
        <h1 className="text-[22px] font-semibold tracking-tight text-ink">Activity</h1>
        <p className="mt-2 text-[14px] text-slate">Connect a wallet to see your history.</p>
        <div className="mt-6 flex justify-center">
          <ConnectButton />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-app space-y-5 px-1">
      <h1 className="text-[22px] font-semibold tracking-tight text-ink">Activity</h1>

      {error && (
        <p className="rounded-card border border-refund/40 bg-refund-tint p-3 text-[13px] text-refund-deep">{error}</p>
      )}

      {loading && items.length === 0 && (
        <div className="space-y-3">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-card bg-mist" />
          ))}
        </div>
      )}

      {!loading && !error && items.length === 0 && (
        <div className="rounded-card border border-hairline bg-paper p-6 text-center text-[14px] text-slate">
          No activity yet. Your sends, receives, and swaps will show up here.
        </div>
      )}

      {groups.map((group) => (
        <div key={group.label}>
          <h2 className="mb-2 px-1 text-[12px] font-semibold uppercase tracking-wider text-slate">
            {group.label}
          </h2>
          <div className="space-y-2.5">
            {group.items.map((it) => (
              <Row key={it.id} item={it} now={now} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
