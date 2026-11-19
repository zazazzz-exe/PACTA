import { useEffect, useState } from 'react';
import { AnimatePresence, m } from 'framer-motion';
import { HelpCircle, Menu, Wallet, X } from 'lucide-react';
import { scrollToId } from './parts';
import { DUR, EASE } from '../../components/motion/MotionProvider';

export const SECTIONS = [
  { id: 'top', label: 'Home' },
  { id: 'features', label: 'Features' },
  { id: 'how', label: 'How it works' },
  { id: 'pacts', label: 'Pacts' },
  { id: 'faq', label: 'FAQ' },
] as const;

// Sticky landing nav: transparent with a thin border and blur once scrolled,
// smooth-scroll section links with the active section marked (aria-current).
export function LandingNav({ onConnect, onHelp, connecting }: { onConnect: () => void; onHelp: () => void; connecting: boolean }) {
  const [active, setActive] = useState<string>('top');
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) setActive(visible.target.id);
      },
      { rootMargin: '-35% 0px -55% 0px', threshold: [0, 0.25, 0.5] },
    );
    for (const s of SECTIONS) {
      const el = document.getElementById(s.id);
      if (el) io.observe(el);
    }
    return () => {
      window.removeEventListener('scroll', onScroll);
      io.disconnect();
    };
  }, []);

  const go = (id: string) => {
    setOpen(false);
    scrollToId(id);
  };

  return (
    <header
      className={`sticky top-0 z-30 border-b transition-colors duration-200 ${
        scrolled ? 'border-hairline bg-canvas/75 backdrop-blur-md' : 'border-transparent bg-transparent'
      }`}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-5">
        <button
          type="button"
          onClick={() => go('top')}
          className="flex min-h-tap items-center gap-2.5 rounded-control focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--lp-cyan)]"
        >
          <img src="/Pacta_logo.png" alt="" aria-hidden className="h-9 w-9 object-contain" />
          <span className="text-[19px] font-bold tracking-tight text-ink">PACTA</span>
        </button>

        <nav aria-label="Landing" className="hidden md:block">
          <ul className="flex items-center gap-1">
            {SECTIONS.map((s) => (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => go(s.id)}
                  aria-current={active === s.id ? 'true' : undefined}
                  className={`relative inline-flex min-h-tap items-center rounded-pill px-3.5 text-[14px] font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--lp-cyan)] ${
                    active === s.id ? 'text-ink' : 'text-slate hover:text-ink'
                  }`}
                >
                  {active === s.id && (
                    <m.span layoutId="lp-nav-active" className="absolute inset-0 rounded-pill bg-white/[0.08]" aria-hidden />
                  )}
                  <span className="relative">{s.label}</span>
                </button>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onHelp}
            aria-label="Take a tour"
            title="Take a tour"
            className="grid h-11 w-11 place-items-center rounded-pill text-slate transition hover:bg-white/[0.08] hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--lp-cyan)]"
          >
            <HelpCircle size={20} aria-hidden />
          </button>
          <button
            type="button"
            onClick={onConnect}
            disabled={connecting}
            data-tour="connect"
            className="hidden h-11 items-center gap-2 rounded-pill bg-accent px-4 text-[14px] font-bold text-on-accent transition hover:bg-accent-deep active:scale-[0.96] disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--lp-cyan)] focus-visible:ring-offset-2 focus-visible:ring-offset-canvas sm:inline-flex"
          >
            <Wallet size={16} aria-hidden />
            {connecting ? 'Connecting' : 'Connect wallet'}
          </button>
          <button
            type="button"
            onClick={() => setOpen(!open)}
            aria-expanded={open}
            aria-controls="lp-mobile-menu"
            aria-label={open ? 'Close menu' : 'Open menu'}
            className="grid h-11 w-11 place-items-center rounded-pill text-ink transition hover:bg-white/[0.08] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--lp-cyan)] md:hidden"
          >
            {open ? <X size={22} aria-hidden /> : <Menu size={22} aria-hidden />}
          </button>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {open && (
          <m.nav
            id="lp-mobile-menu"
            aria-label="Landing"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: DUR.ui, ease: EASE }}
            className="overflow-hidden border-t border-hairline bg-canvas/95 backdrop-blur-md md:hidden"
          >
            <ul className="mx-auto max-w-6xl px-5 py-3">
              {SECTIONS.map((s) => (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => go(s.id)}
                    aria-current={active === s.id ? 'true' : undefined}
                    className={`flex min-h-tap w-full items-center rounded-control px-3 text-left text-[16px] font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--lp-cyan)] ${
                      active === s.id ? 'bg-white/[0.06] text-ink' : 'text-slate'
                    }`}
                  >
                    {s.label}
                  </button>
                </li>
              ))}
              <li className="pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    onConnect();
                  }}
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-pill bg-accent text-[15px] font-bold text-on-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--lp-cyan)]"
                >
                  <Wallet size={16} aria-hidden />
                  Connect wallet
                </button>
              </li>
            </ul>
          </m.nav>
        )}
      </AnimatePresence>
    </header>
  );
}
