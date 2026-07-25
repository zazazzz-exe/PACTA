import { Wallet, ArrowUpDown, ShieldCheck } from 'lucide-react';

// Replaces the old fabricated-data previews on the landing. No numbers, no fake
// transactions: a plain explanation of how PACTA works.
export function HowItWorks() {
  const steps = [
    { icon: <Wallet size={18} aria-hidden />, title: 'Connect your wallet', body: 'PACTA is non-custodial. It never holds your keys or funds; you connect a Stellar wallet like Freighter or xBull.' },
    { icon: <ArrowUpDown size={18} aria-hidden />, title: 'Hold, send, receive, convert', body: 'See your real balances and move money with standard signed Stellar transactions. Nothing here is simulated.' },
    { icon: <ShieldCheck size={18} aria-hidden />, title: 'Send protected when it matters', body: 'For a payment that needs safety, Send protected creates a Pact: on-chain escrow with a security bond and staged, deadline-gated release.' },
  ];
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {steps.map((s) => (
        <div key={s.title} className="rounded-card border border-hairline bg-paper p-5">
          <span className="grid h-10 w-10 place-items-center rounded-pill bg-accent text-white">{s.icon}</span>
          <h3 className="mt-3 text-[15px] font-semibold text-ink">{s.title}</h3>
          <p className="mt-1.5 text-[13px] leading-relaxed text-slate">{s.body}</p>
        </div>
      ))}
    </div>
  );
}
