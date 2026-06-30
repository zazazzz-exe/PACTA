import { Status } from '../lib/contract';

const MAP: Record<number, { label: string; cls: string }> = {
  [Status.Pending]: { label: 'Pending', cls: 'bg-warn-soft text-warn border-warn/30' },
  [Status.Active]: { label: 'Active', cls: 'bg-accent-soft text-accent border-accent/30' },
  [Status.Completed]: { label: 'Completed', cls: 'bg-accent-soft text-accent border-accent/40' },
  [Status.Refunded]: { label: 'Refunded', cls: 'bg-danger-soft text-danger border-danger/30' },
  [Status.Cancelled]: { label: 'Cancelled', cls: 'bg-white/5 text-ink-muted border-hairline' },
};

export function StatusPill({ status }: { status: Status }) {
  const s = MAP[status] ?? MAP[Status.Cancelled];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${s.cls}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {s.label}
    </span>
  );
}
