import { useState } from 'react';
import { ChevronLeft, Minus, Plus, Loader2 } from 'lucide-react';
import { useWallet } from '../hooks/useWallet';
import { createAgreement } from '../lib/contract';
import { toBaseUnits, shortAddr, isValidStellarAddress } from '../lib/format';
import { friendlyError } from '../lib/errors';
import { navigate } from '../lib/router';
import { TOKEN_SYMBOL } from '../lib/config';
import { Button } from '../components/Button';
import { KycGate } from '../components/kyc/KycGate';
import { RiskLens } from '../components/RiskLens';
import { useRiskLens } from '../hooks/useRiskLens';
import { useDebounce } from '../hooks/useDebounce';

export function CreateAgreement() {
  const { address, connect, kycStatus, kycLoading } = useWallet();
  const [trader, setTrader] = useState('');
  const [capital, setCapital] = useState('100');
  const [bond, setBond] = useState('20');
  const [milestones, setMilestones] = useState(4);
  const [share, setShare] = useState('20');
  const [duration, setDuration] = useState('60');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // AI Risk Lens: debounce the inputs so it fires at most once per distinct
  // (trader, capital) the user settles on. Hooks run before any early return.
  const debouncedTrader = useDebounce(trader);
  const debouncedCapital = useDebounce(capital);
  const contemplatedCapital =
    Number(debouncedCapital) > 0 ? toBaseUnits(Number(debouncedCapital)) : undefined;
  const lensTrader =
    isValidStellarAddress(debouncedTrader) && debouncedTrader !== address ? debouncedTrader : null;
  const lens = useRiskLens(lensTrader, contemplatedCapital);

  if (!address) {
    return (
      <div className="mx-auto max-w-app">
        <div className="bg-paper border border-hairline rounded-card shadow-card p-8 text-center">
          <p className="text-[14px] text-slate">Connect your wallet to create an agreement.</p>
          <Button className="mt-4" onClick={connect}>
            Connect wallet
          </Button>
        </div>
      </div>
    );
  }

  // Creating an agreement locks funds, so it is a gated action (Option B).
  if (kycStatus !== 'verified') {
    return <KycGate status={kycStatus} loading={kycLoading} />;
  }

  function validate(): string | null {
    if (!/^G[A-Z2-7]{55}$/.test(trader)) return "That provider address isn't valid. Check it and try again.";
    if (trader === address) return 'The provider cannot be the same as you.';
    if (!(Number(capital) > 0)) return 'Capital must be greater than zero.';
    if (Number(bond) < 0) return 'Bond cannot be negative.';
    if (!Number.isInteger(milestones) || milestones < 1) return 'There must be at least one milestone.';
    const sh = Number(share);
    if (sh < 0 || sh > 100) return 'Profit share must be between 0 and 100 percent.';
    if (Number(duration) < 0) return 'Duration cannot be negative.';
    return null;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const v = validate();
    if (v) {
      setErr(v);
      return;
    }
    setErr(null);
    setBusy(true);
    try {
      const { result: id } = await createAgreement(address!, {
        investor: address!,
        trader,
        capital: toBaseUnits(Number(capital)),
        bond: toBaseUnits(Number(bond)),
        milestones,
        profit_share_bps: Math.round(Number(share) * 100),
        duration: BigInt(Math.round(Number(duration))),
      });
      navigate(`/agreement/${id.toString()}`);
    } catch (e2) {
      setErr(friendlyError(e2));
    } finally {
      setBusy(false);
    }
  }

  const traderLabel = /^G[A-Z2-7]{55}$/.test(trader) ? shortAddr(trader, 4, 4) : 'The provider';

  return (
    <div className="mx-auto max-w-app">
      <div className="flex items-center gap-2 mb-4">
        <button
          onClick={() => navigate('/dashboard')}
          aria-label="Back to dashboard"
          className="grid h-11 w-11 place-items-center rounded-control text-slate hover:bg-mist focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
        >
          <ChevronLeft size={20} aria-hidden />
        </button>
        <h1 className="text-[22px] font-medium tracking-tight text-ink">New agreement</h1>
      </div>

      <form className="space-y-4" onSubmit={onSubmit}>
        <Field label="Provider address">
          <Input mono placeholder="G..." value={trader} onChange={(v) => setTrader(v.trim())} spellCheck={false} />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label={`Capital (${TOKEN_SYMBOL})`}>
            <Input mono type="number" min="0" step="any" value={capital} onChange={setCapital} />
          </Field>
          <Field label={`Security bond (${TOKEN_SYMBOL})`}>
            <Input mono type="number" min="0" step="any" value={bond} onChange={setBond} />
          </Field>
        </div>

        <Field label="Milestones">
          <Stepper value={milestones} min={1} onChange={setMilestones} />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Profit share (%)">
            <Input mono type="number" min="0" max="100" step="any" value={share} onChange={setShare} />
          </Field>
          <Field label="Duration (seconds)">
            <Input mono type="number" min="0" step="1" value={duration} onChange={setDuration} />
          </Field>
        </div>
        <p className="text-[12px] text-fog -mt-1">
          Duration is in seconds and starts when the escrow becomes active. Use 60 for the live demo.
        </p>

        {/* AI Risk Lens — appears once a valid trader address is entered */}
        {lensTrader && (
          <RiskLens
            read={lens.data}
            loading={lens.loading}
            error={lens.error}
            onApply={(m) => setMilestones(m)}
          />
        )}

        {/* Plain-language summary */}
        <div className="bg-mist rounded-control p-4 text-[14px] leading-relaxed text-slate">
          You lock <span className="mono text-ink">{capital || 0} XLM</span>. {traderLabel} posts a{' '}
          <span className="mono text-ink">{bond || 0} XLM</span> bond. Release in{' '}
          <span className="mono text-ink">{milestones}</span> {milestones === 1 ? 'step' : 'steps'}.
          Refund if the deadline passes.
        </div>

        {err && <p className="text-refund text-[13px]">{err}</p>}

        <Button className="w-full" type="submit" disabled={busy}>
          {busy ? (
            <>
              <Loader2 size={18} className="animate-spin" aria-hidden /> Waiting for the network to confirm
            </>
          ) : (
            'Create agreement'
          )}
        </Button>
      </form>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-[13px] text-slate mb-1.5">{label}</span>
      {children}
    </label>
  );
}

function Input({
  value,
  onChange,
  mono,
  ...rest
}: {
  value: string;
  onChange: (v: string) => void;
  mono?: boolean;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'>) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`w-full h-12 px-3.5 rounded-control bg-paper border border-hairline text-ink placeholder:text-fog focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/15 ${
        mono ? 'mono' : ''
      }`}
      {...rest}
    />
  );
}

function Stepper({
  value,
  min,
  onChange,
}: {
  value: number;
  min: number;
  onChange: (v: number) => void;
}) {
  const btn =
    'grid h-12 w-12 shrink-0 place-items-center rounded-control bg-paper border border-hairline-strong text-ink hover:bg-mist disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40';
  return (
    <div className="flex items-center gap-3">
      <button type="button" className={btn} aria-label="Fewer milestones" disabled={value <= min} onClick={() => onChange(Math.max(min, value - 1))}>
        <Minus size={18} aria-hidden />
      </button>
      <span className="mono text-[18px] text-ink w-8 text-center">{value}</span>
      <button type="button" className={btn} aria-label="More milestones" onClick={() => onChange(value + 1)}>
        <Plus size={18} aria-hidden />
      </button>
    </div>
  );
}
