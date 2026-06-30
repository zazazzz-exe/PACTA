// Slow-drifting emerald aurora plus a few floating particles behind all
// content. Decorative only, fixed, non-interactive, disabled under reduced motion.

// position %, size px, duration s, delay s
const PARTICLES = [
  { left: 12, size: 5, dur: 17, delay: 0 },
  { left: 28, size: 3, dur: 22, delay: 4 },
  { left: 44, size: 6, dur: 15, delay: 8 },
  { left: 61, size: 4, dur: 20, delay: 2 },
  { left: 74, size: 7, dur: 24, delay: 6 },
  { left: 88, size: 3, dur: 18, delay: 10 },
  { left: 53, size: 4, dur: 26, delay: 12 },
];

export function AmbientBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden>
      <div
        className="blob blob-a"
        style={{
          top: '2%',
          left: '2%',
          width: '38vw',
          height: '38vw',
          background: 'radial-gradient(circle, rgba(11,122,99,0.55), transparent 65%)',
        }}
      />
      <div
        className="blob blob-b"
        style={{
          top: '18%',
          right: '-4%',
          width: '36vw',
          height: '36vw',
          background: 'radial-gradient(circle, rgba(52,227,176,0.50), transparent 65%)',
        }}
      />
      <div
        className="blob blob-c"
        style={{
          bottom: '-8%',
          left: '28%',
          width: '36vw',
          height: '36vw',
          background: 'radial-gradient(circle, rgba(10,90,73,0.45), transparent 65%)',
        }}
      />

      {PARTICLES.map((p, i) => (
        <span
          key={i}
          className="particle"
          style={{
            left: `${p.left}%`,
            width: `${p.size + 2}px`,
            height: `${p.size + 2}px`,
            boxShadow: '0 0 8px rgba(11,122,99,0.5)',
            animationDuration: `${p.dur}s`,
            animationDelay: `${p.delay}s`,
          }}
        />
      ))}
    </div>
  );
}
