import { useEffect, useRef, useState } from 'react';
import { ExternalLink } from 'lucide-react';

export interface ProofPanelProps {
  id: string;
  protectedAmount: string; // full-precision mono string, e.g. "75.0000000"
  txHash?: string; // short hash, e.g. "9f3a…b1c4"
  contractShort: string;
  explorerUrl: string;
  /** Count the protected amount up once on first mount (DESIGN §8, hero only). */
  countUp?: boolean;
}

// Count up the integer part once, keeping the fractional digits fixed so the
// mono number stays clean (no decimal churn). Respects reduced motion.
function useCountUp(target: string, enabled: boolean, durationMs = 500): string {
  const [display, setDisplay] = useState(target);
  const raf = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (!enabled) {
      setDisplay(target);
      return;
    }
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduce) {
      setDisplay(target);
      return;
    }
    const [intStr, fracStr] = target.split('.');
    const targetInt = parseInt(intStr, 10);
    if (!Number.isFinite(targetInt)) {
      setDisplay(target);
      return;
    }
    let start = 0;
    const tick = (ts: number) => {
      if (!start) start = ts;
      const p = Math.min(1, (ts - start) / durationMs);
      const eased = 1 - Math.pow(1 - p, 3);
      const cur = Math.round(targetInt * eased);
      setDisplay(fracStr ? `${cur}.${fracStr}` : `${cur}`);
      if (p < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, [target, enabled, durationMs]);

  return display;
}

// The one dark surface in the app. Mono throughout, signal-mint accent, no
// shadow, no brand neutrals, no sans body copy (DESIGN §6.9).
export function ProofPanel({
  id,
  protectedAmount,
  txHash,
  contractShort,
  explorerUrl,
  countUp = false,
}: ProofPanelProps) {
  const shown = useCountUp(protectedAmount, countUp);
  return (
    <div className="relative overflow-hidden bg-carbon border border-grid rounded-card p-4 sm:p-5">
      {/* live-instrument motion (decorative) */}
      <div className="proof-grid" aria-hidden />
      <div className="proof-sheen" aria-hidden />

      <div className="relative z-10">
        <p className="mono text-[11px] text-signal mb-2.5 flex items-center gap-1.5">
          <span className="pulse-dot inline-block h-1.5 w-1.5 rounded-full bg-signal" aria-hidden />
          proof · {id}
        </p>
        <div className="flex items-baseline gap-2 mb-2.5">
          <span className="mono text-xl font-medium text-signal tabular-nums">{shown}</span>
          <span className="mono text-xs text-panel-muted">XLM protected</span>
        </div>
        {txHash && (
          <p className="mono text-xs text-panel-ink mb-1">
            tx {txHash} <span className="text-panel-muted">confirmed</span>
          </p>
        )}
        <a
          href={explorerUrl}
          target="_blank"
          rel="noreferrer"
          className="mono text-xs text-panel-muted inline-flex items-center gap-1.5 hover:text-signal focus:outline-none focus-visible:text-signal"
        >
          {contractShort} <ExternalLink size={13} aria-hidden />
        </a>
      </div>
    </div>
  );
}
