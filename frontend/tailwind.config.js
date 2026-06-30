/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // §12 — calm, trustworthy fintech / mission-control instrument panel
        base: '#0B0F14', // deep near-black/navy
        surface: {
          DEFAULT: '#11161D',
          raised: '#161D27',
        },
        hairline: 'rgba(255,255,255,0.08)',
        ink: {
          DEFAULT: '#E8EEF4', // high-contrast off-white
          muted: '#9AA7B4',
          faint: '#5C6773',
        },
        accent: {
          // single confident accent — electric-teal / trust-green
          DEFAULT: '#1FD9B6',
          soft: 'rgba(31,217,182,0.12)',
          ring: 'rgba(31,217,182,0.35)',
        },
        warn: {
          DEFAULT: '#F5B544', // amber — deadline approaching / refund available
          soft: 'rgba(245,181,68,0.12)',
        },
        danger: {
          DEFAULT: '#E5565B', // restrained red — destructive / refunded
          soft: 'rgba(229,86,91,0.12)',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      boxShadow: {
        raised: '0 1px 0 0 rgba(255,255,255,0.04) inset, 0 8px 24px -12px rgba(0,0,0,0.6)',
        glow: '0 0 0 1px rgba(31,217,182,0.35), 0 8px 30px -10px rgba(31,217,182,0.25)',
      },
      borderRadius: {
        xl: '14px',
        '2xl': '18px',
      },
    },
  },
  plugins: [],
};
