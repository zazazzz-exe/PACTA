import type { HTMLAttributes, ReactNode } from 'react';

// Card surfaces (DESIGN §6.2). Radius 24px, 20px padding, soft shadow, no glow.
// - glass (alias "surface"): the plain card surface with a hairline border.
// - hero: the calm balance surface (dark #1B2033 -> #20284A, light #EEF1FF) with
//         normal ink text. Only primary/secondary text may sit on it.
export type CardVariant = 'glass' | 'surface' | 'hero';

const variants: Record<CardVariant, string> = {
  glass: 'bg-paper border border-card rounded-card shadow-card text-ink',
  surface: 'bg-paper border border-card rounded-card shadow-card text-ink',
  hero: 'bg-balance border border-card rounded-hero text-ink',
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
