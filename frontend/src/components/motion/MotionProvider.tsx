import type { ReactNode } from 'react';
import { LazyMotion, MotionConfig } from 'framer-motion';

// Motion tokens (CLAUDE.md "Motion"): UI 150-250ms, screens 300-400ms, one ease.
export const EASE = [0.22, 1, 0.36, 1] as const;
export const DUR = { ui: 0.2, screen: 0.35 } as const;
export const SPRING = { type: 'spring', stiffness: 300, damping: 30 } as const;

const loadFeatures = () => import('./features').then((m) => m.default);

// App-wide motion setup. `strict` makes sure components use the lightweight `m`
// components, and reducedMotion="user" turns transform/scale animations into
// simple fades for people who prefer reduced motion.
export function MotionProvider({ children }: { children: ReactNode }) {
  return (
    <LazyMotion features={loadFeatures} strict>
      <MotionConfig reducedMotion="user" transition={{ duration: DUR.ui, ease: EASE }}>
        {children}
      </MotionConfig>
    </LazyMotion>
  );
}
