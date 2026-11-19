import { m } from 'framer-motion';
import { ArrowDownLeft, ArrowUpRight, Repeat, ShieldCheck, type LucideIcon } from 'lucide-react';
import { t } from '../../lib/strings';

// Four quick actions in one compact card: rounded-square icon containers on a
// soft blue tint, one icon size, a clear label, hover lift and a 0.96 press.
// "New Pact" is the signature action, so it gets the solid blue tile with a
// cyan halo. It is disabled (reason as its description) on networks where
// Pacts are not configured.
interface Props {
  onSend: () => void;
  onReceive: () => void;
  onConvert: () => void;
  onNewPact: () => void;
  pactsAvailable: boolean;
}

interface Tile {
  label: string;
  icon: LucideIcon;
  onClick: () => void;
  featured?: boolean;
  disabled?: boolean;
  hint?: string;
}

export function QuickActions({ onSend, onReceive, onConvert, onNewPact, pactsAvailable }: Props) {
  const tiles: Tile[] = [
    { label: t('actions.send'), icon: ArrowUpRight, onClick: onSend },
    { label: t('actions.receive'), icon: ArrowDownLeft, onClick: onReceive },
    { label: t('actions.convert'), icon: Repeat, onClick: onConvert },
    {
      label: t('actions.newPact'),
      icon: ShieldCheck,
      onClick: onNewPact,
      featured: true,
      disabled: !pactsAvailable,
      hint: pactsAvailable ? undefined : t('actions.pactsUnavailable'),
    },
  ];
  return (
    <nav aria-label={t('actions.title')} className="grid grid-cols-4 gap-1 rounded-card border border-card bg-paper p-2 shadow-card sm:gap-2 sm:p-3">
      {tiles.map(({ label, icon: Icon, onClick, featured, disabled, hint }) => (
        <m.button
          key={label}
          type="button"
          onClick={onClick}
          disabled={disabled}
          title={hint}
          aria-description={hint}
          whileHover={disabled ? undefined : { y: -2 }}
          whileTap={disabled ? undefined : { scale: 0.96 }}
          className="group flex min-h-tap flex-col items-center gap-2 rounded-tile py-2 text-[13px] font-semibold text-ink transition-colors hover:bg-mist/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-not-allowed disabled:opacity-50"
        >
          <span
            className={`grid h-12 w-12 place-items-center rounded-[16px] transition ${
              featured
                ? 'bg-gradient-to-br from-accent to-accent-deep text-on-accent shadow-[0_0_0_1px_rgba(37,198,217,0.45),0_6px_16px_rgba(37,198,217,0.2)]'
                : 'bg-accent-tint text-accent group-hover:bg-accent group-hover:text-on-accent'
            }`}
          >
            <Icon size={22} aria-hidden strokeWidth={2.2} />
          </span>
          {label}
        </m.button>
      ))}
    </nav>
  );
}
