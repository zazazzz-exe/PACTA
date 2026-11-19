import { useId, useState } from 'react';
import { AnimatePresence, m } from 'framer-motion';
import { Plus } from 'lucide-react';
import { DUR, EASE } from '../../components/motion/MotionProvider';
import { Eyebrow, Reveal } from './parts';

// §J: accordion FAQ. Answers describe only what the product does today.
const QA: { q: string; a: string }[] = [
  {
    q: 'What is PACTA?',
    a: 'PACTA is a non-custodial wallet app on Stellar. You can hold, send, receive and convert Stellar assets, and send a payment as a Pact: a protected agreement that releases money in milestones.',
  },
  {
    q: 'How does a protected Pact work?',
    a: 'The sender creates a Pact with milestones and a deadline. The recipient posts a refundable bond and the sender deposits the payment into the PACTA escrow contract. The sender releases one milestone at a time; the final release completes the Pact and returns the bond. If milestones are still unreleased after the deadline, the sender can take an emergency refund of the unreleased amount plus the bond.',
  },
  {
    q: 'Do I need to create an account?',
    a: 'No sign-up and no password. You connect a Stellar wallet such as Freighter, xBull or Hana, and your wallet is your login. Creating or funding a Pact asks for a one-time identity verification.',
  },
  {
    q: 'What does non-custodial mean?',
    a: 'PACTA never holds your keys. Every payment is signed in your own wallet, and money in a Pact is held by the Soroban smart contract, not by PACTA.',
  },
  {
    q: 'Which digital assets are supported?',
    a: 'The wallet shows the Stellar assets your account holds, such as XLM and USDC, and Convert swaps between them on the Stellar decentralized exchange. Pacts settle in one supported asset per network.',
  },
  {
    q: 'Which Stellar network does PACTA use?',
    a: 'PACTA works on Stellar testnet and mainnet, following the network your wallet is set to. The app always shows which network you are on, and Pacts are offered only where the PACTA escrow contract is deployed.',
  },
  {
    q: 'How can I verify my transactions?',
    a: 'Every transaction comes with its transaction hash and a link to the Stellar Expert explorer. A Pact also shows its contract ID and the hashes of each deposit and release.',
  },
];

export function Faq() {
  const [open, setOpen] = useState<number | null>(0);
  const base = useId();
  return (
    <section id="faq" aria-labelledby="lp-faq-title" className="px-5 py-24 sm:py-32">
      <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-[0.8fr_1.2fr]">
        <Reveal>
          <Eyebrow>FAQ</Eyebrow>
          <h2 id="lp-faq-title" className="mt-4 text-[36px] font-bold leading-[1.05] tracking-[-0.02em] text-ink sm:text-[48px]">
            Questions, <span className="lp-grad-text">answered.</span>
          </h2>
          <p className="mt-5 max-w-sm text-[16px] leading-relaxed text-slate">
            Straight answers about how PACTA moves and protects your money.
          </p>
        </Reveal>
        <div className="divide-y divide-[var(--hairline)] border-y border-hairline">
          {QA.map((item, i) => {
            const isOpen = open === i;
            const btn = `${base}-q${i}`;
            const panel = `${base}-a${i}`;
            return (
              <div key={item.q}>
                <h3>
                  <button
                    id={btn}
                    type="button"
                    aria-expanded={isOpen}
                    aria-controls={panel}
                    onClick={() => setOpen(isOpen ? null : i)}
                    className="flex min-h-[64px] w-full items-center justify-between gap-4 py-4 text-left text-[17px] font-bold text-ink transition hover:text-[var(--lp-ice)] focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--lp-cyan)]"
                  >
                    {item.q}
                    <m.span animate={{ rotate: isOpen ? 45 : 0 }} transition={{ duration: DUR.ui, ease: EASE }} className="shrink-0 text-accent">
                      <Plus size={22} aria-hidden />
                    </m.span>
                  </button>
                </h3>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <m.div
                      id={panel}
                      role="region"
                      aria-labelledby={btn}
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25, ease: EASE }}
                      className="overflow-hidden"
                    >
                      <p className="pb-5 pr-10 text-[15px] leading-relaxed text-slate">{item.a}</p>
                    </m.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
