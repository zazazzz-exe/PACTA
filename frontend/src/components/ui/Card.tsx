import type { HTMLAttributes, ReactNode } from 'react';

// Card surfaces (DESIGN §6.2).
// - glass: dark = gradient rgba(77,124,255,.14) -> rgba(255,255,255,.03),
//          border rgba(124,155,255,.22); light = white card, blue border, soft shadow.
//          Radius 22px.
// - hero:  radial #5B86FF, #2B4BE8, #14208A, #0B0F33 (highlight top-right, away
//          from text), radius 26px, off-white text in both themes.
export type CardVariant = 'glass' | 'hero';

const variants: Record<CardVariant, string> = {
  glass: 'bg-glass border border-card rounded-card shadow-card text-ink',
  hero: 'bg-hero rounded-hero text-on-accent shadow-glow',
};

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
  padded?: boolean;
  children: ReactNode;
}

export function Card({ variant = 'glass', padded = true, className = '', children, ...rest }: CardProps) {
  return (
    <div className={`${variants[variant]} ${padded ? 'p-5' : ''} ${className}`} {...rest}>
      {children}
    </div>
  );
}
