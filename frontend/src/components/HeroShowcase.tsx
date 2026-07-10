import { CheckCircle2, ShieldCheck, Star, Zap } from 'lucide-react';
import { PhoneMockup } from './PhoneMockup';
import { AppPreview } from './AppPreview';
import { shortAddr } from '../lib/format';

const DEMO_TRADER = 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF';

/** Vendor-style stats card (top-left float). */
function TraderStatsCard() {
  return (
    <div className="w-[210px] rounded-card border border-grid bg-carbon p-3.5 shadow-pop">
      <div className="flex items-start gap-2.5">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-control bg-onyx text-lg" aria-hidden>
          🔒
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[12px] font-medium text-panel-ink">Agreement agr-001</p>
          <p className="text-[9px] uppercase tracking-wide text-panel-muted">Active escrow</p>
        </div>
        <span className="inline-flex items-center gap-1 rounded-pill bg-onyx px-2 py-0.5 text-[9px] font-medium text-signal">
          <span className="h-1.5 w-1.5 rounded-pill bg-signal pulse-dot" aria-hidden />
          Active
        </span>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2 border-t border-grid pt-3">
        <div>
          <p className="mono text-[14px] font-medium text-signal">75</p>
          <p className="text-[9px] text-panel-muted">XLM locked</p>
        </div>
        <div>
          <p className="mono text-[14px] font-medium text-panel-ink">4</p>
          <p className="text-[9px] text-panel-muted">Milestones</p>
        </div>
        <div>
          <p className="flex items-center gap-0.5 mono text-[14px] font-medium text-panel-ink">
            4.9 <Star size={10} className="fill-signal-amber text-signal-amber" aria-hidden />
          </p>
          <p className="text-[9px] text-panel-muted">Reputation</p>
        </div>
      </div>
      <p className="mt-2 text-[9px] text-panel-muted">Provider · {shortAddr(DEMO_TRADER, 4, 4)}</p>
    </div>
  );
}

/** Live activity feed (bottom-left float). */
function LiveActivityCard() {
  const items = [
    { who: 'Milestone 1 released', time: 'just now', amount: '18.75 XLM', letter: 'M', hue: 'bg-accent' },
    { who: 'Bond posted', time: '2 min ago', amount: '20 XLM', letter: 'B', hue: 'bg-accent-deep' },
    { who: 'Capital locked', time: '5 min ago', amount: '75 XLM', letter: 'C', hue: 'bg-signal text-carbon' },
  ];
  return (
    <div className="w-[220px] rounded-card border border-white/15 bg-carbon/90 p-3.5 shadow-pop backdrop-blur-md">
      <p className="mb-2.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-signal">
        <Zap size={12} aria-hidden />
        Live activity
      </p>
      <ul className="space-y-2.5">
        {items.map((item) => (
          <li key={item.who} className="flex items-center gap-2">
            <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-[11px] font-medium text-white ${item.hue}`}>
              {item.letter}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[11px] font-medium text-panel-ink">{item.who}</p>
              <p className="text-[9px] text-panel-muted">{item.time}</p>
            </div>
            <p className="mono shrink-0 text-[10px] font-medium text-signal">{item.amount}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Payment success toast (right float). */
function SuccessCard() {
  return (
    <div className="w-[200px] rounded-card border border-hairline bg-paper p-4 shadow-pop">
      <div className="flex items-start gap-2.5">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-accent-tint text-accent">
          <CheckCircle2 size={18} aria-hidden />
        </span>
        <div>
          <p className="mono text-[15px] font-semibold text-ink">75.0000000</p>
          <p className="text-[12px] text-slate">XLM protected</p>
          <p className="mt-1.5 flex items-center gap-1 text-[10px] font-medium text-accent">
            <ShieldCheck size={11} aria-hidden />
            Confirmed on-chain
            <Zap size={10} className="text-deadline" aria-hidden />
          </p>
        </div>
      </div>
    </div>
  );
}

export function HeroShowcase() {
  return (
    <div
      className="landing-hero-panel relative min-h-[520px] overflow-hidden lg:min-h-[600px] lg:rounded-l-[2.5rem] lg:rounded-r-none"
      data-tour="proof"
      aria-hidden
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{
          backgroundImage:
            'radial-gradient(circle at 25% 25%, rgba(52,227,176,0.35), transparent 40%), radial-gradient(circle at 75% 75%, rgba(11,122,99,0.5), transparent 45%)',
        }}
        aria-hidden
      />
      <div className="mesh-dots pointer-events-none absolute inset-0 opacity-20" aria-hidden />

      <div className="float-card-a absolute left-3 top-8 z-20 lg:left-6 lg:top-12">
        <div className="float-card-enter float-card-enter-1">
          <TraderStatsCard />
        </div>
      </div>
      <div className="float-card-b absolute bottom-10 left-2 z-20 lg:bottom-16 lg:left-4">
        <div className="float-card-enter float-card-enter-2">
          <LiveActivityCard />
        </div>
      </div>
      <div className="float-card-c absolute right-3 top-[38%] z-30 lg:right-8">
        <div className="float-card-enter float-card-enter-3">
          <SuccessCard />
        </div>
      </div>

      <div className="relative z-10 flex items-center justify-center px-4 py-12 lg:py-16">
        <PhoneMockup size="md" variant="light" tilt float>
          <AppPreview />
        </PhoneMockup>
      </div>

      <p className="absolute bottom-4 left-0 right-0 z-10 text-center text-[11px] font-medium text-panel-muted">
        Secured by Stellar Soroban · Instant settlement
      </p>
    </div>
  );
}
