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
