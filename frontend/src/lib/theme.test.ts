import { describe, it, expect, beforeEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { THEME_STORAGE_KEY, resolveTheme, currentChoice, setThemeChoice } from './theme';

// Minimal browser stand-ins (the frontend tests run in a node environment).
function installDom(prefersLight: boolean) {
  const store = new Map<string, string>();
  const attrs = new Map<string, string>();
  const meta = { content: '', setAttribute: (_k: string, v: string) => (meta.content = v) };
  vi.stubGlobal('window', {
    localStorage: {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
      removeItem: (k: string) => void store.delete(k),
    },
    matchMedia: () => ({ matches: prefersLight, addEventListener() {}, removeEventListener() {} }),
    dispatchEvent: () => true,
  });
  vi.stubGlobal('document', {
    documentElement: { setAttribute: (k: string, v: string) => void attrs.set(k, v) },
    querySelector: () => meta,
  });
  vi.stubGlobal('CustomEvent', class {});
  return { store, attrs, meta };
}

describe('theme choice', () => {
  beforeEach(() => vi.unstubAllGlobals());

  it('saved choice wins, otherwise the OS setting', () => {
    expect(resolveTheme('dark', 'light')).toBe('dark');
    expect(resolveTheme('light', 'dark')).toBe('light');
    expect(resolveTheme(null, 'light')).toBe('light');
    expect(resolveTheme(null, 'dark')).toBe('dark');
  });

  it('saving a choice persists it per device and applies it', () => {
    const { store, attrs, meta } = installDom(true);
    setThemeChoice('dark');
    expect(store.get(THEME_STORAGE_KEY)).toBe('dark');
    expect(attrs.get('data-theme')).toBe('dark');
    expect(meta.content).toBe('#05060B');
    expect(currentChoice()).toBe('dark');
  });

  it('"system" clears the saved choice and follows the OS', () => {
    const { store, attrs } = installDom(true);
    setThemeChoice('dark');
    setThemeChoice('system');
    expect(store.has(THEME_STORAGE_KEY)).toBe(false);
    expect(attrs.get('data-theme')).toBe('light');
    expect(currentChoice()).toBe('system');
  });

  it('ignores a corrupted saved value', () => {
    const { store } = installDom(false);
    store.set(THEME_STORAGE_KEY, 'neon');
    expect(currentChoice()).toBe('system');
  });
});

describe('public/theme-init.js (runs before React)', () => {
  const src = readFileSync(fileURLToPath(new URL('../../public/theme-init.js', import.meta.url)), 'utf8');

  it('uses the same storage key and defaults as src/lib/theme.ts', () => {
    expect(src).toContain(`'${THEME_STORAGE_KEY}'`);
    expect(src).toContain("prefers-color-scheme: light");
    expect(src).toMatch(/var theme = 'dark'/); // dark when nothing is saved and the OS has no light preference
    expect(src).toContain("'#F5F4EF'");
    expect(src).toContain("'#05060B'");
  });

  it('is loaded from <head> before the app bundle, not inline (CSP)', () => {
    const html = readFileSync(fileURLToPath(new URL('../../index.html', import.meta.url)), 'utf8');
    const init = html.indexOf('<script src="/theme-init.js"></script>');
    const app = html.indexOf('src="/src/main.tsx"');
    expect(init).toBeGreaterThan(-1);
    expect(init).toBeLessThan(app);
    expect(html.indexOf('<script>')).toBe(-1); // no inline scripts
  });
});
