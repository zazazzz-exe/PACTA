import { useEffect, useState, type ReactNode } from 'react';
import { Wallet, LineChart, Lock, ShieldCheck } from 'lucide-react';
import './hero-flow.css';

const CYCLE = 7000;

export function HeroFlow() {
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
    <section className="relative overflow-hidden py-8">
      <div className="relative mx-auto flex justify-center px-5">
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
