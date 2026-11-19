// §H: a slow, seamless brand strip. Purely decorative for screen readers (the
// phrases are already said elsewhere); pauses on hover; still with reduced motion.
const WORDS = ['Secure payments', 'Smart agreements', 'Stellar-powered', 'Transparent transactions', 'Protected payments'];

export function Marquee() {
  const run = (
    <div className="flex shrink-0 items-center">
      {WORDS.map((w) => (
        <span key={w} className="flex items-center">
          <span className="px-8 text-[22px] font-bold uppercase tracking-[0.12em] text-ink/90 sm:text-[28px]">{w}</span>
          <span className="text-[20px] text-[var(--lp-cyan)]">✦</span>
        </span>
      ))}
    </div>
  );
  return (
    <div className="lp-marquee overflow-hidden border-y border-hairline bg-white/[0.02] py-6" aria-hidden>
      <div className="lp-marquee-track flex w-max">
        {run}
        {run}
      </div>
    </div>
  );
}
