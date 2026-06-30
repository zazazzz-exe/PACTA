import { useEffect, useState, type ReactNode } from 'react';
import { Wallet, LineChart, Lock, ShieldCheck } from 'lucide-react';
import './hero-flow.css';

const CYCLE = 7000;

export function HeroFlow({ onConnect }: { onConnect?: () => void }) {
  const [amount, setAmount] = useState(0);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mq.matches) {
      setAmount(100);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const tick = (t: number) => {
      const p = ((t - start) % CYCLE) / CYCLE;
      const v = p < 0.3 ? 0 : p < 0.45 ? Math.round(((p - 0.3) / 0.15) * 100) : 100;
      setAmount((prev) => (prev === v ? prev : v));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <section className="relative overflow-hidden">
      <div aria-hidden className="hf-drift1 pointer-events-none absolute -top-16 -right-12 h-64 w-64 rounded-full bg-accent-tint opacity-40 blur-3xl" />

      <div className="relative mx-auto max-w-5xl px-5 py-12">
        <div className="grid items-center gap-10 lg:grid-cols-[1fr_600px] lg:gap-12">
          {/* Left: heading, copy, connect (left-aligned on desktop) */}
          <div className="min-w-0 text-center lg:text-left">
            <p className="mb-5 text-[12px] font-semibold uppercase tracking-[0.22em] text-accent">Pacta</p>
            <h1 className="mb-2.5 text-[26px] font-semibold leading-tight text-ink sm:text-[34px]">
              Trust, written in code.
            </h1>
            <p className="mx-auto mb-8 max-w-[440px] text-[15px] leading-relaxed text-slate lg:mx-0">
              Lock your money in a contract no one can run off with. Released step by step,
              backed by the trader's bond, and provable on-chain.
            </p>
            <div className="flex justify-center lg:justify-start">
              <button
                onClick={onConnect}
                className="h-12 rounded-control bg-accent px-7 text-[15px] font-medium text-white transition hover:bg-accent-deep active:scale-[0.98]"
              >
                Connect wallet
              </button>
            </div>
          </div>

          {/* Right: animated escrow flow */}
          <div className="flex min-w-0 justify-center overflow-hidden">
            <div className="hf-band flex flex-shrink-0 items-center">
              <Node icon={<Wallet size={20} />} label="Investor" />

              <Wire>
                <span className="hf-token hf-in-a" />
                <span className="hf-token hf-in-b" />
              </Wire>

              <div className="hf-vault w-[194px] flex-shrink-0 rounded-card border border-grid bg-carbon p-4 text-left">
                <div className="mb-2 flex items-center gap-1.5">
                  <Lock size={14} className="text-signal" />
                  <span className="font-mono text-[11px] text-signal">protected</span>
                </div>
                <div className="mb-3 flex items-baseline gap-1.5">
                  <span className="font-mono text-[26px] font-medium text-signal">{amount}</span>
                  <span className="font-mono text-xs text-panel-muted">XLM</span>
                </div>
                <div className="relative mb-2.5 h-1.5 overflow-hidden rounded-pill bg-grid">
                  <div className="hf-release h-1.5 rounded-pill bg-signal" />
                  <span className="absolute top-0 left-1/4 h-1.5 w-[1.5px] bg-carbon" />
                  <span className="absolute top-0 left-1/2 h-1.5 w-[1.5px] bg-carbon" />
                  <span className="absolute top-0 left-3/4 h-1.5 w-[1.5px] bg-carbon" />
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-pill bg-onyx px-2.5 py-1">
                  <ShieldCheck size={13} className="text-panel-muted" />
                  <span className="font-mono text-[11px] text-panel-muted">20 XLM bond</span>
                </span>
              </div>

              <Wire>
                <span className="hf-token hf-out-a" />
                <span className="hf-token hf-out-b" />
              </Wire>

              <Node icon={<LineChart size={20} />} label="Trader" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Node({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <div className="w-[66px] flex-shrink-0 text-center">
      <div className="mx-auto flex h-[46px] w-[46px] items-center justify-center rounded-full border border-hairline-strong bg-paper text-slate">
        {icon}
      </div>
      <p className="mt-1.5 text-[11px] text-slate">{label}</p>
    </div>
  );
}

function Wire({ children }: { children: ReactNode }) {
  return (
    <div className="relative h-0.5 w-20 flex-shrink-0 border-t-[1.5px] border-dashed border-hairline-strong">
      {children}
    </div>
  );
}
