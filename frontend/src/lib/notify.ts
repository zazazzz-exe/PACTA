import { useEffect, useState } from 'react';

export type ToastTone = 'info' | 'success' | 'warn';

export interface Toast {
  id: string;
  tone: ToastTone;
  message: string;
}

export type AppEvent =
  | { kind: 'received'; assetCode: string; amount: string }
  | { kind: 'pact-bond' }
  | { kind: 'pact-deposit' }
  | { kind: 'pact-release' }
  | { kind: 'pact-complete' }
  | { kind: 'pact-refund' }
  | { kind: 'deadline-near' };

// Pure: map a domain event to display copy. Unit-tested.
export function messageForEvent(e: AppEvent): { tone: ToastTone; message: string } {
  switch (e.kind) {
    case 'received':
      return { tone: 'success', message: `Received ${e.amount} ${e.assetCode}` };
    case 'pact-bond':
      return { tone: 'info', message: 'Security bond posted' };
    case 'pact-deposit':
      return { tone: 'info', message: 'Capital deposited' };
    case 'pact-release':
      return { tone: 'info', message: 'Milestone released' };
    case 'pact-complete':
      return { tone: 'success', message: 'Pact completed' };
    case 'pact-refund':
      return { tone: 'info', message: 'Pact refunded' };
    case 'deadline-near':
      return { tone: 'warn', message: 'A Pact deadline is approaching' };
  }
}

// Toast store (module-singleton + subscribers, same pattern as outbox.ts).
let toasts: Toast[] = [];
let seq = 0;
const subs = new Set<() => void>();
const timers = new Map<string, number>(); // auto-dismiss timers, keyed by toast id
const emit = () => subs.forEach((f) => f());

export function pushEvent(e: AppEvent): void {
  const { tone, message } = messageForEvent(e);
  const id = `t${(seq += 1)}`;
  toasts = [...toasts, { id, tone, message }];
  emit();
  // auto-dismiss after 5s; track the timer so a manual dismiss can cancel it.
  if (typeof window !== 'undefined') {
    timers.set(id, window.setTimeout(() => dismissToast(id), 5000));
  }
}

export function dismissToast(id: string): void {
  const timer = timers.get(id);
  if (timer !== undefined) {
    if (typeof window !== 'undefined') window.clearTimeout(timer);
    timers.delete(id);
  }
  toasts = toasts.filter((t) => t.id !== id);
  emit();
}

export function useToasts(): Toast[] {
  const [list, setList] = useState<Toast[]>(toasts);
  useEffect(() => {
    const update = () => setList(toasts);
    subs.add(update);
    update();
    return () => {
      subs.delete(update);
    };
  }, []);
  return list;
}
