import { m } from 'framer-motion';
import { EASE } from '../motion/MotionProvider';

// Circular progress that animates to its value (DESIGN §6.10). The label is for
// screen readers; the visual center shows `children` (e.g. "2/4").
interface ProgressRingProps {
  value: number; // 0..1
  size?: number;
  stroke?: number;
  label: string;
  tone?: 'accent' | 'apricot' | 'mint';
  children?: React.ReactNode;
}

const STROKE: Record<NonNullable<ProgressRingProps['tone']>, string> = {
  accent: 'stroke-accent',
  apricot: 'stroke-apricot',
  mint: 'stroke-mint',
};

export function ProgressRing({ value, size = 56, stroke = 6, label, tone = 'accent', children }: ProgressRingProps) {
  const clamped = Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0));
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div
      className="relative shrink-0"
      style={{ width: size, height: size }}
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(clamped * 100)}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} className="stroke-mist" />
        <m.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          className={STROKE[tone]}
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: c * (1 - clamped) }}
          transition={{ duration: 0.6, ease: EASE }}
        />
      </svg>
      {children && (
        <div className="mono absolute inset-0 grid place-items-center text-[12px] font-semibold text-ink">{children}</div>
      )}
    </div>
  );
}
