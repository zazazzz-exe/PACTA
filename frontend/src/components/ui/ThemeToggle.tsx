import { Monitor, Moon, Sun } from 'lucide-react';
import { useTheme, type ThemeChoice } from '../../lib/theme';

// Dark / light toggle, saved per device. "System" follows the OS setting
// (the default until the user picks). A radio group, each option 44px tall.
const OPTIONS: { value: ThemeChoice; label: string; icon: typeof Sun }[] = [
  { value: 'system', label: 'System', icon: Monitor },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'light', label: 'Light', icon: Sun },
];

export function ThemeToggle({ className = '' }: { className?: string }) {
  const { choice, setChoice } = useTheme();
  return (
    <div
      role="radiogroup"
      aria-label="Appearance"
      className={`inline-flex rounded-pill border border-card bg-mist p-1 ${className}`}
    >
      {OPTIONS.map((o) => {
        const on = choice === o.value;
        const Icon = o.icon;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => setChoice(o.value)}
            className={`inline-flex min-h-tap items-center gap-1.5 rounded-pill px-3.5 text-[13px] font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-text/70 ${
              on ? 'bg-btn-primary text-on-accent shadow-glow' : 'text-slate hover:text-ink'
            }`}
          >
            <Icon size={16} aria-hidden />
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
