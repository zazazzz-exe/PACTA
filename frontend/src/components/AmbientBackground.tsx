// Slow-drifting emerald aurora behind content. Decorative, calm, restrained
// (DESIGN §8: no busy recurring motion). No particles.

export function AmbientBackground({ variant = 'full' }: { variant?: 'full' | 'subtle' }) {
  const subtle = variant === 'subtle';
  const blobOpacity = subtle ? 0.28 : 0.5;
  const signalOpacity = subtle ? 0.22 : 0.45;
  const deepOpacity = subtle ? 0.18 : 0.4;

  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden>
      <div
        className="blob blob-a"
        style={{
          top: '2%',
          left: '2%',
          width: subtle ? '28vw' : '38vw',
          height: subtle ? '28vw' : '38vw',
          background: `radial-gradient(circle, rgba(43,92,255,${blobOpacity}), transparent 65%)`,
        }}
      />
      <div
        className="blob blob-b"
        style={{
          top: '18%',
          right: '-4%',
          width: subtle ? '26vw' : '36vw',
          height: subtle ? '26vw' : '36vw',
          background: `radial-gradient(circle, rgba(91,134,255,${signalOpacity}), transparent 65%)`,
        }}
      />
      <div
        className="blob blob-c"
        style={{
          bottom: '-8%',
          left: '28%',
          width: subtle ? '26vw' : '36vw',
          height: subtle ? '26vw' : '36vw',
          background: `radial-gradient(circle, rgba(20,32,138,${deepOpacity}), transparent 65%)`,
        }}
      />
    </div>
  );
}
