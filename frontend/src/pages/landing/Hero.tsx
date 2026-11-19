import { useEffect, useState, type PointerEvent, type ReactNode } from 'react';
import { m, useMotionValue, useReducedMotion, useSpring, useTransform, type MotionValue } from 'framer-motion';
import { ArrowDownLeft, ArrowUpRight, BadgeCheck, CheckCircle2, Globe, Lock, QrCode, ShieldCheck, Wallet } from 'lucide-react';
import { EASE } from '../../components/motion/MotionProvider';
import { PrimaryCta, SecondaryCta } from './parts';

// Hero (task 16 §A, §B): oversized headline with electric-blue gradient
// highlights, CTAs, trust indicators, and a living wallet composition. The
// mockup floats gently; layers follow the cursor on desktop (pointer: fine
// only, off under reduced motion). On phones the composition is simplified.

function useParallaxEnabled(): boolean {
  const reduce = useReducedMotion();
  const [fine, setFine] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(pointer: fine) and (min-width: 1024px)');
    const sync = () => setFine(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);
  return fine && !reduce;
}

function Layer({ mx, my, depth, className, children }: { mx: MotionValue<number>; my: MotionValue<number>; depth: number; className?: string; children: ReactNode }) {
  const x = useTransform(mx, (v) => v * depth);
  const y = useTransform(my, (v) => v * depth);
  return (
    <m.div style={{ x, y }} className={className}>
      {children}
    </m.div>
  );
}

const PARTICLES = [
  { left: '12%', top: '78%', delay: '0s', dur: '7s' },
  { left: '30%', top: '88%', delay: '2.4s', dur: '9s' },
  { left: '58%', top: '82%', delay: '1.2s', dur: '8s' },
  { left: '76%', top: '90%', delay: '3.6s', dur: '10s' },
  { left: '90%', top: '70%', delay: '0.6s', dur: '8.5s' },
  { left: '44%', top: '95%', delay: '4.2s', dur: '9.5s' },
];

export function Hero({ onConnect, onExplore }: { onConnect: () => void; onExplore: () => void }) {
  const enabled = useParallaxEnabled();
  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);
  const mx = useSpring(rawX, { stiffness: 120, damping: 20 });
  const my = useSpring(rawY, { stiffness: 120, damping: 20 });

  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!enabled) return;
    const r = e.currentTarget.getBoundingClientRect();
    rawX.set(((e.clientX - r.left) / r.width - 0.5) * 2);
    rawY.set(((e.clientY - r.top) / r.height - 0.5) * 2);
  };
  const onLeave = () => {
    rawX.set(0);
    rawY.set(0);
  };

  return (
    <section id="top" aria-labelledby="lp-hero-title" className="lp-hero-bg relative overflow-hidden">
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 pb-20 pt-10 sm:pt-16 lg:grid-cols-[1.05fr_1fr] lg:gap-8 lg:pb-28 lg:pt-20">
        <m.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: EASE }}
        >
          <p className="inline-flex items-center gap-2 rounded-pill border border-hairline bg-white/[0.04] px-3.5 py-1.5 text-[13px] font-semibold text-slate" data-tour="network">
            <span className="h-1.5 w-1.5 rounded-pill bg-[var(--lp-cyan)]" aria-hidden />
            Non-custodial wallet and protected payments on Stellar
          </p>
          <h1 id="lp-hero-title" className="mt-6 text-[44px] font-bold leading-[1.02] tracking-[-0.03em] text-ink sm:text-[60px] lg:text-[72px]">
            Payments made <span className="lp-grad-text">simple.</span>
            <br />
            Protection made <span className="lp-grad-text">certain.</span>
          </h1>
          <p className="mt-6 max-w-xl text-[17px] leading-relaxed text-slate sm:text-[18px]">
            Send, receive, and convert with confidence. Create protected payment agreements and keep every transaction
            transparent with PACTA.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <PrimaryCta onClick={onConnect}>
              <Wallet size={18} aria-hidden />
              Connect wallet
            </PrimaryCta>
            <SecondaryCta onClick={onExplore}>Explore PACTA</SecondaryCta>
          </div>
          <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-[14px] font-semibold text-slate">
            <li className="inline-flex items-center gap-2">
              <Lock size={16} aria-hidden className="text-accent" /> Non-custodial by design
            </li>
            <li className="inline-flex items-center gap-2">
              <Globe size={16} aria-hidden className="text-accent" /> Stellar-powered
            </li>
            <li className="inline-flex items-center gap-2">
              <BadgeCheck size={16} aria-hidden className="text-accent" /> Transparent on-chain transactions
            </li>
          </ul>
        </m.div>

        {/* Product composition: decorative, an illustration of the app */}
        <div
          className="relative mx-auto h-[520px] w-full max-w-[460px] [perspective:1200px] sm:h-[580px]"
          onPointerMove={onMove}
          onPointerLeave={onLeave}
          aria-hidden
        >
          {/* particles (desktop only) */}
          <div className="pointer-events-none absolute inset-0 hidden lg:block">
            {PARTICLES.map((p, i) => (
              <span key={i} className="lp-particle" style={{ left: p.left, top: p.top, animationDelay: p.delay, animationDuration: p.dur }} />
            ))}
          </div>
          {/* light trail */}
          <svg className="pointer-events-none absolute -left-10 top-1/3 hidden h-40 w-[130%] lg:block" viewBox="0 0 600 160" fill="none">
            <path d="M0 120 C 160 40, 360 160, 600 30" stroke="url(#lp-trail-g)" strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
            <defs>
              <linearGradient id="lp-trail-g" x1="0" x2="600" y1="0" y2="0" gradientUnits="userSpaceOnUse">
                <stop stopColor="#3D6BFF" stopOpacity="0" />
                <stop offset="0.5" stopColor="#5FD4F4" />
                <stop offset="1" stopColor="#3D6BFF" stopOpacity="0" />
              </linearGradient>
            </defs>
          </svg>

          <m.div
            className="absolute inset-0"
            initial={{ opacity: 0, y: 40, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.9, ease: EASE, delay: 0.15 }}
          >
            {/* Main wallet mockup */}
            {/* Centered with flex: framer-motion's inline transform would override translate classes. */}
            <Layer mx={mx} my={my} depth={10} className="absolute inset-x-0 top-4 flex justify-center">
              <div className="lp-float w-[300px] sm:w-[320px]">
                <WalletMockup />
              </div>
            </Layer>

            {/* Payment successful */}
            <Layer mx={mx} my={my} depth={22} className="absolute -top-2 left-0 hidden sm:block lg:-left-16">
              <div className="lp-float-a lp-glass flex items-center gap-2.5 rounded-tile px-3.5 py-2.5 shadow-pop">
                <span className="grid h-8 w-8 place-items-center rounded-pill bg-mint-soft text-mint">
                  <CheckCircle2 size={18} />
                </span>
                <div>
                  <p className="text-[13px] font-bold text-ink">Payment successful</p>
                  <p className="mono text-[11px] text-slate">+250.00 USDC</p>
                </div>
              </div>
            </Layer>

            {/* USDC token */}
            <Layer mx={mx} my={my} depth={30} className="absolute -right-1 top-10 lg:-right-8">
              <div className="lp-float-b">
                <div className="lp-spin grid h-16 w-16 place-items-center rounded-full bg-[radial-gradient(circle_at_35%_30%,#7FA6FF,#2F5BEA_55%,#14208A)] text-[13px] font-bold text-white shadow-[0_0_28px_rgba(95,212,244,0.45)]">
                  USDC
                </div>
              </div>
            </Layer>

            {/* Verified badge */}
            <Layer mx={mx} my={my} depth={18} className="absolute -right-2 top-[46%] hidden sm:block lg:-right-12">
              <div className="lp-float-c lp-glass inline-flex items-center gap-2 rounded-pill px-3.5 py-2 shadow-pop">
                <BadgeCheck size={16} className="text-[var(--lp-cyan)]" />
                <span className="text-[13px] font-bold text-ink">Verified</span>
              </div>
            </Layer>

            {/* Protected Pact badge + glowing shield */}
            <Layer mx={mx} my={my} depth={26} className="absolute -left-1 bottom-24 hidden sm:block lg:-left-14">
              <div className="lp-float-b lp-glass flex items-center gap-3 rounded-tile px-3.5 py-3 shadow-pop">
                <ShieldCheck size={26} className="lp-glow-shield text-[var(--lp-cyan)]" />
                <div>
                  <p className="text-[13px] font-bold text-ink">Protected Pact</p>
                  <p className="text-[11px] text-slate">Milestone 2 of 3 released</p>
                </div>
              </div>
            </Layer>

            {/* QR payment card (desktop) */}
            <Layer mx={mx} my={my} depth={14} className="absolute bottom-6 right-2 hidden lg:block lg:-right-6">
              <div className="lp-float-a lp-glass rounded-tile p-3 shadow-pop">
                <QrCode size={44} className="text-[var(--lp-ice)]" />
                <p className="mt-1 text-center text-[11px] font-semibold text-slate">Scan to pay</p>
              </div>
            </Layer>
          </m.div>
        </div>
      </div>
      <p className="sr-only">The illustration shows the PACTA wallet with example balances.</p>
    </section>
  );
}

// Product mockup with example figures (an illustration, not live data).
function WalletMockup() {
  return (
    <div className="rounded-[34px] border border-white/10 bg-[#0A1230] p-3 shadow-[0_40px_90px_rgba(2,6,23,0.7)]">
      <div className="rounded-[26px] bg-[#0D1638] p-4">
        <div className="flex items-center justify-between text-[11px] text-slate">
          <span className="mono">9:41</span>
          <span className="rounded-pill bg-white/[0.06] px-2 py-0.5 font-semibold">Example</span>
        </div>
        <div className="mt-3 overflow-hidden rounded-[20px] bg-balance p-4">
          <p className="text-[11px] font-semibold text-slate">Total balance</p>
          <p className="mono mt-1 text-[28px] font-bold leading-none text-ink">$1,250.00</p>
          <p className="mt-1.5 text-[11px] text-slate">≈ ₱70,000 estimate</p>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <span className="flex items-center justify-center gap-1.5 rounded-pill bg-accent py-2 text-[12px] font-bold text-on-accent">
              <ArrowUpRight size={14} /> Send
            </span>
            <span className="flex items-center justify-center gap-1.5 rounded-pill bg-white/10 py-2 text-[12px] font-bold text-ink">
              <ArrowDownLeft size={14} /> Receive
            </span>
          </div>
        </div>
        <div className="mt-3 space-y-2">
          {[
            { code: 'USDC', name: 'USD Coin', amt: '980.00', tone: 'bg-accent-tint text-accent' },
            { code: 'XLM', name: 'Stellar Lumens', amt: '2,400.00', tone: 'bg-lilac-soft text-lilac' },
          ].map((a) => (
            <div key={a.code} className="flex items-center gap-3 rounded-tile bg-white/[0.04] px-3 py-2.5">
              <span className={`grid h-8 w-8 place-items-center rounded-pill text-[12px] font-bold ${a.tone}`}>{a.code[0]}</span>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-bold text-ink">{a.code}</p>
                <p className="text-[11px] text-slate">{a.name}</p>
              </div>
              <span className="mono text-[13px] font-semibold text-ink">{a.amt}</span>
            </div>
          ))}
        </div>
        <div className="mt-3 flex items-center gap-3 rounded-tile border border-[rgba(95,212,244,0.25)] bg-[rgba(95,212,244,0.06)] px-3 py-2.5">
          <ShieldCheck size={20} className="text-[var(--lp-cyan)]" />
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-bold text-ink">Protected payment</p>
            <p className="text-[11px] text-slate">Released in milestones</p>
          </div>
          <span className="mono text-[12px] font-semibold text-[var(--lp-ice)]">2/3</span>
        </div>
      </div>
    </div>
  );
}
