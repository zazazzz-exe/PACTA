import { Wallet, ArrowLeftRight, ShieldCheck, Receipt, User } from 'lucide-react';
import { navigate, type Route } from '../lib/router';
import { tabForRoute } from '../lib/tabForRoute';

type TabName = 'home' | 'convert' | 'dashboard' | 'activity' | 'profile';

const TABS: { name: TabName; label: string; path: string; icon: typeof Wallet }[] = [
  { name: 'home', label: 'Home', path: '/home', icon: Wallet },
  { name: 'convert', label: 'Convert', path: '/convert', icon: ArrowLeftRight },
  { name: 'dashboard', label: 'Pacts', path: '/dashboard', icon: ShieldCheck },
  { name: 'activity', label: 'Activity', path: '/activity', icon: Receipt },
  { name: 'profile', label: 'Profile', path: '/profile', icon: User },
];

export function BottomTabs({ current }: { current: Route['name'] }) {
  const activeTab = tabForRoute(current);
  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-hairline bg-canvas/95 backdrop-blur"
    >
      <div className="mx-auto flex max-w-app items-stretch justify-between px-2">
        {TABS.map((t) => {
          const active = activeTab === t.name;
          const Icon = t.icon;
          return (
            <button
              key={t.name}
              onClick={() => navigate(t.path)}
              aria-current={active ? 'page' : undefined}
              className={`flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 ${
                active ? 'text-accent' : 'text-slate'
              }`}
            >
              <Icon size={22} aria-hidden strokeWidth={active ? 2.4 : 1.8} />
              {t.label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
