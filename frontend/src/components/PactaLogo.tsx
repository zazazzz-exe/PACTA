// The PACTA mark. The neon glow is a separate pair of layers (a halo behind the
// mark and a faint rim highlight on top), so `glow={false}` shows the mark
// exactly as drawn. The glow is static; nothing here animates.
export function PactaLogo({ glow = true, className = 'h-9 w-9' }: { glow?: boolean; className?: string }) {
  return (
    <span aria-hidden className={`relative inline-block shrink-0 ${className}`}>
      {glow && (
        <img
          src="/brand/pacta-mark-glow.png"
          alt=""
          className="pacta-logo-glow pointer-events-none absolute -inset-[40%] h-[180%] w-[180%] max-w-none select-none"
          draggable={false}
        />
      )}
      <img src="/brand/pacta-mark.png" alt="" className="relative h-full w-full select-none object-contain" draggable={false} />
      {glow && (
        <img
          src="/brand/pacta-mark-rim.png"
          alt=""
          className="pacta-logo-rim pointer-events-none absolute inset-0 h-full w-full select-none"
          draggable={false}
        />
      )}
    </span>
  );
}
