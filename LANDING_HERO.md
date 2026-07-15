# PACTA — Animated Landing Hero (LANDING_HERO.md)

> Drop-in animated hero for the landing page. Pure CSS animation (no new dependencies beyond `lucide-react`, which you already use), styled with the DESIGN.md tokens. It realizes the DESIGN.md §7.1 hero as a living escrow-flow loop: capital flows from the Client into the contract, it locks and counts up, then releases to the Provider in milestone tranches, with the Provider's security bond held underneath.

To use: create the two files below, then render `<HeroFlow onConnect={...} />` as the landing hero. Or hand this whole file to Claude Code with the prompt in §3.

---

## 1. `frontend/src/components/HeroFlow.tsx`

```tsx
import { useEffect, useState, type ReactNode } from 'react';
import { Wallet, LineChart, Lock, ShieldCheck } from 'lucide-react';
import './hero-flow.css';

const CYCLE = 7000;

export function HeroFlow({ onConnect }: { onConnect?: () => void }) {
  const [amount, setAmount] = useState(0);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mq.matches) {
      setAmount(100);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const tick = (t: number) => {
      const p = ((t - start) % CYCLE) / CYCLE;
      const v = p < 0.3 ? 0 : p < 0.45 ? Math.round(((p - 0.3) / 0.15) * 100) : 100;
      setAmount((prev) => (prev === v ? prev : v));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <section className="relative overflow-hidden bg-canvas">
      <div aria-hidden className="hf-drift1 pointer-events-none absolute -top-16 -right-12 h-64 w-64 rounded-full bg-accent-tint opacity-50" />
      <div aria-hidden className="hf-drift2 pointer-events-none absolute -bottom-14 -left-10 h-44 w-44 rounded-full bg-accent-tint opacity-40" />

      <div className="relative mx-auto max-w-app-wide px-5 py-12 text-center">
        <p className="mb-5 text-[13px] font-medium text-slate">PACTA</p>
        <h1 className="mb-2.5 text-[26px] font-semibold leading-tight text-ink sm:text-[34px]">
          Any handshake deal, written in code.
        </h1>
        <p className="mx-auto mb-8 max-w-[440px] text-[15px] leading-relaxed text-slate">
          Turn any informal money agreement between two people into a secure, staged,
          bond-protected on-chain contract. Funds release step by step, backed by the
          Provider's bond, and provable on-chain.
        </p>

        <div className="mb-9 flex justify-center">
          <div className="hf-band flex flex-shrink-0 items-center">
            <Node icon={<Wallet size={20} />} label="Client" />

            <Wire>
              <span className="hf-token hf-in-a" />
              <span className="hf-token hf-in-b" />
            </Wire>

            <div className="hf-vault w-[194px] flex-shrink-0 rounded-card border border-grid bg-carbon p-4 text-left">
              <div className="mb-2 flex items-center gap-1.5">
                <Lock size={14} className="text-signal" />
                <span className="font-mono text-[11px] text-signal">protected</span>
              </div>
              <div className="mb-3 flex items-baseline gap-1.5">
                <span className="font-mono text-[26px] font-medium text-signal">{amount}</span>
                <span className="font-mono text-xs text-panel-muted">XLM</span>
              </div>
              <div className="relative mb-2.5 h-1.5 overflow-hidden rounded-pill bg-grid">
                <div className="hf-release h-1.5 rounded-pill bg-signal" />
                <span className="absolute top-0 left-1/4 h-1.5 w-[1.5px] bg-carbon" />
                <span className="absolute top-0 left-1/2 h-1.5 w-[1.5px] bg-carbon" />
                <span className="absolute top-0 left-3/4 h-1.5 w-[1.5px] bg-carbon" />
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-pill bg-onyx px-2.5 py-1">
                <ShieldCheck size={13} className="text-panel-muted" />
                <span className="font-mono text-[11px] text-panel-muted">20 XLM bond</span>
              </span>
            </div>

            <Wire>
              <span className="hf-token hf-out-a" />
              <span className="hf-token hf-out-b" />
            </Wire>

            <Node icon={<LineChart size={20} />} label="Provider" />
          </div>
        </div>

        <button
          onClick={onConnect}
          className="h-12 rounded-control bg-accent px-7 text-[15px] font-medium text-white transition hover:bg-accent-deep active:scale-[0.98]"
        >
          Connect wallet
        </button>
      </div>
    </section>
  );
}

function Node({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <div className="w-[66px] flex-shrink-0 text-center">
      <div className="mx-auto flex h-[46px] w-[46px] items-center justify-center rounded-full border border-hairline-strong bg-paper text-slate">
        {icon}
      </div>
      <p className="mt-1.5 text-[11px] text-slate">{label}</p>
    </div>
  );
}

function Wire({ children }: { children: ReactNode }) {
  return (
    <div className="relative h-0.5 w-20 flex-shrink-0 border-t-[1.5px] border-dashed border-hairline-strong">
      {children}
    </div>
  );
}
```

---

## 2. `frontend/src/components/hero-flow.css`

```css
.hf-band { width: 480px; transform-origin: center; }

.hf-token {
  position: absolute;
  top: 50%;
  width: 11px;
  height: 11px;
  border-radius: 9999px;
  background: var(--color-signal);
  transform: translateY(-50%);
}
.hf-in-a   { animation: hf-in-a 7s linear infinite; }
.hf-in-b   { animation: hf-in-b 7s linear infinite; }
.hf-out-a  { animation: hf-out-a 7s linear infinite; }
.hf-out-b  { animation: hf-out-b 7s linear infinite; }
.hf-release{ width: 0; animation: hf-release 7s linear infinite; }
.hf-vault  { animation: hf-lock 7s ease-in-out infinite; }
.hf-drift1 { animation: hf-drift1 19s ease-in-out infinite; }
.hf-drift2 { animation: hf-drift2 24s ease-in-out infinite; }

@keyframes hf-in-a  { 0%{left:-9px;opacity:0} 6%{opacity:1} 26%{left:70px;opacity:1} 31%{left:70px;opacity:0} 100%{opacity:0} }
@keyframes hf-in-b  { 0%,11%{left:-9px;opacity:0} 17%{opacity:1} 37%{left:70px;opacity:1} 42%{opacity:0} 100%{opacity:0} }
@keyframes hf-out-a { 0%,46%{left:-9px;opacity:0} 52%{opacity:1} 68%{left:70px;opacity:1} 73%{opacity:0} 100%{opacity:0} }
@keyframes hf-out-b { 0%,60%{left:-9px;opacity:0} 66%{opacity:1} 82%{left:70px;opacity:1} 87%{opacity:0} 100%{opacity:0} }

@keyframes hf-lock {
  0%, 28%   { transform: scale(1);    box-shadow: 0 0 0 0 rgba(52, 227, 176, 0); }
  34%       { transform: scale(1.03); box-shadow: 0 0 30px 2px rgba(52, 227, 176, 0.35); }
  42%, 100% { transform: scale(1);    box-shadow: 0 0 0 0 rgba(52, 227, 176, 0); }
}

@keyframes hf-release { 0%,44%{width:0} 54%{width:25%} 64%{width:50%} 74%{width:75%} 84%,100%{width:100%} }
@keyframes hf-drift1  { 0%,100%{transform:translate(0,0)} 50%{transform:translate(28px,-20px)} }
@keyframes hf-drift2  { 0%,100%{transform:translate(0,0)} 50%{transform:translate(-24px,18px)} }

@media (max-width: 640px) {
  .hf-band { transform: scale(0.66); }
}

@media (prefers-reduced-motion: reduce) {
  .hf-token, .hf-release, .hf-vault, .hf-drift1, .hf-drift2 { animation: none !important; }
  .hf-release { width: 100%; }
  .hf-token { opacity: 0; }
  .hf-vault { transform: none; box-shadow: none; }
}
```

---

## 3. Claude Code prompt

```
Add the two files in this document — src/components/HeroFlow.tsx and
src/components/hero-flow.css — to the project exactly as written. Then make
<HeroFlow /> the hero of the landing page (src/pages/Landing.tsx), replacing the
current static hero, and pass the existing wallet-connect handler to its onConnect
prop so the Connect wallet button keeps working. It already uses the DESIGN.md
tokens and respects prefers-reduced-motion, so don't restyle it. Confirm lucide-react
is installed. Then run the app and show me the landing page.
```

---

## 4. Notes

- **Tokens:** the component relies on the DESIGN.md Tailwind tokens (`accent`, `carbon`, `grid`, `onyx`, `signal`, `panel-muted`, `ink`, `slate`, `canvas`, `accent-tint`, `hairline-strong`, `paper`, `rounded-card`, `rounded-control`, `rounded-pill`, `max-w-app-wide`, `font-mono`) and the CSS variable `--color-signal` from `index.css`. If those aren't in place yet, apply DESIGN.md §2 first.
- **The glow** on the vault (the `hf-lock` box-shadow) is the one enhancement the chat preview couldn't show. Keep it subtle; if you want it stronger for the demo, raise the `0.35` alpha or the `30px` blur, but don't let it tip into neon.
- **Reduced motion:** users with that OS setting see a calm, fully-resolved state (vault locked, 100 XLM, milestones filled, no movement). This is required by the DESIGN.md quality floor — keep it.
- **Mobile:** the flow scales to 0.66 under 640px so it fits a phone. If you'd rather it stack vertically on small screens (Client on top, vault, Provider below) for a cleaner phone layout, that's a straightforward variant — ask and I'll provide it.
- **Timing:** everything runs on one 7-second loop. To slow it down, change `CYCLE` in the component and the `7s` durations in the CSS to the same value.
```
