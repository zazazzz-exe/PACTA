import { useEffect } from 'react';
import {
  ArrowRight,
  Wallet,
  Send,
  QrCode,
  Repeat,
  Lock,
  ShieldCheck,
  Layers,
  RotateCcw,
  KeyRound,
  Eye,
  Fingerprint,
  Boxes,
  Clock,
  CheckCircle2,
  TrendingUp,
  BadgeCheck,
} from 'lucide-react';
import { useWallet } from '../hooks/useWallet';
import { useTour } from '../components/Tour';
import { landingSteps } from '../lib/tours';
import { seenTour, markTourSeen } from '../lib/tourSeen';
import { navigate } from '../lib/router';
import { Reveal } from '../components/Reveal';
import { PhoneMockup } from '../components/PhoneMockup';
import { WalletPreview } from '../components/WalletPreview';

// The wallet, up front. Escrow is one capability (Send protected), not the story.
const CAPABILITIES = [
  {
    icon: Wallet,
    title: 'Hold',
    body: 'A multi-asset portfolio with live peso values. Your keys and funds never leave your wallet.',
    tint: 'bg-gradient-to-br from-accent to-accent-deep text-white',
  },
  {
    icon: Send,
    title: 'Send',
    body: 'Pay anyone on Stellar in seconds. Send now, or send protected when it matters.',
    tint: 'bg-gradient-to-br from-deadline to-deadline-deep text-white',
  },
  {
    icon: QrCode,
    title: 'Receive',
    body: 'Share your address or QR and get paid from any Stellar wallet.',
    tint: 'bg-signal text-carbon',
  },
  {
    icon: Repeat,
    title: 'Convert',
    body: 'Swap one asset for another on the Stellar DEX, at the best on-chain rate.',
    tint: 'bg-gradient-to-br from-accent-deep to-accent text-white',
  },
] as const;

// Protection layer — the Pact — explained as what it does for the sender.
const PROTECT = [
  {
    icon: Lock,
    title: 'Locked in code',
    body: 'Funds sit in a Soroban contract, not a person. PACTA never takes custody.',
  },
  {
    icon: ShieldCheck,
    title: 'Backed by a bond',
    body: 'The recipient posts a security bond. If they walk away, the bond is yours.',
  },
  {
    icon: Layers,
    title: 'Released in milestones',
    body: 'Approve each stage as the work lands. Money settles on Stellar in seconds.',
  },
  {
    icon: RotateCcw,
    title: 'Refundable',
    body: 'Reclaim everything if the deadline passes and the work never comes.',
  },
] as const;

const TRUST = [
  {
    icon: KeyRound,
    title: 'Non-custodial',
    body: 'Your wallet is your login. No passwords, no custody, no counterparty risk from us.',
  },
  {
    icon: Eye,
    title: 'Risk Lens',
    body: 'Before you commit, read the counterparty from their real on-chain history.',
  },
  {
    icon: Fingerprint,
    title: 'One identity, many wallets',
    body: 'Verify once, then link your other wallets. Any of them counts as you.',
  },
  {
    icon: Boxes,
    title: 'Provable on-chain',
    body: 'Every send, swap, and Pact is permanent on Stellar. Verifiable by anyone.',
  },
] as const;

export function Landing() {
  const { address, connect } = useWallet();
  const { start } = useTour();

  useEffect(() => {
    if (address) navigate('/home');
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
      {/* ── Hero — wallet-first, split with a live wallet-UI phone ── */}
      <section className="relative w-full overflow-hidden px-5 pb-12 pt-12 sm:px-8 sm:pt-16 lg:pb-20">
        <div className="pointer-events-none absolute inset-0 landing-hero-left" aria-hidden />
        <div
          className="blob blob-a pointer-events-none absolute -left-24 top-0 h-72 w-72 rounded-full bg-accent/15"
          aria-hidden
        />
        <div
          className="blob blob-b pointer-events-none absolute -right-10 top-40 h-56 w-56 rounded-full bg-signal/10"
          aria-hidden
        />

        <div className="relative mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-2 lg:gap-8">
          {/* Left — copy */}
          <div className="animate-rise max-w-xl text-center lg:text-left">
            <span
              data-tour="network"
              className="inline-flex items-center gap-2 rounded-pill border border-accent/20 bg-accent-tint px-4 py-1.5 text-[12px] font-medium text-accent-deep"
            >
              <span className="pulse-dot h-2 w-2 rounded-pill bg-accent" aria-hidden />
              Live on Stellar testnet
            </span>

            <h1 className="mt-6 text-[36px] font-semibold leading-[1.08] tracking-tight text-ink sm:text-[48px] lg:text-[54px]">
              Simplify every payment.{' '}
              <span className="text-accent">Protect the ones that matter.</span>
            </h1>

            <p className="mx-auto mt-6 max-w-lg text-[16px] leading-relaxed text-slate lg:mx-0 sm:text-[17px]">
              A non-custodial wallet for Stellar. Hold, send, receive, and convert without giving up your
              keys. When a payment needs to be safe, send it as a Pact: staged, bond-backed, and provable
              on-chain.
            </p>

            <div className="mt-9 flex flex-col items-center gap-3 sm:flex-row lg:justify-start">
              <button
                onClick={connect}
                data-tour="connect"
                className="btn-shimmer group inline-flex h-14 w-full items-center justify-center gap-2 rounded-[14px] bg-accent px-8 text-[15px] font-medium text-white shadow-card transition hover:bg-accent-deep active:scale-[0.98] sm:w-auto"
              >
                <Wallet size={20} aria-hidden />
                Connect wallet
                <ArrowRight size={18} className="transition-transform group-hover:translate-x-0.5" aria-hidden />
              </button>
              <button
                onClick={scrollToHow}
                className="inline-flex h-14 w-full items-center justify-center gap-2 rounded-[14px] border border-hairline-strong bg-paper px-8 text-[15px] font-medium text-ink transition hover:border-accent/40 hover:bg-accent-tint active:scale-[0.98] sm:w-auto"
              >
                See how it works
              </button>
            </div>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-2.5 lg:justify-start">
              {['No custody, ever', 'Stellar-native', 'Provable on-chain'].map((chip) => (
                <span
                  key={chip}
                  className="inline-flex items-center gap-2 rounded-pill border border-accent/15 bg-accent-tint/70 px-3.5 py-1.5 text-[13px] font-medium text-accent-deep"
                >
                  <ShieldCheck size={14} className="text-accent" aria-hidden />
                  {chip}
                </span>
              ))}
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-center gap-x-2.5 gap-y-2 lg:justify-start">
              <span className="text-[12px] font-medium text-fog">Works with</span>
              {['Freighter', 'xBull', 'Hana'].map((w) => (
                <span
                  key={w}
                  className="inline-flex items-center gap-1.5 rounded-pill bg-mist px-3 py-1 text-[12px] font-medium text-slate"
                >
                  <span className="h-1.5 w-1.5 rounded-pill bg-accent" aria-hidden />
                  {w}
                </span>
              ))}
            </div>
          </div>

          {/* Right — the wallet, on a 3D-tilted phone */}
          <div data-tour="proof" className="relative">
            <div className="relative mx-auto max-w-md overflow-hidden rounded-[28px] border border-accent/20 bg-gradient-to-br from-accent-tint via-canvas to-accent/10 p-6 shadow-pop sm:p-10">
              <div className="glow-orb absolute -right-8 -top-8 h-48 w-48 bg-accent/30" aria-hidden />
              <div className="glow-orb absolute -bottom-10 -left-8 h-40 w-40 bg-signal/25" aria-hidden />
              <div className="glow-orb absolute right-10 bottom-4 h-28 w-28 bg-deadline/20" aria-hidden />
              <div className="mesh-dots pointer-events-none absolute inset-0 opacity-40" aria-hidden />

              <div className="relative flex justify-center py-2">
                <div className="phone-3d">
                  <PhoneMockup size="lg" variant="light" float>
                    <WalletPreview />
                  </PhoneMockup>
                </div>
              </div>

              {/* Floating life — varied colors */}
              <div className="float-card-c absolute -left-2 top-16 z-20 hidden sm:block">
                <div className="float-card-enter flex items-center gap-2.5 rounded-card border border-grid bg-carbon px-3 py-2 shadow-pop">
                  <span className="grid h-8 w-8 place-items-center rounded-control bg-onyx text-signal">
                    <TrendingUp size={15} aria-hidden />
                  </span>
                  <div>
                    <p className="mono text-[13px] font-semibold leading-none text-signal">+12.4%</p>
                    <p className="mt-0.5 text-[9px] text-panel-muted">this month</p>
                  </div>
                </div>
              </div>
              <div className="float-card-a absolute right-0 top-9 z-20 hidden sm:block">
                <div className="float-card-enter float-card-enter-2 flex items-center gap-2 rounded-pill border border-hairline bg-paper px-3 py-1.5 shadow-pop">
                  <CheckCircle2 size={14} className="text-accent" aria-hidden />
                  <span className="text-[11px] font-medium text-ink">Received 75 XLM</span>
                </div>
              </div>
              <div className="float-card-b absolute bottom-16 left-0 z-20 hidden sm:block">
                <div className="float-card-enter float-card-enter-3 flex items-center gap-2 rounded-pill border border-hairline bg-paper px-3 py-1.5 shadow-pop">
                  <Repeat size={14} className="text-accent-deep" aria-hidden />
                  <span className="text-[11px] font-medium text-ink">XLM to USDC</span>
                </div>
              </div>
              <div className="float-card-a absolute -right-1 bottom-9 z-20 hidden sm:block">
                <div className="float-card-enter float-card-enter-3 flex items-center gap-1.5 rounded-pill bg-accent px-3 py-1.5 shadow-pop">
                  <BadgeCheck size={14} className="text-white" aria-hidden />
                  <span className="text-[11px] font-medium text-white">Verified</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── One wallet, everything money ── */}
      <section className="landing-section-green relative px-5 py-14 sm:px-8 sm:py-16" data-tour="how">
        <div className="mesh-dots pointer-events-none absolute inset-0 opacity-40" aria-hidden />
        <div className="relative mx-auto max-w-6xl">
          <Reveal>
            <p className="text-center text-[13px] font-semibold uppercase tracking-widest text-accent">
              The wallet
            </p>
            <h2 className="mt-2 text-center text-[28px] font-semibold tracking-tight text-ink sm:text-[36px]">
              One wallet, everything money
            </h2>
            <p className="mx-auto mt-3 max-w-lg text-center text-[15px] text-slate">
              Connect a Stellar wallet and your money is ready to move. No sign up, no passwords.
            </p>
          </Reveal>

          <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {CAPABILITIES.map(({ icon: Icon, title, body, tint }, i) => (
              <li key={title}>
                <Reveal delay={i * 80}>
                  <div className="group step-card h-full rounded-card border border-accent/20 bg-paper p-6 shadow-card">
                    <div className={`icon-pop grid h-12 w-12 place-items-center rounded-control shadow-card ${tint}`}>
                      <Icon size={24} aria-hidden />
                    </div>
                    <h3 className="mt-4 text-[18px] font-medium text-ink">{title}</h3>
                    <p className="mt-2 text-[14px] leading-relaxed text-slate">{body}</p>
                  </div>
                </Reveal>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── Send protected (a Pact) ── */}
      <section className="landing-section-mint relative px-5 py-14 sm:px-8 sm:py-16">
        <div className="relative mx-auto max-w-6xl">
          <Reveal>
            <p className="text-center text-[13px] font-semibold uppercase tracking-widest text-accent">
              When it matters
            </p>
            <h2 className="mt-2 text-center text-[28px] font-semibold tracking-tight text-ink sm:text-[36px]">
              Send protected, as a Pact
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-center text-[15px] text-slate">
              Paying someone new, or paying on delivery? Choose Send protected instead of Send now.
              Your money is escrowed by a smart contract and released only as the work lands.
            </p>
          </Reveal>

          <ul className="mt-10 grid gap-5 sm:grid-cols-2">
            {PROTECT.map(({ icon: Icon, title, body }, i) => (
              <li key={title}>
                <Reveal delay={i * 80}>
                  <div className="group step-card flex h-full items-start gap-4 rounded-card border border-accent/20 bg-paper/95 p-6 shadow-card ring-1 ring-accent/5">
                    <div className="icon-pop grid h-12 w-12 shrink-0 place-items-center rounded-control bg-gradient-to-br from-accent to-accent-deep text-white shadow-card">
                      <Icon size={24} aria-hidden />
                    </div>
                    <div>
                      <h3 className="text-[18px] font-medium text-ink">{title}</h3>
                      <p className="mt-1.5 text-[14px] leading-relaxed text-slate">{body}</p>
                    </div>
                  </div>
                </Reveal>
              </li>
            ))}
          </ul>

          <Reveal delay={160}>
            <p className="mx-auto mt-10 max-w-xl text-center text-[14px] text-slate">
              Every commitment is gated by verified identity, and the Risk Lens reads your counterparty
              before you sign. Fund-returning actions are never gated, so you can always get your money back.
            </p>
          </Reveal>
        </div>
      </section>

      {/* ── Trust you can verify (dark) ── */}
      <section className="relative overflow-hidden bg-carbon px-5 py-14 sm:px-8 sm:py-16">
        <div className="proof-grid" aria-hidden />
        <div
          className="pointer-events-none absolute inset-0 opacity-70"
          style={{
            backgroundImage:
              'radial-gradient(circle at 82% 18%, rgba(52,227,176,0.16), transparent 45%), radial-gradient(circle at 12% 90%, rgba(11,122,99,0.28), transparent 45%)',
          }}
          aria-hidden
        />
        <div className="relative mx-auto max-w-6xl">
          <Reveal>
            <p className="text-center text-[13px] font-semibold uppercase tracking-widest text-signal">
              Why PACTA
            </p>
            <h2 className="mt-2 text-center text-[28px] font-semibold tracking-tight text-panel-ink sm:text-[36px]">
              Trust you can verify
            </h2>
          </Reveal>

          <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {TRUST.map(({ icon: Icon, title, body }, i) => (
              <li key={title}>
                <Reveal delay={i * 80}>
                  <div className="group step-card h-full rounded-card border border-grid bg-onyx p-6">
                    <div className="icon-pop grid h-11 w-11 place-items-center rounded-control bg-grid text-signal">
                      <Icon size={22} aria-hidden />
                    </div>
                    <h3 className="mt-4 text-[16px] font-medium text-panel-ink">{title}</h3>
                    <p className="mt-2 text-[13.5px] leading-relaxed text-panel-muted">{body}</p>
                  </div>
                </Reveal>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── Bottom CTA ── */}
      <section className="px-5 py-14 sm:px-8 sm:py-16">
        <div className="mx-auto max-w-6xl">
          <Reveal>
            <div className="landing-hero-panel relative overflow-hidden rounded-[24px] px-6 py-14 text-center shadow-pop sm:px-12 sm:py-20">
              <div className="mesh-dots pointer-events-none absolute inset-0 opacity-15" aria-hidden />
              <div
                className="pointer-events-none absolute inset-0 opacity-70"
                style={{
                  backgroundImage:
                    'radial-gradient(circle at 70% 25%, rgba(52,227,176,0.35), transparent 55%)',
                }}
                aria-hidden
              />
              <div className="relative mx-auto max-w-lg">
                <span className="inline-flex items-center gap-2 rounded-pill border border-signal/30 bg-signal/10 px-4 py-1.5 text-[12px] font-medium text-signal">
                  <Clock size={14} aria-hidden />
                  Available now · Testnet
                </span>
                <h2 className="mt-5 text-[28px] font-semibold tracking-tight text-panel-ink sm:text-[38px]">
                  Open your wallet
                </h2>
                <p className="mx-auto mt-3 text-[15px] text-panel-muted">
                  No sign up, no passwords, no custody. Connect a Stellar wallet and your money is ready
                  to move.
                </p>
                <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                  <button
                    onClick={connect}
                    className="inline-flex h-14 items-center gap-2 rounded-[14px] bg-accent px-8 text-[15px] font-medium text-white transition hover:bg-accent-deep active:scale-[0.98]"
                  >
                    <Wallet size={18} aria-hidden />
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
