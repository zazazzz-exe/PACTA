import { AnimatePresence, m } from 'framer-motion';
import { ArrowRight, X } from 'lucide-react';
import { t } from '../../lib/strings';
import { useStoredState } from '../../lib/useStoredState';
import { IconButton } from '../ui/IconButton';
import { DUR, EASE } from '../motion/MotionProvider';
import { PactShield } from './PactShield';

// The protected-payment banner: an elevated card with the glowing PACTA
// shield, a short explanation and a "Try it" action. Dismissible (remembered
// on this device). A helpful feature card, not an ad.
export function TipCard({ onTry }: { onTry: () => void }) {
  const [dismissed, setDismissed] = useStoredState<boolean>('pacta.tip.pact.dismissed', false);
  return (
    <AnimatePresence initial={false}>
      {!dismissed && (
        <m.section
          aria-label={t('tip.title')}
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: DUR.ui, ease: EASE }}
          className="overflow-hidden"
        >
          <div className="wallet-lift relative isolate flex items-center gap-4 overflow-hidden rounded-card border border-card bg-mist p-4 pr-12 shadow-card sm:p-5 sm:pr-14">
            <span
              aria-hidden
              className="pointer-events-none absolute -left-8 top-1/2 -z-10 h-32 w-32 -translate-y-1/2 rounded-full"
              style={{ background: 'radial-gradient(circle, rgba(37,198,217,0.18), transparent 70%)' }}
            />
            <PactShield size={52} />
            <div className="min-w-0 flex-1">
              <h2 className="text-[15px] font-bold text-ink">{t('tip.title')}</h2>
              <p className="mt-0.5 text-[13px] leading-snug text-slate">{t('tip.body')}</p>
              <button
                type="button"
                onClick={onTry}
                className="group mt-1 inline-flex min-h-tap items-center gap-1.5 rounded-pill text-[13px] font-bold text-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                {t('tip.cta')}
                <ArrowRight size={16} aria-hidden className="transition-transform group-hover:translate-x-0.5" />
              </button>
            </div>
            <IconButton label={t('tip.dismiss')} className="absolute right-1.5 top-1.5" onClick={() => setDismissed(true)}>
              <X size={18} aria-hidden />
            </IconButton>
          </div>
        </m.section>
      )}
    </AnimatePresence>
  );
}
