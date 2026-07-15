# PACTA — Design System (DESIGN.md)

> Visual + interaction spec for the PACTA frontend. **This supersedes PRD.md §12.** Use this file for all visual decisions; use PRD.md for everything functional (contract interface, flows, screens-as-behavior).

---

## 0. How Claude Code should use this file

- Apply this as the **visual layer** over the frontend specified in PRD.md §9. Do **not** change any functional behavior, contract calls, or screen logic from the PRD — only how it looks and feels.
- The tokens in §2 are the single source of truth. Put the CSS variables in `frontend/src/index.css` and the Tailwind mappings in `frontend/tailwind.config.js` exactly as given. Every color, radius, and shadow in components must reference a token, never a raw hex.
- Build **mobile-first** (your real users are on phones). The app content column is centered, max ~480px on phones scaling to ~560px on larger screens; the dashboard list may go wider.
- The **proof panel** (§6.9) is the signature element. It is the only dark surface in the app. Treat it as a reusable component and use it wherever the app shows on-chain truth (live contract, tx hash, protected amount).
- Hold the **quality floor** in §10 (responsive, keyboard focus, reduced motion) without exception.

Kickoff is in the chat message that accompanies this file.

---

## 1. Design thesis

**One sentence:** a warm, calm, human interface that any first-time user can trust, with a single dark "instrument" panel that proves everything is real on-chain.

**Wallet-native positioning (see PRD §1.4):** PACTA is wallet-native — the wallet is the login, identity, reputation, and authority. The design must make this feel natural and empowering, not technical. A first-time user should feel "I connected my wallet and I'm protected" within seconds, not "I need to learn blockchain." The proof panel exists to make the on-chain truth visible and confidence-building, bridging the gap between wallet-native architecture and human trust.

PACTA holds people's money. Most users are cautious, mobile-first, low on crypto literacy. So the core must feel like a premium consumer finance app (Wise / Mercury / Monzo register), not a crypto terminal. The personality does **not** come from a loud display face or decoration. It comes from four disciplined choices:

1. **Warm humanist neutrals** instead of cold gray. Warmth signals humanity and safety, the opposite of the cold, technical dashboards that make people wary. (This is a deliberate counter-move, not the default cream-background look. Spend no other boldness on the neutrals.)
2. **A single emerald accent.** Emerald is trust, growth, and "protected" all at once. It is *the* accent. Amber and clay are states, never decoration.
3. **Mono for everything verifiable.** Every amount, address, tx hash, ID, and countdown is monospace. Mono reads as "precise, on-chain, not marketing."
4. **The proof panel as signature.** One dark, mono, instrument-grade block showing the live contract and protected amount. It is the thing the product is remembered by, and the moment that lands with judges. Everything around it stays quiet so it carries weight.

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

---

## 7. Screen layouts (mobile-first)

Content is a centered column (`max-w-app` on phones, `max-w-app-wide` on larger). ASCII wireframes show structure, not pixels.

### 7.1 Landing / Connect — the hero is the thesis

The most characteristic thing about PACTA is verifiable protection, so the hero *is* the proof panel, not a marketing illustration. The landing communicates the wallet-native model immediately: "Connect wallet" is the only action, and the proof panel shows that protection is real, on-chain, and owned by you.

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

After connect: replace the connect button with a truncated mono address + the network badge, and route to the dashboard.

### 7.2 Dashboard

```
┌──────────────────────────┐
│  Your agreements   [ + ]  │   H1 + new-agreement button
│  [ As client | provider ] │   segmented filter
│                           │
│  ┌──────────────────────┐ │   AgreementCard (paper, shadow-card)
│  │ JM Jay Mercado  ●Active│ │   avatar · name · status pill
│  │ 75 XLM protected      │ │   mono amount
│  │ ▰▱▱▱  1 of 4          │ │   milestone bar
│  └──────────────────────┘ │
│  ┌──────────────────────┐ │
│  │ …                    │ │
│  └──────────────────────┘ │
└──────────────────────────┘
```

Empty state (an invitation, not an apology): heading "No agreements yet", one line "Create your first protected agreement.", primary button "Create agreement".

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

A focused card: avatar + name + truncated address, a large reputation summary (completed / refunded / total volume in mono), then a short list of that provider's past agreements with status pills. This is what a client checks before agreeing. Make the completed-vs-refunded contrast (accent vs refund) immediately legible.

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
| Protected amount | "75 XLM protected · 20 XLM bond held" |
| Release action | "Release next milestone" |
| Refund available | "Refund available. The deadline has passed." |
| Refund locked | "Refund unlocks when the deadline passes." |
| Completed | "Agreement complete. The bond was returned to the provider." |
| Pending confirmation | "Waiting for the network to confirm…" |
| Bad address error | "That provider address isn't valid. Check it and try again." |
| Insufficient balance | "Your balance is too low to cover this. Top up and try again." |
| Empty dashboard | "No agreements yet. Create your first protected agreement." |

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
- Keep components small and in `frontend/src/components`; the `ProofPanel` and `MilestoneBar` are the two worth getting pixel-right first since they carry the identity.
- When done, the app should read as: warm and calm everywhere, with one dark proof panel per relevant screen that makes the protection feel real.
```
