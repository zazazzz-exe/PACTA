import { useEffect } from 'react';
import { Lock, Clock, ShieldCheck } from 'lucide-react';
import { useWallet } from '../hooks/useWallet';
import { useTour } from '../components/Tour';
import { landingSteps } from '../lib/tours';
import { seenTour, markTourSeen } from '../lib/tourSeen';
import { navigate } from '../lib/router';
import { HeroFlow } from '../components/HeroFlow';
import { ProofPanel } from '../components/ProofPanel';
import { CONTRACT_ID, contractExplorerUrl } from '../lib/config';
import { shortAddr } from '../lib/format';

const STEPS = [
  { icon: Lock, title: 'Lock capital in a contract', body: 'Your money sits in code, not in a person’s hands.' },
  { icon: ShieldCheck, title: 'The trader posts a bond', body: 'Skin in the game. It is yours if they walk away.' },
  { icon: Clock, title: 'Release step by step', body: 'Approve milestones as trust builds, or refund at the deadline.' },
];

export function Landing() {
  const { address, connect } = useWallet();
  const { start } = useTour();

  // Once connected, move on to the dashboard (behavior unchanged from PRD §9).
  useEffect(() => {
    if (address) navigate('/dashboard');
  }, [address]);

  // Auto-start the tour on first visit, after entrance animations settle.
  // Mark "seen" inside the timeout so React StrictMode's double-invoke does not
  // flag it before the tour actually starts.
  useEffect(() => {
    if (address || seenTour('landing')) return;
    const t = setTimeout(() => {
      markTourSeen('landing');
      start(landingSteps);
    }, 800);
    return () => clearTimeout(t);
  }, [address, start]);

  return (
    <div className="mx-auto max-w-5xl">
      {/* Animated escrow-flow hero (LANDING_HERO.md) */}
      <HeroFlow onConnect={connect} />

      {/* Provable on-chain — the live proof panel artifact */}
      <section className="mt-12 md:mt-16">
        <h2 className="animate-rise text-center text-[13px] font-medium uppercase tracking-wide text-fog">
          Provable on-chain
        </h2>
        <div className="animate-rise mx-auto mt-4 max-w-app" style={{ animationDelay: '80ms' }} data-tour="proof">
          <ProofPanel
            id="agr-001"
            protectedAmount="75.0000000"
            txHash="9f3a…b1c4"
            contractShort={shortAddr(CONTRACT_ID, 6, 6)}
            explorerUrl={contractExplorerUrl()}
            countUp
          />
        </div>
        <p className="mx-auto mt-3 max-w-[440px] text-center text-[13px] leading-relaxed text-slate">
          Every agreement is a real Soroban contract. Verify the funds, the bond, and every release
          on Stellar.
        </p>
      </section>

      <section className="mt-12 md:mt-16" data-tour="how">
        <h2 className="animate-rise text-[13px] font-medium uppercase tracking-wide text-fog">
          How it works
        </h2>
        <ul className="mt-4 grid gap-3 sm:grid-cols-3">
          {STEPS.map(({ icon: Icon, title, body }, i) => (
            <li
              key={title}
              className="animate-rise flex gap-3 sm:flex-col sm:rounded-card sm:p-4 sm:transition sm:hover:bg-mist"
              style={{ animationDelay: `${320 + i * 80}ms` }}
            >
              <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-control bg-accent-tint text-accent-deep">
                <Icon size={18} aria-hidden />
              </span>
              <div>
                <p className="text-[15px] font-medium text-ink">{title}</p>
                <p className="text-[14px] leading-relaxed text-slate">{body}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
