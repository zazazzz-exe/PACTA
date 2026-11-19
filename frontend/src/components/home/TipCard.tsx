import { AnimatePresence, m } from 'framer-motion';
import { X } from 'lucide-react';
import { t } from '../../lib/strings';
import { useStoredState } from '../../lib/useStoredState';
import { Button } from '../ui/Button';
import { IconButton } from '../ui/IconButton';
import { DUR, EASE } from '../motion/MotionProvider';

// Dismissible tip (remembered on this device) nudging people toward Pacts.
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
          <div className="relative flex items-center gap-4 rounded-card border border-card bg-paper p-5 shadow-card">
            <PactIllustration />
            <div className="min-w-0 flex-1 pr-8">
              <h2 className="text-[15px] font-bold text-ink">{t('tip.title')}</h2>
              <p className="mt-0.5 text-[13px] text-slate">{t('tip.body')}</p>
              <Button size="sm" variant="secondary" className="mt-3" onClick={onTry}>
                {t('tip.cta')}
              </Button>
            </div>
            <IconButton label={t('tip.dismiss')} className="absolute right-2 top-2" onClick={() => setDismissed(true)}>
              <X size={18} aria-hidden />
            </IconButton>
          </div>
        </m.section>
      )}
    </AnimatePresence>
  );
}

// Original inline illustration: a soft shield with three milestone steps.
function PactIllustration() {
  return (
    <svg width="72" height="72" viewBox="0 0 72 72" aria-hidden className="shrink-0">
      <circle cx="36" cy="36" r="34" className="fill-apricot-soft" />
      <path
        d="M36 15l15 6v11c0 10-6.5 18-15 22-8.5-4-15-12-15-22V21l15-6z"
        className="fill-paper stroke-apricot"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <path d="M29 36l5 5 9-10" fill="none" className="stroke-mint" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="18" cy="58" r="3.5" className="fill-mint" />
      <circle cx="36" cy="62" r="3.5" className="fill-apricot" />
      <circle cx="54" cy="58" r="3.5" className="fill-lilac" />
    </svg>
  );
}
