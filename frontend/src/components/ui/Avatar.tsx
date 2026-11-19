import { initials as toInitials } from '../../lib/format';

// Initials avatar (DESIGN §6.7). Its color is picked from the name (or address)
// so the same person always gets the same friendly pastel. Decorative: the name
// or address next to it carries the meaning, so it is hidden from screen readers.
const TONES = [
  'bg-accent-tint text-accent',
  'bg-mint-soft text-mint',
  'bg-apricot-soft text-apricot',
  'bg-lilac-soft text-lilac',
] as const;

const sizes = {
  sm: { box: 'h-8 w-8', text: 'text-[11px]' },
  md: { box: 'h-10 w-10', text: 'text-sm' },
  lg: { box: 'h-14 w-14', text: 'text-lg' },
} as const;

// Stable, cheap string hash (djb2) -> tone index.
export function toneIndex(seed: string): number {
  let h = 5381;
  for (let i = 0; i < seed.length; i++) h = ((h << 5) + h + seed.charCodeAt(i)) | 0;
  return Math.abs(h) % TONES.length;
}

// Initials for a display name ("Juan Dela Cruz" -> "JD"); falls back to the
// address-based initials helper.
function initialsFor(name: string | undefined, addr: string): string {
  const parts = (name ?? '').trim().split(/\s+/).filter(Boolean);
  if (parts.length) return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
  return toInitials(addr);
}

export function Avatar({
  addr,
  name,
  size = 'md',
  className = '',
}: {
  addr: string;
  name?: string;
  size?: keyof typeof sizes;
  className?: string;
}) {
  const s = sizes[size];
  const tone = TONES[toneIndex(name?.trim() || addr)];
  return (
    <div
      aria-hidden
      className={`${s.box} ${s.text} ${tone} flex shrink-0 items-center justify-center rounded-pill font-bold ${className}`}
    >
      {initialsFor(name, addr)}
    </div>
  );
}
