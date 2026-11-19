import type { ReactNode } from 'react';

// A list row (assets, activity, settings). Leading visual, title + optional
// subtitle, trailing value (amounts go in `trailing` and use .mono). When it has
// an onClick it renders as a full-width button with a 56px row height, so the
// whole row is the tap target.
interface ListRowProps {
  leading?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  trailing?: ReactNode;
  trailingSub?: ReactNode;
  onClick?: () => void;
  className?: string;
}

export function ListRow({ leading, title, subtitle, trailing, trailingSub, onClick, className = '' }: ListRowProps) {
  const body = (
    <>
      {leading && <div className="shrink-0">{leading}</div>}
      <div className="min-w-0 flex-1 text-left">
        <div className="truncate text-[15px] font-semibold text-ink">{title}</div>
        {subtitle && <div className="truncate text-[13px] text-slate">{subtitle}</div>}
      </div>
      {(trailing || trailingSub) && (
        <div className="shrink-0 text-right">
          {trailing && <div className="mono text-[15px] font-medium text-ink">{trailing}</div>}
          {trailingSub && <div className="mono text-[12px] text-slate">{trailingSub}</div>}
        </div>
      )}
    </>
  );
  const cls = `flex w-full min-h-[56px] items-center gap-3 px-4 py-2.5 ${className}`;
  if (!onClick) return <div className={cls}>{body}</div>;
  return (
    <button
      type="button"
      onClick={onClick}
      className={`${cls} rounded-control transition hover:bg-accent-tint/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent-text/70`}
    >
      {body}
    </button>
  );
}
