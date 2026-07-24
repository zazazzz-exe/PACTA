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
