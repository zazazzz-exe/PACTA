import { m } from 'framer-motion';
import { ArrowDownLeft, ArrowUpRight, CheckCircle2, ExternalLink } from 'lucide-react';
import type { ActivityItem } from '../lib/activity';
import { amountValue, formatAssetAmount, formatFiat, relativeTime, type DisplayCurrency } from '../lib/money';
import { shortAddr } from '../lib/format';
import { txExplorerUrl } from '../lib/config';
import { t } from '../lib/strings';
import { CopyButton } from './CopyButton';
import { Sheet } from './ui/Sheet';
import { EASE } from './motion/MotionProvider';

// One payment from Horizon as a tappable row: direction icon, description,
// counterparty, time, token amount and its display-currency value. Tapping it
// opens <ActivityReceipt>. Payments listed by Horizon are settled ledger
// operations, so the status shown is "Completed".
export function ActivityRow({
  item,
  currency,
  index = 0,
  onOpen,
}: {
  item: ActivityItem;
  currency: DisplayCurrency;
  index?: number;
  onOpen: (item: ActivityItem) => void;
}) {
  const received = item.kind === 'received';
  const amount = formatAssetAmount(item.amount, item.assetCode);
  const value = amountValue(item.assetCode, Number(item.amount), currency);
  const who = shortAddr(item.counterparty, 4, 4);
  return (
    <m.li
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: EASE, delay: Math.min(index, 6) * 0.04 }}
    >
      <button
        type="button"
        onClick={() => onOpen(item)}
        className="flex min-h-[64px] w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-mist/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent"
      >
        <span
          aria-hidden
          className={`grid h-10 w-10 shrink-0 place-items-center rounded-[14px] ${received ? 'bg-mint-soft text-mint' : 'bg-accent-tint text-accent'}`}
        >
          {received ? <ArrowDownLeft size={18} /> : <ArrowUpRight size={18} />}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[15px] font-semibold text-ink">
            {received ? t('activity.paymentReceived') : t('activity.paymentSent')}
          </span>
          <span className="block truncate text-[13px] text-slate">
            <span className="mono">{received ? t('activity.from', { who }) : t('activity.to', { who })}</span>
            {' · '}
            <time dateTime={item.createdAt}>{relativeTime(item.createdAt)}</time>
          </span>
        </span>
        <span className="shrink-0 text-right">
          <span className={`mono block text-[15px] font-semibold ${received ? 'text-mint' : 'text-ink'}`} title={amount.full}>
            {received ? '+' : '−'}
            {amount.display} <span className="text-[12px] font-medium text-slate">{item.assetCode}</span>
          </span>
          {value !== undefined && (
            <span className="mono block text-[12px] text-slate">
              {received ? '+' : '−'}
              {formatFiat(value, currency)}
            </span>
          )}
        </span>
      </button>
    </m.li>
  );
}

// Receipt and details for one payment, with a link to the public explorer.
export function ActivityReceipt({
  item,
  currency,
  onClose,
}: {
  item: ActivityItem | null;
  currency: DisplayCurrency;
  onClose: () => void;
}) {
  const received = item?.kind === 'received';
  const amount = item ? formatAssetAmount(item.amount, item.assetCode) : null;
  const value = item ? amountValue(item.assetCode, Number(item.amount), currency) : undefined;
  return (
    <Sheet open={!!item} onClose={onClose} title={t('receipt.title')}>
      {item && amount && (
        <div className="space-y-4">
          <div className="rounded-card border border-card bg-mist p-5 text-center">
            <span
              aria-hidden
              className={`mx-auto grid h-12 w-12 place-items-center rounded-[16px] ${received ? 'bg-mint-soft text-mint' : 'bg-accent-tint text-accent'}`}
            >
              {received ? <ArrowDownLeft size={22} /> : <ArrowUpRight size={22} />}
            </span>
            <p className="mt-3 text-[13px] font-semibold text-slate">
              {received ? t('activity.paymentReceived') : t('activity.paymentSent')}
            </p>
            <p className={`mono mt-1 text-[28px] font-bold ${received ? 'text-mint' : 'text-ink'}`} title={amount.full}>
              {received ? '+' : '−'}
              {amount.display} {item.assetCode}
            </p>
            {value !== undefined && (
              <p className="mono text-[13px] text-slate">
                {formatFiat(value, currency)}
                {currency === 'PHP' ? ` · ${t('balance.estimate')}` : ''}
              </p>
            )}
            <span className="mt-3 inline-flex items-center gap-1.5 rounded-pill bg-mint-soft px-3 py-1 text-[12px] font-bold text-mint">
              <CheckCircle2 size={14} aria-hidden /> {t('receipt.completed')}
            </span>
          </div>

          <dl className="divide-y divide-[var(--hairline)] rounded-card border border-card bg-paper text-[14px]">
            <div className="flex items-center justify-between gap-3 px-4 py-3">
              <dt className="text-slate">{received ? t('receipt.from') : t('receipt.to')}</dt>
              <dd className="flex items-center gap-1">
                <span className="mono text-ink">{shortAddr(item.counterparty, 6, 6)}</span>
                <CopyButton value={item.counterparty} label={t('receipt.copyAddress')} className="text-slate" />
              </dd>
            </div>
            <div className="flex items-center justify-between gap-3 px-4 py-3">
              <dt className="text-slate">{t('receipt.date')}</dt>
              <dd className="text-ink">
                <time dateTime={item.createdAt}>
                  {new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(item.createdAt))}
                </time>
              </dd>
            </div>
            <div className="flex items-center justify-between gap-3 px-4 py-3">
              <dt className="text-slate">{t('receipt.tx')}</dt>
              <dd className="flex items-center gap-1">
                <span className="mono text-ink">{shortAddr(item.hash, 6, 6)}</span>
                <CopyButton value={item.hash} label={t('receipt.copyTx')} className="text-slate" />
              </dd>
            </div>
          </dl>

          <a
            href={txExplorerUrl(item.hash)}
            target="_blank"
            rel="noreferrer"
            className="flex min-h-tap items-center justify-center gap-2 rounded-pill border border-card bg-paper text-[14px] font-bold text-accent transition hover:bg-mist focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            {t('receipt.explorer')} <ExternalLink size={16} aria-hidden />
          </a>
        </div>
      )}
    </Sheet>
  );
}
