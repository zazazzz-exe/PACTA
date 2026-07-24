# PWA Install + Offline Completion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the PACTA web app installable ("download the app" / add to home screen) and let the installed app open offline so the existing outbox queue-and-flush flow becomes reachable.

**Architecture:** Add a service worker + web app manifest via `vite-plugin-pwa` (the one real change). A pure platform-detection module drives a small `InstallPrompt` (dismissible banner + Profile row). The already-working offline outbox is untouched; the service worker precache is what makes it reachable offline, plus friendly offline states on data pages.

**Tech Stack:** Vite 6, React 18, TypeScript, `vite-plugin-pwa` (Workbox), `@vite-pwa/assets-generator`, Vitest 2 (node env), Tailwind, lucide-react.

## Global Constraints

- No changes to the frozen Soroban contract, money logic, or `ChainAdapter` behavior.
- No new backend; `/api/*` untouched.
- No offline **data** caching (portfolio/activity fetched live); offline = shell loads + outbox queues only.
- No offline signing — offline only queues; reconnect flushes and signs.
- No em-dashes in UI copy.
- Human amounts convert at the UI boundary ×/÷ 1e7 (not relevant here, but preserved).
- Target: `frontend/` Vite app, deployed static to `frontend/dist` at domain root (scope `/`).
- Service worker stays OFF in `npm run dev` (`devOptions.enabled: false`); exercised via `npm run build && npm run preview`.
- Tests live at `frontend/src/**/*.test.ts` (node environment, pure functions only — matches existing pattern).

---

### Task 1: Make the app installable (manifest + service worker + icons)

**Files:**
- Modify: `frontend/package.json` (add dev deps + asset-gen script)
- Create: `frontend/pwa-assets.config.ts`
- Modify: `frontend/vite.config.ts`
- Modify: `frontend/index.html` (Apple meta tags)

**Interfaces:**
- Consumes: existing `frontend/public/pacta.svg` (32-viewBox, full-bleed green background — valid maskable source).
- Produces: a built `dist/sw.js`, `dist/manifest.webmanifest` with icon entries, generated icon PNGs in the build, and an installable app. No code symbols consumed by later tasks.

- [ ] **Step 1: Install dependencies**

Run:
```bash
cd frontend && npm i -D vite-plugin-pwa @vite-pwa/assets-generator
```
Expected: both added under `devDependencies` in `frontend/package.json`, install exits 0.

- [ ] **Step 2: Add the asset-generation script to `frontend/package.json`**

In the `"scripts"` block, add the `generate-pwa-assets` line:
```json
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest",
    "generate-pwa-assets": "pwa-assets-generator"
  },
```

- [ ] **Step 3: Create `frontend/pwa-assets.config.ts`**

```ts
import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config';

// Generates the icon set (64, 192, 512, maskable 512, apple-touch 180) from the
// PACTA mark. pacta.svg already has a full-bleed background, so the maskable
// variant renders without letterboxing.
export default defineConfig({
  headLinkOptions: { preset: '2023' },
  preset: minimal2023Preset,
  images: ['public/pacta.svg'],
});
```

- [ ] **Step 4: Configure `vite-plugin-pwa` in `frontend/vite.config.ts`**

Replace the whole file with:
```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { fileURLToPath, URL } from 'node:url';

// The generated bindings live in ../packages/pacta. We alias the package name
// "pacta" to its built output (dist); its own node_modules resolves the
// @stellar/stellar-sdk subpath imports the bindings depend on.
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      // Auto-generate + inject icons and the apple-touch-icon link from
      // pwa-assets.config.ts.
      pwaAssets: { config: true },
      manifest: {
        name: 'PACTA',
        short_name: 'PACTA',
        description:
          'A non-custodial money app on Stellar. Hold, send, receive, convert, and send protected.',
        theme_color: '#F4F2EC',
        background_color: '#F4F2EC',
        display: 'standalone',
        start_url: '/',
        scope: '/',
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,woff,woff2,png,svg,ico}'],
        navigateFallback: '/index.html',
        cleanupOutdatedCaches: true,
        clientsClaim: true,
      },
      // Keep the service worker out of `npm run dev` to avoid caching surprises.
      devOptions: { enabled: false },
    }),
  ],
  resolve: {
    alias: {
      pacta: fileURLToPath(new URL('../packages/pacta/dist/index.js', import.meta.url)),
    },
  },
  define: {
    global: 'globalThis',
  },
  optimizeDeps: {
    esbuildOptions: {
      define: { global: 'globalThis' },
    },
  },
  server: {
    port: 5173,
    fs: {
      allow: [fileURLToPath(new URL('..', import.meta.url))],
    },
  },
});
```

- [ ] **Step 5: Add Apple/iOS meta tags to `frontend/index.html`**

In `<head>`, immediately after the existing `theme-color` meta line, add:
```html
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="default" />
    <meta name="apple-mobile-web-app-title" content="PACTA" />
```
(The `apple-touch-icon` link and `manifest` link are injected automatically by the plugin.)

- [ ] **Step 6: Generate the icons**

Run:
```bash
cd frontend && npm run generate-pwa-assets
```
Expected: exit 0; new files under `frontend/public/` including `pwa-64x64.png`, `pwa-192x192.png`, `pwa-512x512.png`, `maskable-icon-512x512.png`, `apple-touch-icon-180x180.png`, and `favicon.ico`.

- [ ] **Step 7: Build and verify PWA output**

Run:
```bash
cd frontend && npm run build
```
Expected: exit 0. Then verify the artifacts exist:
```bash
ls frontend/dist/sw.js frontend/dist/manifest.webmanifest frontend/dist/pwa-192x192.png frontend/dist/pwa-512x512.png
```
Expected: all four paths listed (no "No such file"). Confirm `manifest.webmanifest` contains an `"icons"` array with the 192 and 512 entries:
```bash
grep -o '"icons":\[.*512x512[^]]*' frontend/dist/manifest.webmanifest | head -c 200
```
Expected: non-empty output showing icon entries.

- [ ] **Step 8: Commit**

```bash
git add frontend/package.json frontend/package-lock.json frontend/pwa-assets.config.ts frontend/vite.config.ts frontend/index.html frontend/public/
git commit -m "feat(pwa): installable manifest + service worker + icons"
```

---

### Task 2: Platform-detection module (`lib/pwa.ts`)

**Files:**
- Create: `frontend/src/lib/pwa.ts`
- Test: `frontend/src/lib/pwa.test.ts`

**Interfaces:**
- Produces:
  - `interface BeforeInstallPromptEvent extends Event { readonly platforms: string[]; prompt(): Promise<void>; readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }> }`
  - `isStandalone(win: { matchMedia?: (q: string) => { matches: boolean }; navigator?: { standalone?: boolean } }): boolean`
  - `isIOS(userAgent: string, maxTouchPoints?: number): boolean`
- Consumed by: Task 3 (`useInstallPrompt`).

- [ ] **Step 1: Write the failing tests**

Create `frontend/src/lib/pwa.test.ts`:
```ts
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd frontend && npx vitest run src/lib/pwa.test.ts`
Expected: FAIL — cannot find module `./pwa` (or `isStandalone`/`isIOS` not exported).

- [ ] **Step 3: Write the implementation**

Create `frontend/src/lib/pwa.ts`:
```ts
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd frontend && npx vitest run src/lib/pwa.test.ts`
Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/lib/pwa.ts frontend/src/lib/pwa.test.ts
git commit -m "feat(pwa): pure platform-detection helpers with tests"
```

---

### Task 3: Install affordance (hook + component, mounted in App + Profile)

**Files:**
- Create: `frontend/src/hooks/useInstallPrompt.ts`
- Create: `frontend/src/components/InstallPrompt.tsx`
- Modify: `frontend/src/App.tsx` (mount banner under `OutboxBar`)
- Modify: `frontend/src/pages/Profile.tsx` (mount row)

**Interfaces:**
- Consumes: `isStandalone`, `isIOS`, `BeforeInstallPromptEvent` from `../lib/pwa` (Task 2).
- Produces:
  - `useInstallPrompt(): { canPrompt: boolean; iosInstall: boolean; installed: boolean; dismissed: boolean; promptInstall: () => Promise<void>; dismiss: () => void }`
  - `<InstallPrompt variant="banner" | "row" />`

- [ ] **Step 1: Write the `useInstallPrompt` hook**

Create `frontend/src/hooks/useInstallPrompt.ts`:
```ts
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
  const [installed, setInstalled] = useState(() => isStandalone(window));
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
```

- [ ] **Step 2: Write the `InstallPrompt` component**

Create `frontend/src/components/InstallPrompt.tsx`:
```tsx
import { useState } from 'react';
import { Download, X, Share } from 'lucide-react';
import { useInstallPrompt } from '../hooks/useInstallPrompt';

// The "Download app" affordance. `banner` is a dismissible top strip (mounted in
// App near OutboxBar); `row` is a permanent button (mounted in Profile).
export function InstallPrompt({ variant }: { variant: 'banner' | 'row' }) {
  const { canPrompt, iosInstall, installed, dismissed, promptInstall, dismiss } =
    useInstallPrompt();
  const [showIosHelp, setShowIosHelp] = useState(false);

  if (installed) return null;
  const available = canPrompt || iosInstall;
  if (!available) return null;

  const onInstall = () => {
    if (canPrompt) void promptInstall();
    else setShowIosHelp(true);
  };

  if (variant === 'banner') {
    if (dismissed) return null;
    return (
      <>
        <div className="border-b border-accent/30 bg-accent-tint">
          <div className="mx-auto flex max-w-6xl items-center gap-2 px-5 py-2 text-[13px] text-accent-deep">
            <Download size={15} aria-hidden />
            <span className="flex-1">Install PACTA for one-tap access, even offline.</span>
            <button
              onClick={onInstall}
              className="rounded-pill bg-accent px-3 py-1 text-[12px] font-semibold text-white hover:bg-accent-deep focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
            >
              Download app
            </button>
            <button
              onClick={dismiss}
              aria-label="Dismiss"
              className="grid h-7 w-7 place-items-center rounded-pill hover:bg-white/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
            >
              <X size={14} aria-hidden />
            </button>
          </div>
        </div>
        {showIosHelp && <IosHelp onClose={() => setShowIosHelp(false)} />}
      </>
    );
  }

  return (
    <>
      <button
        onClick={onInstall}
        className="inline-flex items-center gap-1.5 rounded-control border border-hairline bg-paper px-3 py-2 text-[13px] text-accent-deep transition hover:border-accent/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
      >
        <Download size={15} aria-hidden /> Install app
      </button>
      {showIosHelp && <IosHelp onClose={() => setShowIosHelp(false)} />}
    </>
  );
}

// iOS Safari has no programmatic install; show the manual steps.
function IosHelp({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-ink/40 px-5"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-card border border-hairline bg-canvas p-5 text-[14px] text-ink"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-[16px] font-semibold">Add PACTA to your Home Screen</h2>
        <ol className="mt-3 space-y-2 text-slate">
          <li className="flex items-center gap-2">
            <Share size={16} aria-hidden /> Tap the Share button in Safari.
          </li>
          <li>Scroll down and tap "Add to Home Screen".</li>
          <li>Tap "Add". PACTA opens like an app.</li>
        </ol>
        <button
          onClick={onClose}
          className="mt-4 w-full rounded-control bg-accent px-4 py-2 text-[13px] font-medium text-white hover:bg-accent-deep focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
        >
          Got it
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Mount the banner in `frontend/src/App.tsx`**

Add the import near the other component imports (after the `OutboxBar` import line):
```tsx
import { InstallPrompt } from './components/InstallPrompt';
```
Then render it right after `<OutboxBar />`:
```tsx
      <NetworkGuard />
      <LockNotice />
      <OutboxBar />
      <InstallPrompt variant="banner" />
```

- [ ] **Step 4: Mount the row in `frontend/src/pages/Profile.tsx`**

Add the import after the existing component imports (e.g. after the `Button` import):
```tsx
import { InstallPrompt } from '../components/InstallPrompt';
```
Then, inside the returned JSX, add an "App" card immediately after the Identity card's closing `</div>` (the block that starts with `{/* Identity */}`) and before `{/* KYC */}`:
```tsx
      {/* App install */}
      <div className="flex items-center justify-between gap-3 rounded-card border border-hairline bg-paper p-4">
        <div className="min-w-0">
          <h2 className="text-[13px] font-semibold uppercase tracking-wider text-slate">App</h2>
          <p className="mt-1 text-[13px] text-slate">Install PACTA to your device for one-tap access, even offline.</p>
        </div>
        <InstallPrompt variant="row" />
      </div>
```
(When already installed or unavailable, `InstallPrompt` renders nothing, leaving just the description.)

- [ ] **Step 5: Typecheck and build**

Run:
```bash
cd frontend && npx tsc -b && npm run build
```
Expected: exit 0, no TypeScript errors.

- [ ] **Step 6: Manual verify in preview (Chromium)**

Run:
```bash
cd frontend && npm run preview
```
Open the printed URL in Chrome. Expected: the "Install PACTA" banner appears at the top (Chrome fires `beforeinstallprompt` on a served build). Clicking "Download app" opens Chrome's install dialog. Clicking the X hides the banner and it stays hidden on reload. In Profile, an "Install app" button is present. Stop the server (Ctrl-C) when done.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/hooks/useInstallPrompt.ts frontend/src/components/InstallPrompt.tsx frontend/src/App.tsx frontend/src/pages/Profile.tsx
git commit -m "feat(pwa): Download app install prompt (banner + Profile row)"
```

---

### Task 4: Friendly offline states on data pages

**Files:**
- Create: `frontend/src/components/OfflineNotice.tsx`
- Modify: `frontend/src/pages/Home.tsx`
- Modify: `frontend/src/pages/Activity.tsx`

**Interfaces:**
- Consumes: `useOffline` from `../lib/outbox` (existing).
- Produces: `<OfflineNotice />` (self-contained; no props).

- [ ] **Step 1: Write the `OfflineNotice` component**

Create `frontend/src/components/OfflineNotice.tsx`:
```tsx
import { CloudOff } from 'lucide-react';

// A calm "you're offline" panel shown on data pages instead of a scary error,
// so an app opened offline (via the service worker) reads as intentional.
export function OfflineNotice() {
  return (
    <div className="flex items-center gap-2.5 rounded-card border border-hairline bg-mist px-4 py-3 text-[13px] text-slate">
      <CloudOff size={15} aria-hidden />
      You are offline. Balances and history will refresh when you reconnect.
    </div>
  );
}
```

- [ ] **Step 2: Use it in `frontend/src/pages/Home.tsx`**

Add the imports after the existing imports:
```tsx
import { useOffline } from '../lib/outbox';
import { OfflineNotice } from '../components/OfflineNotice';
```
Add the hook call inside `Home`, right after the existing `useBalances` line:
```tsx
  const offline = useOffline();
```
Replace the existing error block:
```tsx
        {error && (
          <div className="rounded-card border border-refund/40 bg-refund-tint px-4 py-3 text-[13px] text-refund-deep">
            {error}
          </div>
        )}
```
with an offline-aware version (offline is the cause, so prefer the calm notice):
```tsx
        {offline ? (
          <OfflineNotice />
        ) : (
          error && (
            <div className="rounded-card border border-refund/40 bg-refund-tint px-4 py-3 text-[13px] text-refund-deep">
              {error}
            </div>
          )
        )}
```

- [ ] **Step 3: Use it in `frontend/src/pages/Activity.tsx`**

Add the imports after the existing imports:
```tsx
import { useOffline } from '../lib/outbox';
import { OfflineNotice } from '../components/OfflineNotice';
```
Add the hook call inside `Activity`, right after the existing `useActivity` line:
```tsx
  const offline = useOffline();
```
Replace the existing error block:
```tsx
      {error && (
        <p className="rounded-card border border-refund/40 bg-refund-tint p-3 text-[13px] text-refund-deep">{error}</p>
      )}
```
with:
```tsx
      {offline ? (
        <OfflineNotice />
      ) : (
        error && (
          <p className="rounded-card border border-refund/40 bg-refund-tint p-3 text-[13px] text-refund-deep">{error}</p>
        )
      )}
```

- [ ] **Step 4: Typecheck and build**

Run:
```bash
cd frontend && npx tsc -b && npm run build
```
Expected: exit 0.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/OfflineNotice.tsx frontend/src/pages/Home.tsx frontend/src/pages/Activity.tsx
git commit -m "feat(pwa): calm offline notice on Home and Activity"
```

---

### Task 5: Cache headers + full verification

**Files:**
- Modify: `vercel.json` (headers for service worker + manifest)

**Interfaces:**
- Consumes: the built PWA from Tasks 1-4. Produces no code symbols.

- [ ] **Step 1: Add cache-control headers in `vercel.json`**

Replace the file with (adds a `headers` array; the service worker and manifest must not be long-cached so updates propagate):
```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "framework": null,
  "installCommand": "npm install && npm --prefix packages/pacta install && npm --prefix frontend install",
  "buildCommand": "npm --prefix packages/pacta run build && npm --prefix frontend run build",
  "outputDirectory": "frontend/dist",
  "headers": [
    {
      "source": "/sw.js",
      "headers": [{ "key": "Cache-Control", "value": "public, max-age=0, must-revalidate" }]
    },
    {
      "source": "/manifest.webmanifest",
      "headers": [{ "key": "Cache-Control", "value": "public, max-age=0, must-revalidate" }]
    }
  ]
}
```

- [ ] **Step 2: Full build + Lighthouse PWA audit**

Run:
```bash
cd frontend && npm run build && npm run preview
```
Open the URL in Chrome → DevTools → Lighthouse → check only "Progressive Web App" → Analyze page load.
Expected: the "Installable" checks pass (manifest, service worker, icons, start_url). Note any failures and fix before proceeding.

- [ ] **Step 3: Desktop install test**

In the same Chrome preview session: the address bar shows an install icon. Click it → PACTA opens in its own window with the PACTA icon. Expected: standalone window, no browser tabs/URL bar, and the install banner no longer appears (standalone hides it).

- [ ] **Step 4: Offline drill (the core outcome)**

With the app installed (or open in preview): open DevTools → Network → set to "Offline". Reload the app.
Expected: the app still loads (service worker serves the shell) instead of a blank/error page, and the `OfflineNotice` shows on Home/Activity. Connect a wallet if not connected, go to Send, compose a payment, confirm — expected: it routes to the "Queued" screen. Set Network back to "Online". Expected: the `OutboxBar` shows "Delivering queued payments..." then "Delivered 1 queued payment" (the wallet prompts to sign as part of the flush).

- [ ] **Step 5: Mobile check (manual, best-effort)**

If a device or emulator is available: Android Chrome should show the "Download app" banner and install to the home screen; iOS Safari should show the "Add to Home Screen" instruction sheet from the banner/Profile button. Document the result. If no device is available, note this step as skipped.

- [ ] **Step 6: Commit**

```bash
git add vercel.json
git commit -m "chore(pwa): no-cache headers for service worker and manifest"
```

---

## Self-Review

**Spec coverage:**
- §4.1 plugin config → Task 1. §4.2 manifest → Task 1. §4.3 icons → Task 1 (assets generator). §4.4 index.html apple meta → Task 1 Step 5. §4.5 InstallPrompt (banner + Profile row, Android/iOS/installed, dismissal) → Tasks 2 + 3. §4.6 offline shell state → Task 4. §5 offline drill → Task 5 Step 4. §6 caveats (flush needs wallet, SW cache headers, StrictMode) → Task 5 Step 1 (cache), hook cleanup in Task 3 (StrictMode-safe add/removeEventListener), drill notes wallet signing. §8 verification → Task 5. §9 extension deferred → out of scope, no task (correct).
- Update flow (autoUpdate) → Task 1 Step 4 (`registerType: 'autoUpdate'`).

**Placeholder scan:** No TBD/TODO; every code step has full code; every command has an expected result. Task 5 Step 5 is explicitly "best-effort / may be skipped" rather than a vague placeholder.

**Type consistency:** `useInstallPrompt` returns `{ canPrompt, iosInstall, installed, dismissed, promptInstall, dismiss }` — consumed with those exact names in `InstallPrompt`. `isStandalone`/`isIOS`/`BeforeInstallPromptEvent` signatures in Task 2 match their use in Task 3. `<InstallPrompt variant="banner"|"row">` prop matches both mount sites. `OfflineNotice` is prop-less in both usages.
