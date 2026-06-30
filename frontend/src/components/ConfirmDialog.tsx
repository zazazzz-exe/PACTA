import { useEffect, useRef, type ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from './Button';

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: ReactNode;
  confirmLabel: string;
  variant?: 'primary' | 'danger';
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

// Plain-language confirmation before a wallet signature, so nothing is signed
// blindly. Bottom sheet on mobile, centered card on desktop.
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  variant = 'primary',
  busy = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    confirmRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !busy) onCancel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, busy, onCancel]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
    >
      <div
        className="absolute inset-0 bg-ink/40"
        onClick={() => !busy && onCancel()}
        aria-hidden
      />
      <div className="relative w-full sm:max-w-sm bg-paper border border-hairline rounded-t-card sm:rounded-card shadow-pop p-5 m-0 sm:m-5">
        <h2 className="text-[16px] font-medium text-ink">{title}</h2>
        <div className="mt-2 text-[14px] leading-relaxed text-slate">{description}</div>
        <div className="mt-5 flex gap-3">
          <Button variant="secondary" className="flex-1" onClick={onCancel} disabled={busy}>
            Cancel
          </Button>
          <Button ref={confirmRef} variant={variant} className="flex-1" onClick={onConfirm} disabled={busy}>
            {busy ? (
              <>
                <Loader2 size={18} className="animate-spin" aria-hidden /> Confirming
              </>
            ) : (
              confirmLabel
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
