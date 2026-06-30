import { X, HelpCircle } from 'lucide-react';
import { useRoute, navigate } from './lib/router';
import { useWallet } from './hooks/useWallet';
import { useTour } from './components/Tour';
import { landingSteps, dashboardSteps } from './lib/tours';
import { ConnectButton } from './components/ConnectButton';
import { NetworkGuard } from './components/NetworkGuard';
import { AmbientBackground } from './components/AmbientBackground';
import { Landing } from './pages/Landing';
import { Dashboard } from './pages/Dashboard';
import { CreateAgreement } from './pages/CreateAgreement';
import { AgreementDetail } from './pages/AgreementDetail';
import { TraderProfile } from './pages/TraderProfile';
import { CONTRACT_ID, contractExplorerUrl } from './lib/config';
import { shortAddr } from './lib/format';

function Wordmark() {
  return (
    <button
      onClick={() => navigate('/')}
      className="flex items-center gap-2.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 rounded-control"
    >
      <span className="grid h-7 w-7 place-items-center rounded-control bg-accent text-white text-sm font-semibold">
        P
      </span>
      <span className="text-[17px] font-medium tracking-tight text-ink">Pacta</span>
    </button>
  );
}

function NetworkBadge() {
  return (
    <span
      data-tour="network"
      className="mono inline-flex items-center gap-1.5 text-[12px] text-slate"
    >
      <span className="h-1.5 w-1.5 rounded-pill bg-accent" aria-hidden />
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

export default function App() {
  const route = useRoute();
  const { start } = useTour();

  const startTour = () =>
    start(route.name === 'dashboard' ? dashboardSteps : landingSteps);

  return (
    <div className="min-h-screen flex flex-col">
      <AmbientBackground />
      <header className="sticky top-0 z-20 border-b border-hairline bg-canvas/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 h-14">
          <div className="flex items-center gap-3">
            <Wordmark />
            <NetworkBadge />
          </div>
          <div className="flex items-center gap-2">
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

      <main className="relative z-10 flex-1 px-5 py-6 sm:py-8">
        {route.name === 'landing' && <Landing />}
        {route.name === 'dashboard' && <Dashboard />}
        {route.name === 'create' && <CreateAgreement />}
        {route.name === 'detail' && <AgreementDetail id={route.id} />}
        {route.name === 'trader' && <TraderProfile address={route.address} />}
      </main>

      <footer className="relative z-10 px-5 py-6">
        <div className="mx-auto max-w-6xl border-t border-hairline pt-4 flex flex-col gap-1 text-[12px] text-fog sm:flex-row sm:items-center sm:justify-between">
          <span>Pacta runs entirely on a Soroban contract. No backend, no custody.</span>
          <a
            href={contractExplorerUrl()}
            target="_blank"
            rel="noreferrer"
            className="mono hover:text-accent focus:outline-none focus-visible:text-accent"
          >
            contract {shortAddr(CONTRACT_ID, 6, 6)}
          </a>
        </div>
      </footer>
    </div>
  );
}
