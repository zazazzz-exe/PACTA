import { useEffect, useState } from 'react';
import { countdown } from '../lib/format';

// Live countdown to a unix-seconds deadline. Turns amber within the last
// minute and red once the deadline (and thus Emergency Refund) is reached.
export function Countdown({ deadlineSec, className = '' }: { deadlineSec: number; className?: string }) {
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));

  useEffect(() => {
    const t = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(t);
  }, []);

  const remaining = deadlineSec - now;
  const reached = remaining <= 0;
  const soon = remaining > 0 && remaining <= 60;
  const tone = reached ? 'text-danger' : soon ? 'text-warn' : 'text-ink';

  return (
    <span className={`mono ${tone} ${className}`}>
      {reached ? 'Refund available' : countdown(deadlineSec, now)}
    </span>
  );
}
