import { useState } from 'react';
import { m, useReducedMotion } from 'framer-motion';
import { CalendarClock, CheckCircle2, Circle, Coins, Lock, ShieldCheck } from 'lucide-react';
import { EASE } from '../../components/motion/MotionProvider';
import { Eyebrow, PrimaryCta, Reveal, VIEWPORT } from './parts';

// §D: the signature Pacts section. A layered, animated dashboard mockup (an
// example agreement, labeled as such) beside an explanation of how a Pact's
// predefined conditions work. Figures are illustrative, not live data.
const MILESTONES = [
  { title: 'Initial design', state: 'Completed' as const },
  { title: 'Design approval', state: 'Completed' as const },
  { title: 'Final delivery', state: 'Pending' as const },
];

const POINTS = [
  { icon: Coins, title: 'Milestones you define', body: 'Split the payment into steps. Each release pays one step, never more.' },
  { icon: CalendarClock, title: 'A deadline that protects you', body: 'If the work stops, the unreleased funds can come back after the deadline.' },
  { icon: Lock, title: 'A refundable bond', body: 'The recipient posts a bond that returns to them when the Pact completes.' },
  { icon: ShieldCheck, title: 'A record on chain', body: 'Every deposit and release is a Stellar transaction you can look up.' },
];

export function PactShowcase({ onExplore }: { onExplore: () => void }) {
  return (
    <section id="pacts" aria-labelledby="lp-pacts-title" className="relative overflow-hidden px-5 py-24 sm:py-32" data-tour="proof">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{ background: 'radial-gradient(50% 50% at 25% 50%, rgba(61,107,255,0.18), transparent 70%)' }}
      />
      <div className="relative mx-auto grid max-w-6xl items-center gap-14 lg:grid-cols-[1.1fr_1fr]">
        <PactMockup />
        <Reveal>
          <Eyebrow>Protected payments</Eyebrow>
          <h2 id="lp-pacts-title" className="mt-4 text-[36px] font-bold leading-[1.05] tracking-[-0.02em] text-ink sm:text-[52px]">
            Not just payments.
            <br />
            <span className="lp-grad-text">Payments you can trust.</span>
          </h2>
          <p className="mt-5 text-[17px] leading-relaxed text-slate">
            Create protected agreements, organize milestone payments, and make every release transparent.
          </p>
          <ul className="mt-8 space-y-5">
            {POINTS.map(({ icon: Icon, title, body }) => (
              <li key={title} className="flex gap-4">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-tile bg-accent-tint text-[var(--lp-ice)]">
                  <Icon size={20} aria-hidden />
                </span>
                <div>
                  <p className="text-[16px] font-bold text-ink">{title}</p>
                  <p className="mt-0.5 text-[14px] leading-relaxed text-slate">{body}</p>
                </div>
              </li>
            ))}
          </ul>
          <PrimaryCta onClick={onExplore} className="mt-9">
            Explore protected payments
          </PrimaryCta>
        </Reveal>
      </div>
    </section>
  );
}

function PactMockup() {
  const reduce = useReducedMotion();
  const [shown, setShown] = useState<boolean>(!!reduce);
  return (
    <m.div
      className="relative mx-auto w-full max-w-[520px] pb-10 pt-6"
      initial={reduce ? false : { opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={VIEWPORT}
      transition={{ duration: 0.7, ease: EASE }}
      onViewportEnter={() => setShown(true)}
      aria-label="Example Pact: website design agreement, 2 of 3 milestones completed"
      role="img"
    >
      {/* back layers */}
      <div aria-hidden className="lp-card absolute -right-3 top-0 h-[78%] w-[88%] rotate-[4deg] rounded-card opacity-50 sm:-right-8" />
      <div aria-hidden className="lp-float-a absolute -left-2 bottom-0 z-20 sm:-left-8">
        <div className="lp-glass flex items-center gap-3 rounded-tile px-4 py-3 shadow-pop">
          <Lock size={18} className="text-[var(--lp-cyan)]" />
          <div>
            <p className="text-[13px] font-bold text-ink">Recipient bond held</p>
            <p className="mono text-[12px] text-slate">₱1,500</p>
          </div>
        </div>
      </div>
      <div aria-hidden className="lp-float-c absolute -top-4 right-6 z-20">
        <span className="grid h-14 w-14 place-items-center rounded-pill bg-[radial-gradient(circle_at_35%_30%,rgba(95,212,244,0.35),rgba(53,99,245,0.25))]">
          <ShieldCheck size={28} className="lp-glow-shield text-[var(--lp-cyan)]" />
        </span>
      </div>

      {/* main dashboard card */}
      <div aria-hidden className="lp-card relative z-10 rounded-card p-6 shadow-pop sm:p-7">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[12px] font-bold uppercase tracking-[0.14em] text-accent">Pact · Example</p>
            <p className="mt-1.5 text-[20px] font-bold tracking-tight text-ink">Website design agreement</p>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-pill bg-accent-tint px-3 py-1 text-[12px] font-bold text-[var(--lp-ice)]">
            <span className="h-1.5 w-1.5 rounded-pill bg-[var(--lp-cyan)]" /> Active
          </span>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <div className="rounded-tile bg-white/[0.04] p-4">
            <p className="text-[12px] font-semibold text-slate">Total agreement</p>
            <p className="mono mt-1 text-[24px] font-bold text-ink">₱12,000</p>
          </div>
          <div className="rounded-tile bg-white/[0.04] p-4">
            <p className="text-[12px] font-semibold text-slate">Secured funds</p>
            <p className="mono mt-1 text-[24px] font-bold text-[var(--lp-ice)]">₱8,000</p>
          </div>
        </div>

        <div className="mt-5">
          <div className="flex items-center justify-between text-[13px]">
            <span className="font-semibold text-slate">Secured in the contract</span>
            <span className="mono font-semibold text-ink">67%</span>
          </div>
          <div className="mt-2 h-2.5 overflow-hidden rounded-pill bg-white/[0.08]">
            <m.div
              className="h-full origin-left rounded-pill bg-gradient-to-r from-[var(--lp-electric)] to-[var(--lp-cyan)]"
              initial={reduce ? false : { scaleX: 0 }}
              animate={shown ? { scaleX: 8 / 12 } : {}}
              transition={{ duration: 1, ease: EASE, delay: 0.3 }}
            />
          </div>
        </div>

        <div className="mt-6 flex items-center justify-between">
          <p className="text-[14px] font-bold text-ink">Milestone progress</p>
          <p className="mono text-[14px] font-semibold text-[var(--lp-ice)]">2 of 3</p>
        </div>
        <ol className="relative mt-4 space-y-4 pl-1">
          <span aria-hidden className="absolute bottom-3 left-[13px] top-3 w-0.5 bg-white/[0.08]" />
          <m.span
            aria-hidden
            className="absolute left-[13px] top-3 w-0.5 origin-top bg-gradient-to-b from-[var(--lp-electric)] to-[var(--lp-cyan)]"
            style={{ height: '58%' }}
            initial={reduce ? false : { scaleY: 0 }}
            animate={shown ? { scaleY: 1 } : {}}
            transition={{ duration: 1.1, ease: EASE, delay: 0.5 }}
          />
          {MILESTONES.map((ms, i) => {
            const done = ms.state === 'Completed';
            return (
              <m.li
                key={ms.title}
                className="relative flex items-center gap-3"
                initial={reduce ? false : { opacity: 0, x: -10 }}
                animate={shown ? { opacity: 1, x: 0 } : {}}
                transition={{ duration: 0.45, ease: EASE, delay: 0.6 + i * 0.35 }}
              >
                <span className={`relative z-10 grid h-7 w-7 place-items-center rounded-pill ${done ? 'bg-mint-soft text-mint' : 'bg-white/[0.06] text-slate'}`}>
                  {done ? <CheckCircle2 size={16} /> : <Circle size={14} />}
                </span>
                <span className="flex-1 text-[15px] font-semibold text-ink">{ms.title}</span>
                <span
                  className={`rounded-pill px-2.5 py-1 text-[12px] font-bold ${done ? 'bg-mint-soft text-mint' : 'bg-deadline-tint text-deadline'}`}
                >
                  {ms.state}
                </span>
              </m.li>
            );
          })}
        </ol>
      </div>
    </m.div>
  );
}
