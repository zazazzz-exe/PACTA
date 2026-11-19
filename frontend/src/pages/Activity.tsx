import { useState } from 'react';
import { useWallet } from '../hooks/useWallet';
import { useActivity } from '../hooks/useActivity';
import type { ActivityItem } from '../lib/activity';
import { groupByDay } from '../lib/activity';
import { useDisplayCurrency } from '../lib/displayCurrency';
import { ActivityReceipt, ActivityRow } from '../components/ActivityRow';
import { ConnectButton } from '../components/ConnectButton';
import { useOffline } from '../lib/outbox';
import { OfflineNotice } from '../components/OfflineNotice';

export function Activity() {
  const { address } = useWallet();
  const { items, loading, error } = useActivity(address);
  const offline = useOffline();
  const now = Date.now();
  const groups = groupByDay(items, now);
  const [currency] = useDisplayCurrency();
  const [open, setOpen] = useState<ActivityItem | null>(null);

  if (!address) {
    return (
      <div className="mx-auto max-w-app px-1 py-16 text-center">
        <h1 className="text-[22px] font-bold tracking-tight text-ink">Activity</h1>
        <p className="mt-2 text-[14px] text-slate">Connect a wallet to see your history.</p>
        <div className="mt-6 flex justify-center">
          <ConnectButton />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-app space-y-5 px-1">
      <h1 className="text-[22px] font-bold tracking-tight text-ink">Activity</h1>

      {offline ? (
        <OfflineNotice />
      ) : (
        error && (
          <p className="rounded-card border border-refund/40 bg-refund-tint p-3 text-[13px] text-refund-deep">{error}</p>
        )
      )}

      {loading && items.length === 0 && (
        <div className="space-y-3">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-card bg-mist" />
          ))}
        </div>
      )}

      {!loading && !error && items.length === 0 && (
        <div className="rounded-card border border-card bg-paper p-6 text-center text-[14px] text-slate shadow-card">
          No activity yet. Your sends, receives, and swaps will show up here.
        </div>
      )}

      {groups.map((group) => (
        <div key={group.label}>
          <h2 className="mb-2 px-1 text-[12px] font-semibold uppercase tracking-wider text-slate">
            {group.label}
          </h2>
          <ul className="divide-y divide-[var(--hairline)] overflow-hidden rounded-card border border-card bg-paper shadow-card">
            {group.items.map((it, i) => (
              <ActivityRow key={it.id} item={it} currency={currency} index={i} onOpen={setOpen} />
            ))}
          </ul>
        </div>
      ))}

      <ActivityReceipt item={open} currency={currency} onClose={() => setOpen(null)} />
    </div>
  );
}
