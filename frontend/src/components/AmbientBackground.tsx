// Slow-drifting emerald aurora plus floating particles. Decorative only.

const PARTICLES = [
  { left: 12, size: 5, dur: 17, delay: 0 },
  { left: 28, size: 3, dur: 22, delay: 4 },
  { left: 44, size: 6, dur: 15, delay: 8 },
  { left: 61, size: 4, dur: 20, delay: 2 },
  { left: 74, size: 7, dur: 24, delay: 6 },
  { left: 88, size: 3, dur: 18, delay: 10 },
  { left: 53, size: 4, dur: 26, delay: 12 },
];

const SUBTLE_PARTICLES = PARTICLES.slice(0, 4);

export function AmbientBackground({ variant = 'full' }: { variant?: 'full' | 'subtle' }) {
  const subtle = variant === 'subtle';
  const particles = subtle ? SUBTLE_PARTICLES : PARTICLES;
  const blobOpacity = subtle ? 0.28 : 0.55;
  const signalOpacity = subtle ? 0.22 : 0.5;
  const deepOpacity = subtle ? 0.18 : 0.45;

  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden>
      <div
        className="blob blob-a"
        style={{
          top: '2%',
          left: '2%',
          width: subtle ? '28vw' : '38vw',
          height: subtle ? '28vw' : '38vw',
          background: `radial-gradient(circle, rgba(11,122,99,${blobOpacity}), transparent 65%)`,
        }}
      />
      <div
        className="blob blob-b"
        style={{
          top: '18%',
          right: '-4%',
          width: subtle ? '26vw' : '36vw',
          height: subtle ? '26vw' : '36vw',
          background: `radial-gradient(circle, rgba(52,227,176,${signalOpacity}), transparent 65%)`,
        }}
      />
      <div
        className="blob blob-c"
        style={{
          bottom: '-8%',
          left: '28%',
          width: subtle ? '26vw' : '36vw',
          height: subtle ? '26vw' : '36vw',
          background: `radial-gradient(circle, rgba(10,90,73,${deepOpacity}), transparent 65%)`,
        }}
      />
      {!subtle && (
        <div
          className="blob blob-b"
          style={{
            top: '55%',
            left: '60%',
            width: '22vw',
            height: '22vw',
            background: 'radial-gradient(circle, rgba(199,125,17,0.18), transparent 65%)',
            animationDelay: '-8s',
          }}
        />
      )}

      {particles.map((p, i) => (
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
            opacity: subtle ? 0.5 : 1,
          }}
        />
      ))}
    </div>
  );
}
