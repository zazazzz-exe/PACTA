import { Wallet, ArrowLeftRight, ShieldCheck, Receipt, User } from 'lucide-react';
import { navigate, type Route } from '../../lib/router';
import { tabForRoute } from '../../lib/tabForRoute';

// Floating pill bottom nav (DESIGN §6.8): a glass pill that floats above the
// content and the device's home indicator. Same tabs and routes as before.
// Each tab is at least 44x44 and the current one is marked with aria-current.
type TabName = 'home' | 'convert' | 'dashboard' | 'activity' | 'profile';

export const NAV_TABS: { name: TabName; label: string; path: string; icon: typeof Wallet }[] = [
  { name: 'home', label: 'Home', path: '/home', icon: Wallet },
  { name: 'convert', label: 'Convert', path: '/convert', icon: ArrowLeftRight },
  { name: 'dashboard', label: 'Pacts', path: '/dashboard', icon: ShieldCheck },
  { name: 'activity', label: 'Activity', path: '/activity', icon: Receipt },
  { name: 'profile', label: 'Profile', path: '/profile', icon: User },
];

export function FloatingNav({ current }: { current: Route['name'] }) {
  const activeTab = tabForRoute(current);
  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-30 px-4 pb-[max(12px,env(safe-area-inset-bottom))] pointer-events-none"
    >
      <div className="pointer-events-auto mx-auto flex max-w-app items-stretch justify-between gap-1 rounded-pill border border-card bg-paper/85 p-1.5 shadow-pop backdrop-blur-xl">
        {NAV_TABS.map((t) => {
          const active = activeTab === t.name;
          const Icon = t.icon;
          return (
            <button
              key={t.name}
              type="button"
              onClick={() => navigate(t.path)}
              aria-current={active ? 'page' : undefined}
              className={`flex min-h-[52px] min-w-tap flex-1 flex-col items-center justify-center gap-0.5 rounded-pill text-[11px] font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-text/70 ${
                active ? 'bg-accent-tint text-accent-deep' : 'text-slate hover:text-ink'
              }`}
            >
              <Icon size={21} aria-hidden strokeWidth={active ? 2.4 : 1.9} />
              {t.label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
