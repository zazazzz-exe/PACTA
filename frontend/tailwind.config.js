/** @type {import('tailwindcss').Config} */

// PACTA "electric glow" design system. Values live as CSS variables in
// src/index.css (dark base, light override) so one class works in both themes.
// Colors are RGB channels: `rgb(var(--x) / <alpha-value>)` keeps opacity
// modifiers like `ring-accent/40` and `bg-canvas/95` working.
const c = (name) => `rgb(var(--${name}) / <alpha-value>)`;

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: ['selector', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        canvas: c('canvas'),
        paper: c('paper'),
        mist: c('mist'),
        hairline: { DEFAULT: 'var(--hairline)', strong: 'var(--hairline-strong)' },
        ink: c('ink'),
        slate: c('slate'),
        fog: c('fog'),
        accent: {
          DEFAULT: c('accent'),
          deep: c('accent-deep'),
          tint: c('accent-tint'),
          text: c('accent-text'),
          strong: c('accent-text-strong'),
        },
        'on-accent': c('on-accent'),
        deadline: { DEFAULT: c('deadline'), deep: c('deadline-deep'), tint: c('deadline-tint') },
        refund: { DEFAULT: c('refund'), deep: c('refund-deep'), tint: c('refund-tint') },
        carbon: c('carbon'),
        onyx: c('onyx'),
        grid: c('grid'),
        'panel-ink': c('panel-ink'),
        'panel-muted': c('panel-muted'),
        signal: { DEFAULT: c('signal'), amber: c('signal-amber'), red: c('signal-red') },
        'hero-panel': c('hero-panel'),
        'hero-navy': c('hero-navy'),
      },
      // Accent is used both as a fill (#2B5CFF) and as text. #2B5CFF fails AA as
      // text on the dark canvas, so the TEXT utilities point at the blue-text
      // tokens instead: text-accent -> #7C9BFF (dark) / #1F4FE0 (light), and
      // text-accent-deep -> the stronger blue used on accent-tint backgrounds.
      textColor: {
        accent: {
          DEFAULT: c('accent-text'),
          deep: c('accent-text-strong'),
          tint: c('accent-tint'),
          text: c('accent-text'),
          strong: c('accent-text-strong'),
        },
      },
      fontFamily: {
        sans: 'var(--font-sans)',
        mono: 'var(--font-mono)',
      },
      borderRadius: {
        card: 'var(--radius-card)',
        hero: 'var(--radius-hero)',
        control: 'var(--radius-control)',
        pill: 'var(--radius-pill)',
      },
      boxShadow: {
        card: 'var(--shadow-card)',
        pop: 'var(--shadow-pop)',
        glow: 'var(--btn-glow)',
      },
      backgroundImage: {
        glass: 'var(--glass)',
        hero: 'var(--hero-gradient)',
        'btn-primary': 'var(--btn-primary)',
      },
      borderColor: {
        card: 'var(--card-border)',
      },
      minHeight: { tap: '44px' },
      minWidth: { tap: '44px' },
      maxWidth: { app: '480px', 'app-wide': '560px' },
    },
  },
  plugins: [],
};
