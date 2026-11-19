import { useEffect, useState } from 'react';
import { X, HelpCircle, ShieldCheck, Lock, RotateCcw, CheckCircle2, ArrowUpRight } from 'lucide-react';
import { useRoute, navigate } from './lib/router';
import { OutboxBar } from './components/OutboxBar';
import { InstallPrompt } from './components/InstallPrompt';
import { useWallet } from './hooks/useWallet';
import { useTour } from './components/Tour';
import { landingSteps, dashboardSteps } from './lib/tours';
import { ConnectButton } from './components/ConnectButton';
import { NetworkGuard } from './components/NetworkGuard';
import { AmbientBackground } from './components/AmbientBackground';
import { PageTransition, routeKey } from './components/PageTransition';
import { Landing } from './pages/Landing';
import { Dashboard } from './pages/Dashboard';
import { CreateAgreement } from './pages/CreateAgreement';
import { AgreementDetail } from './pages/AgreementDetail';
import { TraderProfile } from './pages/TraderProfile';
import { Verify } from './pages/Verify';
import { Profile } from './pages/Profile';
import { Home } from './pages/Home';
import { Receive } from './pages/Receive';
import { Send } from './pages/Send';
import { Convert } from './pages/Convert';
import { Activity } from './pages/Activity';
import { FloatingNav, NAV_SPACE } from './components/ui/FloatingNav';
import { ThemeQuickToggle } from './components/ui/ThemeQuickToggle';
import { Toaster } from './components/Toaster';
import { contractExplorerUrl } from './lib/config';
import { useActiveNetwork } from './lib/activeNetwork';

function Wordmark() {
  return (
    <button
      onClick={() => navigate('/')}
      className="flex min-h-tap items-center gap-2.5 rounded-control focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
    >
      <img src="/Pacta_logo.png" alt="" aria-hidden className="h-9 w-9 object-contain" />
      <span className="text-[19px] font-bold tracking-tight text-ink">PACTA</span>
    </button>
  );
}

function NetworkBadge() {
  const net = useActiveNetwork();
  return (
    <span
      data-tour="network"
      className="inline-flex items-center gap-1.5 rounded-pill border border-card bg-paper px-2.5 py-1 text-[12px] font-semibold text-slate"
    >
      <span className="h-1.5 w-1.5 rounded-pill bg-deadline" aria-hidden />
      {net.label}
    </span>
  );
}

// Shown on any network where the Pact contract is not configured. Names the
// network the wallet is actually on, so the message stays true once mainnet
// Pacts are enabled (at which point it no longer renders on mainnet at all).
function PactsUnavailableNotice() {
  const net = useActiveNetwork();
  return (
    <div className="mx-auto max-w-app px-1 py-16 text-center">
      <h1 className="text-[22px] font-semibold tracking-tight text-ink">Protected payments</h1>
      <p className="mt-2 text-[14px] text-slate">
        Protected payments are not available on {net.label} yet. Switch your wallet to testnet to
        use them.
      </p>
    </div>
  );
}

function LockNotice() {
  const { lockNotice, clearLockNotice } = useWallet();
  if (!lockNotice) return null;
  return (
    <div className="bg-mist border-b border-hairline">
      <div className="mx-auto max-w-6xl px-5 py-2.5 flex items-center gap-2 text-[13px] text-slate">
        <span className="flex-1">{lockNotice}</span>
        <button
          onClick={clearLockNotice}
          aria-label="Dismiss"
          className="grid h-11 w-11 place-items-center rounded-control hover:bg-paper focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
        >
          <X size={16} aria-hidden />
        </button>
      </div>
    </div>
  );
}

export default function App() {
  const route = useRoute();
  const net = useActiveNetwork();
  const { start } = useTour();
  const { address } = useWallet();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const startTour = () =>
    start(route.name === 'dashboard' ? dashboardSteps : landingSteps);

  const key = routeKey(route);
  const showTabs = address && route.name !== 'landing';

  return (
    <div className="min-h-screen flex flex-col">
      {/* Ambient glow — full on mobile landing, subtle on all other pages. */}
      {route.name === 'landing' ? (
        <>
          <div className="hidden lg:block">
            <AmbientBackground variant="subtle" />
          </div>
          <div className="lg:hidden">
            <AmbientBackground variant="full" />
          </div>
        </>
      ) : (
        <AmbientBackground variant="subtle" />
      )}
      <header
        className={`sticky top-0 z-20 border-b backdrop-blur transition-shadow duration-200 ${
          scrolled ? 'border-hairline bg-canvas/90 shadow-card' : 'border-transparent bg-canvas/70'
        }`}
      >
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-2 px-4 sm:px-5">
          <div className="flex min-w-0 items-center gap-2.5">
            <Wordmark />
            <NetworkBadge />
          </div>
          <div className="flex items-center gap-1">
            <ThemeQuickToggle />
            <button
              onClick={startTour}
              aria-label="Take a tour"
              title="Take a tour"
              className="grid h-11 w-11 place-items-center rounded-pill text-slate hover:bg-mist hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              <HelpCircle size={20} aria-hidden />
            </button>
            {!address && (
              <span data-tour="connect">
                <ConnectButton />
              </span>
            )}
          </div>
        </div>
      </header>

      <NetworkGuard />
      <LockNotice />
      <OutboxBar />
      <InstallPrompt variant="banner" />

      <main
        className={`relative z-10 flex-1 ${
          route.name === 'landing' ? '' : 'px-5 pt-6 sm:pt-8'
        } ${showTabs ? NAV_SPACE : route.name === 'landing' ? '' : 'pb-6 sm:pb-8'}`}
      >
        <PageTransition routeKey={key}>
          {route.name === 'landing' && <Landing />}
          {route.name === 'dashboard' && <Dashboard />}
          {route.name === 'create' && (net.supportsPacts ? <CreateAgreement /> : <PactsUnavailableNotice />)}
          {route.name === 'detail' && (net.supportsPacts ? <AgreementDetail id={route.id} /> : <PactsUnavailableNotice />)}
          {route.name === 'trader' && (net.supportsPacts ? <TraderProfile address={route.address} /> : <PactsUnavailableNotice />)}
          {route.name === 'verify' && <Verify />}
          {route.name === 'home' && <Home />}
          {route.name === 'receive' && <Receive />}
          {route.name === 'send' && <Send />}
          {route.name === 'convert' && <Convert />}
          {route.name === 'activity' && <Activity />}
          {route.name === 'profile' && <Profile />}
        </PageTransition>
      </main>

      {!address && (
      <footer className={`relative z-10 bg-hero-navy text-panel-ink ${route.name === 'landing' ? 'mt-0' : 'mt-12'}`}>
        <div className="mx-auto max-w-6xl px-5 py-9">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
            {/* Brand */}
            <div>
              <div className="flex items-center gap-2">
                <img src="/Pacta_logo.png" alt="" aria-hidden className="h-9 w-9 object-contain" />
                <span className="text-[17px] font-semibold tracking-tight text-panel-ink">PACTA</span>
              </div>
              <p className="mt-2.5 max-w-[260px] text-[12.5px] leading-relaxed text-panel-muted">
                A non-custodial wallet on Stellar. Hold, send, receive, and convert, and send protected
                when a payment needs to be safe.
              </p>
              <span className="mono mt-3 inline-flex items-center gap-1.5 text-[11px] text-panel-muted">
                <span className="h-1.5 w-1.5 rounded-pill bg-signal" aria-hidden /> Stellar {net.label}
              </span>
            </div>

            {/* Product */}
            <div>
              <h3 className="text-[11px] font-semibold uppercase tracking-wider text-signal">Product</h3>
              <ul className="mt-2.5 space-y-2">
                <li><FooterBtn onClick={() => navigate('/')}>Home</FooterBtn></li>
                <li><FooterBtn onClick={() => navigate('/dashboard')}>Pacts</FooterBtn></li>
                <li><FooterBtn onClick={() => navigate('/activity')}>Activity</FooterBtn></li>
              </ul>
            </div>

            {/* Resources */}
            <div>
              <h3 className="text-[11px] font-semibold uppercase tracking-wider text-signal">Resources</h3>
              <ul className="mt-2.5 space-y-2">
                <li><FooterExt href={contractExplorerUrl()}>Smart contract</FooterExt></li>
                <li><FooterExt href="https://stellar.org">Stellar network</FooterExt></li>
                <li><FooterExt href="https://www.freighter.app/">Freighter wallet</FooterExt></li>
              </ul>
            </div>

            {/* Security */}
            <div>
              <h3 className="text-[11px] font-semibold uppercase tracking-wider text-signal">Security</h3>
              <ul className="mt-2.5 space-y-2 text-[13px] text-panel-muted">
                <li className="flex items-center gap-2"><ShieldCheck size={14} className="text-signal shrink-0" aria-hidden /> Non-custodial</li>
                <li className="flex items-center gap-2"><Lock size={14} className="text-signal shrink-0" aria-hidden /> Funds locked in contract</li>
                <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-signal shrink-0" aria-hidden /> On-chain reputation</li>
                <li className="flex items-center gap-2"><RotateCcw size={14} className="text-signal shrink-0" aria-hidden /> Deadline refunds</li>
              </ul>
            </div>
          </div>

          <div className="mt-8 flex flex-col gap-2 border-t border-white/10 pt-4 text-[12px] text-panel-muted sm:flex-row sm:items-center sm:justify-between">
            <span>© 2026 PACTA. Trust, written in code.</span>
            <span className="flex items-center gap-1.5">
              Powered by
              <a
                href="https://stellar.org/soroban"
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-tap items-center font-medium text-signal hover:opacity-80 focus:outline-none focus-visible:underline"
              >
                Stellar Soroban
              </a>
            </span>
          </div>
        </div>
      </footer>
      )}

      {showTabs && <FloatingNav current={route.name} />}
      <Toaster />
    </div>
  );
}

function FooterBtn({ onClick, children }: { onClick: () => void; children: string }) {
  return (
    <button
      onClick={onClick}
      type="button"
      className="inline-flex min-h-tap min-w-tap items-center text-[13px] text-panel-muted transition-colors hover:text-panel-ink focus:outline-none focus-visible:text-panel-ink focus-visible:underline"
    >
      {children}
    </button>
  );
}

function FooterExt({ href, children }: { href: string; children: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="inline-flex min-h-tap items-center gap-1 text-[13px] text-panel-muted transition-colors hover:text-panel-ink focus:outline-none focus-visible:text-panel-ink"
    >
      {children}
      <ArrowUpRight size={13} aria-hidden />
    </a>
  );
}
