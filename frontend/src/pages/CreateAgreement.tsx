import { useState } from 'react';
import { useWallet } from '../hooks/useWallet';
import { createAgreement } from '../lib/contract';
import { toBaseUnits } from '../lib/format';
import { friendlyError } from '../lib/errors';
import { navigate } from '../lib/router';
import { TOKEN_SYMBOL } from '../lib/config';

export function CreateAgreement() {
  const { address, connect } = useWallet();
  const [trader, setTrader] = useState('');
  const [capital, setCapital] = useState('100');
  const [bond, setBond] = useState('20');
  const [milestones, setMilestones] = useState('4');
  const [share, setShare] = useState('20');
  const [duration, setDuration] = useState('60');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  if (!address) {
    return (
      <div className="card p-10 text-center">
        <p className="text-ink-muted">Connect your wallet to create an agreement.</p>
        <button className="btn-primary mt-4" onClick={connect}>
          Connect Wallet
        </button>
      </div>
    );
  }

  function validate(): string | null {
    if (!/^G[A-Z2-7]{55}$/.test(trader)) return 'Enter a valid trader address (starts with G).';
    if (trader === address) return 'The trader cannot be the same as the investor.';
    const cap = Number(capital);
    if (!(cap > 0)) return 'Capital must be greater than zero.';
    if (Number(bond) < 0) return 'Bond cannot be negative.';
    const ms = Number(milestones);
    if (!Number.isInteger(ms) || ms < 1) return 'There must be at least one milestone.';
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
        milestones: Number(milestones),
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

  return (
    <div className="mx-auto max-w-xl">
      <button className="mb-4 text-sm text-ink-muted hover:text-ink" onClick={() => navigate('/dashboard')}>
        ← Back to dashboard
      </button>
      <div className="card p-6">
        <h1 className="text-xl font-bold tracking-tight text-ink">New agreement</h1>
        <p className="mt-1 text-sm text-ink-muted">
          You are the investor. Funds move only after both sides fund the escrow.
        </p>

        <form className="mt-6 space-y-5" onSubmit={onSubmit}>
          <Field label="Trader address" hint="The trader you are entrusting funds to.">
            <input
              className="field mono"
              placeholder="G..."
              value={trader}
              onChange={(e) => setTrader(e.target.value.trim())}
              spellCheck={false}
            />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label={`Capital (${TOKEN_SYMBOL})`}>
              <input
                className="field mono"
                type="number"
                min="0"
                step="any"
                value={capital}
                onChange={(e) => setCapital(e.target.value)}
              />
            </Field>
            <Field label={`Security bond (${TOKEN_SYMBOL})`}>
              <input
                className="field mono"
                type="number"
                min="0"
                step="any"
                value={bond}
                onChange={(e) => setBond(e.target.value)}
              />
            </Field>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <Field label="Milestones">
              <input
                className="field mono"
                type="number"
                min="1"
                step="1"
                value={milestones}
                onChange={(e) => setMilestones(e.target.value)}
              />
            </Field>
            <Field label="Profit share %">
              <input
                className="field mono"
                type="number"
                min="0"
                max="100"
                step="any"
                value={share}
                onChange={(e) => setShare(e.target.value)}
              />
            </Field>
            <Field label="Duration (s)" hint="">
              <input
                className="field mono"
                type="number"
                min="0"
                step="1"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
              />
            </Field>
          </div>

          <p className="text-xs text-ink-faint">
            Duration is in seconds and starts when the escrow becomes active. Use 60 for the live
            demo so emergency refund unlocks quickly.
          </p>

          {err && (
            <div className="rounded-xl border border-danger/30 bg-danger-soft p-3 text-sm text-danger">
              {err}
            </div>
          )}

          <button className="btn-primary w-full" type="submit" disabled={busy}>
            {busy ? 'Sign in your wallet...' : 'Create agreement'}
          </button>
        </form>
      </div>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="label">{label}</span>
      {children}
      {hint ? <span className="block text-xs text-ink-faint">{hint}</span> : null}
    </label>
  );
}
