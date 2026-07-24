import { useEffect, useState } from 'react';

// Simulated offline queue. When offline, a payment is stored here and auto-sent
// through the adapter when the connection returns. Offline state is the browser's
// navigator.onLine plus an optional manual override.

// ---- offline state ----
let forced = false;
const offlineSubs = new Set<() => void>();

export function isOffline(): boolean {
  return forced || (typeof navigator !== 'undefined' && navigator.onLine === false);
}
export function setForceOffline(on: boolean): void {
  forced = on;
  offlineSubs.forEach((f) => f());
}
export function toggleForceOffline(): void {
  setForceOffline(!forced);
}

export function useOffline(): boolean {
  const [off, setOff] = useState(isOffline());
  useEffect(() => {
    const update = () => setOff(isOffline());
    offlineSubs.add(update);
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      offlineSubs.delete(update);
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);
  return off;
}

// ---- outbox queue ----
export interface QueuedSend {
  id: string;
  to: string;
  assetCode: string;
  issuer?: string;
  amount: string;
  createdAt: string;
}

const KEY = 'pacta_outbox';
const outboxSubs = new Set<() => void>();

function read(): QueuedSend[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as QueuedSend[]) : [];
  } catch {
    return [];
  }
}
function write(items: QueuedSend[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(items));
  } catch {
    /* storage unavailable */
  }
  outboxSubs.forEach((f) => f());
}

export function outboxList(): QueuedSend[] {
  return read();
}
export function outboxEnqueue(item: Omit<QueuedSend, 'id' | 'createdAt'>): QueuedSend {
  const full: QueuedSend = {
    ...item,
    id: `q${Date.now().toString(36)}${Math.floor(Math.random() * 1e6).toString(36)}`,
    createdAt: new Date().toISOString(),
  };
  write([...read(), full]);
  return full;
}
export function outboxRemove(id: string): void {
  write(read().filter((x) => x.id !== id));
}

export function useOutbox(): QueuedSend[] {
  const [items, setItems] = useState<QueuedSend[]>(outboxList);
  useEffect(() => {
    const update = () => setItems(outboxList());
    outboxSubs.add(update);
    return () => {
      outboxSubs.delete(update);
    };
  }, []);
  return items;
}
