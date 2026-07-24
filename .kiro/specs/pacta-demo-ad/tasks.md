# Implementation Plan: PACTA Demo Ad

## Overview

Build a standalone, self-contained HTML page that auto-plays a 1-minute cinematic advertisement for PACTA through 6 sequenced scenes with CSS transitions. The implementation uses vanilla JavaScript inlined in a single HTML file for the deliverable, with TypeScript/Vitest for the test suite. The architecture separates a declarative timeline data model, a transition engine, and a rendering layer.

## Tasks

- [x] 1. Set up project structure and design system foundation
  - [x] 1.1 Create the HTML file scaffold with inlined CSS design tokens and base structure
    - Create `demo-ad/index.html` with the full HTML skeleton
    - Inline CSS custom properties for the Design System Token Map (--canvas, --ink, --slate, --fog, --accent, --signal, --carbon, --grid, --deadline-amber, --refund-clay, --font-sans, --font-mono)
    - Set up the fixed 1920×1080 container with viewport scaling logic
    - Add `overflow: hidden`, `cursor: none`, zero margins/padding on html/body
    - Add the viewport scaling CSS using `transform: scale(min(vw/1920, vh/1080))` for smaller viewports
    - Include the progress indicator bar (4px, top edge, accent at 80% opacity)
    - Add `aria-live="polite"` region for scene announcements
    - _Requirements: 1.1, 1.3, 1.4, 1.5, 5.1, 5.2, 5.5, 5.6, 5.7, 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_

  - [x] 1.2 Inline font subsets and SVG assets
    - Embed Plus Jakarta Sans (regular, bold) as base64 @font-face declarations
    - Embed JetBrains Mono (regular) as base64 @font-face declaration
    - Create and inline SVG assets: PACTA wordmark, shield/lock icon, warning icon, peso symbols, flow diagram nodes
    - _Requirements: 1.3, 1.4, 5.3, 5.4_

  - [x] 1.3 Define CSS animation keyframes and transition classes
    - Define `.scene-enter-fade`, `.scene-exit-fade` (opacity transitions)
    - Define `.scene-enter-slide-left`, `.scene-exit-slide-left` (translateX)
    - Define `.scene-enter-slide-up`, `.scene-exit-slide-up` (translateY)
    - Define `.scene-enter-scale`, `.scene-exit-scale` (scale + opacity)
    - Define `.scene-enter-clip-wipe`, `.scene-exit-clip-wipe` (clip-path inset)
    - Add `will-change: transform, opacity` on all scene containers
    - Use only `transform` and `opacity` for animation properties (no layout-triggering props)
    - Define text entry animations: fade-in, slide-up, type-on keyframes
    - Add `prefers-reduced-motion: reduce` media query that sets all durations to 0ms
    - _Requirements: 4.1, 4.2, 4.3, 4.5, 8.1, 8.2, 10.1_

- [x] 2. Implement the Timeline Controller and Scene Manager
  - [x] 2.1 Implement the declarative timeline data model
    - Define the scene configuration array with all 6 scenes: Hook (7s, fade 800ms), Problem (9s, slide-left 900ms), Solution (9s, clip-wipe 1000ms), Features (12s, slide-up 800ms), Proof (10s, scale 900ms), CTA (8s, fade 800ms)
    - Include scene titles, accessibility summaries, element definitions with entry animations and delays
    - Validate total duration sums to ~60s (55s hold + ~5.2s transitions)
    - _Requirements: 2.2, 3.1, 3.2, 4.6_

  - [x] 2.2 Implement the Timeline Controller
    - Write `start()` function that initiates playback on `window.load` within 500ms
    - Implement sequential scene advancement using `requestAnimationFrame` for timing
    - Implement `goToScene(index)` for reduced-motion keyboard navigation
    - On final scene transition complete, halt the timeline and hold indefinitely (no loop)
    - _Requirements: 2.1, 2.4, 2.5_

  - [x] 2.3 Implement the Transition Engine
    - Write `executeTransition(outgoing, incoming, config)` that toggles CSS transition classes
    - Use `animationend` / `transitionend` event listeners to resolve transitions
    - Ensure outgoing scene gets exit class and incoming scene gets enter class simultaneously
    - Handle transition completion cleanup (remove transition classes, hide outgoing)
    - _Requirements: 4.1, 4.2, 4.3, 4.5_

  - [x] 2.4 Implement the Progress Indicator
    - Animate the progress bar width from 0% to 100% over total timeline duration
    - Use `requestAnimationFrame` loop for smooth updates
    - Ensure monotonic progress (never decreases)
    - Stop updating when timeline completes
    - _Requirements: 2.3_

  - [x] 2.5 Implement reduced-motion mode and accessibility
    - Detect `prefers-reduced-motion: reduce` via `window.matchMedia`
    - Listen for dynamic changes via `matchMedia.addEventListener('change', ...)`
    - In reduced-motion mode: disable auto-play, show first scene statically
    - Add keyboard listeners: Right Arrow / Spacebar → next scene, Left Arrow → previous scene
    - Set `tabindex="0"` on active scene container, move focus on navigation
    - Display visible focus indicator (2px outline in accent color)
    - Update `aria-live` region with scene title and summary on every scene change
    - _Requirements: 10.1, 10.2, 10.3, 10.4_

- [x] 3. Checkpoint — Core engine working
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Build scene content — Scenes 1–3
  - [x] 4.1 Implement Scene 1: Opening Hook
    - PACTA wordmark SVG centered on canvas background
    - Tagline "Trust, written in code." below wordmark with fade-in entry (400ms)
    - Subtle emerald glow pulse animation on wordmark (CSS box-shadow or filter)
    - Scene holds for 7 seconds
    - _Requirements: 3.3, 9.4_

  - [x] 4.2 Implement Scene 2: Problem Statement
    - Headline "Your payment disappeared." with slide-up entry
    - Supporting stat "63% of Filipino freelancers have lost money to unpaid invoices" with fade-in (stagger 600ms delay)
    - Warning icon (SVG) with scale-up entry
    - Scattered peso symbols that fade out to reinforce the loss metaphor
    - Ensure body text ≤ 20 words, font sizes ≥ 18px body / 32px headline
    - _Requirements: 3.4, 6.1, 6.2, 6.3, 6.5_

  - [x] 4.3 Implement Scene 3: Solution Introduction
    - PACTA name as headline with slide-up entry
    - Description "A wallet-native money app on Stellar. Non-custodial protection for every payment." with fade-in
    - Shield/lock icon with emerald accent, scale-up entry animation
    - Ensure body text ≤ 20 words, sentence case
    - _Requirements: 3.5, 6.1, 6.4_

- [x] 5. Build scene content — Scenes 4–6
  - [x] 5.1 Implement Scene 4: Key Features (Send Protected Flow)
    - Build animated flow diagram with labeled nodes: Sender → Contract → Milestone Release → Recipient
    - Animate tokens (small circles/dots) traveling between nodes over 4–8 seconds
    - Display at least 3 badges: milestone progress bar, security bond indicator, AI Risk Lens badge, non-custodial badge
    - Show the peso sign (₱) adjacent to XLM amounts (e.g., "₱5,500 ≈ 100 XLM")
    - Security bond indicator with fade-in/scale-up entry
    - Ensure 4 labeled stages visible: funds sent → held in contract → milestone release → recipient receives
    - _Requirements: 3.6, 6.5, 9.1, 9.3, 9.5_

  - [x] 5.2 Implement Scene 5: On-Chain Proof
    - Render Proof_Panel with carbon (#0B0F0E) background, grid (#233029) border, signal (#34E3B0) text
    - No drop shadow on the panel
    - Animated count-up from 0 to 100 XLM over 2–4 seconds using requestAnimationFrame
    - Mock contract address appearing character by character (type-on effect)
    - Mock tx hash appearing character by character
    - All on-chain data in monospace font (JetBrains Mono)
    - _Requirements: 3.7, 5.5, 9.2_

  - [x] 5.3 Implement Scene 6: CTA
    - PACTA wordmark (same as Scene 1)
    - Live app URL as readable text
    - Hackathon track name
    - Action prompt: "Try PACTA — protect your next payment." with fade-in
    - Ensure wordmark present (satisfies Req 9.4 for last scene)
    - _Requirements: 3.8, 9.4_

- [x] 6. Checkpoint — Full playback working
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Error handling and fallbacks
  - [x] 7.1 Implement JavaScript fallback for missing CSS animation support
    - Detect CSS animation support via feature check
    - If not supported, use `setTimeout` to display scenes as static frames for their designated durations
    - _Requirements: 8.6_

  - [x] 7.2 Implement viewport scaling fallback and final polish
    - Ensure CSS `transform: scale()` calculation works for viewports < 1920×1080
    - Add `requestAnimationFrame` polyfill fallback to `setTimeout(fn, 16)`
    - Verify no more than 15 simultaneously animating elements at any point
    - Ensure no colors outside the Design System palette are used
    - Ensure no text smaller than 12px, no text smaller than 18px for body
    - Final validation: all contrast ratios meet WCAG AA (4.5:1 body, 3:1 large text)
    - _Requirements: 7.6, 8.3, 8.4, 5.7, 5.8, 6.2, 10.5_

- [ ] 8. Testing
  - [ ]* 8.1 Write property test: Timeline total duration is within bounds
    - **Property 1: Timeline total duration is within bounds**
    - Generate random scene/transition duration arrays within valid ranges, verify total in [55000, 65000]ms
    - **Validates: Requirements 2.2, 4.6**

  - [ ]* 8.2 Write property test: Scene configuration bounds
    - **Property 2: Scene configuration bounds**
    - Generate random scene counts [5–8] and durations, verify each in [5000, 15000]ms
    - **Validates: Requirements 3.1**

  - [ ]* 8.3 Write property test: Transition duration bounds
    - **Property 3: Transition duration bounds**
    - Generate random transition durations, verify all in [600, 1200]ms
    - **Validates: Requirements 4.2**

  - [ ]* 8.4 Write property test: Transition type diversity
    - **Property 4: Transition type diversity**
    - Generate random transition type assignments across scenes, verify ≥ 3 distinct types
    - **Validates: Requirements 4.3**

  - [ ]* 8.5 Write property test: Progress indicator monotonicity
    - **Property 5: Progress indicator monotonicity**
    - Generate random elapsed time pairs (t1 < t2), verify progress(t1) ≤ progress(t2)
    - **Validates: Requirements 2.3**

  - [ ]* 8.6 Write property test: Text visibility minimum hold time
    - **Property 6: Text visibility minimum hold time**
    - Generate random text elements with entry delays/durations within scenes, verify ≥ 3000ms visible time
    - **Validates: Requirements 6.6**

  - [ ]* 8.7 Write property test: Body text word count per scene
    - **Property 7: Body text word count per scene**
    - Generate random body text strings, verify word count ≤ 20 per scene
    - **Validates: Requirements 6.1**

  - [ ]* 8.8 Write property test: Viewport scaling calculation
    - **Property 8: Viewport scaling calculation**
    - Generate random viewport sizes (< 1920×1080), verify scale = min(w/1920, h/1080) ≤ 1.0
    - **Validates: Requirements 7.6**

  - [ ]* 8.9 Write property test: Reduced motion navigation round-trip
    - **Property 9: Reduced motion navigation round-trip**
    - Generate random navigation sequences (N forward + N back), verify return to start scene
    - **Validates: Requirements 10.2**

  - [ ]* 8.10 Write unit tests for scene content and design compliance
    - Verify each scene contains required elements per narrative arc (Req 3.3–3.8)
    - Verify all colors match the Design System palette (Req 5.1–5.8)
    - Verify PACTA logo in first and last scenes (Req 9.4)
    - Verify proof panel styling (carbon bg, grid border, signal text, no shadow) (Req 5.5)
    - Verify no setInterval used for animation (Req 8.3)
    - Verify will-change hints on animated elements (Req 8.2)
    - Verify CSS animations use only transform/opacity (Req 8.1)
    - Verify aria-live region exists (Req 10.4)
    - _Requirements: 3.3–3.8, 5.1–5.8, 8.1–8.3, 9.4, 10.4_

- [x] 9. Final checkpoint — Complete deliverable
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- The deliverable is a single HTML file — all code, styles, fonts, and SVGs are inlined
- Test suite uses Vitest + fast-check and tests the extracted logic (timeline calculations, scaling, navigation state) rather than DOM rendering
- Font subsets should be minimal (only characters used in the ad) to stay under 5MB total

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2", "1.3"] },
    { "id": 2, "tasks": ["2.1"] },
    { "id": 3, "tasks": ["2.2", "2.3", "2.4", "2.5"] },
    { "id": 4, "tasks": ["4.1", "4.2", "4.3"] },
    { "id": 5, "tasks": ["5.1", "5.2", "5.3"] },
    { "id": 6, "tasks": ["7.1", "7.2"] },
    { "id": 7, "tasks": ["8.1", "8.2", "8.3", "8.4", "8.5", "8.6", "8.7", "8.8", "8.9", "8.10"] }
  ]
}
```
