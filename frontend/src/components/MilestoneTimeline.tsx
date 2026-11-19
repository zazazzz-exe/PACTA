import { m } from 'framer-motion';
import { Check, Circle, Lock, Undo2, X } from 'lucide-react';
import type { Agreement } from '../lib/contract';
import { Status } from '../lib/pactSummary';
import { pactSteps, type State } from '../lib/pactSteps';
import { EASE } from './motion/MotionProvider';

const DOT: Record<State, string> = {
  done: 'bg-mint-soft text-mint',
  current: 'bg-accent text-on-accent shadow-glow',
  todo: 'bg-mist text-fog',
  stopped: 'bg-refund-tint text-refund',
};

export function MilestoneTimeline({ a }: { a: Agreement }) {
  const steps = pactSteps(a);
  const done = steps.filter((s) => s.state === 'done').length;
  const fill = steps.length > 1 ? Math.min(1, Math.max(0, (done - 0.5) / (steps.length - 1))) : 0;
  return (
    <div>
      <div className="flex items-center justify-between">
        <h2 className="text-[17px] font-bold text-ink">Milestones</h2>
        <span className="mono text-[13px] font-semibold text-slate">
          {Number(a.released_milestones)} of {Number(a.milestones)} released
        </span>
      </div>
      <ol className="relative mt-4 space-y-1">
        <span aria-hidden className="absolute bottom-5 left-[17px] top-5 w-0.5 rounded-pill bg-mist" />
        <m.span
          aria-hidden
          className="absolute left-[17px] top-5 w-0.5 origin-top rounded-pill bg-gradient-to-b from-mint to-accent"
          style={{ height: 'calc(100% - 40px)' }}
          initial={{ scaleY: 0 }}
          animate={{ scaleY: fill }}
          transition={{ duration: 0.8, ease: EASE }}
        />
        {steps.map((s, i) => (
          <li key={i} className="relative flex items-center gap-3 py-2" aria-current={s.state === 'current' ? 'step' : undefined}>
            <span className={`relative z-10 grid h-9 w-9 shrink-0 place-items-center rounded-pill ${DOT[s.state]}`}>
              {s.state === 'done' ? (
                <Check size={16} aria-hidden strokeWidth={3} />
              ) : s.state === 'stopped' ? (
                a.status === Status.Refunded ? <Undo2 size={16} aria-hidden /> : <X size={16} aria-hidden />
              ) : s.state === 'current' ? (
                <Circle size={10} aria-hidden fill="currentColor" />
              ) : (
                <Lock size={14} aria-hidden />
              )}
            </span>
            <div className="min-w-0 flex-1">
              <p className={`text-[15px] font-semibold ${s.state === 'todo' ? 'text-slate' : 'text-ink'}`}>{s.title}</p>
              <p className="text-[12px] text-slate">
                {s.state === 'done' ? 'Done' : s.state === 'current' ? 'Next step' : s.state === 'stopped' ? 'Closed' : 'Not yet'}
              </p>
            </div>
            {s.detail && <span className={`mono shrink-0 text-[13px] font-semibold ${s.state === 'todo' ? 'text-slate' : 'text-ink'}`}>{s.detail}</span>}
          </li>
        ))}
      </ol>
    </div>
  );
}
