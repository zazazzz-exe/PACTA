import type { ButtonHTMLAttributes, ReactNode } from 'react';

// Pill / Chip (DESIGN §6.5). Static chips label things (status, network);
// interactive chips (pass onClick) are filter or choice buttons and keep a
// 44px tap target. Every tone pairs a tinted background with text that passes
// WCAG AA in both themes (see src/lib/contrast.test.ts).
export type ChipTone = 'neutral' | 'accent' | 'deadline' | 'refund';

const tones: Record<ChipTone, string> = {
  neutral: 'bg-mist text-slate border border-hairline',
  accent: 'bg-accent-tint text-accent-deep',
  deadline: 'bg-deadline-tint text-deadline-deep',
  refund: 'bg-refund-tint text-refund-deep',
};

const selectedCls = 'bg-accent text-on-accent border border-transparent';

interface ChipProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  tone?: ChipTone;
  /** For choice chips: renders the selected (filled) state and aria-pressed. */
  selected?: boolean;
  icon?: ReactNode;
  children: ReactNode;
}

export function Chip({ tone = 'neutral', selected, icon, className = '', children, onClick, ...rest }: ChipProps) {
  const look = selected ? selectedCls : tones[tone];
  if (!onClick) {
    return (
      <span
        className={`inline-flex items-center gap-1.5 rounded-pill px-2.5 py-1 text-xs font-semibold ${look} ${className}`}
      >
        {icon}
        {children}
      </span>
    );
  }
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`inline-flex min-h-tap items-center gap-1.5 rounded-pill px-4 text-[13px] font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-text/70 ${look} ${className}`}
      {...rest}
    >
      {icon}
      {children}
    </button>
  );
}

/** Alias: a Pill is a static Chip. */
export const Pill = Chip;
