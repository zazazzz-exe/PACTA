import { CheckCircle2, Info, AlertTriangle, X } from 'lucide-react';
import { useToasts, dismissToast, type ToastTone } from '../lib/notify';

const toneStyle: Record<ToastTone, string> = {
  success: 'border-accent/30 bg-accent-tint text-accent-deep',
  info: 'border-hairline bg-paper text-ink',
  warn: 'border-deadline/30 bg-deadline-tint text-deadline-deep',
};

function ToneIcon({ tone }: { tone: ToastTone }) {
  if (tone === 'success') return <CheckCircle2 size={15} aria-hidden />;
  if (tone === 'warn') return <AlertTriangle size={15} aria-hidden />;
  return <Info size={15} aria-hidden />;
}

export function Toaster() {
  const toasts = useToasts();
  if (toasts.length === 0) return null;
  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2" role="status" aria-live="polite">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`flex items-center gap-2 rounded-card border px-3.5 py-2.5 text-[13px] shadow-card ${toneStyle[t.tone]}`}
        >
          <ToneIcon tone={t.tone} />
          <span className="flex-1">{t.message}</span>
          <button
            onClick={() => dismissToast(t.id)}
            aria-label="Dismiss"
            className="grid h-6 w-6 place-items-center rounded-pill hover:bg-black/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
          >
            <X size={13} aria-hidden />
          </button>
        </div>
      ))}
    </div>
  );
}
