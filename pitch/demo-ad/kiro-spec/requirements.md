# Requirements Document

## Introduction

PACTA Demo Ad is a standalone, self-contained HTML page that serves as a 1-minute animated advertisement/demo video for PACTA. It auto-plays through cinematic scenes telling the PACTA story (Problem → Solution → How It Works → Call to Action) with smooth transitions, designed to be screen-recorded as the hackathon demo video submission. The page uses the PACTA "Calm Trust" design system and targets hackathon judges and potential users (Filipino freelancers, OFWs, informal deal-makers).

## Glossary

- **Demo_Ad**: The standalone HTML page that auto-plays an animated presentation showcasing PACTA
- **Scene**: A distinct visual section of the Demo_Ad that displays for a defined duration before transitioning to the next
- **Transition**: A CSS animation that moves between two adjacent Scenes
- **Timeline**: The full ordered sequence of Scenes with their durations totaling approximately 60 seconds
- **Proof_Panel**: The signature dark surface (carbon background, signal-mint accent) that displays on-chain data in monospace
- **Design_System**: The PACTA "Calm Trust" visual language: warm neutrals (#F4F2EC canvas), emerald accent (#0B7A63 / #34E3B0 signal), dark proof panels, Plus Jakarta Sans + JetBrains Mono typography
- **Auto_Play**: The automatic progression through all Scenes without user interaction
- **CTA**: Call to Action — the final scene prompting the viewer to visit or try PACTA

## Requirements

### Requirement 1: Self-Contained Deliverable

**User Story:** As a hackathon submitter, I want the demo ad to be a single self-contained HTML file (or minimal file set), so that I can open it in any browser and screen-record it without dependencies or a build step.

#### Acceptance Criteria

1. THE Demo_Ad SHALL be deliverable as a single HTML file with all CSS and JavaScript inlined, or as at most three files (HTML, CSS, JS) in a single directory, with a combined total file size not exceeding 5 MB
2. THE Demo_Ad SHALL render without missing visual elements, layout errors, or JavaScript console errors when opened directly from the filesystem via a file:// URL in the latest two major versions of Chrome, Firefox, or Safari
3. THE Demo_Ad SHALL load no external network resources at runtime (no CDN fonts, no external scripts, no remote images), verifiable by an empty Network tab in browser DevTools after page load completes
4. THE Demo_Ad SHALL embed all font subsets, SVG assets, and animation logic inline within the deliverable files
5. THE Demo_Ad SHALL require no build step, package installation, or pre-processing command to open and play — the delivered files SHALL be directly openable in a browser as-is

### Requirement 2: Auto-Playing Timeline

**User Story:** As a viewer, I want the presentation to play automatically from start to finish without interaction, so that I can screen-record it hands-free.

#### Acceptance Criteria

1. WHEN the Demo_Ad page fires the window load event, THE Timeline SHALL begin playing automatically within 500 milliseconds
2. THE Timeline SHALL progress through all Scenes sequentially, with total elapsed wall-clock time from first Scene appearance to final Scene hold (including all Transition durations) totaling between 55 and 65 seconds
3. WHILE the Timeline is playing, THE Demo_Ad SHALL display a progress indicator no taller than 4px positioned at the top or bottom edge of the viewport, using the Design_System accent color at no more than 80% opacity, showing proportional advancement from 0% to 100% of total playback duration
4. THE Demo_Ad SHALL NOT require any click, scroll, or keyboard input to advance between Scenes
5. WHEN the Timeline reaches the final Scene and its entrance Transition completes, THE Demo_Ad SHALL hold the final frame indefinitely with no loop, no blank screen, and no further animation

### Requirement 3: Scene Structure — Narrative Arc

**User Story:** As a hackathon judge, I want the ad to tell a clear story (problem, solution, how it works, proof, call to action), so that I understand PACTA's value in 60 seconds.

#### Acceptance Criteria

1. THE Timeline SHALL contain a minimum of 5 and a maximum of 8 distinct Scenes, where each Scene displays for no less than 5 seconds and no more than 15 seconds (excluding transition time)
2. THE Timeline SHALL follow the narrative arc in this order: Opening Hook → Problem Statement → Solution Introduction → Key Features / How It Works → On-Chain Proof Moment → Call to Action, where each arc point corresponds to at least one Scene and adjacent arc points may be combined into a single Scene
3. WHEN the Opening Hook Scene plays, THE Demo_Ad SHALL display the PACTA wordmark and tagline "Trust, written in code." within the first 5 seconds
4. WHEN the Problem Statement Scene plays, THE Demo_Ad SHALL display a text headline stating the problem of unprotected payments and at least one supporting visual element (icon, illustration, or statistic) referencing freelancers or OFWs
5. WHEN the Solution Introduction Scene plays, THE Demo_Ad SHALL display the PACTA name, a text description identifying it as a wallet-native money app on Stellar, and a visual indicator of non-custodial protection (such as a shield icon or lock icon)
6. WHEN the Key Features Scene plays, THE Demo_Ad SHALL visually demonstrate the Send Protected flow as a sequential animation showing at least 4 labeled stages: funds sent → held in contract → milestone release → recipient receives
7. WHEN the On-Chain Proof Scene plays, THE Demo_Ad SHALL render a Proof_Panel with animated mock data (contract address, protected amount, tx hash) using the carbon/signal-mint design
8. WHEN the CTA Scene plays, THE Demo_Ad SHALL display the live app URL as readable text, the hackathon track name, and a text prompt inviting the viewer to try PACTA (containing an action verb such as "Try," "Visit," or "Explore")

### Requirement 4: Cinematic Transitions

**User Story:** As a viewer, I want smooth, professional transitions between scenes, so that the presentation feels like a polished video ad rather than a slideshow.

#### Acceptance Criteria

1. THE Demo_Ad SHALL use CSS animations or JavaScript-driven transitions (not abrupt cuts) between every pair of adjacent Scenes
2. WHEN a Scene transition occurs, THE Transition SHALL complete within 600 to 1200 milliseconds
3. THE Demo_Ad SHALL use at least 3 distinct Transition types across the full Timeline, where "distinct" means each type uses a different primary animation property or direction (e.g., opacity change, translateX movement, scale change, or clip-path reveal each count as one distinct type, but two fades with different durations do not)
4. WHILE a Transition is in progress, THE Demo_Ad SHALL maintain 60 frames per second rendering on a device with a quad-core CPU and integrated GPU (e.g., 2020-era laptop) with no dropped frames observable in Chrome DevTools Performance panel
5. THE Demo_Ad SHALL include at least one Transition that uses a directional wipe or reveal effect (clip-path or translateX/translateY movement proceeding in a single consistent direction)
6. WHEN calculating total Timeline duration, THE Demo_Ad SHALL count Transition durations as part of the total playback time (not in addition to Scene durations)

### Requirement 5: Design System Compliance

**User Story:** As the PACTA brand owner, I want the demo ad to follow the "Calm Trust" design system exactly, so that it looks like an official PACTA production.

#### Acceptance Criteria

1. THE Demo_Ad SHALL use the canvas color #F4F2EC as the default background for all surfaces except the Proof_Panel
2. THE Demo_Ad SHALL use #0B7A63 (accent) and #34E3B0 (signal) as the only green tones, and SHALL use #C77D11 (deadline amber) and #B43A2C (refund clay) only to indicate deadline and refund states respectively
3. THE Demo_Ad SHALL render all on-chain data (amounts, addresses, tx hashes) in a monospace font (JetBrains Mono or a fallback from the same engineered-mono category such as SF Mono or Menlo)
4. THE Demo_Ad SHALL render all human-readable text (headings, descriptions, labels) in a humanist sans-serif font (Plus Jakarta Sans or a fallback from the same humanist-sans category such as system-ui)
5. THE Demo_Ad SHALL render the Proof_Panel with a #0B0F0E (carbon) background, #233029 (grid) border, #34E3B0 (signal) text accent, and no drop shadow, and the Proof_Panel SHALL be the only element that uses the carbon dark surface
6. THE Demo_Ad SHALL maintain warm neutral tones (#1A201D ink for body text, #586059 slate for labels and captions, #8C918A fog for hints and muted metadata)
7. THE Demo_Ad SHALL NOT use any color outside the Design_System palette (no pure black #000, no pure white #FFF, no blue, no purple)
8. THE Demo_Ad SHALL NOT render any text element at a font size smaller than 12px

### Requirement 6: Typography and Content Hierarchy

**User Story:** As a viewer watching at screen-recording resolution, I want text to be large, readable, and well-paced, so that every message lands clearly in the short timeframe.

#### Acceptance Criteria

1. THE Demo_Ad SHALL display no more than 20 words of body text (human-readable descriptive text in sans-serif, excluding headlines, labels, and monospace on-chain data) on screen at any single moment within a Scene
2. THE Demo_Ad SHALL use a minimum font size of 18px for body text and 32px for headline text at 1920x1080 viewport
3. WHEN text appears in a Scene, THE Demo_Ad SHALL animate text entry using fade-in, type-on, or slide-up with a duration between 200 and 600 milliseconds
4. THE Demo_Ad SHALL use sentence case for all headings and labels (not ALL CAPS except for the acronym "PACTA")
5. THE Demo_Ad SHALL display the peso sign (₱) immediately adjacent to XLM amounts on the same text line in at least one Scene to anchor value for the target audience
6. WHEN a block of body text or headline text is displayed, THE Demo_Ad SHALL keep that text visible for a minimum of 3 seconds before it is replaced or transitioned away

### Requirement 7: Viewport and Recording Optimization

**User Story:** As a screen recorder, I want the page to render at standard video dimensions with no browser chrome interference, so that the recording looks like a produced video.

#### Acceptance Criteria

1. THE Demo_Ad SHALL be designed for a 1920x1080 viewport (16:9 aspect ratio)
2. THE Demo_Ad SHALL center all content within the viewport with no horizontal or vertical scrollbars, using overflow hidden to prevent any scrollbar appearance
3. THE Demo_Ad SHALL hide or not render any browser-interactive elements (no visible cursor targets, no hover states, no scrollbars) and SHALL set the CSS cursor property to none on the document to hide the mouse pointer during playback
4. THE Demo_Ad SHALL use a fixed-size container of exactly 1920x1080 pixels that does not reflow or respond to viewport changes during playback
5. WHEN rendered at 1920x1080, THE Demo_Ad SHALL fill the entire viewport with presentation content (no visible canvas/background gaps at edges), with all default body and html margins and padding set to zero
6. IF the browser viewport is smaller than 1920x1080, THEN THE Demo_Ad SHALL scale the fixed container down proportionally to fit within the available viewport without cropping content or introducing scrollbars

### Requirement 8: Animation Performance

**User Story:** As a screen recorder, I want the animations to run smoothly without dropped frames, so that the recorded output looks professional.

#### Acceptance Criteria

1. THE Demo_Ad SHALL use CSS transforms and opacity for all movement animations (no layout-triggering properties like top, left, width, height for animation)
2. THE Demo_Ad SHALL use `will-change` or layer promotion hints on all animated elements to enable GPU compositing
3. THE Demo_Ad SHALL complete all animations using requestAnimationFrame or CSS animation/transition (no setInterval-based movement)
4. THE Demo_Ad SHALL contain no more than 15 simultaneously animating elements at any point during playback
5. WHILE the Timeline is playing, THE Demo_Ad SHALL maintain a frame rate of 60 frames per second or higher on a device with a 4-core CPU and integrated GPU (e.g., 2020-era laptop) at 1920x1080 viewport
6. IF the browser does not support CSS animations, THEN THE Demo_Ad SHALL display all Scenes as static frames in sequence using JavaScript setTimeout fallback, holding each Scene for its designated Timeline duration before advancing to the next

### Requirement 9: Key Visual Moments

**User Story:** As a hackathon judge, I want memorable visual moments that demonstrate the product's core value, so that PACTA stands out among submissions.

#### Acceptance Criteria

1. THE Demo_Ad SHALL include an animated flow diagram showing funds moving from a sender wallet into the escrow contract and releasing to a recipient in stages, with at least 3 labeled nodes (Sender, Contract, Recipient) and animated tokens traveling between them over a duration of 4 to 8 seconds
2. THE Demo_Ad SHALL include a Proof_Panel that animates in with the protected amount counting up from 0 to 100 XLM over a duration of 2 to 4 seconds
3. THE Demo_Ad SHALL include a visual representation of the security bond (a shield icon or bond indicator with a labeled amount) appearing alongside the escrow with a fade-in or scale-up entry animation
4. THE Demo_Ad SHALL include the PACTA logo or wordmark in at least the first and last Scenes
5. WHEN the Key Features Scene plays, THE Demo_Ad SHALL display at least 3 of the following: milestone progress bar, security bond indicator, AI Risk Lens badge, non-custodial badge, or deadline countdown

### Requirement 10: Accessibility and Reduced Motion

**User Story:** As a user with motion sensitivity, I want the page to respect my system preferences, so that the content is still accessible without animation.

#### Acceptance Criteria

1. WHEN the user has `prefers-reduced-motion: reduce` enabled, THE Demo_Ad SHALL disable all CSS animations and transitions by setting their durations to 0ms
2. WHILE reduced motion is active, THE Demo_Ad SHALL display one Scene at a time as a static frame, navigable by keyboard where Right Arrow or Spacebar advances to the next Scene and Left Arrow returns to the previous Scene
3. WHILE reduced motion is active and the user navigates between Scenes via keyboard, THE Demo_Ad SHALL move visible focus to the active Scene container and display a visible focus indicator
4. THE Demo_Ad SHALL include an aria-live polite region that announces the Scene title and narrative summary text each time the current Scene changes
5. THE Demo_Ad SHALL maintain a minimum contrast ratio of 4.5:1 for all body text (below 24px regular or 18.67px bold) and 3:1 for large text (24px and above regular, or 18.67px and above bold) against their backgrounds
