import { useState } from 'react';
import type { ActivityItem } from '../../lib/activity';
import type { DisplayCurrency } from '../../lib/money';
import { t } from '../../lib/strings';
import { ActivityReceipt, ActivityRow } from '../ActivityRow';
import { SectionHeader } from './SectionHeader';

// The 4 latest payments as tappable rows (each opens its receipt), plus "See all".
export function RecentActivity({
  items,
  loading,
  currency,
  onSeeAll,
}: {
  items: ActivityItem[];
  loading: boolean;
  currency: DisplayCurrency;
  onSeeAll: () => void;
}) {
  const [open, setOpen] = useState<ActivityItem | null>(null);
  const latest = items.slice(0, 4);
  return (
    <section aria-labelledby="home-activity">
      <SectionHeader id="home-activity" title={t('activity.title')} action={{ label: t('activity.seeAll'), onClick: onSeeAll }} />
      {loading && items.length === 0 ? (
        <div className="space-y-2" aria-hidden>
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-[64px] animate-pulse rounded-card bg-mist" />
          ))}
        </div>
      ) : latest.length === 0 ? (
        <p className="rounded-card border border-card bg-paper px-5 py-6 text-center text-[13px] text-slate">{t('activity.empty')}</p>
      ) : (
        <ul className="divide-y divide-[var(--hairline)] overflow-hidden rounded-card border border-card bg-paper shadow-card">
          {latest.map((item, i) => (
            <ActivityRow key={item.id} item={item} currency={currency} index={i} onOpen={setOpen} />
          ))}
        </ul>
      )}
      <ActivityReceipt item={open} currency={currency} onClose={() => setOpen(null)} />
    </section>
  );
}
