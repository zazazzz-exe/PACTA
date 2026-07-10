import { useState } from 'react';
import { Check, Copy } from 'lucide-react';

// Small copy-to-clipboard control for mono values (addresses, tx hashes). For a
// "verify it yourself" product, one-tap copy is table stakes. Stops event
// propagation so it is safe to place next to (not inside) links.
export function CopyButton({
  value,
  label = 'Copy',
  size = 15,
  className = '',
}: {
  value: string;
  label?: string;
  size?: number;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copy(e: React.MouseEvent) {
    e.stopPropagation();
    e.preventDefault();
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable — no-op */
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      aria-label={copied ? 'Copied' : label}
      title={copied ? 'Copied' : label}
      className={`inline-grid h-8 w-8 shrink-0 place-items-center rounded-control text-slate transition hover:bg-mist hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 ${className}`}
    >
      {copied ? (
        <Check size={size} className="text-accent" aria-hidden />
      ) : (
        <Copy size={size} aria-hidden />
      )}
    </button>
  );
}
