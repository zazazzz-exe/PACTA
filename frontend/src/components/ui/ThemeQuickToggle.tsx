import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../../lib/theme';
import { IconButton } from './IconButton';

// Header shortcut: flips between dark and light and saves the choice for this
// device. The full control (including "System") is in Profile > Appearance.
export function ThemeQuickToggle() {
  const { theme, setChoice } = useTheme();
  const next = theme === 'dark' ? 'light' : 'dark';
  return (
    <IconButton label={`Switch to ${next} mode`} onClick={() => setChoice(next)}>
      {theme === 'dark' ? <Sun size={20} aria-hidden /> : <Moon size={20} aria-hidden />}
    </IconButton>
  );
}
