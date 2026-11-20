import { describe, it, expect, vi } from 'vitest';
vi.mock('virtual:pwa-register', () => ({ registerSW: () => async () => {} }));
const { shouldApplyNow } = await import('./pwaUpdate');

describe('when a new app version is applied', () => {
  it('applies right away on a fresh load or a hidden tab', () => {
    expect(shouldApplyNow(2_000, false)).toBe(true);
    expect(shouldApplyNow(600_000, true)).toBe(true);
  });
  it('waits while someone is using the app', () => {
    expect(shouldApplyNow(600_000, false)).toBe(false);
  });
});
