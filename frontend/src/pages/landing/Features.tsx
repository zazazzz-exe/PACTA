import type { ReactNode } from 'react';
import { m, useReducedMotion } from 'framer-motion';
import { ArrowRight, ArrowUp, CheckCircle2, QrCode, Repeat, ShieldCheck } from 'lucide-react';
import { EASE } from '../../components/motion/MotionProvider';
import { Eyebrow, Reveal, VIEWPORT } from './parts';

// §E: editorial bento grid with four asymmetrical feature cards, each with a
// small animated visual, hover elevation and a clear CTA.
export function Features({ onConnect, onPacts }: { onConnect: () => void; onPacts: () => void }) {
  return (
    <section id="features" aria-labelledby="lp-features-title" className="px-5 py-24 sm:py-32" data-tour="how">
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr] lg:items-end">
          <Reveal>
            <Eyebrow>Features</Eyebrow>
            <h2 id="lp-features-title" className="mt-4 text-[36px] font-bold leading-[1.05] tracking-[-0.02em] text-ink sm:text-[52px]">
              Move money <span className="lp-grad-text">without the complexity.</span>
            </h2>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="text-[17px] leading-relaxed text-slate lg:pb-2">
              Your money. Your control. One wallet to send, receive and convert, and a protected way to pay when it matters.
            </p>
          </Reveal>
        </div>

        <div className="mt-12 grid gap-4 md:grid-cols-6">
          <FeatureCard
            className="md:col-span-4"
            title="Send money"
            body="Send digital assets with a simple, guided payment experience."
            cta="Start sending"
            onCta={onConnect}
            visual={<SendVisual />}
          />
          <FeatureCard
            className="md:col-span-2"
            title="Receive payments"
            body="Receive funds through your wallet address or QR code."
            cta="Get paid"
            onCta={onConnect}
            visual={<QrVisual />}
          />
          <FeatureCard
            className="md:col-span-2"
            title="Convert assets"
            body="Exchange supported digital assets through a streamlined interface."
            cta="Convert"
            onCta={onConnect}
            visual={<SwapVisual />}
          />
          <FeatureCard
            className="md:col-span-4"
            title="Protected Pacts"
            body="Organize agreements and milestone-based payment releases."
            cta="See how Pacts work"
            onCta={onPacts}
            visual={<PactVisual />}
            accent
          />
        </div>
      </div>
    </section>
  );
}

function FeatureCard({
  title,
  body,
  cta,
  onCta,
  visual,
  className = '',
  accent = false,
}: {
  title: string;
  body: string;
  cta: string;
  onCta: () => void;
  visual: ReactNode;
  className?: string;
  accent?: boolean;
}) {
  const reduce = useReducedMotion();
  return (
    <m.article
      className={`lp-card group relative flex min-h-[300px] flex-col overflow-hidden rounded-card p-6 shadow-card transition-shadow hover:shadow-pop sm:p-7 ${className}`}
      initial={reduce ? false : { opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      whileHover={{ y: -6 }}
      viewport={VIEWPORT}
      transition={{ duration: 0.5, ease: EASE }}
    >
      {accent && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{ background: 'radial-gradient(60% 80% at 100% 0%, rgba(95,212,244,0.14), transparent 70%)' }}
        />
      )}
      <div className="relative flex flex-1 items-center justify-center py-4" aria-hidden>
        {visual}
      </div>
      <div className="relative">
        <h3 className="text-[22px] font-bold tracking-tight text-ink">{title}</h3>
        <p className="mt-1.5 max-w-md text-[15px] leading-relaxed text-slate">{body}</p>
        <button
          type="button"
          onClick={onCta}
          className="mt-4 inline-flex min-h-tap items-center gap-1.5 text-[14px] font-bold text-accent transition hover:gap-2.5 focus:outline-none focus-visible:underline"
        >
          {cta} <ArrowRight size={16} aria-hidden />
        </button>
      </div>
    </m.article>
  );
}

function SendVisual() {
  return (
    <div className="lp-float-a lp-glass flex w-full max-w-[320px] items-center gap-4 rounded-tile p-4 shadow-pop">
      <span className="lp-up grid h-12 w-12 place-items-center rounded-pill bg-accent text-on-accent">
        <ArrowUp size={22} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[14px] font-bold text-ink">Payment sent</p>
        <p className="mono text-[12px] text-slate">to GD4L…DNFN</p>
      </div>
      <span className="mono text-[15px] font-bold text-ink">120.00</span>
    </div>
  );
}

function QrVisual() {
  return (
    <div className="lp-float-b relative overflow-hidden rounded-tile border border-[rgba(95,212,244,0.3)] bg-white/[0.04] p-4 shadow-[0_0_30px_rgba(95,212,244,0.18)]">
      <QrCode size={96} className="text-[var(--lp-ice)]" />
      <span className="lp-scan absolute inset-x-3 top-4 h-0.5 bg-[var(--lp-cyan)] shadow-[0_0_10px_rgba(95,212,244,0.9)]" />
    </div>
  );
}

function SwapVisual() {
  return (
    <div className="flex items-center gap-3">
      <span className="lp-float-a grid h-16 w-16 place-items-center rounded-full bg-[radial-gradient(circle_at_35%_30%,#A99BF0,#4B3FB0)] text-[13px] font-bold text-white shadow-pop">
        XLM
      </span>
      <span className="grid h-10 w-10 place-items-center rounded-pill bg-white/[0.08] text-[var(--lp-ice)]">
        <Repeat size={18} className="lp-swap" />
      </span>
      <span className="lp-float-c grid h-16 w-16 place-items-center rounded-full bg-[radial-gradient(circle_at_35%_30%,#7FA6FF,#2F5BEA)] text-[12px] font-bold text-white shadow-pop">
        USDC
      </span>
    </div>
  );
}

function PactVisual() {
  const reduce = useReducedMotion();
  return (
    <div className="flex w-full max-w-[420px] items-center gap-4">
      <ShieldCheck size={54} className="lp-glow-shield shrink-0 text-[var(--lp-cyan)]" />
      <div className="lp-glass flex-1 rounded-tile p-4">
        <p className="text-[13px] font-bold text-ink">Agreement · 3 milestones</p>
        <div className="mt-3 flex items-center gap-2">
          {[0, 1, 2].map((i) => (
            <m.span
              key={i}
              className={`h-2 flex-1 origin-left rounded-pill ${i < 2 ? 'bg-gradient-to-r from-[var(--lp-electric)] to-[var(--lp-cyan)]' : 'bg-white/[0.1]'}`}
              initial={reduce ? false : { scaleX: 0 }}
              whileInView={{ scaleX: 1 }}
              viewport={VIEWPORT}
              transition={{ duration: 0.5, ease: EASE, delay: 0.3 + i * 0.3 }}
            />
          ))}
        </div>
        <p className="mt-2 inline-flex items-center gap-1 text-[12px] font-semibold text-mint">
          <CheckCircle2 size={12} /> 2 released
        </p>
      </div>
    </div>
  );
}
