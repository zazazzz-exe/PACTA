import { ShieldCheck, Wallet } from 'lucide-react';
import { PrimaryCta, Reveal, SecondaryCta } from './parts';

// §K: closing call to action with a glowing shield, a few particles and a soft
// radial gradient (breathes slowly; still under reduced motion).
const DOTS = [
  { left: '18%', top: '70%', delay: '0s', dur: '8s' },
  { left: '34%', top: '85%', delay: '2s', dur: '9s' },
  { left: '66%', top: '80%', delay: '1s', dur: '7.5s' },
  { left: '82%', top: '72%', delay: '3s', dur: '9.5s' },
];

export function FinalCta({ onConnect, onHow }: { onConnect: () => void; onHow: () => void }) {
  return (
    <section aria-labelledby="lp-final-title" className="px-5 pb-24 pt-8 sm:pb-32">
      <div className="lp-card relative mx-auto max-w-6xl overflow-hidden rounded-[32px] px-6 py-20 text-center shadow-pop sm:px-12 sm:py-24">
        {/* centered by flex: the breathing animation owns the transform */}
        <div aria-hidden className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div
            className="lp-breathe h-[520px] w-[520px] shrink-0 rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(61,107,255,0.35), transparent 65%)' }}
          />
        </div>
        <div aria-hidden className="pointer-events-none absolute inset-0 hidden sm:block">
          {DOTS.map((d, i) => (
            <span key={i} className="lp-particle" style={{ left: d.left, top: d.top, animationDelay: d.delay, animationDuration: d.dur }} />
          ))}
        </div>
        <Reveal className="relative">
          <span aria-hidden className="mx-auto grid h-20 w-20 place-items-center rounded-pill bg-[radial-gradient(circle_at_35%_30%,rgba(95,212,244,0.35),rgba(53,99,245,0.3))]">
            <ShieldCheck size={40} className="lp-glow-shield text-[var(--lp-cyan)]" />
          </span>
          <h2 id="lp-final-title" className="mx-auto mt-8 max-w-3xl text-[40px] font-bold leading-[1.03] tracking-[-0.03em] text-ink sm:text-[64px]">
            Move money with <span className="lp-grad-text">confidence.</span>
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-[17px] leading-relaxed text-slate">
            Experience a simpler way to send payments and manage protected agreements.
          </p>
          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <PrimaryCta onClick={onConnect}>
              <Wallet size={18} aria-hidden />
              Connect your wallet
            </PrimaryCta>
            <SecondaryCta onClick={onHow}>Explore how it works</SecondaryCta>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
