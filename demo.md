# PACTA — 60-Second Animated Demo Ad (Concept & Flow)

> A self-contained HTML page that auto-plays as a ~60-second animated pitch for PACTA.
> Designed for presenting to judges, investors, and potential users — no interaction needed.

---

## Concept

The Demo Ad is a **cinematic pitch deck that runs itself**. Think of it as a 60-second TV commercial rendered entirely in HTML/CSS/JS — no video files, no dependencies, no build step. Open the file, and PACTA sells itself.

The visual language draws from the PACTA Design System: warm canvas backgrounds, emerald accents, monospace for anything on-chain, and the signature dark "proof panel" surface. The narrative arc mirrors a classic startup pitch: hook → problem → solution → how it works → proof → CTA.

---

## Timeline & Section Breakdown (~60s total)

| # | Section | Duration | Key Message |
|---|---------|----------|-------------|
| 1 | **Opening Hook** | 0s – 7s | Logo reveal + tagline "Trust, written in code." |
| 2 | **The Problem** | 7s – 15s | "You pay. They disappear. You lose." |
| 3 | **Meet PACTA** | 15s – 23s | A wallet-native money app on Stellar |
| 4 | **The Wallet** | 23s – 31s | Hold · Send · Receive · Convert |
| 5 | **Send Protected** | 31s – 42s | The Pact: staged release + bond + refund |
| 6 | **Differentiators** | 42s – 52s | AI Risk Lens + Works Offline |
| 7 | **On-Chain Proof** | 52s – 56s | Proof panel with live tx data animation |
| 8 | **Closing CTA** | 56s – 60s+ | Logo + "Your money is yours to move." (holds) |

---

## Section Details

### 1. Opening Hook (0–7s)
- **Visual:** Dark screen fades in. PACTA logo assembles/draws itself (SVG path animation). Emerald glow radiates outward.
- **Text:** Tagline types itself: "Trust, written in code."
- **Mood:** Mysterious, premium, confident.
- **Transition out:** Logo scales down and moves to top-left as background fades to warm canvas.

### 2. The Problem (7–15s)
- **Visual:** Warm canvas background. Animated icons or simple illustrations depicting: money leaving a phone → question mark → sad face. Simple, relatable.
- **Text sequence (staggered fade-in):**
  - "You hire a freelancer online."
  - "You pay up front."
  - "They vanish."
  - Bold: **"₱25,000 — gone."**
- **Mood:** Tension, relatability. The peso amount grounds it in the Filipino audience.
- **Transition out:** Text and icons slide left, new content slides in from right.

### 3. Meet PACTA (15–23s)
- **Visual:** Phone mockup of the PACTA wallet home screen (illustrated via CSS). Portfolio balance animates up. The three action buttons (Send, Receive, Convert) pop in staggered.
- **Text:** "A wallet that protects your money — not just moves it."
- **Subtext:** "Non-custodial. On Stellar. Your keys, your funds."
- **Transition out:** Phone mockup slides to the side, content morphs into feature tiles.

### 4. The Wallet Layer (23–31s)
- **Visual:** Four feature cards animate in (staggered grid): Hold, Send, Receive, Convert. Each has an icon and a one-line description. The cards have the paper/shadow-card treatment.
- **Text:** "Everything a wallet should be."
- **Key details animated:** "Multi-asset portfolio", "Stellar DEX", "₱ values", "Instant"
- **Transition out:** Cards converge into the center, morphing into a shield icon.

### 5. Send Protected — The Pact (31–42s)
- **Visual:** This is the hero section. A full animated flow:
  1. "Send protected" button highlighted (emerald glow)
  2. Funds animate from Sender → Contract vault (locks with glow)
  3. Bond appears below the vault
  4. Milestone bar fills segment by segment (4 stages)
  5. Funds release to Recipient in tranches
  6. Bond returns to Recipient on completion
- **Text overlay (timed to animation):**
  - "Funds locked in a smart contract"
  - "Recipient posts a security bond"
  - "Released in milestones as work is delivered"
  - "Miss the deadline? Full refund."
- **Mood:** The centerpiece. This is what makes PACTA different.
- **Transition out:** Vault and flow dissolve into particles that reform as the next section.

### 6. Differentiators (42–52s)
- **Split into two 5-second beats:**

**Beat 1: AI Risk Lens (42–47s)**
- Visual: A recipient avatar with an animated "scan" effect. Stats appear around it (completed: 12, refunded: 0, volume: ₱180K). A speech bubble with plain-language assessment fades in.
- Text: "AI reads on-chain history. Know who you're paying."

**Beat 2: Works Offline (47–52s)**
- Visual: Signal bars animate to zero. A payment card shows "Queued ✓". Signal returns. Card flips to "Delivered ✓".
- Text: "Queue payments offline. Auto-delivers on reconnect."
- Subtext: "Built for places where the signal drops."

- **Transition out:** Fade to dark (carbon) background.

### 7. On-Chain Proof (52–56s)
- **Visual:** The signature proof panel on carbon/dark background. Animated:
  - `proof · pact-001` types in with signal mint
  - `75.0000000 XLM protected` counts up from 0
  - `tx 9f3a…b1c4 confirmed` appears with a checkmark
  - Subtle ambient glow pulses behind the panel
- **Mood:** Technical confidence. "This is real. This is on-chain."
- **Transition out:** Proof panel scales down and fades as the background brightens.

### 8. Closing CTA (56–60s+)
- **Visual:** Clean warm canvas. PACTA logo centered, large. Tagline below.
- **Text:** "Your money is yours to move." → "Trust, written in code."
- **Subtext:** "pacta-zarrah.vercel.app" (the live link)
- **Holds indefinitely** — this is the slide you present while speaking.
- **Subtle loop:** Background ambient shapes drift gently (from the landing hero CSS).

---

## Transition Recommendations

### Recommended Transition Types by Section Boundary

| From → To | Recommended Transition | Rationale |
|-----------|----------------------|-----------|
| Hook → Problem | **Scale-down + fade** | Logo shrinks into position, world expands |
| Problem → Meet PACTA | **Slide left** | Classic narrative progression, "here's the answer" |
| Meet PACTA → Wallet | **Morph/dissolve** | Phone screen content transforms into feature tiles |
| Wallet → Send Protected | **Converge + glow** | Cards collapse into a shield/lock, signals "protection" |
| Send Protected → Differentiators | **Particle dissolve** | Complex section ends with energy dispersing |
| Differentiators → Proof Panel | **Fade to dark** | Mood shift from warm to technical/dark |
| Proof Panel → Closing | **Scale-down + brighten** | Technical proof gives way to human warmth |

### Transition Principles

1. **Never use the same transition twice in a row.** Variety keeps the eye engaged.
2. **Match transition energy to narrative energy.** Calm moments get fades; high-energy moments get slides/morphs.
3. **Use direction to imply narrative flow.** Left-to-right = progress. Scale-down = "zooming out to see the bigger picture." Fade-to-dark = entering the technical truth.
4. **Keep transitions under 800ms.** Any longer feels sluggish; any shorter feels jarring. The sweet spot is 600–700ms.
5. **Stagger internal elements.** When a section appears, don't reveal everything at once. Stagger by 150–250ms per element for a layered, cinematic feel.
6. **Use easing curves, not linear.** `cubic-bezier(0.4, 0, 0.2, 1)` for enters, `cubic-bezier(0.4, 0, 1, 1)` for exits. This is Material Design's standard easing — proven and smooth.

### CSS Animation Approach

- **Primary engine:** CSS `@keyframes` + `animation-delay` for the timeline sequencing
- **Orchestration:** A small JS timeline controller that adds/removes CSS classes at the right timestamps
- **GPU-friendly:** All animations use `transform` and `opacity` only — no `width`, `height`, `top`, `left`
- **Staggering:** CSS custom properties (`--delay`) on child elements, set via `style` attribute

### Background Ambience

- Floating, slow-moving blurred circles (like the landing hero's `hf-drift1` / `hf-drift2`) throughout
- Color shifts with the section: emerald-tinted on light sections, mint-tinted on dark sections
- Subtle radial gradient that follows the "focus point" of each section
- Never distracting — 30% opacity max, always behind content

---

## Technical Implementation Notes

- **Single file:** All HTML, CSS, and JS in one `.html` file
- **No build step:** Open directly in browser
- **Fonts:** Link to Google Fonts CDN (Plus Jakarta Sans + JetBrains Mono) with system fallbacks
- **Logo:** Inline SVG (the PACTA logo path data)
- **Icons:** Inline SVG paths from Lucide (only the ~8 icons needed)
- **Progress bar:** A thin emerald line at the viewport bottom that advances with the timeline
- **Keyboard controls:** Space = pause/play, R = restart (event listeners in the JS)
- **Total file size target:** Under 200KB (achievable with inline SVG and no images)

---

## Presenter Notes

- **Before presenting:** Open the HTML file in Chrome/Firefox, go full-screen (F11), let it play.
- **If you need to pause:** Press spacebar. Press again to resume.
- **If you need to restart:** Press R.
- **The closing slide holds forever** — use it as your backdrop while speaking.
- **Works offline** — once loaded, no network needed (fonts cached, everything inline).

---

## File Location

The final HTML file will be created at: `demo-ad.html` in the project root.
