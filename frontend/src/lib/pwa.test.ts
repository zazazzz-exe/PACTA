import { describe, it, expect } from 'vitest';
import { isStandalone, isIOS } from './pwa';

describe('isIOS', () => {
  it('detects iPhone', () => {
    expect(isIOS('Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X)')).toBe(true);
  });
  it('detects iPadOS masquerading as Mac when touch is present', () => {
    expect(isIOS('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15)', 5)).toBe(true);
  });
  it('does not treat a desktop Mac (no touch) as iOS', () => {
    expect(isIOS('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15)', 0)).toBe(false);
  });
  it('does not treat Android as iOS', () => {
    expect(isIOS('Mozilla/5.0 (Linux; Android 13; Pixel)')).toBe(false);
  });
});

describe('isStandalone', () => {
  it('true when display-mode standalone matches', () => {
    expect(isStandalone({ matchMedia: () => ({ matches: true }) })).toBe(true);
  });
  it('true when iOS navigator.standalone is set', () => {
    expect(isStandalone({ navigator: { standalone: true } })).toBe(true);
  });
  it('false in a normal browser tab', () => {
    expect(isStandalone({ matchMedia: () => ({ matches: false }), navigator: {} })).toBe(false);
  });
});
