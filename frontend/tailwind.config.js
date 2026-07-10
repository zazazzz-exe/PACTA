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
        'hero-panel': 'var(--color-hero-panel)',
        'hero-navy': 'var(--color-hero-navy)',
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
