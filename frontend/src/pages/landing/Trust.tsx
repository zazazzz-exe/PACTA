import { FileSearch, Globe, KeyRound, type LucideIcon } from 'lucide-react';
import { Eyebrow, Reveal } from './parts';

// §G: technology and trust, on a network-inspired background (static nodes,
// slow light trails along the links; still under reduced motion). Copy stays
// within what the product actually does: no promise of absolute security.
const ITEMS: { icon: LucideIcon; label: string; body: string }[] = [
  { icon: KeyRound, label: 'Non-custodial', body: 'Maintain control of your wallet and keys.' },
  { icon: Globe, label: 'Stellar-powered', body: 'Built on Stellar for digital asset transactions.' },
  { icon: FileSearch, label: 'Transparent', body: 'Verify supported transactions through on-chain records.' },
];

const NODES = [
  [80, 90], [260, 40], [430, 120], [610, 60], [790, 140], [960, 70], [1120, 130],
  [150, 260], [360, 300], [540, 240], [720, 310], [900, 250], [1060, 300],
];
const LINKS = [
  [0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [0, 7], [7, 8], [8, 9], [9, 10], [10, 11], [11, 12],
  [2, 9], [4, 10], [6, 12], [1, 8], [3, 9], [5, 11],
];

export function Trust() {
  return (
    <section id="trust" aria-labelledby="lp-trust-title" className="relative overflow-hidden px-5 py-24 sm:py-32">
      <svg aria-hidden className="pointer-events-none absolute inset-x-0 top-10 h-[360px] w-full opacity-60" viewBox="0 0 1200 360" preserveAspectRatio="xMidYMid slice">
        {LINKS.map(([a, b], i) => (
          <g key={i}>
            <line x1={NODES[a][0]} y1={NODES[a][1]} x2={NODES[b][0]} y2={NODES[b][1]} stroke="rgba(140,175,255,0.16)" strokeWidth="1" />
            <line
              className="lp-trail"
              x1={NODES[a][0]}
              y1={NODES[a][1]}
              x2={NODES[b][0]}
              y2={NODES[b][1]}
              stroke="#5FD4F4"
              strokeWidth="1.5"
              strokeLinecap="round"
              style={{ animationDelay: `${(i % 6) * 0.9}s` }}
            />
          </g>
        ))}
        {NODES.map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r={i % 4 === 0 ? 4 : 3} fill={i % 3 === 0 ? '#5FD4F4' : '#8CAFFF'} opacity="0.8" />
        ))}
      </svg>
      <div className="relative mx-auto max-w-6xl">
        <Reveal className="max-w-2xl">
          <Eyebrow>Technology</Eyebrow>
          <h2 id="lp-trust-title" className="mt-4 text-[36px] font-bold leading-[1.05] tracking-[-0.02em] text-ink sm:text-[52px]">
            Powered by Stellar.
            <br />
            <span className="lp-grad-text">Designed around trust.</span>
          </h2>
        </Reveal>
        <div className="mt-14 grid gap-4 md:grid-cols-3">
          {ITEMS.map(({ icon: Icon, label, body }, i) => (
            <Reveal key={label} delay={i * 0.08}>
              <div className="lp-card h-full rounded-card p-7 shadow-card">
                <span className="grid h-12 w-12 place-items-center rounded-tile bg-accent-tint text-[var(--lp-ice)]">
                  <Icon size={22} aria-hidden />
                </span>
                <p className="mt-6 text-[13px] font-bold uppercase tracking-[0.16em] text-accent">{label}</p>
                <p className="mt-2 text-[18px] font-semibold leading-snug text-ink">{body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
