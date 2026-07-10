import type { ReactNode } from 'react';

const SIZES = {
  sm: { shell: 'w-[220px]', screen: 'h-[420px]' },
  md: { shell: 'w-[260px]', screen: 'h-[500px]' },
  lg: { shell: 'w-[280px]', screen: 'h-[540px]' },
} as const;

export function PhoneMockup({
  children,
  className = '',
  size = 'md',
  float = true,
  variant = 'dark',
  tilt = false,
}: {
  children: ReactNode;
  className?: string;
  size?: keyof typeof SIZES;
  float?: boolean;
  variant?: 'dark' | 'light';
  tilt?: boolean;
}) {
  const dims = SIZES[size];
  const shell =
    variant === 'light'
      ? 'rounded-[2.5rem] border-2 border-ink bg-paper p-2 shadow-pop'
      : 'rounded-[2.5rem] border-2 border-ink bg-ink p-2.5 shadow-pop';

  const floatClass = float ? (tilt ? 'phone-tilt phone-float' : 'phone-float') : tilt ? 'phone-tilt' : '';

  return (
    <div className={`mx-auto ${dims.shell} ${floatClass} ${className}`} aria-hidden>
      <div className={shell}>
        <div className={`relative overflow-hidden rounded-[2rem] bg-canvas ${dims.screen}`}>
          <div className="flex items-center justify-between px-4 pt-3 pb-2">
            <span className="mono text-[10px] text-fog">9:41</span>
            <div className="flex items-center gap-1">
              <span className="h-1 w-1 rounded-pill bg-fog" />
              <span className="h-1 w-1 rounded-pill bg-fog" />
              <span className="h-1.5 w-3 rounded-sm bg-fog/60" />
            </div>
          </div>
          <div className="px-3 pb-3">{children}</div>
        </div>
      </div>
    </div>
  );
}
