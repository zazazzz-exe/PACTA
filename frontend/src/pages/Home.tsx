import { useMemo, useState } from 'react';
import { m, type Variants } from 'framer-motion';
import { CloudOff } from 'lucide-react';
import { useWallet } from '../hooks/useWallet';
import { useBalances } from '../hooks/useBalances';
import { useActivity } from '../hooks/useActivity';
import { useAgreements } from '../hooks/useAgreements';
import { useActiveNetwork } from '../lib/activeNetwork';
import { navigate } from '../lib/router';
import { useOffline } from '../lib/outbox';
import { t } from '../lib/strings';
import { isOpenPact, summarizePact, type PactSummary } from '../lib/pactSummary';
import { useStoredState } from '../lib/useStoredState';
import type { DisplayCurrency } from '../lib/money';
import { ConnectButton } from '../components/ConnectButton';
import { OfflineNotice } from '../components/OfflineNotice';
import { Greeting } from '../components/home/Greeting';
import { BalanceCard } from '../components/home/BalanceCard';
import { QuickActions } from '../components/home/QuickActions';
import { TipCard } from '../components/home/TipCard';
import { ActivePacts } from '../components/home/ActivePacts';
import { AssetList } from '../components/home/AssetList';
import { RecentActivity } from '../components/home/RecentActivity';
import { Sheet } from '../components/ui/Sheet';
import { Button } from '../components/ui/Button';
import { EASE } from '../components/motion/MotionProvider';
import { Send } from './Send';
import { Receive } from './Receive';

// Home (DESIGN §7.6). Reuses the existing data hooks unchanged; everything
// shown is computed from live reads. Sections fade up 40ms apart on load
// (simple fades with reduced motion, via MotionConfig).
const list: Variants = { show: { transition: { staggerChildren: 0.04 } } };
const item: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: EASE } },
};

export function Home() {
  const { address } = useWallet();
  const net = useActiveNetwork();
  const { balances, loading, error, refetch } = useBalances(address);
  const activity = useActivity(address);
  const pacts = useAgreements(address ?? undefined, net.supportsPacts && !!address);
  const offline = useOffline();
  const [currency, setCurrency] = useStoredState<DisplayCurrency>('pacta.home.currency', 'USD');
  const [sheet, setSheet] = useState<'send' | 'receive' | null>(null);

  const openPacts = useMemo<PactSummary[]>(() => {
    if (!address) return [];
    return pacts.agreements
      .filter(isOpenPact)
      .map((a) => summarizePact(a, address))
      .filter((p): p is PactSummary => p !== null);
  }, [pacts.agreements, address]);

  if (!address) {
    return (
      <div className="mx-auto max-w-app px-1 py-16 text-center">
        <h1 className="text-[22px] font-bold tracking-tight text-ink">{t('connect.title')}</h1>
        <p className="mt-2 text-[15px] text-slate">{t('connect.body')}</p>
        <div className="mt-6 flex justify-center">
          <ConnectButton />
        </div>
      </div>
    );
  }

  const refreshAll = () => {
    refetch();
    activity.refetch();
    if (net.supportsPacts) void pacts.refresh();
  };
  const newPact = () => navigate('/create');

  return (
    <>
      <m.div variants={list} initial="hidden" animate="show" className="mx-auto max-w-app space-y-6 px-1">
        <m.div variants={item}>
          <Greeting address={address} />
        </m.div>

        <m.div variants={item}>
          <BalanceCard address={address} balances={balances} loading={loading} currency={currency} onCurrency={setCurrency} />
        </m.div>

        {offline ? (
          <m.div variants={item}>
            <OfflineNotice />
          </m.div>
        ) : (
          error && (
            <m.div variants={item}>
              <ErrorState message={error} onRetry={refreshAll} />
            </m.div>
          )
        )}

        <m.div variants={item}>
          <QuickActions
            onSend={() => setSheet('send')}
            onReceive={() => setSheet('receive')}
            onConvert={() => navigate('/convert')}
            onNewPact={newPact}
            pactsAvailable={net.supportsPacts}
          />
        </m.div>

        {net.supportsPacts && (
          <m.div variants={item}>
            <TipCard onTry={newPact} />
          </m.div>
        )}

        {net.supportsPacts && (
          <m.div variants={item}>
            <ActivePacts
              pacts={openPacts}
              loading={pacts.loading}
              onOpen={(id) => navigate(`/agreement/${id}`)}
              onStart={newPact}
              onSeeAll={() => navigate('/dashboard')}
            />
          </m.div>
        )}

        <m.div variants={item}>
          <AssetList
            balances={balances}
            currency={currency}
            network={net.key === 'public' ? 'public' : 'testnet'}
            loading={loading}
            onRefresh={refreshAll}
          />
        </m.div>

        <m.div variants={item}>
          <RecentActivity items={activity.items} loading={activity.loading} onSeeAll={() => navigate('/activity')} />
        </m.div>
      </m.div>

      <Sheet open={sheet === 'send'} onClose={() => setSheet(null)} title={t('sheet.send')}>
        <Send embedded onDone={() => setSheet(null)} />
      </Sheet>
      <Sheet open={sheet === 'receive'} onClose={() => setSheet(null)} title={t('sheet.receive')}>
        <Receive embedded />
      </Sheet>
    </>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div role="alert" className="flex items-start gap-3 rounded-card border border-refund/30 bg-refund-tint p-5">
      <CloudOff size={20} aria-hidden className="mt-0.5 shrink-0 text-refund" />
      <div className="min-w-0 flex-1">
        <p className="text-[15px] font-bold text-ink">{t('error.title')}</p>
        <p className="mt-0.5 text-[13px] text-refund-deep">{message}</p>
        <Button size="sm" variant="secondary" className="mt-3" onClick={onRetry}>
          {t('error.retry')}
        </Button>
      </div>
    </div>
  );
}
