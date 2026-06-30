import { initials as toInitials } from '../lib/format';

// Initials avatar (DESIGN §6.7).
export function Avatar({ addr, className = '' }: { addr: string; className?: string }) {
  return (
    <div
      className={`w-10 h-10 rounded-pill bg-accent-tint text-accent-deep flex items-center justify-center text-sm font-medium ${className}`}
      aria-hidden
    >
      {toInitials(addr)}
    </div>
  );
}
