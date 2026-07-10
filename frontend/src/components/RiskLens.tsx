import { ShieldCheck, AlertTriangle, CheckCircle2, Minus, Sparkles, Loader2 } from 'lucide-react';
import type { RiskRead, RiskLevel } from '../lib/riskTypes';

const levelStyle: Record<RiskLevel, { box: string; dot: string; label: string }> = {
  low: { box: 'bg-accent-tint text-accent-deep', dot: 'bg-accent', label: 'Low risk' },
  moderate: { box: 'bg-mist text-slate', dot: 'bg-slate', label: 'Moderate' },
  elevated: { box: 'bg-deadline-tint text-deadline-deep', dot: 'bg-deadline', label: 'Elevated' },
  high: { box: 'bg-refund-tint text-refund-deep', dot: 'bg-refund', label: 'High risk' },
};

const toneIcon = {
  positive: <CheckCircle2 size={15} className="text-accent shrink-0" aria-hidden />,
  neutral: <Minus size={15} className="text-slate shrink-0" aria-hidden />,
  caution: <AlertTriangle size={15} className="text-deadline shrink-0" aria-hidden />,
};

export function RiskLens({
  read,
  loading,
  error,
  onApply,
}: {
  read?: RiskRead;
  loading?: boolean;
  error?: boolean;
  onApply?: (milestones: number, firstPct: number) => void;
}) {
  if (loading) {
    return (
      <div className="bg-paper border border-hairline rounded-card p-4 flex items-center gap-2.5 text-slate text-sm">
        <Loader2 size={16} className="animate-spin" aria-hidden /> Reading on-chain history...
      </div>
    );
  }
  if (error || !read) {
    return (
      <div className="bg-mist rounded-control p-4 text-[13px] text-slate">
        Risk read unavailable right now. The provider's on-chain history is still shown above.
      </div>
    );
  }

  const s = levelStyle[read.risk_level];
  return (
    <div className="bg-paper border border-hairline rounded-card shadow-card p-4">
      <div className="flex items-center justify-between mb-3">
        <span
          className={`inline-flex items-center gap-2 text-xs font-medium px-2.5 py-1 rounded-pill ${s.box}`}
        >
          <span className={`w-1.5 h-1.5 rounded-pill ${s.dot}`} /> {s.label}
        </span>
        <span className="inline-flex items-center gap-1 text-[11px] text-fog">
          <Sparkles size={13} aria-hidden /> Risk lens
        </span>
      </div>

      <p className="text-[15px] font-medium text-ink mb-1">{read.headline}</p>
      <p className="text-[13px] text-slate mb-3">{read.summary}</p>

      <ul className="space-y-1.5 mb-3">
        {read.signals.map((sig, i) => (
          <li key={i} className="flex items-start gap-2 text-[13px] text-ink">
            {toneIcon[sig.tone]}
            <span>
              <span className="font-medium">{sig.label}.</span>{' '}
              <span className="text-slate">{sig.detail}</span>
            </span>
          </li>
        ))}
      </ul>

      <div className="bg-mist rounded-control p-3 flex items-start gap-2 mb-3">
        <ShieldCheck size={16} className="text-accent shrink-0 mt-0.5" aria-hidden />
        <p className="text-[13px] text-ink">{read.recommendation}</p>
      </div>

      {onApply && (
        <button
          onClick={() => onApply(read.suggested_milestones, read.suggested_first_milestone_pct)}
          className="w-full h-11 rounded-control bg-accent text-white text-sm font-medium hover:bg-accent-deep active:scale-[0.98] transition focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
        >
          Apply suggested protection ({read.suggested_milestones} milestones)
        </button>
      )}

      <p className="text-[11px] text-fog mt-2.5">
        Based on this provider's on-chain history. A signal, not a guarantee.
      </p>
    </div>
  );
}
