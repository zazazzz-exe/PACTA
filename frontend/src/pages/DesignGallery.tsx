import { useState } from 'react';
import { ArrowDownLeft, ArrowUpRight, Bell, Repeat, ShieldCheck } from 'lucide-react';
import { Avatar, Button, Card, Chip, IconButton, ListRow, ThemeToggle } from '../components/ui';
import { FloatingNav } from '../components/ui/FloatingNav';

// Dev-only gallery of the "electric glow" components (open #/design on the Vite
// dev server). Never shipped: main.tsx only renders it when import.meta.env.DEV.
// Also the target of the automated contrast and tap-target audit.
const ADDR = 'GD4L6NWF7IHBX5J4IBWJQYT2G6YNM5W54SQLNHV6FZ7VBDCCTR7ODNFN';

export function DesignGallery() {
  const [filter, setFilter] = useState<'all' | 'sent' | 'received'>('all');
  return (
    <div className="mx-auto max-w-app space-y-8 px-4 pb-32 pt-8">
      <header className="flex items-center justify-between">
        <h1 className="text-[22px] font-bold tracking-tight">Design system</h1>
        <ThemeToggle />
      </header>

      <section aria-labelledby="g-hero" className="space-y-3">
        <h2 id="g-hero" className="text-[13px] font-semibold uppercase tracking-wider text-slate">Hero card</h2>
        <Card variant="hero" className="p-6">
          <div className="text-[12px] font-semibold uppercase tracking-wider text-on-accent/90">Balance</div>
          <div className="mono mt-1 text-[34px] font-semibold leading-tight">1,250.00 USDC</div>
          <div className="mono mt-1 text-[13px] text-on-accent/90">≈ ₱72,812.50 est.</div>
        </Card>
      </section>

      <section aria-labelledby="g-buttons" className="space-y-3">
        <h2 id="g-buttons" className="text-[13px] font-semibold uppercase tracking-wider text-slate">Buttons</h2>
        <div className="flex flex-wrap gap-3">
          <Button>Send protected</Button>
          <Button variant="secondary">Send now</Button>
          <Button variant="ghost">Cancel</Button>
          <Button variant="danger">Emergency refund</Button>
          <Button size="sm">Small</Button>
          <Button disabled>Disabled</Button>
        </div>
        <div className="flex gap-2">
          <IconButton label="Notifications"><Bell size={20} aria-hidden /></IconButton>
          <IconButton label="Convert" variant="glass"><Repeat size={20} aria-hidden /></IconButton>
          <IconButton label="Send" variant="primary"><ArrowUpRight size={20} aria-hidden /></IconButton>
        </div>
      </section>

      <section aria-labelledby="g-chips" className="space-y-3">
        <h2 id="g-chips" className="text-[13px] font-semibold uppercase tracking-wider text-slate">Chips</h2>
        <div className="flex flex-wrap gap-2">
          <Chip>Pending</Chip>
          <Chip tone="accent" icon={<ShieldCheck size={12} aria-hidden />}>Protected</Chip>
          <Chip tone="deadline">Deadline soon</Chip>
          <Chip tone="refund">Refunded</Chip>
        </div>
        <div className="flex flex-wrap gap-2">
          {(['all', 'sent', 'received'] as const).map((f) => (
            <Chip key={f} selected={filter === f} onClick={() => setFilter(f)}>
              {f[0].toUpperCase() + f.slice(1)}
            </Chip>
          ))}
        </div>
      </section>

      <section aria-labelledby="g-list" className="space-y-3">
        <h2 id="g-list" className="text-[13px] font-semibold uppercase tracking-wider text-slate">Glass card and list rows</h2>
        <Card padded={false} className="divide-y divide-[var(--hairline)] overflow-hidden">
          <ListRow
            leading={<Avatar addr={ADDR} />}
            title="Jay Santos"
            subtitle="+63 917 *** 4821"
            trailing="−25.00"
            trailingSub="Pact · milestone 1/4"
            onClick={() => {}}
          />
          <ListRow
            leading={
              <span className="grid h-10 w-10 place-items-center rounded-pill bg-accent-tint text-accent">
                <ArrowDownLeft size={18} aria-hidden />
              </span>
            }
            title="Received"
            subtitle="Today, 9:41"
            trailing="+100.00"
            trailingSub="USDC"
          />
        </Card>
        <Card>
          <p className="text-[15px] text-ink">Body text on a glass card.</p>
          <p className="mt-1 text-[13px] text-slate">Muted helper text.</p>
          <p className="mt-1 text-[12px] text-fog">Tertiary text.</p>
          <p className="mt-1 text-[13px] text-accent">Blue link text</p>
          <p className="mt-1 text-[13px] text-deadline">Deadline text</p>
          <p className="mt-1 text-[13px] text-refund">Refund text</p>
        </Card>
        <div className="flex items-center gap-3">
          <Avatar addr={ADDR} size="sm" />
          <Avatar addr={ADDR} />
          <Avatar addr={ADDR} size="lg" />
        </div>
      </section>

      <FloatingNav current="home" />
    </div>
  );
}
