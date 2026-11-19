import type { ReactNode } from 'react';

// Section title (17px/700) with an optional text action ("See all").
export function SectionHeader({
  id,
  title,
  action,
  extra,
}: {
  id: string;
  title: string;
  action?: { label: string; onClick: () => void };
  extra?: ReactNode;
}) {
  return (
    <div className="mb-3 flex items-center justify-between gap-2">
      <h2 id={id} className="text-[17px] font-bold text-ink">
        {title}
      </h2>
      <div className="flex items-center gap-1">
        {extra}
        {action && (
          <button
            type="button"
            onClick={action.onClick}
            className="inline-flex min-h-tap items-center rounded-pill px-3 text-[13px] font-semibold text-accent transition hover:bg-accent-tint focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            {action.label}
          </button>
        )}
      </div>
    </div>
  );
}
