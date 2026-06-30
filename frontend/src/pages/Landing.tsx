import { useEffect } from 'react';
import { useWallet } from '../hooks/useWallet';
import { navigate } from '../lib/router';

const STEPS = [
  {
    n: '01',
    title: 'Create the agreement',
    body: 'Set the trader, capital, security bond, milestones, and a deadline. Nothing moves yet.',
  },
  {
    n: '02',
    title: 'Fund the escrow',
    body: 'The trader posts a bond, you deposit capital. Both are held by the contract, not by either person.',
  },
  {
    n: '03',
    title: 'Release step by step',
    body: 'Approve milestones as trust builds. If the deadline passes, reclaim what is left plus the bond.',
  },
];

export function Landing() {
  const { address, connect, connecting } = useWallet();

  // Once connected from the landing page, move on to the dashboard.
  useEffect(() => {
    if (address) navigate('/dashboard');
  }, [address]);

  return (
    <div className="space-y-16">
      <section className="grid items-center gap-10 pt-6 md:grid-cols-2">
        <div className="space-y-6">
          <span className="inline-flex items-center gap-2 rounded-full border border-hairline bg-surface px-3 py-1 text-xs text-ink-muted">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" />
            Built on Stellar and Soroban
          </span>
          <h1 className="text-4xl font-bold leading-[1.1] tracking-tight text-ink sm:text-5xl">
            Trust, written in code.
          </h1>
          <p className="max-w-md text-lg text-ink-muted">
            Pacta is a non custodial escrow for people who entrust money to independent traders.
            Your capital is locked in a contract. Release it step by step. Get it back if the
            deadline passes.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <button className="btn-primary" onClick={connect} disabled={connecting}>
              {connecting ? 'Connecting...' : 'Connect Wallet'}
            </button>
            <span className="text-sm text-ink-faint">The wallet is your login. No passwords.</span>
          </div>
        </div>

        <div className="card relative overflow-hidden p-6">
          <div className="label mb-4">How your money is protected</div>
          <div className="space-y-3">
            <Proof label="Staged release" value="Exposure limited over time" />
            <Proof label="Security bond" value="Trader posts skin in the game" />
            <Proof label="Emergency refund" value="Unreleased capital + bond back" />
            <Proof label="On chain reputation" value="Every outcome recorded forever" />
          </div>
        </div>
      </section>

      <section>
        <h2 className="mb-6 text-sm font-semibold uppercase tracking-wider text-ink-faint">
          How it works
        </h2>
        <div className="grid gap-4 md:grid-cols-3">
          {STEPS.map((s) => (
            <div key={s.n} className="card p-5">
              <div className="mono text-2xl text-accent">{s.n}</div>
              <div className="mt-3 font-semibold text-ink">{s.title}</div>
              <p className="mt-2 text-sm text-ink-muted">{s.body}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function Proof({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-hairline bg-base/40 px-4 py-3">
      <span className="text-sm font-medium text-ink">{label}</span>
      <span className="text-xs text-ink-muted">{value}</span>
    </div>
  );
}
