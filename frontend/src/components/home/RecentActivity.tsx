import { ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import type { ActivityItem } from '../../lib/activity';
import { formatAssetAmount, relativeTime } from '../../lib/money';
import { shortAddr } from '../../lib/format';
import { t } from '../../lib/strings';
import { SectionHeader } from './SectionHeader';

// The 3 latest items with an icon, a friendly description, relative time and
// amount, plus "See all".
export function RecentActivity({
  items,
  loading,
  onSeeAll,
}: {
  items: ActivityItem[];
  loading: boolean;
  onSeeAll: () => void;
}) {
  const latest = items.slice(0, 3);
  return (
    <section aria-labelledby="home-activity">
      <SectionHeader id="home-activity" title={t('activity.title')} action={{ label: t('activity.seeAll'), onClick: onSeeAll }} />
      {loading && items.length === 0 ? (
        <div className="space-y-2" aria-hidden>
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-[60px] animate-pulse rounded-card bg-mist" />
          ))}
        </div>
      ) : latest.length === 0 ? (
        <p className="rounded-card border border-card bg-paper px-5 py-6 text-center text-[13px] text-slate">{t('activity.empty')}</p>
      ) : (
        <ul className="divide-y divide-[var(--hairline)] overflow-hidden rounded-card border border-card bg-paper shadow-card">
          {latest.map((item) => {
            const received = item.kind === 'received';
            const amount = formatAssetAmount(item.amount, item.assetCode);
            const who = shortAddr(item.counterparty, 4, 4);
            return (
              <li key={item.id} className="flex min-h-[60px] items-center gap-3 px-4 py-3">
                <span
                  aria-hidden
                  className={`grid h-10 w-10 shrink-0 place-items-center rounded-pill ${received ? 'bg-mint-soft text-mint' : 'bg-accent-tint text-accent'}`}
                >
                  {received ? <ArrowDownLeft size={18} /> : <ArrowUpRight size={18} />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[15px] font-semibold text-ink">
                    {received ? t('activity.received') : t('activity.sent')}
                  </p>
                  <p className="truncate text-[13px] text-slate">
                    <span className="mono">{received ? t('activity.from', { who }) : t('activity.to', { who })}</span>
                    {' · '}
                    <time dateTime={item.createdAt}>{relativeTime(item.createdAt)}</time>
                  </p>
                </div>
                <span
                  className={`mono shrink-0 text-[15px] font-semibold ${received ? 'text-mint' : 'text-ink'}`}
                  title={amount.full}
                >
                  {received ? '+' : '−'}
                  {amount.display} <span className="text-[12px] text-slate">{item.assetCode}</span>
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
