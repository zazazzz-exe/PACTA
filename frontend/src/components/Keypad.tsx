import { useEffect, useState } from 'react';
import { m } from 'framer-motion';
import { Delete } from 'lucide-react';

// True on touch-first devices, where the on-screen keypad replaces the
// system keyboard for amounts.
export function useCoarsePointer(): boolean {
  const q = '(pointer: coarse)';
  const [coarse, setCoarse] = useState(() => typeof window !== 'undefined' && !!window.matchMedia?.(q).matches);
  useEffect(() => {
    const mq = window.matchMedia?.(q);
    if (!mq) return;
    const on = () => setCoarse(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return coarse;
}

// Apply one keypad key to a decimal amount string (max 7 decimals, the
// Stellar precision; no leading zeros).
export function applyKey(value: string, key: string): string {
  if (key === 'back') return value.slice(0, -1);
  if (key === '.') return value.includes('.') ? value : (value || '0') + '.';
  const [, frac] = value.split('.');
  if (frac !== undefined && frac.length >= 7) return value;
  if (value === '0') return key;
  return value + key;
}

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'back'];

// A familiar 3x4 numeric keypad for amounts.
export function Keypad({ onKey }: { onKey: (key: string) => void }) {
  return (
    <div className="grid grid-cols-3 gap-2" role="group" aria-label="Amount keypad">
      {KEYS.map((k) => (
        <m.button
          key={k}
          type="button"
          whileTap={{ scale: 0.94 }}
          onClick={() => onKey(k)}
          aria-label={k === 'back' ? 'Delete' : k === '.' ? 'Decimal point' : k}
          className="mono grid h-14 place-items-center rounded-tile bg-mist text-[22px] font-semibold text-ink transition-colors active:bg-accent-tint focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          {k === 'back' ? <Delete size={22} aria-hidden /> : k}
        </m.button>
      ))}
    </div>
  );
}
