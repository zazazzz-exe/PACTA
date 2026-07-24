import { useEffect, useState } from 'react';
import { isStandalone, isIOS, type BeforeInstallPromptEvent } from '../lib/pwa';

const DISMISS_KEY = 'pacta_install_dismissed';

export interface InstallState {
  canPrompt: boolean; // native Android/Chromium prompt is available
  iosInstall: boolean; // iOS: show manual "Add to Home Screen" instructions
  installed: boolean; // already running as an installed PWA
  dismissed: boolean; // banner dismissed on this device
  promptInstall: () => Promise<void>;
  dismiss: () => void;
}

export function useInstallPrompt(): InstallState {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  // `window` structurally has `navigator: Navigator`, which shares no property
  // with the intentionally-narrow `{ standalone?: boolean }` shape isStandalone
  // takes (for unit-testability); TS's weak-type check rejects that without an
  // explicit assertion, even though the runtime value is exactly what's wanted.
  const [installed, setInstalled] = useState(() =>
    isStandalone(window as unknown as Parameters<typeof isStandalone>[0]),
  );
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem(DISMISS_KEY) === '1';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    const onBeforeInstall = (e: Event) => {
      e.preventDefault(); // stop Chrome's default mini-infobar; we show our own UI
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferred(null);
    };
    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const promptInstall = async () => {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    setDeferred(null); // a prompt can only be used once
  };

  const dismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem(DISMISS_KEY, '1');
    } catch {
      /* storage unavailable — no-op */
    }
  };

  return {
    canPrompt: deferred !== null,
    iosInstall: isIOS(navigator.userAgent, navigator.maxTouchPoints),
    installed,
    dismissed,
    promptInstall,
    dismiss,
  };
}
