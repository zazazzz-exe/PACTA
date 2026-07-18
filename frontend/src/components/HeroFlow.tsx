import { useEffect, useState, type ReactNode } from 'react';
import { Wallet, ArrowDownLeft, Lock, ShieldCheck } from 'lucide-react';
import './hero-flow.css';

const CYCLE = 7000;

// The live Pact flow: money leaves your wallet, locks in the protected vault
// (count-up + staged milestone release), then settles to the recipient, with the
// security bond held underneath. One 7s loop; reduced motion shows the resolved
// state. The vault is the app's one dark surface (carbon + signal green).
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
    <div className="relative flex w-full justify-center overflow-hidden py-8">
      <div
        aria-hidden
        className="hf-drift1 pointer-events-none absolute -top-8 right-6 h-52 w-52 rounded-full bg-accent-tint opacity-70 blur-2xl"
      />
      <div
        aria-hidden
        className="hf-drift2 pointer-events-none absolute -bottom-8 left-6 h-40 w-40 rounded-full bg-signal/15 opacity-80 blur-2xl"
      />

      <div className="hf-band relative flex flex-shrink-0 items-center">
        <Node icon={<Wallet size={20} />} label="Your wallet" />

        <Wire>
          <span className="hf-token hf-in-a" />
          <span className="hf-token hf-in-b" />
        </Wire>

        <div className="hf-vault w-[194px] flex-shrink-0 rounded-card border border-grid bg-carbon p-4 text-left">
          <div className="mb-2 flex items-center gap-1.5">
            <Lock size={14} className="text-signal" aria-hidden />
            <span className="font-mono text-[11px] tracking-wide text-signal">protected</span>
          </div>
          <div className="mb-3 flex items-baseline gap-1.5">
            <span className="font-mono text-[26px] font-medium tabular-nums text-signal">{amount}</span>
            <span className="font-mono text-xs text-panel-muted">XLM</span>
          </div>
          <div className="relative mb-2.5 h-1.5 overflow-hidden rounded-pill bg-grid">
            <div className="hf-release h-1.5 rounded-pill bg-signal" />
            <span className="absolute top-0 left-1/4 h-1.5 w-[1.5px] bg-carbon" />
            <span className="absolute top-0 left-1/2 h-1.5 w-[1.5px] bg-carbon" />
            <span className="absolute top-0 left-3/4 h-1.5 w-[1.5px] bg-carbon" />
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-pill bg-onyx px-2.5 py-1">
            <ShieldCheck size={13} className="text-panel-muted" aria-hidden />
            <span className="font-mono text-[11px] text-panel-muted">20 XLM bond</span>
          </span>
        </div>

        <Wire>
          <span className="hf-token hf-out-a" />
          <span className="hf-token hf-out-b" />
        </Wire>

        <Node icon={<ArrowDownLeft size={20} />} label="Recipient" />
      </div>
    </div>
  );
}

function Node({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <div className="w-[66px] flex-shrink-0 text-center">
      <div className="mx-auto flex h-[46px] w-[46px] items-center justify-center rounded-full border border-hairline-strong bg-paper text-slate shadow-card">
        {icon}
      </div>
      <p className="mt-1.5 text-[11px] font-medium text-slate">{label}</p>
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
