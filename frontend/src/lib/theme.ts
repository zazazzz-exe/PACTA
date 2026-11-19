import { useEffect, useState } from 'react';

// Dark/light theme, saved per device. The first paint is handled by
// public/theme-init.js (same key and rules); this module keeps React in sync.
// Order: saved choice, else the OS setting, else dark.

export type Theme = 'dark' | 'light';
export type ThemeChoice = Theme | 'system';

export const THEME_STORAGE_KEY = 'pacta-theme';
const THEME_COLOR: Record<Theme, string> = { dark: '#05060B', light: '#F5F4EF' };
const EVENT = 'pacta-theme-change';

function readSaved(): Theme | null {
  try {
    const v = window.localStorage.getItem(THEME_STORAGE_KEY);
    return v === 'dark' || v === 'light' ? v : null;
  } catch {
    return null;
  }
}

function systemTheme(): Theme {
  try {
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  } catch {
    return 'dark';
  }
}

export function resolveTheme(saved: Theme | null, system: Theme): Theme {
  return saved ?? system;
}

export function currentChoice(): ThemeChoice {
  return readSaved() ?? 'system';
}

export function applyTheme(theme: Theme): void {
  document.documentElement.setAttribute('data-theme', theme);
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_COLOR[theme]);
}

function prefersReducedMotion(): boolean {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

// Apply a user-initiated theme change with a 200ms crossfade (CSS in index.css:
// ::view-transition-*). Falls back to an instant switch where the View
// Transitions API is missing or the user prefers reduced motion.
export function applyThemeWithFade(theme: Theme): void {
  const doc = document as Document & { startViewTransition?: (cb: () => void) => unknown };
  if (typeof doc.startViewTransition === 'function' && !prefersReducedMotion()) {
    doc.startViewTransition(() => applyTheme(theme));
  } else {
    applyTheme(theme);
  }
}

// Save the user's choice ('system' clears it) and apply it with a crossfade.
export function setThemeChoice(choice: ThemeChoice): void {
  try {
    if (choice === 'system') window.localStorage.removeItem(THEME_STORAGE_KEY);
    else window.localStorage.setItem(THEME_STORAGE_KEY, choice);
  } catch {
    /* storage blocked: the choice lasts for this page only */
  }
  applyThemeWithFade(choice === 'system' ? systemTheme() : choice);
  window.dispatchEvent(new CustomEvent(EVENT));
}

// Current theme plus the saved choice; follows OS changes while no choice is saved.
export function useTheme(): { theme: Theme; choice: ThemeChoice; setChoice: (c: ThemeChoice) => void } {
  const read = () => ({ theme: resolveTheme(readSaved(), systemTheme()), choice: currentChoice() });
  const [state, setState] = useState(read);

  useEffect(() => {
    const sync = () => {
      const next = read();
      if (document.documentElement.getAttribute('data-theme') !== next.theme) applyThemeWithFade(next.theme);
      setState(next);
    };
    let mq: MediaQueryList | null = null;
    try {
      mq = window.matchMedia('(prefers-color-scheme: light)');
      mq.addEventListener('change', sync);
    } catch {
      mq = null;
    }
    window.addEventListener(EVENT, sync);
    window.addEventListener('storage', sync); // another tab changed it
    return () => {
      mq?.removeEventListener('change', sync);
      window.removeEventListener(EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  return { ...state, setChoice: setThemeChoice };
}
