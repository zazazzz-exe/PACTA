import { Status } from '../lib/contract';

const MAP: Record<number, { label: string; cls: string }> = {
  [Status.Active]: { label: 'Active', cls: 'bg-accent-tint text-accent-deep' },
  [Status.Completed]: { label: 'Completed', cls: 'bg-mint-soft text-mint' },
  [Status.Pending]: { label: 'Pending', cls: 'bg-deadline-tint text-deadline-deep' },
  [Status.Refunded]: { label: 'Refunded', cls: 'bg-refund-tint text-refund-deep' },
  [Status.Cancelled]: { label: 'Cancelled', cls: 'bg-mist text-fog' },
};

export function StatusPill({ status }: { status: Status }) {
  const s = MAP[status] ?? MAP[Status.Cancelled];
  return (
    <span className={`inline-flex shrink-0 items-center rounded-pill px-2.5 py-1 text-[12px] font-bold ${s.cls}`}>{s.label}</span>
  );
}
