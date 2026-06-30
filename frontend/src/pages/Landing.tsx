import { useEffect } from 'react';
import { Lock, Clock, ShieldCheck } from 'lucide-react';
import { useWallet } from '../hooks/useWallet';
import { useTour } from '../components/Tour';
import { landingSteps } from '../lib/tours';
import { seenTour, markTourSeen } from '../lib/tourSeen';
import { navigate } from '../lib/router';
import { HeroFlow } from '../components/HeroFlow';
import { Reveal } from '../components/Reveal';
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
    <div className="mx-auto max-w-6xl">
      {/* Animated escrow-flow hero (LANDING_HERO.md) */}
      <HeroFlow onConnect={connect} />

      {/* Provable on-chain — the live proof panel artifact (reveals on scroll) */}
      <section className="mt-12 md:mt-16">
        <Reveal>
          <h2 className="text-center text-[13px] font-medium uppercase tracking-wide text-fog">
            Provable on-chain
          </h2>
        </Reveal>
        <Reveal delay={120} className="my-8 flex justify-center">
          <div data-tour="proof" className="w-full max-w-md origin-center sm:scale-110 lg:scale-125">
            <ProofPanel
              id="agr-001"
              protectedAmount="75.0000000"
              txHash="9f3a…b1c4"
              contractShort={shortAddr(CONTRACT_ID, 6, 6)}
              explorerUrl={contractExplorerUrl()}
              countUp
            />
          </div>
        </Reveal>
        <Reveal delay={200}>
          <p className="mx-auto mt-3 max-w-[440px] text-center text-[13px] leading-relaxed text-slate">
            Every agreement is a real Soroban contract. Verify the funds, the bond, and every release
            on Stellar.
          </p>
        </Reveal>
      </section>

      <section className="mt-12 md:mt-16" data-tour="how">
        <Reveal>
          <h2 className="text-[13px] font-medium uppercase tracking-wide text-fog">How it works</h2>
        </Reveal>
        <ul className="mt-4 grid gap-3 sm:grid-cols-3">
          {STEPS.map(({ icon: Icon, title, body }, i) => (
            <li key={title}>
              <Reveal
                delay={i * 120}
                className="flex gap-3 sm:flex-col sm:rounded-card sm:p-4 sm:transition sm:hover:bg-mist"
              >
                <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-control bg-accent-tint text-accent-deep">
                  <Icon size={18} aria-hidden />
                </span>
                <div>
                  <p className="text-[15px] font-medium text-ink">{title}</p>
                  <p className="text-[14px] leading-relaxed text-slate">{body}</p>
                </div>
              </Reveal>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
