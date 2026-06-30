import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';
import { X } from 'lucide-react';
import { Button } from './Button';

export interface TourStep {
  /** CSS selector for the element to highlight. Omit for a centered step. */
  target?: string;
  title: string;
  body: string;
  placement?: 'top' | 'bottom' | 'left' | 'right' | 'center';
}

interface TourCtx {
  start: (steps: TourStep[]) => void;
  active: boolean;
}
const Ctx = createContext<TourCtx | null>(null);

export function useTour(): TourCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error('useTour must be used within TourProvider');
  return c;
}

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

const PAD = 6;
const GAP = 14;
const CARD_W = 300;

export function TourProvider({ children }: { children: ReactNode }) {
  const [steps, setSteps] = useState<TourStep[] | null>(null);
  const [i, setI] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);

  const close = useCallback(() => {
    setSteps(null);
    setI(0);
    setRect(null);
  }, []);

  // Only keep steps whose target exists (or that are centered).
  const start = useCallback((s: TourStep[]) => {
    const usable = s.filter((step) => !step.target || document.querySelector(step.target));
    if (usable.length) {
      setSteps(usable);
      setI(0);
    }
  }, []);

  const step = steps && i < steps.length ? steps[i] : null;

  useLayoutEffect(() => {
    if (!step) return;
    if (!step.target) {
      setRect(null);
      return;
    }
    const el = document.querySelector(step.target) as HTMLElement | null;
    if (!el) {
      setRect(null);
      return;
    }
    el.scrollIntoView({ block: 'center', inline: 'center', behavior: 'smooth' });
    const measure = () => {
      const r = el.getBoundingClientRect();
      // A hidden target (e.g. an element hidden on mobile) measures 0x0; fall
      // back to a centered step instead of a broken zero-size spotlight.
      if (r.width === 0 && r.height === 0) {
        setRect(null);
        return;
      }
      setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
    };
    measure();
    const t = window.setTimeout(measure, 240);
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
    };
  }, [step]);

  const next = useCallback(() => {
    setI((v) => {
      if (steps && v < steps.length - 1) return v + 1;
      close();
      return v;
    });
  }, [steps, close]);

  const prev = useCallback(() => setI((v) => Math.max(0, v - 1)), []);

  useEffect(() => {
    if (!steps) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
      else if (e.key === 'ArrowRight' || e.key === 'Enter') next();
      else if (e.key === 'ArrowLeft') prev();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [steps, next, prev, close]);

  return (
    <Ctx.Provider value={{ start, active: !!steps }}>
      {children}
      {step && (
        <TourOverlay
          step={step}
          rect={rect}
          index={i}
          total={steps!.length}
          onNext={next}
          onPrev={prev}
          onClose={close}
        />
      )}
    </Ctx.Provider>
  );
}

function tooltipStyle(rect: Rect | null, placement: TourStep['placement']): CSSProperties {
  const vw = window.innerWidth;
  const clampLeft = (x: number) => Math.min(Math.max(12, x), Math.max(12, vw - CARD_W - 12));
  let place = placement ?? 'bottom';
  // On narrow screens side placements do not fit; fall back to bottom.
  if (vw < 640 && (place === 'left' || place === 'right')) place = 'bottom';

  if (!rect || place === 'center') {
    return { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };
  }
  switch (place) {
    case 'top':
      return { top: rect.top - GAP, left: clampLeft(rect.left), transform: 'translateY(-100%)' };
    case 'left':
      return { top: rect.top, left: rect.left - GAP, transform: 'translateX(-100%)' };
    case 'right':
      return { top: rect.top, left: rect.left + rect.width + GAP };
    case 'bottom':
    default:
      return { top: rect.top + rect.height + GAP, left: clampLeft(rect.left) };
  }
}

function TourOverlay({
  step,
  rect,
  index,
  total,
  onNext,
  onPrev,
  onClose,
}: {
  step: TourStep;
  rect: Rect | null;
  index: number;
  total: number;
  onNext: () => void;
  onPrev: () => void;
  onClose: () => void;
}) {
  const last = index === total - 1;
  return (
    <div className="fixed inset-0 z-[60]" role="dialog" aria-modal="true" aria-label="Product tour">
      {/* Dim + spotlight */}
      {rect ? (
        <div
          className="fixed transition-all duration-200 pointer-events-none"
          style={{
            top: rect.top - PAD,
            left: rect.left - PAD,
            width: rect.width + PAD * 2,
            height: rect.height + PAD * 2,
            borderRadius: 14,
            boxShadow: '0 0 0 9999px rgba(26,32,29,0.55)',
            outline: '2px solid var(--color-accent)',
          }}
          aria-hidden
        />
      ) : (
        <div className="fixed inset-0 bg-ink/55" aria-hidden />
      )}

      {/* Tooltip card */}
      <div
        className="fixed w-[300px] max-w-[calc(100vw-24px)] bg-paper border border-hairline rounded-card shadow-pop p-4"
        style={tooltipStyle(rect, step.placement)}
      >
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-[15px] font-medium text-ink">{step.title}</h3>
          <button
            onClick={onClose}
            aria-label="Close tour"
            className="grid h-8 w-8 -mr-1 -mt-1 place-items-center rounded-control text-fog hover:bg-mist focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
          >
            <X size={16} aria-hidden />
          </button>
        </div>
        <p className="mt-1 text-[13px] leading-relaxed text-slate">{step.body}</p>

        <div className="mt-4 flex items-center justify-between">
          <span className="mono text-[12px] text-fog">
            {index + 1} / {total}
          </span>
          <div className="flex items-center gap-2">
            {index > 0 && (
              <Button variant="secondary" className="h-10 px-3 text-[13px]" onClick={onPrev}>
                Back
              </Button>
            )}
            <Button className="h-10 px-4 text-[13px]" onClick={onNext}>
              {last ? 'Done' : 'Next'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
