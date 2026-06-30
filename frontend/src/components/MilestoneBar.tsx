import { formatAmount } from '../lib/format';

// Numbering is earned here (a real sequence). Flat segments; filled = accent,
// empty = hairline-strong (DESIGN §6.5).
export function MilestoneBar({
  released,
  total,
  releasedAmount,
}: {
  released: number;
  total: number;
  releasedAmount: bigint;
}) {
  return (
    <div>
      <div className="flex justify-between text-[13px] mb-2">
        <span className="text-slate">Milestones released</span>
        <span className="mono font-medium text-ink">
          {released} of {total}
        </span>
      </div>
      <div className="flex gap-1.5" aria-label={`${released} of ${total} milestones released`}>
        {Array.from({ length: total }).map((_, i) => (
          <div
            key={i}
            className={`flex-1 h-2 rounded-pill transition-colors ${
              i < released ? 'bg-accent' : 'bg-hairline-strong'
            }`}
          />
        ))}
      </div>
      <p className="mono text-xs text-fog mt-2">
        {formatAmount(releasedAmount)} released to trader so far
      </p>
    </div>
  );
}
