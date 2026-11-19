// WCAG AA contrast check for the PACTA design tokens.
//
//   node scripts/check-contrast.ts          (Node >= 22.18 runs TypeScript directly)
//
// Reads the CSS variables from frontend/src/index.css (dark "Midnight", light
// "Paper", and the theme-independent block) and checks every text/background
// pair the UI uses. Body text needs 4.5:1; large text, icons and focus rings
// need 3:1. Exits 1 if any pair fails. frontend/src/lib/contrast.test.ts runs
// the same check in the test suite, so a failing token breaks the build.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

type RGB = [number, number, number];
type Vars = Record<string, string>;
export interface PairResult {
  theme: string;
  fg: string;
  bg: string;
  ratio: number;
  need: number;
  ok: boolean;
}

const BODY = 4.5;
const LARGE = 3; // large text (>= 24px, or >= 18.66px bold), icons, focus rings

function blockVars(css: string, selector: string): Vars {
  const at = css.indexOf(selector);
  if (at === -1) throw new Error(`index.css is missing the block ${JSON.stringify(selector)}`);
  const body = css.slice(css.indexOf('{', at) + 1, css.indexOf('}', at));
  const vars: Vars = {};
  for (const m of body.matchAll(/--([a-z0-9-]+):\s*([^;]+);/g)) vars[m[1]] = m[2].replace(/\/\*.*?\*\//g, '').trim();
  return vars;
}

function hexToRgb(hex: string): RGB {
  return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as RGB;
}

// Accepts "79 103 230" channels, "#4F67E6", "rgb(231 228 220)" or "rgba(r, g, b, a)" (alpha ignored).
function parseColor(v: string): RGB {
  const t = v.trim();
  if (t.startsWith('#')) return hexToRgb(t);
  const fn = /^rgba?\(([^)]+)\)$/.exec(t);
  const parts = (fn ? fn[1] : t).split(/[\s,/]+/).filter(Boolean).map(Number);
  if (parts.length < 3 || parts.slice(0, 3).some((n) => !Number.isFinite(n))) throw new Error(`not a color: ${v}`);
  return [parts[0], parts[1], parts[2]];
}

function alphaOf(v: string): number {
  const m = /^rgba\(([^)]+)\)$/.exec(v.trim());
  return m ? Number(m[1].split(',')[3]) : 1;
}

function over(fg: RGB, bg: RGB, a: number): RGB {
  return fg.map((c, i) => Math.round(c * a + bg[i] * (1 - a))) as RGB;
}

function luminance([r, g, b]: RGB): number {
  const f = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

export function contrastRatio(a: RGB, b: RGB): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

const gradientStops = (v: string): string[] => v.match(/#[0-9A-Fa-f]{6}/g) ?? [];

export function checkContrast(cssText: string): PairResult[] {
  const css = cssText.split(String.fromCharCode(13)).join('');
  const shared = blockVars(css, ':root {\n  /* proof panel');
  const themes: Record<string, Vars> = {
    dark: { ...shared, ...blockVars(css, ":root,\n:root[data-theme='dark']") },
    light: { ...shared, ...blockVars(css, ":root[data-theme='light']") },
  };
  // The landing page's scoped palette (.lp), inheriting anything it does not set.
  const LP = '\n.lp {';
  if (css.includes(LP)) themes.landing = { ...themes.dark, ...blockVars(css, LP) };
  const results: PairResult[] = [];

  for (const [theme, v] of Object.entries(themes)) {
    const col = (k: string) => {
      if (!(k in v)) throw new Error(`${theme}: missing token --${k}`);
      return parseColor(v[k]);
    };
    const push = (fg: string, bg: string, fgc: RGB, bgc: RGB, need: number) => {
      const ratio = contrastRatio(fgc, bgc);
      results.push({ theme, fg, bg, ratio, need, ok: ratio >= need });
    };
    const surfaces: Array<[string, RGB]> = [
      ['canvas', col('canvas')],
      ...('deep' in v ? [['deep', col('deep')] as [string, RGB]] : []),
      ['paper', col('paper')],
      ['mist', col('mist')],
    ];
    // The body glow is centered above the viewport; its brightest visible point
    // carries about 80% of the token alpha.
    const glow = v.glow;
    surfaces.push(['canvas+glow', over(parseColor(glow), col('canvas'), alphaOf(glow) * 0.8)]);
    // Balance card gradient stops.
    for (const stop of gradientStops(v['balance-card'] ?? '')) surfaces.push([`balance ${stop}`, hexToRgb(stop)]);

    const text = ['ink', 'slate', 'fog', 'accent-text', 'cyan', 'mint', 'apricot', 'lilac', 'deadline', 'refund'];
    for (const fg of text) for (const [bg, bgc] of surfaces) {
      // Rule: the balance card carries primary and secondary text only (and the
      // accent for links); tertiary, pastels and states never sit on it.
      if (bg.startsWith('balance') && !['ink', 'slate', 'accent-text'].includes(fg)) continue;
      push(fg, bg, col(fg), bgc, BODY);
    }

    // Tinted chips and tiles: text/icon on its own soft background.
    for (const [fg, bg] of [
      ['accent-text-strong', 'accent-tint'],
      ['accent-text', 'accent-tint'],
      ['mint', 'mint-soft'],
      ['apricot', 'apricot-soft'],
      ['lilac', 'lilac-soft'],
      ['deadline-deep', 'deadline-tint'],
      ['refund-deep', 'refund-tint'],
      ['ink', 'accent-tint'],
    ]) push(fg, bg, col(fg), col(bg), BODY);

    // Buttons and focus rings.
    push('on-accent', 'accent', col('on-accent'), col('accent'), BODY);
    push('on-accent', 'accent-deep', col('on-accent'), col('accent-deep'), BODY);
    for (const [bg, bgc] of surfaces.filter(([n]) => !n.includes('+') && !n.startsWith('balance'))) push('accent (focus ring)', bg, col('accent'), bgc, LARGE);
  }

  // Always-dark proof panel.
  const s = (k: string) => parseColor(shared[k]);
  for (const [fg, bg] of [
    ['panel-ink', 'carbon'],
    ['panel-muted', 'carbon'],
    ['panel-muted', 'onyx'],
    ['signal', 'carbon'],
    ['signal-amber', 'carbon'],
    ['signal-red', 'carbon'],
  ]) {
    const ratio = contrastRatio(s(fg), s(bg));
    results.push({ theme: 'panel', fg, bg, ratio, need: BODY, ok: ratio >= BODY });
  }
  return results;
}

function main(): void {
  const cssPath = fileURLToPath(new URL('../frontend/src/index.css', import.meta.url));
  const results = checkContrast(readFileSync(cssPath, 'utf8'));
  const failures = results.filter((r) => !r.ok);
  for (const r of failures) {
    console.log(`FAIL ${r.theme.padEnd(5)} ${r.fg} on ${r.bg}: ${r.ratio.toFixed(2)}:1 (needs ${r.need}:1)`);
  }
  const worst = [...results].sort((a, b) => a.ratio / a.need - b.ratio / b.need).slice(0, 5);
  console.log(`\nChecked ${results.length} pairs. Tightest:`);
  for (const r of worst) console.log(`  ${r.theme.padEnd(5)} ${r.fg} on ${r.bg}: ${r.ratio.toFixed(2)}:1 (needs ${r.need})`);
  console.log(failures.length ? `\n${failures.length} pair(s) fail WCAG AA.` : '\nAll pairs pass WCAG AA.');
  process.exit(failures.length ? 1 : 0);
}

if (process.argv[1] && import.meta.url === new URL(`file:///${process.argv[1].replace(/\\/g, '/').replace(/^\//, '')}`).href) {
  main();
}
