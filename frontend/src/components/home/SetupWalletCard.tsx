import { useState } from 'react';
import { Loader2, Sparkles } from 'lucide-react';
import type { AssetBalance } from '../../lib/adapters/ChainAdapter';
import { activateWallet, RelayError } from '../../lib/relay';
import { t } from '../../lib/strings';
import { Button } from '../ui';

// Sponsored wallet setup (fee relayer): a wallet with no account yet, or no
// USDC trustline, is set up with one signature. PACTA pays the account and
// trustline reserves and the fee, so the user never needs XLM.

export function needsSetup(balances: AssetBalance[], usdcIssuer: string | undefined): boolean {
  return !balances.some((b) => b.asset.code === 'USDC' && b.asset.issuer === usdcIssuer);
}

const ERRORS: Record<string, string> = {
  session: 'setup.errorSession',
  activation_cap: 'setup.errorBusy',
  daily_cap: 'setup.errorBusy',
  rate_limited: 'setup.errorBusy',
};

export function SetupWalletCard({ address, onDone }: { address: string; onDone: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    setBusy(true);
    setError(null);
    try {
      await activateWallet(address);
      onDone();
    } catch (e) {
      const key = e instanceof RelayError ? ERRORS[e.code] : undefined;
      setError(t((key ?? 'setup.error') as 'setup.error'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section aria-labelledby="setup-wallet" className="rounded-card border border-card bg-mist p-5 shadow-card">
      <div className="flex items-start gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-tile bg-accent-tint text-accent">
          <Sparkles size={20} aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <h2 id="setup-wallet" className="text-[17px] font-bold text-ink">
            {t('setup.title')}
          </h2>
          <p className="mt-1 text-[14px] text-slate">{t('setup.body')}</p>
        </div>
      </div>
      <Button className="mt-4 w-full" disabled={busy} onClick={run}>
        {busy && <Loader2 size={16} className="animate-spin" aria-hidden />}
        {busy ? t('setup.working') : t('setup.cta')}
      </Button>
      {error && (
        <p role="alert" className="mt-3 text-[13px] font-semibold text-refund">
          {error}
        </p>
      )}
    </section>
  );
}
