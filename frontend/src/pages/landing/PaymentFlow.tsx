import { useState } from 'react';
import { m, useReducedMotion } from 'framer-motion';
import { CheckCircle2, FileSignature, Handshake, ShieldCheck, User, Wallet, type LucideIcon } from 'lucide-react';
import { EASE } from '../../components/motion/MotionProvider';
import { Eyebrow, Reveal, VIEWPORT } from './parts';

// §C: two flows that animate into view and describe the real process.
// Everyday: the sender signs, the payment settles on Stellar, the receiver gets it.
// Protected: funds are held by the Pact contract and released per approved milestone.
interface Node {
  icon: LucideIcon;
  title: string;
  detail: string;
  status: string;
}

const EVERYDAY: Node[] = [
  { icon: User, title: 'Sender', detail: 'Signs in their own wallet', status: 'Signed' },
  { icon: Wallet, title: 'PACTA', detail: 'Builds and submits the payment', status: 'Settled on Stellar' },
  { icon: CheckCircle2, title: 'Receiver', detail: 'Funds arrive in seconds', status: 'Received' },
];

const PROTECTED: Node[] = [
  { icon: User, title: 'Client', detail: 'Creates the Pact and deposits', status: 'Created' },
  { icon: ShieldCheck, title: 'Protected Pact', detail: 'Contract holds funds and the bond', status: 'Funds held' },
  { icon: FileSignature, title: 'Milestone approval', detail: 'Client approves delivered work', status: 'Approved' },
  { icon: Handshake, title: 'Payment release', detail: 'One milestone is paid out', status: 'Released' },
];

export function PaymentFlow() {
  return (
    <section id="flow" aria-labelledby="lp-flow-title" className="relative px-5 py-24 sm:py-32">
      <div className="mx-auto max-w-6xl">
        <Reveal className="max-w-2xl">
          <Eyebrow>How money moves</Eyebrow>
          <h2 id="lp-flow-title" className="mt-4 text-[36px] font-bold leading-[1.05] tracking-[-0.02em] text-ink sm:text-[52px]">
            Every payment. <span className="lp-grad-text">More confidence.</span>
          </h2>
          <p className="mt-5 text-[17px] leading-relaxed text-slate">
            From everyday transfers to protected agreements, PACTA gives you more control over how money moves.
          </p>
        </Reveal>

        <div className="mt-14 space-y-8">
          <Flow label="Everyday payment" nodes={EVERYDAY} />
          <Flow label="Protected payment (Pact)" nodes={PROTECTED} highlight />
        </div>
      </div>
    </section>
  );
}

function Flow({ label, nodes, highlight = false }: { label: string; nodes: Node[]; highlight?: boolean }) {
  const reduce = useReducedMotion();
  const [shown, setShown] = useState<boolean>(!!reduce);
  const step = 0.45;
  return (
    <m.div
      className={`lp-card rounded-card p-6 sm:p-8 ${highlight ? 'shadow-[0_0_0_1px_rgba(95,212,244,0.18),0_30px_70px_rgba(2,6,23,0.55)]' : 'shadow-card'}`}
      initial={reduce ? false : { opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={VIEWPORT}
      transition={{ duration: 0.6, ease: EASE }}
      onViewportEnter={() => setShown(true)}
    >
      <p className="text-[13px] font-bold uppercase tracking-[0.14em] text-accent">{label}</p>
      <ol className="mt-6 flex flex-col gap-4 md:flex-row md:items-stretch md:gap-0">
        {nodes.map((n, i) => (
          <li key={n.title} className="flex flex-col md:flex-1 md:flex-row md:items-center">
            <FlowNode node={n} shown={shown} delay={i * step} />
            {i < nodes.length - 1 && <Connector shown={shown} delay={i * step + 0.2} />}
          </li>
        ))}
      </ol>
    </m.div>
  );
}

function FlowNode({ node, shown, delay }: { node: Node; shown: boolean; delay: number }) {
  const reduce = useReducedMotion();
  const Icon = node.icon;
  return (
    <m.div
      initial={reduce ? false : { opacity: 0, scale: 0.9 }}
      animate={shown ? { opacity: 1, scale: 1 } : {}}
      transition={{ duration: 0.45, ease: EASE, delay }}
      whileHover={{ y: -3 }}
      className="group flex flex-1 items-center gap-3 rounded-tile border border-hairline bg-white/[0.03] p-4 md:min-w-[150px] md:flex-col md:text-center"
    >
      <span className="grid h-12 w-12 shrink-0 place-items-center rounded-pill bg-accent-tint text-[var(--lp-ice)] transition group-hover:shadow-[0_0_20px_rgba(95,212,244,0.35)]">
        <Icon size={22} aria-hidden />
      </span>
      <div className="min-w-0">
        <p className="text-[15px] font-bold text-ink">{node.title}</p>
        <p className="mt-0.5 text-[13px] text-slate">{node.detail}</p>
        <m.span
          initial={reduce ? false : { opacity: 0, y: 6 }}
          animate={shown ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.35, ease: EASE, delay: delay + 0.3 }}
          className="mt-2 inline-flex items-center gap-1.5 rounded-pill bg-mint-soft px-2.5 py-1 text-[12px] font-bold text-mint"
        >
          <CheckCircle2 size={12} aria-hidden /> {node.status}
        </m.span>
      </div>
    </m.div>
  );
}

function Connector({ shown, delay }: { shown: boolean; delay: number }) {
  const reduce = useReducedMotion();
  return (
    <>
      {/* desktop: horizontal line with a travelling fund particle */}
      <div className="hidden w-14 shrink-0 items-center md:flex lg:w-20" aria-hidden>
        <div className="lp-connector w-full">
          <m.div
            className="lp-connector-fill"
            initial={reduce ? false : { scaleX: 0 }}
            animate={shown ? { scaleX: 1 } : {}}
            transition={{ duration: 0.5, ease: EASE, delay }}
          />
          {shown && <span className="lp-fund" style={{ animationDelay: `${delay + 0.5}s` }} />}
        </div>
      </div>
      {/* mobile: vertical line */}
      <div className="ml-10 flex h-6 items-center md:hidden" aria-hidden>
        <m.span
          className="block h-full w-0.5 origin-top bg-gradient-to-b from-[var(--lp-electric)] to-[var(--lp-cyan)]"
          initial={reduce ? false : { scaleY: 0 }}
          animate={shown ? { scaleY: 1 } : {}}
          transition={{ duration: 0.4, ease: EASE, delay }}
        />
      </div>
      <span className="sr-only">then</span>
    </>
  );
}

