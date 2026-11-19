import type { ReactNode } from 'react';
import { m, useReducedMotion } from 'framer-motion';
import { EASE } from '../../components/motion/MotionProvider';

// Small building blocks shared by the landing sections.

// Reveal as soon as a small part is visible, once. Under reduced motion every
// reveal starts visible (initial={false}), so nothing depends on the trigger.
export const VIEWPORT = { once: true, amount: 0.15 } as const;

// Fade-up on scroll into view (simple fade under reduced motion via MotionConfig).
export function Reveal({
  children,
  delay = 0,
  className = '',
  y = 24,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
  y?: number;
}) {
  const reduce = useReducedMotion();
  return (
    <m.div
      className={className}
      initial={reduce ? false : { opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={VIEWPORT}
      transition={{ duration: 0.6, ease: EASE, delay }}
    >
      {children}
    </m.div>
  );
}

// Large section label ("HOW IT WORKS") with an electric dot.
export function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <p className="inline-flex items-center gap-2 text-[12px] font-bold uppercase tracking-[0.18em] text-accent">
      <span className="h-1.5 w-1.5 rounded-pill bg-[var(--lp-cyan)]" aria-hidden />
      {children}
    </p>
  );
}

const ctaBase =
  'inline-flex h-14 items-center justify-center gap-2 rounded-pill px-7 text-[15px] font-bold transition ' +
  'focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--lp-cyan)] focus-visible:ring-offset-2 focus-visible:ring-offset-canvas';

export function PrimaryCta({ children, onClick, className = '' }: { children: ReactNode; onClick: () => void; className?: string }) {
  return (
    <m.button
      type="button"
      onClick={onClick}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.96 }}
      className={`${ctaBase} bg-accent text-on-accent shadow-[0_10px_30px_rgba(53,99,245,0.45)] hover:bg-accent-deep ${className}`}
    >
      {children}
    </m.button>
  );
}

export function SecondaryCta({ children, onClick, className = '' }: { children: ReactNode; onClick: () => void; className?: string }) {
  return (
    <m.button
      type="button"
      onClick={onClick}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.96 }}
      className={`${ctaBase} lp-glass text-ink hover:bg-white/10 ${className}`}
    >
      {children}
    </m.button>
  );
}

export function scrollToId(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
}
