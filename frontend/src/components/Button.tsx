import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'danger';

const base =
  'inline-flex items-center justify-center gap-2 h-12 px-5 rounded-control text-[15px] font-medium transition active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40';

const styles: Record<Variant, string> = {
  primary: 'bg-accent text-white hover:bg-accent-deep',
  secondary: 'bg-paper text-ink border border-hairline-strong hover:bg-mist',
  danger: 'bg-transparent text-refund border border-refund/40 hover:bg-refund-tint',
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  children: ReactNode;
}

// One primary (emerald) action per screen. Secondary and danger never compete
// for color (DESIGN §6.1).
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', className = '', children, ...rest },
  ref,
) {
  return (
    <button ref={ref} className={`${base} ${styles[variant]} ${className}`} {...rest}>
      {children}
    </button>
  );
});
