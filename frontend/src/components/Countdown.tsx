import { useEffect, useState } from 'react';
import { countdown } from '../lib/format';

// Live countdown to a unix-seconds deadline (the only persistent motion in the
// app, DESIGN §8). Amber within the last minute, refund (clay) once reached.
export function Countdown({ deadlineSec, className = '' }: { deadlineSec: number; className?: string }) {
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));

  useEffect(() => {
    const t = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(t);
  }, []);

  const remaining = deadlineSec - now;
  const reached = remaining <= 0;

  return (
    <span className={`mono ${reached ? 'text-refund-deep' : 'text-deadline-deep'} ${className}`}>
      {reached ? 'Deadline passed' : countdown(deadlineSec, now)}
    </span>
  );
}
