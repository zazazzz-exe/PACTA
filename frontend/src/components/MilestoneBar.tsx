export function MilestoneBar({ released, total }: { released: number; total: number }) {
  const segments = Array.from({ length: total }, (_, i) => i < released);
  const pct = total > 0 ? Math.round((released / total) * 100) : 0;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="label">Milestones</span>
        <span className="mono text-xs text-ink-muted">
          {released}/{total}
        </span>
      </div>
      <div className="flex gap-1" aria-label={`${released} of ${total} milestones released`}>
        {segments.map((filled, i) => (
          <div
            key={i}
            className={`h-2 flex-1 rounded-full transition-colors ${
              filled ? 'bg-accent' : 'bg-white/8 border border-hairline'
            }`}
          />
        ))}
      </div>
      <div className="text-right">
        <span className="mono text-[11px] text-ink-faint">{pct}% released</span>
      </div>
    </div>
  );
}
