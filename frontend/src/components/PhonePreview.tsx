import { Send, QrCode, Repeat, ShieldCheck, KeyRound, ChevronRight } from 'lucide-react';

// A polished, self-contained illustration of the wallet Home screen for the
// landing hero. It is decorative (aria-hidden) and clearly labelled a preview:
// the figures are illustrative, not live wallet data. Real balances only ever
// load from the user's own connected wallet, never from here.

function ActionButton({ icon: Icon, label }: { icon: typeof Send; label: string }) {
  return (
    <div className="flex flex-1 flex-col items-center gap-1.5">
      <span className="grid h-11 w-11 place-items-center rounded-control bg-accent-tint text-accent-deep">
        <Icon size={18} aria-hidden />
      </span>
      <span className="text-[10px] font-medium text-slate">{label}</span>
    </div>
  );
}

function AssetRow({
  code,
  network,
  amount,
  value,
  dot,
}: {
  code: string;
  network: string;
  amount: string;
  value: string;
  dot: string;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <span className={`h-8 w-8 shrink-0 rounded-full ${dot}`} aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="text-[12px] font-medium text-ink">{code}</p>
        <p className="text-[9px] text-fog">{network}</p>
      </div>
      <div className="text-right">
        <p className="mono text-[12px] font-medium text-ink">{amount}</p>
        <p className="text-[9px] text-fog">{value}</p>
      </div>
    </div>
  );
}

/** The wallet Home screen, rendered inside the phone shell. */
function HomeScreen() {
  return (
    <div className="space-y-3.5">
      {/* Portfolio balance card */}
      <div className="landing-hero-panel relative overflow-hidden rounded-card p-4 shadow-card">
        <div className="mesh-dots pointer-events-none absolute inset-0 opacity-20" aria-hidden />
        <div className="relative">
          <p className="text-[10px] font-medium uppercase tracking-wide text-signal">Total value</p>
          <p className="mono mt-1 text-[24px] font-semibold leading-none text-panel-ink">$1,204.50</p>
          <p className="mt-2 text-[10px] text-panel-muted">XLM · USDC · 2 assets</p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-stretch gap-1 rounded-card border border-hairline bg-paper p-2.5 shadow-card">
        <ActionButton icon={Send} label="Send" />
        <ActionButton icon={QrCode} label="Receive" />
        <ActionButton icon={Repeat} label="Convert" />
      </div>

      {/* Assets */}
      <div className="space-y-2.5 rounded-card border border-hairline bg-paper p-3.5 shadow-card">
        <p className="text-[11px] font-medium text-slate">Assets</p>
        <AssetRow
          code="XLM"
          network="Stellar"
          amount="1,240.00"
          value="$906.40"
          dot="bg-gradient-to-br from-accent to-accent-deep"
        />
        <AssetRow
          code="USDC"
          network="Stellar"
          amount="298.00"
          value="$298.10"
          dot="bg-signal"
        />
      </div>

      {/* Send-protected teaser */}
      <div className="flex items-center gap-2.5 rounded-card border border-accent/25 bg-accent-tint p-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-control bg-gradient-to-br from-accent to-accent-deep text-white">
          <ShieldCheck size={16} aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[12px] font-medium text-ink">Send protected</p>
          <p className="text-[9.5px] text-slate">Escrow a payment as a Pact</p>
        </div>
        <ChevronRight size={16} className="text-accent-deep" aria-hidden />
      </div>
    </div>
  );
}

/** Small floating claim chip (a statement about the product, not live data). */
function FloatChip({
  icon: Icon,
  label,
  className,
  anim,
}: {
  icon: typeof ShieldCheck;
  label: string;
  className: string;
  anim: string;
}) {
  return (
    <div className={`absolute z-30 hidden md:block ${className}`}>
      <div
        className={`${anim} flex items-center gap-1.5 rounded-pill border border-hairline bg-paper/95 px-3 py-1.5 shadow-pop backdrop-blur`}
      >
        <Icon size={13} className="text-accent" aria-hidden />
        <span className="text-[11px] font-medium text-ink">{label}</span>
      </div>
    </div>
  );
}

export function PhonePreview() {
  return (
    <div className="relative mx-auto w-full max-w-[360px] px-2" aria-hidden>
      {/* Emerald backdrop panel the phone rests on */}
      <div
        className="phone-backdrop pointer-events-none absolute -inset-x-8 -top-8 bottom-4 rounded-[3rem] shadow-pop sm:-inset-x-12 lg:-inset-x-16"
        aria-hidden
      >
        <div className="mesh-dots absolute inset-0 rounded-[3rem] opacity-30" aria-hidden />
      </div>

      {/* Soft glow behind the device */}
      <div className="phone-glow pointer-events-none absolute inset-0" aria-hidden />

      <FloatChip
        icon={KeyRound}
        label="Non-custodial"
        className="-left-4 top-14 lg:-left-8"
        anim="chip-float-a"
      />
      <FloatChip
        icon={ShieldCheck}
        label="Bond-backed"
        className="-right-3 bottom-24 lg:-right-6"
        anim="chip-float-b"
      />

      {/* Device */}
      <div className="phone-float relative mx-auto w-[268px]">
        <div className="rounded-[2.5rem] border-2 border-ink bg-paper p-2 shadow-pop">
          <div className="relative overflow-hidden rounded-[2rem] bg-canvas">
            {/* Status bar */}
            <div className="flex items-center justify-between px-4 pt-3 pb-1">
              <span className="mono text-[10px] text-fog">9:41</span>
              <div className="flex items-center gap-1">
                <span className="h-1 w-1 rounded-pill bg-fog" />
                <span className="h-1 w-1 rounded-pill bg-fog" />
                <span className="h-1.5 w-3 rounded-sm bg-fog/60" />
              </div>
            </div>
            {/* App header */}
            <div className="flex items-center justify-between px-4 pb-2">
              <span className="text-[13px] font-semibold text-ink">Home</span>
              <span className="rounded-pill bg-mist px-2 py-0.5 text-[9px] font-medium text-slate">
                Preview
              </span>
            </div>
            <div className="px-3 pb-4">
              <HomeScreen />
            </div>
          </div>
        </div>
      </div>

      <p className="mt-4 text-center text-[11px] text-fog">
        An interface preview. Your real balances load from your own wallet.
      </p>
    </div>
  );
}
