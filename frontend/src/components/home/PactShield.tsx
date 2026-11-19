import { useId } from 'react';

// The PACTA shield mark: a blue-to-cyan gradient shield with a check and three
// milestone dots. Decorative (aria-hidden). `glow` adds the soft breathing
// cyan halo (off under reduced motion).
export function PactShield({ size = 56, glow = true }: { size?: number; glow?: boolean }) {
  const id = useId().replace(/:/g, '');
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden className={`shrink-0 ${glow ? 'wallet-shield' : ''}`}>
      <defs>
        <linearGradient id={`${id}-g`} x1="12" y1="6" x2="54" y2="58" gradientUnits="userSpaceOnUse">
          <stop stopColor="#4F6BFF" />
          <stop offset="1" stopColor="#25C6D9" />
        </linearGradient>
        <linearGradient id={`${id}-s`} x1="32" y1="6" x2="32" y2="34" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FFFFFF" stopOpacity="0.35" />
          <stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d="M32 5l21 8.4v15.4c0 13.6-9 24.6-21 30.2C20 53.4 11 42.4 11 28.8V13.4L32 5z" fill={`url(#${id}-g)`} />
      <path d="M32 5l21 8.4v15.4c0 3-0.4 5.6-1.2 8.2H12.2C11.4 34.4 11 31.8 11 28.8V13.4L32 5z" fill={`url(#${id}-s)`} />
      <path d="M23.5 31.5l6 6 11.5-12.5" fill="none" stroke="#FFFFFF" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="24" cy="47" r="2" fill="#FFFFFF" fillOpacity="0.9" />
      <circle cx="32" cy="50" r="2" fill="#FFFFFF" fillOpacity="0.9" />
      <circle cx="40" cy="47" r="2" fill="#FFFFFF" fillOpacity="0.55" />
    </svg>
  );
}
