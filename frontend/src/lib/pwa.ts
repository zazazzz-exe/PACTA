// Pure platform detection for the install affordance. No side effects, so it is
// unit-testable in the node test environment by passing in fakes.

// The Chromium install event. Not in lib.dom, so we type it here.
export interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  prompt(): Promise<void>;
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

// True when running as an installed PWA (standalone window) rather than a tab.
export function isStandalone(win: {
  matchMedia?: (q: string) => { matches: boolean };
  navigator?: { standalone?: boolean };
}): boolean {
  const displayMode = win.matchMedia?.('(display-mode: standalone)').matches ?? false;
  const iosStandalone = win.navigator?.standalone === true;
  return displayMode || iosStandalone;
}

// True for iOS, where `beforeinstallprompt` never fires and install is manual.
// iPadOS 13+ reports a Macintosh UA, so it is distinguished by touch support.
export function isIOS(userAgent: string, maxTouchPoints = 0): boolean {
  if (/iphone|ipad|ipod/i.test(userAgent)) return true;
  return /Macintosh/.test(userAgent) && maxTouchPoints > 1;
}
