import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';

// Electric-glow button (DESIGN §6.1). One primary action per screen.
// - primary:   pill, gradient #5B86FF -> #2B5CFF (label sits on the #2B5CFF part, AA),
//              glow shadow, off-white text
// - secondary: pill, glass/outline, ink text
// - ghost:     pill, no surface, blue text
// - danger:    pill, outline in the refund color (destructive)
// Every size keeps the tap target at 44px or more.
export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'md' | 'sm';

const base =
  'inline-flex items-center justify-center gap-2 rounded-pill font-semibold transition ' +
  'active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100 disabled:cursor-not-allowed ' +
  'focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-text/70 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas';

const sizes: Record<ButtonSize, string> = {
  md: 'h-12 min-w-tap px-6 text-[15px]',
  sm: 'h-11 min-w-tap px-4 text-[14px]',
};

const variants: Record<ButtonVariant, string> = {
  primary: 'bg-btn-primary text-on-accent shadow-glow hover:brightness-110 btn-shimmer',
  secondary:
    'bg-glass text-ink border border-card shadow-card hover:border-accent-text/50 hover:bg-accent-tint/40',
  ghost: 'bg-transparent text-accent hover:bg-accent-tint/60',
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
