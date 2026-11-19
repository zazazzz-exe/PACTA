import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { checkContrast } from '../../../scripts/check-contrast';

// Build guard: the same WCAG AA check as `node scripts/check-contrast.ts`, run
// against the real tokens in src/index.css. Body text 4.5:1; icons, large text
// and focus rings 3:1.
const css = readFileSync(fileURLToPath(new URL('../index.css', import.meta.url)), 'utf8');
const results = checkContrast(css);

describe('design tokens meet WCAG AA', () => {
  it('checks both app themes, the landing palette and the proof panel', () => {
    const themes = new Set(results.map((r) => r.theme));
    expect([...themes].sort()).toEqual(['dark', 'landing', 'light', 'panel']);
    expect(results.length).toBeGreaterThan(100);
  });

  it.each(results.map((r) => [`${r.theme}: ${r.fg} on ${r.bg}`, r] as const))('%s', (_name, r) => {
    expect(r.ratio, `${r.ratio.toFixed(2)}:1, needs ${r.need}:1`).toBeGreaterThanOrEqual(r.need);
  });

  it('uses the calm accent and keeps it a solid fill', () => {
    expect(css).toMatch(/--accent: 79 103 230;/);
    expect(css).toMatch(/--btn-primary: linear-gradient\(rgb\(79 103 230\), rgb\(79 103 230\)\)/);
  });

  it('keeps the glow budget: no shadow glow above 0.25 opacity or 16px blur', () => {
    const glow = /--btn-glow:\s*0 (\d+)px (\d+)px rgba\([^)]*, ([0-9.]+)\)/.exec(css);
    expect(glow).not.toBeNull();
    expect(Number(glow![2])).toBeLessThanOrEqual(16);
    expect(Number(glow![3])).toBeLessThanOrEqual(0.25);
  });
});
