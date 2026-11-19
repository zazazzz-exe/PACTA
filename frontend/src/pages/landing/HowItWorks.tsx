import { m, useReducedMotion } from 'framer-motion';
import { EASE } from '../../components/motion/MotionProvider';
import { Eyebrow, Reveal, VIEWPORT } from './parts';

// §I: three steps, a horizontal timeline on desktop and vertical on mobile,
// each animating into view.
const STEPS = [
  { n: '01', title: 'Connect your wallet', body: 'Connect your compatible Stellar wallet securely.' },
  { n: '02', title: 'Choose your payment', body: 'Send, receive, convert, or create a protected Pact.' },
  { n: '03', title: 'Track and verify', body: 'Monitor transaction progress and access relevant payment records.' },
];

export function HowItWorks() {
  const reduce = useReducedMotion();
  return (
    <section id="how" aria-labelledby="lp-how-title" className="px-5 py-24 sm:py-32">
      <div className="mx-auto max-w-6xl">
        <Reveal className="max-w-2xl">
          <Eyebrow>How it works</Eyebrow>
          <h2 id="lp-how-title" className="mt-4 text-[36px] font-bold leading-[1.05] tracking-[-0.02em] text-ink sm:text-[52px]">
            Built for payments <span className="lp-grad-text">that matter.</span>
          </h2>
        </Reveal>

        <ol className="relative mt-16 grid gap-10 md:grid-cols-3 md:gap-6">
          {/* desktop connecting line */}
          <m.span
            aria-hidden
            className="absolute left-0 right-0 top-[30px] hidden h-0.5 origin-left bg-gradient-to-r from-[var(--lp-electric)] via-[var(--lp-cyan)] to-transparent md:block"
            initial={reduce ? false : { scaleX: 0 }}
            whileInView={{ scaleX: 1 }}
            viewport={VIEWPORT}
            transition={{ duration: 1.2, ease: EASE }}
          />
          {/* mobile connecting line */}
          <span aria-hidden className="absolute bottom-6 left-[29px] top-6 w-0.5 bg-gradient-to-b from-[var(--lp-electric)] to-[var(--lp-cyan)] md:hidden" />
          {STEPS.map((s, i) => (
            <m.li
              key={s.n}
              className="relative flex gap-5 md:flex-col md:gap-6"
              initial={reduce ? false : { opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={VIEWPORT}
              transition={{ duration: 0.55, ease: EASE, delay: i * 0.15 }}
            >
              <span className="relative z-10 grid h-[60px] w-[60px] shrink-0 place-items-center rounded-pill border border-[rgba(95,212,244,0.35)] bg-canvas text-[18px] font-bold text-[var(--lp-ice)] shadow-[0_0_24px_rgba(53,99,245,0.35)]">
                {s.n}
              </span>
              <div>
                <h3 className="text-[22px] font-bold tracking-tight text-ink">{s.title}</h3>
                <p className="mt-2 max-w-xs text-[15px] leading-relaxed text-slate">{s.body}</p>
              </div>
            </m.li>
          ))}
        </ol>
      </div>
    </section>
  );
}
