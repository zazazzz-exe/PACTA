import { m } from 'framer-motion';
import { Wallet, ArrowLeftRight, ShieldCheck, Receipt, User } from 'lucide-react';
import { navigate, type Route } from '../../lib/router';
import { tabForRoute } from '../../lib/tabForRoute';
import { SPRING } from '../motion/MotionProvider';

// Floating pill bottom nav (DESIGN §6.8): a frosted pill above the content and
// the device's home indicator. The active item is an accent pill (with the one
// allowed soft glow) that slides between items. Each tab is at least 44x44 and
// the current one carries aria-current. Pages reserve bottom space for it
// (App main: NAV_SPACE) so no content sits under the nav.
type TabName = 'home' | 'convert' | 'dashboard' | 'activity' | 'profile';

export const NAV_TABS: { name: TabName; label: string; path: string; icon: typeof Wallet }[] = [
  { name: 'home', label: 'Home', path: '/home', icon: Wallet },
  { name: 'convert', label: 'Convert', path: '/convert', icon: ArrowLeftRight },
  { name: 'dashboard', label: 'Pacts', path: '/dashboard', icon: ShieldCheck },
  { name: 'activity', label: 'Activity', path: '/activity', icon: Receipt },
  { name: 'profile', label: 'Profile', path: '/profile', icon: User },
];

/** Bottom padding pages need so nothing hides under the nav (nav + gap + safe area). */
export const NAV_SPACE = 'pb-[calc(112px+env(safe-area-inset-bottom))]';

export function FloatingNav({ current }: { current: Route['name'] }) {
  const activeTab = tabForRoute(current);
  return (
    <nav
      aria-label="Primary"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-30 px-4 pb-[max(12px,env(safe-area-inset-bottom))]"
    >
      <div className="pointer-events-auto mx-auto flex max-w-app items-stretch justify-between gap-1 rounded-pill border border-card bg-paper/80 p-1.5 shadow-pop backdrop-blur-lg">
        {NAV_TABS.map((t) => {
          const active = activeTab === t.name;
          const Icon = t.icon;
          return (
            <m.button
              key={t.name}
              type="button"
              onClick={() => navigate(t.path)}
              aria-current={active ? 'page' : undefined}
              whileTap={{ scale: 0.96 }}
              className={`relative flex min-h-[52px] min-w-tap flex-1 flex-col items-center justify-center gap-0.5 rounded-pill text-[11px] font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                active ? 'text-on-accent' : 'text-slate hover:text-ink'
              }`}
            >
              {active && (
                <m.span
                  layoutId="nav-active-pill"
                  transition={SPRING}
                  className="absolute inset-0 rounded-pill bg-accent shadow-glow"
                  aria-hidden
                />
              )}
              <Icon size={21} aria-hidden strokeWidth={active ? 2.4 : 1.9} className="relative" />
              <span className="relative">{t.label}</span>
            </m.button>
          );
        })}
      </div>
    </nav>
  );
}
