import { useEffect, useState } from 'react';
import { X, HelpCircle, ShieldCheck, Lock, RotateCcw, CheckCircle2, ArrowUpRight, Cloud, CloudOff } from 'lucide-react';
import { useRoute, navigate } from './lib/router';
import { isDemo, setDemo } from './lib/demo';
import { useOffline, toggleForceOffline } from './lib/outbox';
import { OutboxBar } from './components/OutboxBar';
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
import { BottomTabs } from './components/BottomTabs';
import { IdentityBadge } from './components/kyc/IdentityBadge';
import { contractExplorerUrl } from './lib/config';

function Wordmark() {
  return (
    <button
      onClick={() => navigate('/')}
      className="flex items-center gap-2.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 rounded-control"
    >
      <img src="/Pacta_logo.png" alt="" aria-hidden className="h-11 w-11 object-contain" />
      <span className="text-[21px] font-semibold tracking-tight text-ink">PACTA</span>
    </button>
  );
}

function NetworkBadge() {
  return (
    <span
      data-tour="network"
      className="mono hidden sm:inline-flex items-center gap-1.5 text-[12px] text-slate"
    >
      <span className="h-1.5 w-1.5 rounded-pill bg-accent pulse-dot" aria-hidden />
      testnet
    </span>
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
          className="grid h-8 w-8 place-items-center rounded-control hover:bg-paper focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
        >
          <X size={16} aria-hidden />
        </button>
      </div>
    </div>
  );
}

function DemoControls() {
  const demo = isDemo();
  const offline = useOffline();
  return (
    <div className="flex items-center gap-1.5">
      <button
        onClick={() => {
          setDemo(!demo);
          window.location.reload();
        }}
        title={demo ? 'Turn off demo mode' : 'Turn on demo mode (seeded, no network)'}
        className={`rounded-pill px-2.5 py-1 text-[11px] font-semibold transition ${
          demo ? 'bg-accent text-white' : 'bg-mist text-slate hover:bg-hairline'
        }`}
      >
        {demo ? 'Demo on' : 'Demo'}
      </button>
      {demo && (
        <button
          onClick={() => toggleForceOffline()}
          title={offline ? 'Simulate coming back online' : 'Simulate going offline'}
          className={`inline-flex items-center gap-1 rounded-pill px-2.5 py-1 text-[11px] font-semibold transition ${
            offline ? 'bg-deadline-tint text-deadline-deep' : 'bg-mist text-slate hover:bg-hairline'
          }`}
        >
          {offline ? <CloudOff size={11} aria-hidden /> : <Cloud size={11} aria-hidden />}
          {offline ? 'Offline' : 'Online'}
        </button>
      )}
    </div>
  );
}

export default function App() {
  const route = useRoute();
  const { start } = useTour();
  const { address, kycStatus } = useWallet();
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
          route.name === 'landing'
            ? scrolled
              ? 'border-accent/20 bg-accent-tint/90 shadow-card'
              : 'border-accent/15 bg-accent-tint/70'
            : scrolled
              ? 'border-hairline bg-canvas/95 shadow-card'
              : 'border-hairline bg-canvas/85'
        }`}
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 h-14">
          <div className="flex items-center gap-3">
            <Wordmark />
            <NetworkBadge />
          </div>
          <div className="flex items-center gap-2">
            <DemoControls />
            {address && <IdentityBadge status={kycStatus} className="hidden sm:inline-flex" />}
            <button
              onClick={startTour}
              aria-label="Take a tour"
              title="Take a tour"
              className="grid h-11 w-11 place-items-center rounded-pill text-slate hover:bg-mist focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
            >
              <HelpCircle size={20} aria-hidden />
            </button>
            <span data-tour="connect">
              <ConnectButton />
            </span>
          </div>
        </div>
      </header>

      <NetworkGuard />
      <LockNotice />
      <OutboxBar />

      <main
        className={`relative z-10 flex-1 ${
          route.name === 'landing' ? '' : 'px-5 py-6 sm:py-8'
        } ${showTabs ? 'pb-24' : ''}`}
      >
        <PageTransition routeKey={key}>
          {route.name === 'landing' && <Landing />}
          {route.name === 'dashboard' && <Dashboard />}
          {route.name === 'create' && <CreateAgreement />}
          {route.name === 'detail' && <AgreementDetail id={route.id} />}
          {route.name === 'trader' && <TraderProfile address={route.address} />}
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
      <footer className={`relative z-10 bg-[#0A3328] text-panel-ink ${route.name === 'landing' ? 'mt-0' : 'mt-12'}`}>
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
                <span className="h-1.5 w-1.5 rounded-pill bg-signal" aria-hidden /> Stellar testnet
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
                className="font-medium text-signal hover:opacity-80 focus:outline-none focus-visible:opacity-80"
              >
                Stellar Soroban
              </a>
            </span>
          </div>
        </div>
      </footer>
      )}

      {showTabs && <BottomTabs current={route.name} />}
    </div>
  );
}

function FooterBtn({ onClick, children }: { onClick: () => void; children: string }) {
  return (
    <button
      onClick={onClick}
      className="text-[13px] text-panel-muted transition-colors hover:text-panel-ink focus:outline-none focus-visible:text-panel-ink"
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
      className="inline-flex items-center gap-1 text-[13px] text-panel-muted transition-colors hover:text-panel-ink focus:outline-none focus-visible:text-panel-ink"
    >
      {children}
      <ArrowUpRight size={13} aria-hidden />
    </a>
  );
}
