import { toneIndex } from './ui/Avatar';

// Original token marks (not issuer logos): USDC a blue coin, XLM a dark
// indigo coin, anything else a tinted letter coin picked from its key.
// Decorative; the code is always printed next to it.
const KNOWN: Record<string, string> = {
  USDC: 'bg-[radial-gradient(circle_at_30%_25%,#7895FF,#3A55E0)] text-white',
  XLM: 'bg-[radial-gradient(circle_at_30%_25%,#4A5378,#1E2340)] text-white ring-1 ring-white/10',
  EURC: 'bg-[radial-gradient(circle_at_30%_25%,#5FD4F4,#0A7482)] text-white',
};
const TONES = ['bg-accent-tint text-accent', 'bg-mint-soft text-mint', 'bg-apricot-soft text-apricot', 'bg-lilac-soft text-lilac'];

export function TokenIcon({ code, seed, size = 40 }: { code: string; seed?: string; size?: number }) {
  const cls = KNOWN[code.toUpperCase()] ?? TONES[toneIndex(seed ?? code)];
  const label = code.toUpperCase() === 'USDC' ? '$' : code.toUpperCase() === 'XLM' ? '✦' : code.slice(0, 1);
  return (
    <span
      aria-hidden
      style={{ width: size, height: size, fontSize: Math.round(size * 0.38) }}
      className={`grid shrink-0 place-items-center rounded-full font-bold shadow-[inset_0_-2px_0_rgba(0,0,0,0.18)] ${cls}`}
    >
      {label}
    </span>
  );
}
