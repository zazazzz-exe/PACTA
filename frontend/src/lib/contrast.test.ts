import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// WCAG AA guard for the "electric glow" tokens. Reads the real values from
// src/index.css, so changing a token that breaks contrast fails the build.
// Normal text needs 4.5:1; large text (>= 24px, or >= 18.66px bold) 3:1.

// Normalize CRLF so the block selectors below match on Windows checkouts.
const css = readFileSync(fileURLToPath(new URL('../index.css', import.meta.url)), 'utf8')
  .split(String.fromCharCode(13))
  .join('');

function block(selector: string): Record<string, string> {
  const start = css.indexOf(selector);
  if (start === -1) throw new Error(`missing ${selector}`);
  const body = css.slice(css.indexOf('{', start) + 1, css.indexOf('}', start));
  const vars: Record<string, string> = {};
  for (const m of body.matchAll(/--([a-z-]+):\s*([^;]+);/g)) vars[m[1]] = m[2].trim();
  return vars;
}

const shared = block(':root {\n  /* proof panel');
const themes = {
  dark: { ...shared, ...block(":root,\n:root[data-theme='dark']") },
  light: { ...shared, ...block(":root[data-theme='light']") },
};

type RGB = [number, number, number];
function parse(v: string): RGB {
  if (v.startsWith('#')) return [1, 3, 5].map((i) => parseInt(v.slice(i, i + 2), 16)) as RGB;
  const nums = v.replace(/\/\*.*?\*\//g, '').trim().split(/\s+/).map(Number);
  if (nums.length < 3 || nums.some((n) => !Number.isFinite(n))) throw new Error(`not a color: ${v}`);
  return nums.slice(0, 3) as RGB;
}
function rgba(v: string): { rgb: RGB; a: number } {
  const m = /rgba\(([^)]+)\)/.exec(v);
  if (!m) throw new Error(`not rgba: ${v}`);
  const [r, g, b, a] = m[1].split(',').map((x) => Number(x.trim()));
  return { rgb: [r, g, b], a };
}
const over = (fg: RGB, bg: RGB, a: number): RGB =>
  fg.map((c, i) => Math.round(c * a + bg[i] * (1 - a))) as RGB;
function luminance([r, g, b]: RGB): number {
  const f = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}
export function ratio(a: RGB, b: RGB): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

const TEXT = ['ink', 'slate', 'fog', 'accent-text'];
const SURFACES = ['canvas', 'paper', 'mist'];

for (const [name, t] of Object.entries(themes)) {
  const col = (k: string) => parse(t[k]);
  describe(`${name} theme meets WCAG AA`, () => {
    for (const fg of TEXT) {
      for (const bg of SURFACES) {
        it(`${fg} on ${bg}`, () => {
          expect(ratio(col(fg), col(bg))).toBeGreaterThanOrEqual(4.5);
        });
      }
    }

    it('text on the top glow (worst on-screen point)', () => {
      // The body glow is centered 80px above the viewport, so the brightest
      // visible point carries about 80% of the token alpha.
      const g = rgba(t.glow);
      const peak = over(g.rgb, col('canvas'), g.a * 0.8);
      for (const fg of TEXT) expect(ratio(col(fg), peak), fg).toBeGreaterThanOrEqual(4.5);
    });

    it.each([
      ['accent-text', 'accent-tint'],
      ['accent-text-strong', 'accent-tint'],
      ['on-accent', 'accent'],
      ['on-accent', 'accent-deep'],
      ['deadline', 'canvas'],
      ['deadline', 'paper'],
      ['deadline-deep', 'deadline-tint'],
      ['refund', 'canvas'],
      ['refund', 'paper'],
      ['refund-deep', 'refund-tint'],
    ])('%s on %s', (fg, bg) => {
      expect(ratio(col(fg), col(bg))).toBeGreaterThanOrEqual(4.5);
    });
  });
}

describe('always-dark surfaces meet WCAG AA', () => {
  const col = (k: string) => parse(shared[k]);
  it.each([
    ['panel-ink', 'carbon'],
    ['panel-muted', 'carbon'],
    ['panel-muted', 'onyx'],
    ['signal', 'carbon'],
    ['signal-amber', 'carbon'],
    ['signal-red', 'carbon'],
  ])('%s on %s', (fg, bg) => {
    expect(ratio(col(fg), col(bg))).toBeGreaterThanOrEqual(4.5);
  });

  it('primary button label sits on the #2B5CFF part of its gradient', () => {
    // --btn-primary reaches #2B5CFF by 32%; a 15px label in a 48px button
    // starts at about 35% of the height, so its background is solid #2B5CFF.
    expect(shared['btn-primary']).toMatch(/#2B5CFF 32%/);
    expect(ratio(parse('#F5F4EF'), parse('#2B5CFF'))).toBeGreaterThanOrEqual(4.5);
  });

  it('hero card text: small text on #2B4BE8 or darker, large text on the highlight', () => {
    expect(shared['hero-gradient']).toMatch(/at 88% 0%/); // highlight top-right, away from labels
    expect(ratio(parse('#F5F4EF'), parse('#2B4BE8'))).toBeGreaterThanOrEqual(4.5);
    expect(ratio(parse('#F5F4EF'), parse('#5B86FF'))).toBeGreaterThanOrEqual(3);
  });
});
