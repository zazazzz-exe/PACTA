import { useState } from 'react';
import { AnimatePresence, m } from 'framer-motion';
import { ChevronDown, RefreshCw } from 'lucide-react';
import type { AssetBalance } from '../../lib/adapters/ChainAdapter';
import { arrangeAssets, assetKey, labelAsset } from '../../lib/assetRegistry';
import { balanceValue, formatAssetAmount, formatFiat, type DisplayCurrency } from '../../lib/money';
import { t } from '../../lib/strings';
import { Chip } from '../ui/Chip';
import { IconButton } from '../ui/IconButton';
import { SectionHeader } from './SectionHeader';
import { DUR, EASE } from '../motion/MotionProvider';
import { TokenIcon } from '../TokenIcon';

// How many assets Home shows before "View all assets".
const PREVIEW = 4;

// Assets: one rounded container with clearly separated rows. Token icon,
// code + issuer source (duplicate codes told apart), Unverified / Testnet
// only tags, the real token balance with a full-value tooltip and its value
// in the display currency. Sorted by value; the rest (and empty balances)
// sit behind "View all assets".
export function AssetList({
  balances,
  currency,
  network,
  loading,
  feesCovered = false,
  onRefresh,
}: {
  balances: AssetBalance[];
  currency: DisplayCurrency;
  network: 'testnet' | 'public';
  loading: boolean;
  feesCovered?: boolean;
  onRefresh: () => void;
}) {
  const [showAll, setShowAll] = useState(false);
  const { visible, empty } = arrangeAssets(balances, (b) => balanceValue(b, currency));
  const head = visible.slice(0, PREVIEW);
  const rest = [...visible.slice(PREVIEW), ...empty];

  return (
    <section aria-labelledby="home-assets">
      <SectionHeader
        id="home-assets"
        title={t('assets.title')}
        extra={
          <IconButton label={loading ? t('assets.refreshing') : t('assets.refresh')} onClick={onRefresh} disabled={loading}>
            <RefreshCw size={18} aria-hidden className={loading ? 'animate-spin' : ''} />
          </IconButton>
        }
      />
      {loading && balances.length === 0 ? (
        <div className="space-y-2" aria-hidden>
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-[68px] animate-pulse rounded-card bg-mist" />
          ))}
        </div>
      ) : head.length === 0 && rest.length === 0 ? (
        <p className="rounded-card border border-card bg-paper px-5 py-6 text-center text-[13px] text-slate">{t('assets.empty')}</p>
      ) : (
        <div className="overflow-hidden rounded-card border border-card bg-paper shadow-card">
          <ul className="divide-y divide-[var(--hairline)]">
            {head.map((b) => (
              <AssetRowItem key={assetKey(b.asset)} b={b} currency={currency} network={network} feesCovered={feesCovered} />
            ))}
          </ul>
          {rest.length > 0 && (
            <>
              <AnimatePresence initial={false}>
                {showAll && (
                  <m.ul
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: DUR.ui, ease: EASE }}
                    className={`divide-y divide-[var(--hairline)] overflow-hidden ${head.length ? 'border-t border-card' : ''}`}
                  >
                    {rest.map((b) => (
                      <AssetRowItem key={assetKey(b.asset)} b={b} currency={currency} network={network} feesCovered={feesCovered} />
                    ))}
                  </m.ul>
                )}
              </AnimatePresence>
              <button
                type="button"
                onClick={() => setShowAll(!showAll)}
                aria-expanded={showAll}
                className="flex min-h-tap w-full items-center justify-center gap-1.5 border-t border-card text-[13px] font-semibold text-accent transition hover:bg-mist focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent"
              >
                {showAll ? t('assets.viewLess') : t('assets.viewAll', { count: head.length + rest.length })}
                <ChevronDown size={16} aria-hidden className={`transition ${showAll ? 'rotate-180' : ''}`} />
              </button>
            </>
          )}
        </div>
      )}
    </section>
  );
}

function AssetRowItem({ b, currency, network, feesCovered }: { b: AssetBalance; currency: DisplayCurrency; network: 'testnet' | 'public'; feesCovered: boolean }) {
  const label = labelAsset(b.asset, network);
  // With the fee relayer on, XLM is optional: users may hold and send it, but never need it for fees.
  const optional = feesCovered && b.asset.code === 'XLM' && !b.asset.issuer;
  const amount = formatAssetAmount(b.amount, b.asset.code);
  const value = balanceValue(b, currency);
  return (
    <li className="flex min-h-[68px] items-center gap-3 px-4 py-3 transition-colors hover:bg-mist/50">
      <TokenIcon code={b.asset.code} seed={assetKey(b.asset)} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[15px] font-bold text-ink">{b.asset.code}</span>
          <span className="truncate text-[13px] text-slate">· {label.source}</span>
        </div>
        {(!label.verified || label.testnetOnly || optional) && (
          <div className="mt-1 flex flex-wrap gap-1">
            {optional && <Chip title={t('assets.optionalHint')}>{t('assets.optional')}</Chip>}
            {label.testnetOnly && <Chip tone="deadline">{t('assets.testnetOnly')}</Chip>}
            {!label.verified && <Chip>{t('assets.unverified')}</Chip>}
          </div>
        )}
        {optional && <p className="mt-1 text-[12px] text-slate">{t('assets.optionalHint')}</p>}
      </div>
      <div className="shrink-0 text-right">
        <div className="mono text-[15px] font-semibold text-ink" title={amount.full}>
          {amount.display} <span className="text-[12px] font-medium text-slate">{b.asset.code}</span>
        </div>
        <div className="mono text-[13px] text-slate">
          {value !== undefined ? `≈ ${formatFiat(value, currency).replace(/^≈ /, '')}` : t('assets.noRate')}
        </div>
      </div>
    </li>
  );
}
