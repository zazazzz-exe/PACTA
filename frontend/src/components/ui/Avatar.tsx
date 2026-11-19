import { initials as toInitials } from '../../lib/format';

// Avatar with a gradient ring (DESIGN §6.7): a #5B86FF -> #2B5CFF ring around a
// card-colored disc with the address initials. Decorative: the address or name
// next to it carries the meaning, so it is hidden from screen readers.
const sizes = {
  sm: { box: 'h-8 w-8', text: 'text-[11px]' },
  md: { box: 'h-10 w-10', text: 'text-sm' },
  lg: { box: 'h-14 w-14', text: 'text-lg' },
} as const;

export function Avatar({
  addr,
  size = 'md',
  className = '',
}: {
  addr: string;
  size?: keyof typeof sizes;
  className?: string;
}) {
  const s = sizes[size];
  return (
    <div
      aria-hidden
      className={`${s.box} shrink-0 rounded-pill bg-btn-primary p-[2px] shadow-glow ${className}`}
    >
      <div
        className={`flex h-full w-full items-center justify-center rounded-pill bg-paper font-semibold text-accent ${s.text}`}
      >
        {toInitials(addr)}
      </div>
    </div>
  );
}
