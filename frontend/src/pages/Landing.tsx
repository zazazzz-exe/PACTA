import { useEffect } from 'react';
import {
  ArrowRight,
  Banknote,
  Clock,
  Layers,
  Lock,
  QrCode,
  ShieldCheck,
  Smartphone,
  Wallet,
  Zap,
} from 'lucide-react';
import { useWallet } from '../hooks/useWallet';
import { useTour } from '../components/Tour';
import { landingSteps } from '../lib/tours';
import { seenTour, markTourSeen } from '../lib/tourSeen';
import { navigate } from '../lib/router';
import { Reveal } from '../components/Reveal';
import { HeroShowcase } from '../components/HeroShowcase';

const HOW_STEPS = [
  {
    n: 1,
    title: 'Create your agreement',
    body: 'Set the capital, security bond, milestones, and deadline. Both parties agree before any funds move.',
    tag: 'Free on testnet',
    icon: QrCode,
  },
  {
    n: 2,
    title: 'Lock funds on-chain',
    body: 'The client deposits capital and the provider posts a bond. Everything sits in a Soroban contract, not a person.',
    tag: 'No custody',
    icon: Wallet,
  },
  {
    n: 3,
    title: 'Release step by step',
    body: 'Approve milestones as work completes. Money settles on Stellar in seconds. Refund if the deadline passes.',
    tag: '~3s settlement',
    icon: Zap,
  },
] as const;

const FEATURES = [
  {
    icon: Layers,
    title: 'Milestone escrow',
    body: 'Lock capital in tranches and release milestone by milestone. Every step is visible on-chain.',
    bullets: ['No middleman', 'Client stays in control', 'Works on any wallet'],
    highlight: '₱0 platform fees on testnet',
  },
  {
    icon: ShieldCheck,
    title: 'Security bond',
    body: 'Providers post a bond held by the contract. If they walk away, the bond is yours.',
    bullets: ['Skin in the game', 'Bond returned on completion', 'Forfeited on refund'],
    highlight: null,
  },
  {
    icon: Lock,
    title: 'Immutable records',
    body: 'Every agreement, deposit, and release is permanently on the Stellar blockchain. Dispute-proof.',
    bullets: ['Verifiable history', 'On-chain reputation', 'Transparent ledger'],
    highlight: null,
  },
  {
    icon: Smartphone,
    title: 'Mobile-first web app',
    body: 'Open in any browser on Android or iPhone. Connect your wallet and go. No app store required.',
    bullets: ['Wallet is your login', 'No passwords', 'Testnet ready today'],
    highlight: 'Available now',
  },
] as const;

export function Landing() {
  const { address, connect } = useWallet();
  const { start } = useTour();

  useEffect(() => {
    if (address) navigate('/dashboard');
  }, [address]);

  useEffect(() => {
    if (address || seenTour('landing')) return;
    const t = setTimeout(() => {
      markTourSeen('landing');
      start(landingSteps);
    }, 800);
    return () => clearTimeout(t);
  }, [address, start]);

  const scrollToHow = () => {
    document.querySelector('[data-tour="how"]')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="w-full bg-canvas">
      {/* ── Hero (PalengkePay split) ── */}
      <section className="relative w-full overflow-hidden">
        <div className="pointer-events-none absolute inset-0 landing-hero-left" aria-hidden />
        <div className="pointer-events-none absolute -left-20 top-20 h-64 w-64 rounded-full bg-accent/20 blur-3xl blob blob-a" aria-hidden />
        <div className="pointer-events-none absolute bottom-10 left-1/3 h-48 w-48 rounded-full bg-signal/15 blur-3xl blob blob-b" aria-hidden />

        <div className="relative grid lg:grid-cols-2 lg:min-h-[600px]">
          {/* Left — copy + CTAs */}
          <div className="flex flex-col justify-center px-5 py-14 sm:px-10 lg:px-12 xl:px-16">
            <div className="mx-auto w-full max-w-xl lg:mx-0 animate-rise">
              <span
                data-tour="network"
                className="mb-6 inline-flex items-center gap-2 rounded-pill border border-accent/20 bg-accent-tint px-4 py-1.5 text-[12px] font-medium text-accent-deep"
              >
                <span className="pulse-dot h-2 w-2 rounded-pill bg-accent" aria-hidden />
                Live on Stellar testnet
              </span>

              <h1 className="mb-5 text-[32px] font-semibold leading-[1.1] tracking-tight text-ink sm:text-[44px] lg:text-[48px]">
                Protected agreements{' '}
                <span className="text-accent">built in</span>{' '}
                <span className="relative inline-block text-ink">
                  code
                  <span className="absolute -bottom-1 left-0 h-1.5 w-full rounded-pill bg-deadline" aria-hidden />
                </span>
              </h1>

              <p className="mb-8 max-w-md text-[16px] leading-relaxed text-slate">
                Lock. Release. Prove. Powered by Stellar Soroban.
                Non-custodial escrow with milestone releases and provider bonds.
              </p>

              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  onClick={connect}
                  data-tour="connect"
                  className="btn-shimmer group inline-flex h-14 flex-1 items-center justify-center gap-2 rounded-[14px] bg-accent px-6 text-[15px] font-medium text-white shadow-card transition hover:bg-accent-deep active:scale-[0.98] sm:flex-none sm:px-8"
                >
                  <Wallet size={20} aria-hidden />
                  I&apos;m a Client
                  <ArrowRight size={18} className="transition-transform group-hover:translate-x-0.5" aria-hidden />
                </button>
                <button
                  onClick={connect}
                  className="inline-flex h-14 flex-1 items-center justify-center gap-2 rounded-[14px] border-2 border-accent/50 bg-accent-tint px-6 text-[15px] font-medium text-accent-deep shadow-card transition hover:border-accent hover:bg-accent-tint/80 active:scale-[0.98] sm:flex-none sm:px-8"
                >
                  <Banknote size={20} className="text-accent" aria-hidden />
                  I&apos;m a Provider
                  <ArrowRight size={18} aria-hidden />
                </button>
              </div>

              <div className="mt-8 flex flex-wrap gap-3">
                <span className="inline-flex items-center gap-2 rounded-pill border border-accent/20 bg-accent-tint/80 px-3.5 py-2 text-[13px] font-medium text-accent-deep">
                  <span className="text-base" aria-hidden>🏦</span>
                  No bank account needed
                </span>
                <span className="inline-flex items-center gap-2 rounded-pill border border-accent/20 bg-accent-tint/80 px-3.5 py-2 text-[13px] font-medium text-accent-deep">
                  <span className="text-base" aria-hidden>⚡</span>
                  Stellar-native settlement
                </span>
              </div>
            </div>
          </div>

          {/* Right — phone showcase (navy panel) */}
          <div className="animate-rise lg:block" style={{ animationDelay: '120ms' }}>
            <HeroShowcase />
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="landing-section-green relative px-5 py-16 sm:px-8 lg:py-20" data-tour="how">
        <div className="mesh-dots pointer-events-none absolute inset-0 opacity-40" aria-hidden />
        <div className="relative mx-auto max-w-6xl">
          <Reveal>
            <p className="text-center text-[13px] font-semibold uppercase tracking-widest text-accent">
              Simple &amp; fast
            </p>
            <h2 className="mt-2 text-center text-[28px] font-semibold text-ink sm:text-[34px]">
              How it works
            </h2>
            <p className="mx-auto mt-3 max-w-lg text-center text-[15px] text-slate">
              Three simple steps to your first protected agreement
            </p>
          </Reveal>

          <ul className="mt-12 grid gap-6 md:grid-cols-3">
            {HOW_STEPS.map(({ n, title, body, tag, icon: Icon }, i) => (
              <li key={n}>
                <Reveal delay={i * 100}>
                  <div className="step-card relative h-full rounded-card border border-accent/25 bg-paper/90 p-6 shadow-card backdrop-blur-sm">
                    <span className="absolute -top-3 left-6 grid h-8 w-8 place-items-center rounded-full bg-accent text-[13px] font-semibold text-white shadow-card">
                      {n}
                    </span>
                    <div className="mt-4 grid h-11 w-11 place-items-center rounded-control bg-accent-tint text-accent">
                      <Icon size={22} aria-hidden />
                    </div>
                    <h3 className="mt-4 text-[18px] font-medium text-ink">{title}</h3>
                    <p className="mt-2 text-[14px] leading-relaxed text-slate">{body}</p>
                    <span className="mt-4 inline-flex items-center gap-1 rounded-pill bg-accent-tint px-3 py-1 text-[12px] font-medium text-accent-deep">
                      ✨ {tag}
                    </span>
                  </div>
                </Reveal>
              </li>
            ))}
          </ul>

          <Reveal delay={200}>
            <p className="mt-10 text-center text-[14px] text-slate">
              Ready to get started?{' '}
              <button
                onClick={connect}
                className="font-medium text-accent hover:text-accent-deep focus:outline-none focus-visible:underline"
              >
                Connect your wallet
              </button>
            </p>
          </Reveal>
        </div>
      </section>

      {/* ── Why choose us ── */}
      <section className="landing-section-mint relative px-5 py-16 sm:px-8 lg:py-20">
        <div className="relative mx-auto max-w-6xl">
          <Reveal>
            <p className="text-center text-[13px] font-semibold uppercase tracking-widest text-accent">
              Why choose us
            </p>
            <h2 className="mt-2 text-center text-[28px] font-semibold text-ink sm:text-[34px]">
              Built for real agreements
            </h2>
            <p className="mx-auto mt-3 max-w-lg text-center text-[15px] text-slate">
              Everything you need to entrust money safely between two parties
            </p>
          </Reveal>

          <ul className="mt-12 grid gap-6 sm:grid-cols-2">
            {FEATURES.map(({ icon: Icon, title, body, bullets, highlight }, i) => (
              <li key={title}>
                <Reveal delay={i * 80}>
                  <div className="step-card h-full rounded-card border border-accent/20 bg-paper/95 p-6 shadow-card ring-1 ring-accent/10">
                    <div className="grid h-12 w-12 place-items-center rounded-control bg-gradient-to-br from-accent to-accent-deep text-white shadow-card">
                      <Icon size={24} aria-hidden />
                    </div>
                    <h3 className="mt-4 text-[18px] font-medium text-ink">{title}</h3>
                    <p className="mt-2 text-[14px] leading-relaxed text-slate">{body}</p>
                    <ul className="mt-4 space-y-1.5">
                      {bullets.map((b) => (
                        <li key={b} className="flex items-center gap-2 text-[13px] text-slate">
                          <span className="h-1.5 w-1.5 shrink-0 rounded-pill bg-accent" aria-hidden />
                          {b}
                        </li>
                      ))}
                    </ul>
                    {highlight && (
                      <p className="mt-4">
                        <span className="text-[22px] font-semibold text-accent">₱0</span>
                        <span className="text-[14px] text-slate"> platform fees on testnet</span>
                      </p>
                    )}
                  </div>
                </Reveal>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── Bottom CTA ── */}
      <section className="bg-accent-tint/50 px-5 py-16 sm:px-8">
        <div className="mx-auto max-w-6xl">
          <Reveal>
            <div className="landing-hero-panel relative overflow-hidden rounded-[20px] px-6 py-12 text-center shadow-pop sm:px-12 sm:py-16">
              <div className="mesh-dots pointer-events-none absolute inset-0 opacity-15" aria-hidden />
              <div
                className="pointer-events-none absolute inset-0 opacity-70"
                style={{
                  backgroundImage:
                    'radial-gradient(circle at 70% 30%, rgba(52,227,176,0.4), transparent 50%)',
                }}
                aria-hidden
              />
              <div className="relative">
                <span className="inline-flex items-center gap-2 rounded-pill border border-signal/30 bg-signal/10 px-4 py-1.5 text-[12px] font-medium text-signal">
                  <Clock size={14} aria-hidden />
                  Available now · Testnet
                </span>
                <h2 className="mt-5 text-[26px] font-semibold text-panel-ink sm:text-[34px]">
                  Ready to go digital?
                </h2>
                <p className="mx-auto mt-3 max-w-md text-[15px] text-panel-muted">
                  Join agreements already protected on-chain. No setup fees. No monthly costs.
                  Just connect and create.
                </p>
                <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                  <button
                    onClick={connect}
                    className="btn-shimmer inline-flex h-14 items-center gap-2 rounded-[14px] bg-accent px-8 text-[15px] font-medium text-white transition hover:bg-accent-deep active:scale-[0.98]"
                  >
                    Connect wallet
                    <ArrowRight size={18} aria-hidden />
                  </button>
                  <button
                    onClick={scrollToHow}
                    className="inline-flex h-14 items-center gap-2 rounded-[14px] border border-white/20 bg-white/10 px-8 text-[15px] font-medium text-panel-ink transition hover:bg-white/15 active:scale-[0.98]"
                  >
                    See how it works
                  </button>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>
    </div>
  );
}
