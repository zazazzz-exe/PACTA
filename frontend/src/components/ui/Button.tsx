import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';

// Button (DESIGN §6.1). One primary action per screen.
// - primary:   pill, solid accent #4F67E6, white text, the one allowed soft glow
// - secondary: pill, surface + border, ink text
// - ghost:     pill, no surface, accent text
// - danger:    pill, outline in the error color (destructive)
// Presses scale to 0.96.
// Every size keeps the tap target at 44px or more.
export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'md' | 'sm';

const base =
  'inline-flex items-center justify-center gap-2 rounded-pill font-semibold transition ' +
  'active:scale-[0.96] disabled:opacity-50 disabled:active:scale-100 disabled:cursor-not-allowed ' +
  'focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-canvas';

const sizes: Record<ButtonSize, string> = {
  md: 'h-12 min-w-tap px-6 text-[15px]',
  sm: 'h-11 min-w-tap px-4 text-[14px]',
};

const variants: Record<ButtonVariant, string> = {
  primary: 'bg-accent text-on-accent shadow-glow hover:bg-accent-deep',
  secondary:
    'bg-paper text-ink border border-card hover:border-accent/50 hover:bg-mist',
  ghost: 'bg-transparent text-accent hover:bg-accent-tint',
  danger: 'bg-transparent text-refund border border-refund/50 hover:bg-refund-tint',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', className = '', type = 'button', children, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={`${base} ${sizes[size]} ${variants[variant]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
});
