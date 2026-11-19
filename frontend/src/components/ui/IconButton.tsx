import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';

// Icon-only button. Always 44x44 (tap target) and always labelled: `label`
// becomes aria-label and the tooltip, since there is no visible text.
export type IconButtonVariant = 'ghost' | 'glass' | 'primary';

const variants: Record<IconButtonVariant, string> = {
  ghost: 'text-slate hover:text-ink hover:bg-mist',
  glass: 'bg-glass border border-card text-ink shadow-card hover:border-accent-text/50',
  primary: 'bg-btn-primary text-on-accent shadow-glow hover:brightness-110',
};

interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'aria-label'> {
  label: string;
  variant?: IconButtonVariant;
  children: ReactNode;
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { label, variant = 'ghost', className = '', type = 'button', children, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      aria-label={label}
      title={label}
      className={`grid h-11 w-11 shrink-0 place-items-center rounded-pill transition active:scale-95 disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-text/70 ${variants[variant]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
});
