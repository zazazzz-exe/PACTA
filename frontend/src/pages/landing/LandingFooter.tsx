import { useActiveNetwork } from '../../lib/activeNetwork';
import { SECTIONS } from './LandingNav';
import { scrollToId } from './parts';

// §L: footer. Pages that do not exist yet (docs, support, privacy, terms) are
// shown as "coming soon" text rather than dead links.
const SOON = ['Documentation', 'Support', 'Privacy Policy', 'Terms of Service'];

export function LandingFooter() {
  const net = useActiveNetwork();
  const product = SECTIONS.filter((s) => s.id !== 'top');
  return (
    <footer className="border-t border-hairline px-5 pb-10 pt-16">
      <div className="mx-auto grid max-w-6xl gap-10 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_1fr]">
        <div>
          <div className="flex items-center gap-2.5">
            <img src="/Pacta_logo.png" alt="" aria-hidden className="h-9 w-9 object-contain" />
            <span className="text-[19px] font-bold tracking-tight text-ink">PACTA</span>
          </div>
          <p className="mt-4 max-w-xs text-[14px] leading-relaxed text-slate">
            A non-custodial wallet for Stellar. Send, receive and convert, and protect the payments that matter with
            milestone-based Pacts.
          </p>
          <p className="mt-5 inline-flex items-center gap-2 rounded-pill border border-hairline px-3 py-1.5 text-[12px] font-semibold text-slate">
            <span className="h-1.5 w-1.5 rounded-pill bg-[var(--lp-cyan)]" aria-hidden />
            Stellar-powered · {net.label}
          </p>
        </div>

        <nav aria-label="Product">
          <p className="text-[13px] font-bold uppercase tracking-[0.14em] text-ink">Product</p>
          <ul className="mt-3">
            {product.map((s) => (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => scrollToId(s.id)}
                  className="inline-flex min-h-tap min-w-tap items-center text-[14px] text-slate transition hover:text-ink focus:outline-none focus-visible:underline"
                >
                  {s.label}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        <div>
          <p className="text-[13px] font-bold uppercase tracking-[0.14em] text-ink">Resources</p>
          <ul className="mt-3 space-y-3">
            {SOON.map((label) => (
              <li key={label} className="text-[14px] text-slate">
                {label} <span className="text-[12px] text-fog">(coming soon)</span>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="text-[13px] font-bold uppercase tracking-[0.14em] text-ink">Network</p>
          <ul className="mt-3 space-y-3 text-[14px] text-slate">
            <li>Connected network: {net.label}</li>
            <li>
              <a
                href={net.explorerBase}
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-tap items-center text-accent hover:underline focus:outline-none focus-visible:underline"
              >
                Stellar Expert explorer
              </a>
            </li>
          </ul>
        </div>
      </div>
      <div className="mx-auto mt-12 flex max-w-6xl flex-col gap-2 border-t border-hairline pt-6 text-[13px] text-fog sm:flex-row sm:justify-between">
        <p>© 2026 PACTA. Trust, written in code.</p>
        <p>PACTA does not hold your keys or funds.</p>
      </div>
    </footer>
  );
}
