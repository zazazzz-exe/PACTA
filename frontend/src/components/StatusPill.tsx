import { Status } from '../lib/contract';

const MAP: Record<number, { label: string; cls: string }> = {
  [Status.Active]: { label: 'Active', cls: 'bg-accent-tint text-accent-deep' },
  [Status.Completed]: { label: 'Completed', cls: 'bg-accent-tint text-accent-deep' },
  [Status.Pending]: { label: 'Pending', cls: 'bg-mist text-slate' },
  [Status.Refunded]: { label: 'Refunded', cls: 'bg-refund-tint text-refund-deep' },
  [Status.Cancelled]: { label: 'Cancelled', cls: 'bg-mist text-fog' },
};

export function StatusPill({ status }: { status: Status }) {
  const s = MAP[status] ?? MAP[Status.Cancelled];
  return (
    <span className={`text-xs font-medium px-2.5 py-1 rounded-pill ${s.cls}`}>{s.label}</span>
  );
}
