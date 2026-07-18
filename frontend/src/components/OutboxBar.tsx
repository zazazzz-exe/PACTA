import { useEffect, useRef, useState, type ReactNode } from 'react';
import { CloudOff, Loader2, CheckCircle2 } from 'lucide-react';
import { useWallet } from '../hooks/useWallet';
import { useOffline, useOutbox, outboxList, outboxRemove } from '../lib/outbox';
import { adapter } from '../lib/adapters/StellarAdapter';

// Shows the offline / queued state and, when the connection returns, auto-flushes
// the outbox by sending each queued payment through the adapter.
export function OutboxBar() {
  const { address } = useWallet();
  const offline = useOffline();
  const queued = useOutbox();
  const [flushing, setFlushing] = useState(false);
  const [delivered, setDelivered] = useState<number | null>(null);
  const prevOffline = useRef(offline);

  useEffect(() => {
    const wasOffline = prevOffline.current;
    prevOffline.current = offline;
    if (wasOffline && !offline && address && outboxList().length > 0 && !flushing) {
      void flush();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [offline, address]);

  async function flush() {
    setFlushing(true);
    setDelivered(null);
    const items = outboxList();
    for (const item of items) {
      try {
        await adapter.send({
          from: address!,
          to: item.to,
          asset: item.issuer ? { code: item.assetCode, issuer: item.issuer } : { code: item.assetCode },
          amount: item.amount,
        });
        outboxRemove(item.id);
      } catch {
        // Leave it queued to retry on the next reconnect.
      }
    }
    setFlushing(false);
    if (items.length > 0) {
      setDelivered(items.length);
      setTimeout(() => setDelivered(null), 4000);
    }
  }

  if (!address) return null;

  if (flushing) {
    return (
      <Bar tone="accent">
        <Loader2 size={15} className="animate-spin" aria-hidden /> Delivering queued payments...
      </Bar>
    );
  }
  if (delivered) {
    return (
      <Bar tone="accent">
        <CheckCircle2 size={15} aria-hidden /> Delivered {delivered} queued payment{delivered > 1 ? 's' : ''}.
      </Bar>
    );
  }
  if (offline && queued.length > 0) {
    return (
      <Bar tone="deadline">
        <CloudOff size={15} aria-hidden /> You are offline. {queued.length} payment
        {queued.length > 1 ? 's' : ''} queued and will send when you reconnect.
      </Bar>
    );
  }
  if (offline) {
    return (
      <Bar tone="deadline">
        <CloudOff size={15} aria-hidden /> You are offline. Payments will queue and send when you reconnect.
      </Bar>
    );
  }
  return null;
}

function Bar({ tone, children }: { tone: 'accent' | 'deadline'; children: ReactNode }) {
  const cls =
    tone === 'accent'
      ? 'border-accent/30 bg-accent-tint text-accent-deep'
      : 'border-deadline/30 bg-deadline-tint text-deadline-deep';
  return (
    <div className={`border-b ${cls}`}>
      <div className="mx-auto flex max-w-6xl items-center gap-2 px-5 py-2 text-[13px] font-medium">
        {children}
      </div>
    </div>
  );
}
