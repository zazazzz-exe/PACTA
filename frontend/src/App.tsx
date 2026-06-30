import { useRoute, navigate } from './lib/router';
import { useWallet } from './hooks/useWallet';
import { ConnectButton } from './components/ConnectButton';
import { Landing } from './pages/Landing';
import { Dashboard } from './pages/Dashboard';
import { CreateAgreement } from './pages/CreateAgreement';
import { AgreementDetail } from './pages/AgreementDetail';
import { CONTRACT_ID, contractExplorerUrl } from './lib/config';
import { shortAddr } from './lib/format';

function Logo() {
  return (
    <button onClick={() => navigate('/')} className="flex items-center gap-2.5">
      <span className="grid h-8 w-8 place-items-center rounded-lg border border-accent/40 bg-accent-soft">
        <span className="text-accent font-bold">P</span>
      </span>
      <div className="leading-tight text-left">
        <div className="font-semibold tracking-tight text-ink">Pacta</div>
        <div className="text-[10px] uppercase tracking-[0.2em] text-ink-faint">
          Trust, in code
        </div>
      </div>
    </button>
  );
}

export default function App() {
  const route = useRoute();
  const { address } = useWallet();

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-hairline bg-base/70 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-3.5">
          <div className="flex items-center gap-6">
            <Logo />
            {address && (
              <nav className="hidden items-center gap-1 sm:flex">
                <NavLink active={route.name === 'dashboard'} to="/dashboard">
                  Dashboard
                </NavLink>
                <NavLink active={route.name === 'create'} to="/create">
                  New agreement
                </NavLink>
              </nav>
            )}
          </div>
          <ConnectButton />
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-5 py-8">
        {route.name === 'landing' && <Landing />}
        {route.name === 'dashboard' && <Dashboard />}
        {route.name === 'create' && <CreateAgreement />}
        {route.name === 'detail' && <AgreementDetail id={route.id} />}
      </main>

      <footer className="mx-auto max-w-5xl px-5 pb-10 pt-4">
        <div className="flex flex-col items-start justify-between gap-2 border-t border-hairline pt-5 text-xs text-ink-faint sm:flex-row sm:items-center">
          <span>Pacta runs entirely on a Soroban contract. No backend, no custody.</span>
          <a
            href={contractExplorerUrl()}
            target="_blank"
            rel="noreferrer"
            className="mono hover:text-accent"
          >
            contract {shortAddr(CONTRACT_ID, 6, 6)} ↗
          </a>
        </div>
      </footer>
    </div>
  );
}

function NavLink({ to, active, children }: { to: string; active: boolean; children: string }) {
  return (
    <button
      onClick={() => navigate(to)}
      className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
        active ? 'bg-white/5 text-ink' : 'text-ink-muted hover:text-ink'
      }`}
    >
      {children}
    </button>
  );
}
