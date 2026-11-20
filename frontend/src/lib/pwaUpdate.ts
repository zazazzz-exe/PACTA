import { registerSW } from 'virtual:pwa-register';

// Keeps installed and returning visitors on the latest deploy. The service
// worker precaches the app, so without this a visitor sees the previous version
// until a second visit. When a new version is ready we switch to it at a safe
// moment, never in the middle of something:
// - right away if the page was opened moments ago (nothing in progress yet),
// - otherwise the next time the tab is hidden (the user switched away).
// We also look for a new version every hour and whenever the tab comes back.

const FRESH_LOAD_MS = 15_000;
const CHECK_EVERY_MS = 60 * 60 * 1000;

export function shouldApplyNow(sinceLoadMs: number, hidden: boolean): boolean {
  return hidden || sinceLoadMs < FRESH_LOAD_MS;
}

export function startPwaUpdates(): void {
  if (!('serviceWorker' in navigator)) return;
  const loadedAt = performance.now();
  let pending = false;

  const updateSW = registerSW({
    immediate: true,
    onNeedRefresh() {
      if (pending) return;
      pending = true;
      if (shouldApplyNow(performance.now() - loadedAt, document.hidden)) {
        void updateSW(true);
        return;
      }
      const onHide = () => {
        if (!document.hidden) return;
        document.removeEventListener('visibilitychange', onHide);
        void updateSW(true);
      };
      document.addEventListener('visibilitychange', onHide);
    },
    onRegisteredSW(_url, reg) {
      if (!reg) return;
      const check = () => {
        if (!navigator.onLine) return;
        void reg.update().catch(() => {});
      };
      window.setInterval(check, CHECK_EVERY_MS);
      document.addEventListener('visibilitychange', () => {
        if (!document.hidden) check();
      });
    },
  });
}
