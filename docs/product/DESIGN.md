# PACTA — Design System (DESIGN.md)

> Visual + interaction spec for the PACTA frontend. **This supersedes PRD.md §12.** Use this file for all visual decisions; use PRD.md for everything functional (contract interface, flows, screens-as-behavior).

---

## 0. How Claude Code should use this file

- Apply this as the **visual layer** over the frontend specified in PRD.md §9. Do **not** change any functional behavior, contract calls, or screen logic from the PRD — only how it looks and feels.
- The tokens in §2 are the single source of truth. Put the CSS variables in `frontend/src/index.css` and the Tailwind mappings in `frontend/tailwind.config.js` exactly as given. Every color, radius, and shadow in components must reference a token, never a raw hex.
- Build **mobile-first** (your real users are on phones). The app content column is centered, max ~480px on phones scaling to ~560px on larger screens; list surfaces (Wallet Home assets, Pacts) may go wider.
- **The wallet is the front door.** After connect, the app opens on **Wallet Home** (§7.6): a calm portfolio total, three actions (Send, Receive, Convert), and a scannable asset list. The escrow is not the landing surface anymore; it is one feature reached through **Send** ("Send protected") and listed under the **Pacts** tab. Everything below still applies, gently reframed so the wallet leads and Pacts are one surface within it.
- Navigation is a **bottom tab shell** (§6.14): Home · Convert · Pacts · Activity · Profile, adapting to a side rail / top nav on desktop.
- The **proof panel** (§6.9) is the signature element. It is the only dark surface in the app. Treat it as a reusable component and use it wherever the app shows on-chain truth: the on-chain **receipt** for a completed send, swap, or Pact, and the live contract / tx hash / protected amount on a Pact.
- Hold the **quality floor** in §10 (responsive, keyboard focus, reduced motion) without exception.

Kickoff is in the chat message that accompanies this file.

---

## 1. Design thesis

**One sentence:** a warm, calm, human interface that any first-time user can trust, with a single dark "instrument" panel that proves everything is real on-chain.

**Wallet-first positioning (see PRD §1.4, §7, §9.4):** PACTA is a wallet-first money app. The app opens on **Wallet Home**: your balance, your assets, and three plain actions (Send, Receive, Convert). The wallet is the login, identity, reputation, and authority; the design must make that feel natural and empowering, not technical. A first-time user should feel "this is my money, and I can protect it when it matters" within seconds, not "I need to learn blockchain." Protection is a **Pact**: a staged, bond-backed payment offered as a choice inside the **Send** flow ("Send now" vs "Send protected"), never the front door. The proof panel makes the on-chain truth visible and confidence-building for every kind of movement (sends, swaps, and Pacts), bridging wallet-first architecture and human trust.

PACTA holds people's money. Most users are cautious, mobile-first, low on crypto literacy. So the core must feel like a premium consumer finance app (Wise / Mercury / Monzo register), not a crypto terminal. The personality does **not** come from a loud display face or decoration. It comes from four disciplined choices:

1. **Warm humanist neutrals** instead of cold gray. Warmth signals humanity and safety, the opposite of the cold, technical dashboards that make people wary. (This is a deliberate counter-move, not the default cream-background look. Spend no other boldness on the neutrals.)
2. **A single emerald accent.** Emerald is trust, growth, and "protected" all at once. It is *the* accent. Amber and clay are states, never decoration.
3. **Mono for everything verifiable.** Every amount, address, tx hash, ID, and countdown is monospace. Mono reads as "precise, on-chain, not marketing."
4. **The proof panel as signature.** One dark, mono, instrument-grade block that shows on-chain truth: the live contract and protected amount on a Pact, and the receipt (tx hash, confirmation) after any send or swap. It is the thing the product is remembered by, and the moment that lands with judges. Everything around it stays quiet so it carries weight.

**Anti-template guardrails:** no gradient hero with a big number and a small label; no acid-green-on-black everywhere (the dark/voltage look is rationed to the one proof panel); no decorative numbered markers unless the content is a real sequence (the milestone flow is, so numbering there is earned).

---

## 2. Design tokens (drop-in)

### 2.1 `frontend/src/index.css`

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  /* surfaces */
  --color-canvas: #F4F2EC;
  --color-paper: #FFFFFF;
  --color-mist: #F8F6F1;
  --color-hairline: #E6E2D8;
  --color-hairline-strong: #D8D3C6;

  /* ink + text */
  --color-ink: #1A201D;
  --color-slate: #586059;
  --color-fog: #8C918A;

  /* accent — emerald (primary + "protected") */
  --color-accent: #0B7A63;
  --color-accent-deep: #0A5A49;
  --color-accent-tint: #E2F2EC;

  /* state — deadline (amber) */
  --color-deadline: #C77D11;
  --color-deadline-deep: #8A560A;
  --color-deadline-tint: #FAEED6;

  /* state — refund / destructive (clay) */
  --color-refund: #B43A2C;
  --color-refund-deep: #8C2C21;
  --color-refund-tint: #F8E8E4;

  /* proof panel — the one dark surface */
  --color-carbon: #0B0F0E;
  --color-onyx: #121916;
  --color-grid: #233029;
  --color-panel-ink: #E7ECE9;
  --color-panel-muted: #7C8B85;
  --color-signal: #34E3B0;
  --color-signal-amber: #F2B442;
  --color-signal-red: #FB6A57;

  /* radius */
  --radius-card: 16px;
  --radius-control: 12px;
  --radius-pill: 999px;

  /* elevation (soft, warm-tinted) */
  --shadow-card: 0 1px 2px rgba(26,32,29,0.04), 0 6px 16px rgba(26,32,29,0.05);
  --shadow-pop: 0 8px 28px rgba(26,32,29,0.12);

  /* type */
  --font-sans: 'Plus Jakarta Sans', system-ui, -apple-system, Segoe UI, sans-serif;
  --font-mono: 'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace;
}

html, body { background: var(--color-canvas); color: var(--color-ink); }
body { font-family: var(--font-sans); -webkit-font-smoothing: antialiased; }

/* tabular, aligned numbers everywhere money/data appears */
.mono { font-family: var(--font-mono); font-variant-numeric: tabular-nums; }

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation-duration: 0.001ms !important; transition-duration: 0.001ms !important; }
}
```

### 2.2 `frontend/tailwind.config.js`

Tokens live in CSS so they can be re-themed at runtime (dark mode). Tailwind maps semantic names to them.

```js
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: ['selector', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        canvas: 'var(--color-canvas)',
        paper: 'var(--color-paper)',
        mist: 'var(--color-mist)',
        hairline: { DEFAULT: 'var(--color-hairline)', strong: 'var(--color-hairline-strong)' },
        ink: 'var(--color-ink)',
        slate: 'var(--color-slate)',
        fog: 'var(--color-fog)',
        accent: {
          DEFAULT: 'var(--color-accent)',
          deep: 'var(--color-accent-deep)',
          tint: 'var(--color-accent-tint)',
        },
        deadline: {
          DEFAULT: 'var(--color-deadline)',
          deep: 'var(--color-deadline-deep)',
          tint: 'var(--color-deadline-tint)',
        },
        refund: {
          DEFAULT: 'var(--color-refund)',
          deep: 'var(--color-refund-deep)',
          tint: 'var(--color-refund-tint)',
        },
        carbon: 'var(--color-carbon)',
        onyx: 'var(--color-onyx)',
        grid: 'var(--color-grid)',
        'panel-ink': 'var(--color-panel-ink)',
        'panel-muted': 'var(--color-panel-muted)',
        signal: {
          DEFAULT: 'var(--color-signal)',
          amber: 'var(--color-signal-amber)',
          red: 'var(--color-signal-red)',
        },
      },
      fontFamily: {
        sans: 'var(--font-sans)',
        mono: 'var(--font-mono)',
      },
      borderRadius: {
        card: 'var(--radius-card)',
        control: 'var(--radius-control)',
        pill: 'var(--radius-pill)',
      },
      boxShadow: {
        card: 'var(--shadow-card)',
        pop: 'var(--shadow-pop)',
      },
      maxWidth: { app: '480px', 'app-wide': '560px' },
    },
  },
  plugins: [],
};
```

### 2.3 Fonts

Install and import the two faces (no external network at runtime — bundled):

```bash
npm i @fontsource/plus-jakarta-sans @fontsource/jetbrains-mono
```

In `frontend/src/main.tsx`:

```ts
import '@fontsource/plus-jakarta-sans/400.css';
import '@fontsource/plus-jakarta-sans/500.css';
import '@fontsource/plus-jakarta-sans/600.css';
import '@fontsource/jetbrains-mono/400.css';
import '@fontsource/jetbrains-mono/500.css';
import './index.css';
```

> Type rationale: Plus Jakarta Sans is humanist and warm without being childish — it carries the "calm, human, trustworthy" register. JetBrains Mono is sharp and engineered — it carries the "verifiable, on-chain" register. The two faces *are* the two halves of the thesis. Don't swap in Inter + a generic mono; that's the default pairing this brief is trying to avoid. If you must substitute, keep the humanist-sans + engineered-mono contrast.

### 2.4 Dark mode (stretch — ship light first)

Only build this after the light app is done and the demo path works. Add to `index.css`:

```css
:root[data-theme="dark"] {
  --color-canvas: #0E1311;
  --color-paper: #161D1A;
  --color-mist: #121815;
  --color-hairline: #283029;
  --color-hairline-strong: #354039;
  --color-ink: #ECF1EE;
  --color-slate: #9BA39D;
  --color-fog: #6E766F;
  --color-accent: #2CC79E;       /* emerald lifts toward signal mint for contrast on dark */
  --color-accent-deep: #6FE9C6;
  --color-accent-tint: #143029;
}
```

The proof panel keeps its literal carbon/signal values in both modes — it is dark by design, not by theme.

---

## 3. Typography scale

Two weights do almost everything: 400 (regular) and 500 (medium). 600 is reserved for the single hero amount on a screen. Never 700.

| Role | Size / weight | Face | Used for |
|---|---|---|---|
| Hero amount | 30px / 600 | mono | the one big protected/capital figure per screen |
| H1 | 22px / 500 | sans | page titles |
| H2 | 18px / 500 | sans | section headers |
| H3 / card title | 16px / 500 | sans | card headers, names |
| Body | 15–16px / 400, line-height 1.6 | sans | descriptions, prose |
| Label / caption | 13px / 400–500 | sans | field labels, meta |
| Micro | 12px / 400 | sans or mono | hints, footnotes |
| Data | inherit / 400–500 | **mono, tabular-nums** | amounts, addresses, tx hashes, IDs, countdowns |

Rule: **anything a contract would care about is mono.** Anything spoken to a human is sans. Sentence case everywhere. Never below 12px.

---

## 4. Spacing, radius, elevation, borders

- **Spacing:** generous. Screen padding 18–20px on mobile. Vertical rhythm in rem (0.75 / 1 / 1.5 / 2). Component-internal gaps in px (8 / 12 / 16).
- **Radius:** cards `rounded-card` (16px); buttons, inputs, inset cards `rounded-control` (12px); pills/avatars `rounded-pill`. No rounding on single-sided borders.
- **Elevation:** raised cards use `shadow-card` (soft, barely-there) + a `hairline` border. Popovers/sheets use `shadow-pop`. The proof panel has **no** shadow — flat dark with a `grid` border. At most one floating layer at a time.
- **Borders:** default `border-hairline`; on hover/emphasis `border-hairline-strong`. 1px, not heavier.
- **Touch targets:** minimum 44px height for anything tappable.

---

## 5. Iconography

Use `lucide-react` (already in the PRD stack). Outline, 18–20px inline, 24px max. Decorative icons get `aria-hidden`; icon-only buttons get `aria-label`.

Core set: `Lock` (protected), `Clock` (deadline), `ShieldCheck` (bond/safety), `ShieldX` / `RotateCcw` (refund), `CheckCircle2` (completed / reputation good), `AlertTriangle` (reputation refunded / warning), `ChevronLeft`, `ExternalLink`, `Copy`, `Wallet`, `ArrowRight`, `Plus`, `Loader2` (spinner).

Wallet set: `ArrowUpRight` (send), `ArrowDownLeft` (receive), `Repeat` / `ArrowLeftRight` (convert), `Home`, `Layers` (Pacts), `Activity`, `User` (profile) for the tab bar, and `ShieldCheck` reused as the "Send protected" cue. Keep the tab icons on outline at 20px; the active tab tints to `accent` (see §6.14).

---

## 6. Components

Patterns below are Tailwind + React. Build them as real components in `frontend/src/components`. Keep variants minimal.

### 6.1 Button

```tsx
// variant: 'primary' | 'secondary' | 'danger'
const base = 'inline-flex items-center justify-center gap-2 h-12 px-5 rounded-control text-[15px] font-medium transition active:scale-[0.98] disabled:opacity-50';
const styles = {
  primary:   'bg-accent text-white hover:bg-accent-deep',
  secondary: 'bg-paper text-ink border border-hairline-strong hover:bg-mist',
  danger:    'bg-transparent text-refund border border-refund/40 hover:bg-refund-tint',
};
```

One primary (emerald) action per screen. Secondary and danger never compete with it for color.

### 6.2 Card

```tsx
<div className="bg-paper border border-hairline rounded-card shadow-card p-5">…</div>
```

Inset/quiet card (inside another card): `bg-mist rounded-control p-4`, no shadow.

### 6.3 Status pill

```tsx
const map = {
  Active:    'bg-accent-tint text-accent-deep',
  Completed: 'bg-accent-tint text-accent-deep',
  Pending:   'bg-mist text-slate',
  Refunded:  'bg-refund-tint text-refund-deep',
  Cancelled: 'bg-mist text-fog',
};
<span className={`text-xs font-medium px-2.5 py-1 rounded-pill ${map[status]}`}>{label}</span>
```

### 6.4 Amount display

```tsx
<div>
  <p className="text-[13px] text-slate mb-1.5">Protected in escrow</p>
  <div className="flex items-baseline gap-2">
    <span className="mono text-[30px] font-semibold text-ink">75 XLM</span>
    <span className="text-sm text-fog">≈ ₱4,200</span>
  </div>
  <p className="flex items-center gap-1.5 mt-2 text-[13px] text-accent">
    <Lock size={16} aria-hidden /> 20 XLM bond held as protection
  </p>
</div>
```

Always show the local-currency estimate (`≈ ₱…`) next to XLM. It anchors the value for a non-crypto user.

### 6.5 Milestone bar

Numbering is earned here (real sequence). Flat segments; filled = accent, empty = hairline-strong.

```tsx
<div>
  <div className="flex justify-between text-[13px] mb-2">
    <span className="text-slate">Milestones released</span>
    <span className="font-medium text-ink">{released} of {total}</span>
  </div>
  <div className="flex gap-1.5">
    {Array.from({ length: total }).map((_, i) => (
      <div key={i} className={`flex-1 h-2 rounded-pill transition-colors ${i < released ? 'bg-accent' : 'bg-hairline-strong'}`} />
    ))}
  </div>
  <p className="mono text-xs text-fog mt-2">{releasedAmount} XLM released to provider so far</p>
</div>
```

### 6.6 Reputation chip

```tsx
<span className="mono inline-flex items-center gap-2.5 text-xs">
  <span className="inline-flex items-center gap-1 text-accent"><CheckCircle2 size={14} aria-hidden />{completed}</span>
  <span className="inline-flex items-center gap-1 text-refund"><AlertTriangle size={14} aria-hidden />{refunded}</span>
</span>
```

### 6.7 Avatar (initials)

```tsx
<div className="w-10 h-10 rounded-pill bg-accent-tint text-accent-deep flex items-center justify-center text-sm font-medium">{initials}</div>
```

### 6.8 Input

```tsx
<label className="block text-[13px] text-slate mb-1.5">{label}</label>
<input className="w-full h-12 px-3.5 rounded-control bg-paper border border-hairline text-ink placeholder:text-fog
  focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/15" />
```

Amount/address inputs add `className="mono"`. Show contract error text below in `text-refund text-[13px]`.

### 6.9 Proof panel — the signature component

The one dark surface. Mono throughout, `signal` mint accent. Use on the landing hero and the agreement detail. Keep it literal (not themed).

```tsx
function ProofPanel({ id, protectedAmount, txHash, contractShort, explorerUrl }: ProofPanelProps) {
  return (
    <div className="bg-carbon border border-grid rounded-card p-4 sm:p-5">
      <p className="mono text-[11px] text-signal mb-2.5">proof · {id}</p>
      <div className="flex items-baseline gap-2 mb-2.5">
        <span className="mono text-xl font-medium text-signal">{protectedAmount}</span>
        <span className="mono text-xs text-panel-muted">XLM protected</span>
      </div>
      <p className="mono text-xs text-panel-ink mb-1">tx {txHash} <span className="text-panel-muted">confirmed</span></p>
      <a href={explorerUrl} className="mono text-xs text-panel-muted inline-flex items-center gap-1.5 hover:text-signal">
        {contractShort} <ExternalLink size={13} aria-hidden />
      </a>
    </div>
  );
}
```

Rules for the proof panel: never add a shadow, never tint it with brand neutrals, never put sans-serif body copy inside it. It earns its impact by being the only place the app goes dark and technical.

### 6.10 Balance header (Wallet Home)

The calm portfolio total is the first thing on Wallet Home. It is large but quiet: mono, tabular, weight 600 (the one hero amount per screen), with the display currency and a truncated address + `testnet` badge beneath. No card, no shadow, no gradient. It sits directly on `canvas` so it reads as "yours," not as a marketing figure.

```tsx
<header className="pt-2 pb-1">
  <p className="text-[13px] text-slate mb-1.5">Total balance</p>
  <div className="flex items-baseline gap-2">
    <span className="mono text-[30px] font-semibold text-ink">₱24,180.50</span>
    <span className="text-sm text-fog">≈ 431.79 XLM</span>
  </div>
  <div className="flex items-center gap-2 mt-2.5 text-[13px]">
    <span className="mono text-slate">GДJ7…K2QP</span>
    <button aria-label="Copy address" className="text-fog hover:text-slate"><Copy size={14} aria-hidden /></button>
    <span className="inline-flex items-center gap-1.5 text-fog">
      <span className="w-1.5 h-1.5 rounded-pill bg-accent" aria-hidden /> testnet
    </span>
  </div>
</header>
```

The three primary actions sit directly under the header as an equal-width row (`Send · Receive · Convert`), each a `secondary` button with an outline icon above a 13px label. **Send** is the one that carries the accent (it is where protection lives); Receive and Convert stay neutral so Send leads without shouting.

### 6.11 Asset row

Quiet and scannable. One tap target per holding: asset icon + name/code on the left, mono balance + display value right-aligned. No shadows, hairline dividers between rows (or thin-bordered cards at the wide breakpoint). Tabular mono keeps the numbers on a clean right edge.

```tsx
<button className="w-full flex items-center gap-3 py-3.5 text-left hover:bg-mist rounded-control px-2 -mx-2">
  <div className="w-9 h-9 rounded-pill bg-accent-tint text-accent-deep flex items-center justify-center text-xs font-medium shrink-0">XLM</div>
  <div className="min-w-0 flex-1">
    <p className="text-[15px] text-ink truncate">Stellar Lumens</p>
    <p className="text-[13px] text-fog">XLM</p>
  </div>
  <div className="text-right shrink-0">
    <p className="mono text-[15px] text-ink">431.7900000</p>
    <p className="mono text-[13px] text-fog">≈ ₱24,180.50</p>
  </div>
</button>
```

Full precision (7 decimals) is fine in the balance column since it is mono and right-aligned; the display value beneath is the human anchor. Never color an asset row for its own sake; color is reserved for state, not decoration.

### 6.12 Send fork — two choices, never a hidden toggle

At the send step the user picks **Send now** (a plain payment) or **Send protected** (a Pact). Present them as two full-width, clearly labelled option cards stacked vertically, each with a one-line plain explanation. This is a visible choice, not a switch buried in a settings row. **Send protected** is the elevated one: accent border, `accent-tint` wash, and a small `ShieldCheck` cue. Selecting a card marks it (accent ring); a single primary button below continues with the chosen path.

```tsx
// Send now — neutral option card
<button className="w-full text-left p-4 rounded-card border border-hairline hover:border-hairline-strong bg-paper
  aria-[pressed=true]:border-accent aria-[pressed=true]:ring-2 aria-[pressed=true]:ring-accent/15">
  <div className="flex items-center gap-2">
    <ArrowUpRight size={18} className="text-slate" aria-hidden />
    <span className="text-[15px] font-medium text-ink">Send now</span>
  </div>
  <p className="text-[13px] text-slate mt-1.5">Pay the recipient directly. Fast and final.</p>
</button>

// Send protected — elevated option card (the Pact)
<button className="w-full text-left p-4 rounded-card border border-accent bg-accent-tint
  aria-[pressed=true]:ring-2 aria-[pressed=true]:ring-accent/25">
  <div className="flex items-center gap-2">
    <ShieldCheck size={18} className="text-accent-deep" aria-hidden />
    <span className="text-[15px] font-medium text-accent-deep">Send protected</span>
    <span className="mono text-[11px] text-accent-deep bg-paper/70 px-2 py-0.5 rounded-pill ml-auto">Pact</span>
  </div>
  <p className="text-[13px] text-accent-deep/90 mt-1.5">Hold the money in a contract and release it step by step. Refundable if the deadline passes.</p>
</button>
```

Never render the fork as a single toggle, checkbox, or "advanced" disclosure. Both options are always visible with their explanation. Once "Send protected" is chosen, the flow continues into the Risk Lens read, terms (bond, milestones, duration), and the KYC gate before the Pact is created; visually those steps reuse the existing form, card, milestone-bar, and proof-panel components.

### 6.13 Convert card

One focused card: from-asset selector, a swap-direction control, to-asset selector, amount, then a quiet quote block. The live quote is mono and reads as data, not a promise: rate, minimum received (after slippage), and route. Refresh the quote silently as inputs change; show `Loader2` only while a fresh quote is in flight.

```tsx
<div className="bg-paper border border-hairline rounded-card shadow-card p-5">
  {/* From */}
  <label className="block text-[13px] text-slate mb-1.5">From</label>
  <div className="flex gap-2">
    <AssetSelect value="XLM" />
    <input className="mono flex-1 h-12 px-3.5 rounded-control bg-mist border border-hairline text-right text-ink" placeholder="0.00" />
  </div>

  <div className="flex justify-center my-2">
    <button aria-label="Swap direction" className="w-9 h-9 rounded-pill border border-hairline bg-paper text-slate hover:border-hairline-strong">
      <Repeat size={16} aria-hidden />
    </button>
  </div>

  {/* To */}
  <label className="block text-[13px] text-slate mb-1.5">To</label>
  <div className="flex gap-2">
    <AssetSelect value="USDC" />
    <input readOnly className="mono flex-1 h-12 px-3.5 rounded-control bg-mist border border-hairline text-right text-fog" placeholder="0.00" />
  </div>

  {/* Quote — quiet data block */}
  <dl className="mt-4 pt-4 border-t border-hairline space-y-1.5 text-[13px]">
    <div className="flex justify-between"><dt className="text-slate">Rate</dt><dd className="mono text-ink">1 XLM ≈ 0.1123 USDC</dd></div>
    <div className="flex justify-between"><dt className="text-slate">Minimum received</dt><dd className="mono text-ink">55.84 USDC</dd></div>
    <div className="flex justify-between"><dt className="text-slate">Route</dt><dd className="mono text-fog">XLM → USDC</dd></div>
  </dl>

  <button className="mt-4 w-full h-12 rounded-control bg-accent text-white font-medium">Review conversion</button>
</div>
```

"No route" and slippage states use the same quote block: replace the values with one calm line (`text-slate`), e.g. "No route for this pair right now. Try a different amount or asset." The convert receipt (after signing) is a proof panel, same as sends.

### 6.14 Bottom tab shell

The app frame. Mobile-first fixed bottom bar with five equal tabs (`Home · Convert · Pacts · Activity · Profile`); the active tab tints its icon + label to `accent`, the rest stay `fog`. `paper` background, top `hairline`, safe-area padding at the bottom. Content scrolls above it; the bar never scrolls.

```tsx
<nav className="fixed inset-x-0 bottom-0 bg-paper border-t border-hairline
  pb-[max(0.5rem,env(safe-area-inset-bottom))] md:hidden">
  <ul className="max-w-app-wide mx-auto flex">
    {tabs.map(t => (
      <li key={t.id} className="flex-1">
        <a href={t.href} aria-current={t.active ? 'page' : undefined}
           className={`flex flex-col items-center gap-1 py-2 min-h-[44px] text-[11px]
             ${t.active ? 'text-accent' : 'text-fog'}`}>
          <t.icon size={20} aria-hidden />
          {t.label}
        </a>
      </li>
    ))}
  </ul>
</nav>
```

**Desktop adaptation:** at `md` and up the bottom bar is replaced by a **left side rail** (or a slim top nav): the same five destinations as a vertical list of icon + label, active item marked with an `accent` left indicator and `accent-tint` wash. The content column stays centered next to it. One nav pattern, driven by breakpoint, so tab identity and order never change between mobile and desktop.

### 6.15 Receipt (proof panel, reused)

The on-chain receipt after any write is the **proof panel** (§6.9), unchanged in look. It confirms a send, a swap, or a Pact action with the same dark, mono, signal-mint surface, so "it's real on-chain" feels identical everywhere. Adapt only the label line and the figure to the action:

- **Send now:** `sent · <short-id>` · `50.0000000 XLM` · `tx 9f3a…b1c4 confirmed` · recipient short address linked to Stellar Expert.
- **Convert:** `swapped · <short-id>` · `55.84 USDC received` · `tx … confirmed` · route line.
- **Pact:** `proof · agr-001` · protected amount · contract short + tx (the original §6.9 usage).

Keep the component API and rules identical (no shadow, no brand tint, no sans body). Only the top label and headline figure change; everything else is the same signature surface.

---

## 7. Screen layouts (mobile-first)

Content is a centered column (`max-w-app` on phones, `max-w-app-wide` on larger) that sits above the bottom tab shell (§6.14) on every signed-in screen. ASCII wireframes show structure, not pixels.

**Signed-in surfaces map to the five tabs:** Wallet Home (§7.6, the default) · Convert (§7.8) · Pacts (§7.2, the old "dashboard," now one tab) · Activity · Profile. Send (§7.7), Receive, and the create/detail Pact screens are pushed on top of a tab, not tabs themselves.

### 7.1 Landing / Connect — the hero is the thesis

Before connect there is nothing to show but the promise, so the landing hero *is* the proof panel, not a marketing illustration. It communicates the wallet-first model immediately: "Connect wallet" is the only action, and the proof panel shows that protection is real, on-chain, and owned by you. After connect, the app opens on **Wallet Home** (§7.6), not this screen.

```
┌──────────────────────────┐
│  PACTA           ● test  │   wordmark + network badge
│                           │
│  Trust, written in code.  │   H1, ink
│  Lock money in a contract │   body, slate
│  no one can run off with. │
│                           │
│  ┌──────────────────────┐ │
│  │  proof · agr-001     │ │   ← ProofPanel as hero artifact (carbon)
│  │  75.0000000 protected│ │
│  │  tx 9f3a…b1c4  ✓     │ │
│  └──────────────────────┘ │
│                           │
│  [ Connect wallet ]       │   primary button, full width
│                           │
│  How it works (3 steps)   │   quiet, optional, below the fold
└──────────────────────────┘
```

After connect: replace the connect button with a truncated mono address + the network badge, and route to **Wallet Home** (§7.6).

### 7.2 Pacts (the old dashboard, now one tab)

This is the **Pacts** tab: the connected wallet's protected payments. It is no longer the app's front door (that is Wallet Home, §7.6); it is where Pacts already created live and are tracked. Cards are unchanged; the filter now reads in wallet roles (**sender** / **recipient**).

```
┌──────────────────────────┐
│  Your Pacts               │   H1 (no [+] here — Pacts start in Send)
│  [ As sender | recipient ]│   segmented filter
│                           │
│  ┌──────────────────────┐ │   PactCard (paper, shadow-card)
│  │ JM Jay Mercado  ●Active│ │   avatar · counterparty · status pill
│  │ 75 XLM protected      │ │   mono amount
│  │ ▰▱▱▱  1 of 4          │ │   milestone bar
│  └──────────────────────┘ │
│  ┌──────────────────────┐ │
│  │ …                    │ │
│  └──────────────────────┘ │
└──────────────────────────┘
```

A Pact is started from the **Send** flow ("Send protected", §7.7), not from a "+" on this tab, so the front door for protection stays the wallet. Empty state (an invitation, not an apology): heading "No Pacts yet", one line "Protect a payment from Send, and it will show up here.", secondary button "Go to Send".

### 7.3 Create agreement

Single scrollable form, fields in this order: provider address, capital, security bond, milestones (stepper), profit share %, duration. A live summary card at the bottom restates terms in plain language before the primary "Create agreement" button. Validate inline (capital > 0, milestones ≥ 1, share ≤ 100%) with `text-refund` messages.

```
┌──────────────────────────┐
│  ← New agreement          │
│  Provider address[______] │  mono input
│  Capital (XLM)   [______] │  mono
│  Security bond   [______] │  mono
│  Milestones      [- 4 +]  │
│  Profit share    [__ %]   │
│  Duration        [__ days]│
│  ┌──────────────────────┐ │
│  │ You lock 100 XLM.     │ │  plain-language summary
│  │ Jay posts a 20 XLM    │ │
│  │ bond. Release in 4    │ │
│  │ steps. Refund if the  │ │
│  │ deadline passes.      │ │
│  └──────────────────────┘ │
│  [ Create agreement ]     │
└──────────────────────────┘
```

### 7.4 Agreement detail

Already designed (the mock you approved). Order: header (back · `AGR-id` · status pill) → amount display (protected + bond line) → provider card with reputation chip → milestone bar → deadline banner (amber, with live countdown) → action buttons (primary "Release next milestone"; "Emergency refund" shown but disabled until `now ≥ deadline`, with helper text "Refund unlocks when the deadline passes.") → **ProofPanel** → contract link footer.

The provider's view of the same screen swaps the primary action to "Post bond" (when pending) and shows received tranches instead of release controls.

### 7.5 Provider / reputation profile

A focused card: avatar + name + truncated address, a large reputation summary (completed / refunded / total volume in mono), then a short list of that recipient's past Pacts with status pills. This is what a sender checks before protecting a payment; it is surfaced by the Risk Lens inside "Send protected." Make the completed-vs-refunded contrast (accent vs refund) immediately legible.

> **Note on §7.3–7.5 (Pact create / detail / reputation).** These are the escrow surfaces, unchanged in layout. They are no longer reached from a dashboard "+"; they open **inside the "Send protected" branch** of the Send flow (§7.7) and are tracked afterward under the Pacts tab (§7.2). In wallet copy the two parties are **sender** (on-chain `investor`) and **recipient** (on-chain `trader`); the frozen contract fields are unchanged.

### 7.6 Wallet Home (default tab) — the front door

The first screen after connect. Calm and personal: the balance header, three actions, then the asset list. No proof panel here (nothing has happened yet); the proof panel appears as a receipt after an action and on Pact detail.

```
┌──────────────────────────┐
│  Total balance            │   label, slate
│  ₱24,180.50   ≈431.79 XLM │   HERO amount (mono 600) + display
│  GДJ7…K2QP ⧉  ● testnet   │   truncated address + copy + badge
│                           │
│  [ ↗ Send ][ ↙ Recv ][ ⇄ ]│   3 actions; Send carries the accent
│                           │
│  Assets                   │   H2
│  ┌──────────────────────┐ │
│  │ XLM  Stellar Lumens   │ │   asset row (§6.11)
│  │           431.7900000 │ │   mono balance, right-aligned
│  │           ≈ ₱24,180.50│ │   display value
│  ├──────────────────────┤ │
│  │ USDC USD Coin         │ │
│  │              0.000000 │ │
│  └──────────────────────┘ │
│  Recent activity      →   │   compact strip → Activity tab
├──────────────────────────┤
│ ⌂ Home ⇄ Convert ◫ Pacts …│   bottom tab shell (§6.14)
└──────────────────────────┘
```

At the wide breakpoint the asset list can go two columns and the recent-activity strip can sit beside it. The balance header stays left-aligned and calm, never a centered gradient hero.

### 7.7 Send (the fork) — plain payment or Pact

Two steps. Step 1 collects recipient, asset, and amount (validate `> 0` and `≤ balance`). Step 2 is the **fork** (§6.12): "Send now" vs "Send protected," each a labelled option card with its one-line explanation. The choice is always visible; it is never a toggle.

```
┌──────────────────────────┐
│  ← Send                   │
│  To     [ G… address ___ ]│   mono input
│  Asset  [ XLM ▾ ]         │
│  Amount [ 50.00 ______ ]  │   mono; "≤ balance" inline check
│                           │
│  How do you want to send? │   label
│  ┌──────────────────────┐ │
│  │ ↗ Send now            │ │   neutral option card
│  │ Pay directly. Final.  │ │
│  ├──────────────────────┤ │
│  │ 🛡 Send protected  Pact│ │   ELEVATED: accent border + tint
│  │ Hold in a contract,   │ │
│  │ release step by step. │ │
│  └──────────────────────┘ │
│  [ Continue ]             │   primary; label reflects choice
└──────────────────────────┘
```

- **Send now** → confirmation dialog (amount, recipient, "this is final") → sign → **receipt** proof panel (`sent · …`).
- **Send protected** → Risk Lens read of the recipient (§7.5 reputation, powered by Google Gemini `gemini-2.5-flash`) → set terms (bond, milestones via the stepper, duration; "Apply suggested protection" presets milestones) → **KYC gate** if the wallet is not verified → the Pact is created and appears under Pacts, its own proof panel showing on-chain truth. These sub-steps reuse the Create-Pact form (§7.3), the milestone bar (§6.5), and the proof panel (§6.9); no new visual language.

Confirm-before-signing (PRD §9.6) applies to both paths: the plain-language dialog names the amount, the counterparty, and the effect before any signature.

### 7.8 Convert (tab)

The Convert card (§6.13) centered in a comfortably narrow column, with a short "Rates update as you type" note beneath. Confirming opens a confirmation dialog (from, to, minimum received) → sign → a **receipt** proof panel (`swapped · …`), then balances refetch.

```
┌──────────────────────────┐
│  Convert                  │   H1
│  ┌──────────────────────┐ │
│  │ From [XLM ▾]   500.00 │ │   convert card (§6.13)
│  │        ⇄              │ │
│  │ To   [USDC ▾]   55.84 │ │
│  │ ─────────────────────  │ │
│  │ Rate    1 XLM≈0.1123  │ │   quiet mono quote block
│  │ Min recv    55.84 USDC│ │
│  │ Route      XLM → USDC │ │
│  │ [ Review conversion ] │ │
│  └──────────────────────┘ │
├──────────────────────────┤
│ ⌂ ⇄ Convert ◫ Pacts …     │   bottom tab shell (active: Convert)
└──────────────────────────┘
```

---

## 8. Motion

Subtle and purposeful only. Over-animation reads as AI-generated; restraint reads as premium.

- Button press: `active:scale-[0.98]`.
- Milestone segment fill and status changes: `transition-colors` ~200ms.
- Hero/protected number: a single count-up on first load is allowed (≤500ms); nothing recurring.
- Deadline countdown ticks once per second (the only persistent motion).
- Tx pending: a single `Loader2` spinner, no skeleton theatrics.
- All of the above must collapse under `prefers-reduced-motion` (handled globally in §2.1).

---

## 9. Voice and microcopy

Plain, warm, and specific. Copy is design material; each line helps the user act. Sentence case. No em-dashes. No "successfully", no "please", no exclamation marks on system text. Name things by what the user controls, not how the chain works.

| Moment | Say |
|---|---|
| Connect | "Connect wallet" |
| Balance header | "Total balance" |
| Send action | "Send" |
| Receive action | "Receive" |
| Convert action | "Convert" |
| The send fork | "How do you want to send?" |
| Send now option | "Send now. Pay the recipient directly, fast and final." |
| Send protected option | "Send protected. Hold the money in a contract and release it step by step." |
| Send-now sent | "Sent. 50 XLM is on its way to the recipient." |
| Convert quote note | "Rates update as you type." |
| No swap route | "No route for this pair right now. Try a different amount or asset." |
| Convert done | "Converted. 55.84 USDC is in your wallet." |
| Protected amount | "75 XLM protected · 20 XLM bond held" |
| Release action | "Release next milestone" |
| Refund available | "Refund available. The deadline has passed." |
| Refund locked | "Refund unlocks when the deadline passes." |
| Completed | "Pact complete. The bond was returned to the recipient." |
| Pending confirmation | "Waiting for the network to confirm…" |
| Bad address error | "That address isn't valid. Check it and try again." |
| Insufficient balance | "Your balance is too low to cover this. Top up and try again." |
| Empty Pacts tab | "No Pacts yet. Protect a payment from Send, and it will show up here." |

Action names stay consistent end to end: a button that says "Release next milestone" produces a confirmation that says "Milestone released."

---

## 10. Quality floor (non-negotiable)

- **Responsive** from 360px up; the column stays comfortable, nothing clips, tap targets ≥44px.
- **Keyboard:** visible focus on every interactive element (the `focus:ring` on inputs; ensure buttons/links show focus too).
- **Reduced motion** respected (global rule in §2.1).
- **Contrast:** the palette is built to pass; keep small text on the `-deep` text tokens, never on solid accent/state fills.
- **Icon-only controls** have `aria-label`; decorative icons have `aria-hidden`.
- **Numbers** are always rounded for display and formatted with thousands separators where appropriate (`toLocaleString`), shown in tabular mono.
- **No browser storage of secrets;** the wallet holds keys. (Per PRD.)

---

## 11. Implementation notes

- Stack is unchanged from PRD.md §9 (Vite + React + TS + Tailwind). This file only defines tokens, components, and layout.
- Source of truth for tokens is CSS variables (§2.1); Tailwind references them (§2.2) so dark mode is a variable swap, not a refactor.
- Fonts are bundled via `@fontsource` (§2.3) so there is no runtime font fetch.
- Keep components small and in `frontend/src/components`; the `ProofPanel`, `BalanceHeader`, `SendFork`, and `MilestoneBar` are the ones worth getting pixel-right first since they carry the identity (the wallet front door plus the protection moment).
- The bottom tab shell (§6.14) is the app frame that hosts every signed-in screen; build it once and drive the desktop side-rail from the same breakpoint, not a separate nav.
- When done, the app should read as: a calm, personal wallet at the front door (balance, assets, three actions), where protecting a payment is one clearly labelled choice inside Send, and one dark proof panel per receipt/Pact makes the on-chain truth feel real.
```
