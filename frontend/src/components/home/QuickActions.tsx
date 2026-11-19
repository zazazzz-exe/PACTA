import { m } from 'framer-motion';
import { ArrowDownLeft, ArrowUpRight, Repeat, ShieldPlus, type LucideIcon } from 'lucide-react';
import { t } from '../../lib/strings';

// Four round tiles (DESIGN §7.6), each with its own pastel icon background.
// Press scales to 0.96. "New Pact" is disabled (with the reason as its
// description) on networks where Pacts are not configured.
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
  tone: string;
  onClick: () => void;
  disabled?: boolean;
  hint?: string;
}

export function QuickActions({ onSend, onReceive, onConvert, onNewPact, pactsAvailable }: Props) {
  const tiles: Tile[] = [
    { label: t('actions.send'), icon: ArrowUpRight, tone: 'bg-accent-tint text-accent', onClick: onSend },
    { label: t('actions.receive'), icon: ArrowDownLeft, tone: 'bg-mint-soft text-mint', onClick: onReceive },
    { label: t('actions.convert'), icon: Repeat, tone: 'bg-lilac-soft text-lilac', onClick: onConvert },
    {
      label: t('actions.newPact'),
      icon: ShieldPlus,
      tone: 'bg-apricot-soft text-apricot',
      onClick: onNewPact,
      disabled: !pactsAvailable,
      hint: pactsAvailable ? undefined : t('actions.pactsUnavailable'),
    },
  ];
  return (
    <nav aria-label={t('actions.title')} className="grid grid-cols-4 gap-2">
      {tiles.map(({ label, icon: Icon, tone, onClick, disabled, hint }) => (
        <m.button
          key={label}
          type="button"
          onClick={onClick}
          disabled={disabled}
          title={hint}
          aria-description={hint}
          whileTap={disabled ? undefined : { scale: 0.96 }}
          className="group flex min-h-tap flex-col items-center gap-2 rounded-tile py-2 text-[13px] font-semibold text-ink transition focus:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-not-allowed disabled:opacity-50"
        >
          <span className={`grid h-14 w-14 place-items-center rounded-pill transition group-hover:brightness-110 ${tone}`}>
            <Icon size={22} aria-hidden strokeWidth={2.2} />
          </span>
          {label}
        </m.button>
      ))}
    </nav>
  );
}
