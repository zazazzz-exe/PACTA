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
import { toneIndex } from '../ui/Avatar';

const TOKEN_TONES = [
  'bg-accent-tint text-accent',
  'bg-mint-soft text-mint',
  'bg-apricot-soft text-apricot',
  'bg-lilac-soft text-lilac',
];

// Assets (DESIGN §7.6): letter token icon, name + issuer source (duplicate codes
// told apart), Unverified / Testnet only tags, locale amounts with a full-value
// tooltip, value in the chosen currency. Sorted by value; zeros collapse.
export function AssetList({
  balances,
  currency,
  network,
  loading,
  onRefresh,
}: {
  balances: AssetBalance[];
  currency: DisplayCurrency;
  network: 'testnet' | 'public';
  loading: boolean;
  onRefresh: () => void;
}) {
  const [showEmpty, setShowEmpty] = useState(false);
  const { visible, empty } = arrangeAssets(balances, (b) => balanceValue(b, currency));

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
      ) : visible.length === 0 && empty.length === 0 ? (
        <p className="rounded-card border border-card bg-paper px-5 py-6 text-center text-[13px] text-slate">{t('assets.empty')}</p>
      ) : (
        <div className="overflow-hidden rounded-card border border-card bg-paper shadow-card">
          <ul className="divide-y divide-[var(--hairline)]">
            {visible.map((b) => (
              <AssetRowItem key={assetKey(b.asset)} b={b} currency={currency} network={network} />
            ))}
          </ul>
          {empty.length > 0 && (
            <>
              <AnimatePresence initial={false}>
                {showEmpty && (
                  <m.ul
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: DUR.ui, ease: EASE }}
                    className="divide-y divide-[var(--hairline)] overflow-hidden border-t border-card"
                  >
                    {empty.map((b) => (
                      <AssetRowItem key={assetKey(b.asset)} b={b} currency={currency} network={network} />
                    ))}
                  </m.ul>
                )}
              </AnimatePresence>
              <button
                type="button"
                onClick={() => setShowEmpty(!showEmpty)}
                aria-expanded={showEmpty}
                className="flex min-h-tap w-full items-center justify-center gap-1.5 border-t border-card text-[13px] font-semibold text-accent transition hover:bg-mist focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent"
              >
                {showEmpty ? t('assets.hideEmpty') : t('assets.showEmpty', { count: empty.length })}
                <ChevronDown size={16} aria-hidden className={`transition ${showEmpty ? 'rotate-180' : ''}`} />
              </button>
            </>
          )}
        </div>
      )}
    </section>
  );
}

function AssetRowItem({ b, currency, network }: { b: AssetBalance; currency: DisplayCurrency; network: 'testnet' | 'public' }) {
  const label = labelAsset(b.asset, network);
  const amount = formatAssetAmount(b.amount, b.asset.code);
  const value = balanceValue(b, currency);
  const tone = TOKEN_TONES[toneIndex(assetKey(b.asset))];
  return (
    <li className="flex min-h-[68px] items-center gap-3 px-4 py-3">
      <span aria-hidden className={`grid h-10 w-10 shrink-0 place-items-center rounded-pill text-[14px] font-bold ${tone}`}>
        {b.asset.code.slice(0, 1)}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[15px] font-semibold text-ink">{b.asset.code}</span>
          <span className="truncate text-[13px] text-slate">· {label.source}</span>
        </div>
        {(!label.verified || label.testnetOnly) && (
          <div className="mt-1 flex flex-wrap gap-1">
            {label.testnetOnly && <Chip tone="deadline">{t('assets.testnetOnly')}</Chip>}
            {!label.verified && <Chip>{t('assets.unverified')}</Chip>}
          </div>
        )}
      </div>
      <div className="shrink-0 text-right">
        <div className="mono text-[15px] font-semibold text-ink" title={amount.full}>
          {amount.display}
        </div>
        <div className="mono text-[13px] text-slate">
          {value !== undefined ? formatFiat(value, currency) : t('assets.noRate')}
        </div>
      </div>
    </li>
  );
}
