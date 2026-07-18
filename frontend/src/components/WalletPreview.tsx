import { ArrowUpRight, ArrowDownLeft, Repeat, ShieldCheck } from 'lucide-react';

// A wallet-home mock for the landing hero phone: total balance, quick actions,
// and a couple of assets. Display-only, static numbers — it is a picture of the
// product, not live data.

function Action({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <span className="grid h-11 w-11 place-items-center rounded-control bg-accent-tint text-accent-deep">
        {icon}
      </span>
      <span className="text-[10px] font-medium text-slate">{label}</span>
    </div>
  );
}

function Asset({
  code,
  amount,
  php,
  tone,
}: {
  code: string;
  amount: string;
  php: string;
  tone: 'accent' | 'slate';
}) {
  return (
    <div className="flex items-center gap-2.5 rounded-control border border-hairline bg-paper px-3 py-2.5">
      <span
        className={`grid h-8 w-8 shrink-0 place-items-center rounded-pill text-[11px] font-semibold ${
          tone === 'accent' ? 'bg-accent text-white' : 'bg-mist text-slate'
        }`}
      >
        {code.slice(0, 2)}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[12px] font-medium text-ink">{code}</p>
        <p className="mono text-[10px] text-fog">{amount}</p>
      </div>
      <p className="mono text-[12px] font-medium text-ink">{php}</p>
    </div>
  );
}

export function WalletPreview() {
  return (
    <div className="space-y-3">
      {/* Balance */}
      <div className="rounded-card bg-gradient-to-br from-accent to-accent-deep p-4 text-white shadow-card">
        <p className="text-[10px] text-white/70">Total balance</p>
        <p className="mono mt-1 text-[26px] font-semibold leading-none">₱42,580</p>
        <p className="mt-1.5 text-[10px] text-white/70">≈ 1,935.20 XLM</p>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-3 gap-2 rounded-card border border-hairline bg-paper p-3 shadow-card">
        <Action icon={<ArrowUpRight size={18} aria-hidden />} label="Send" />
        <Action icon={<ArrowDownLeft size={18} aria-hidden />} label="Receive" />
        <Action icon={<Repeat size={18} aria-hidden />} label="Convert" />
      </div>

      {/* Assets */}
      <div className="space-y-2">
        <p className="text-[10px] font-medium uppercase tracking-wide text-fog">Assets</p>
        <Asset code="XLM" amount="1,935.20" php="₱42,580" tone="accent" />
        <Asset code="USDC" amount="120.00" php="₱6,720" tone="slate" />
      </div>

      {/* Protection hint */}
      <div className="flex items-center gap-2 rounded-control bg-accent-tint px-3 py-2">
        <ShieldCheck size={14} className="shrink-0 text-accent" aria-hidden />
        <p className="text-[10px] text-accent-deep">Send protected when a payment needs to be safe.</p>
      </div>
    </div>
  );
}
