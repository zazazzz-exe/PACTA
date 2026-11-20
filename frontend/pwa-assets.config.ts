import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config';

// Generates the icon set (64, 192, 512, maskable 512, apple-touch 180) from the
// PACTA mark. pacta-icon.png is full-bleed (#0D1018 with the glowing mark inside
// the maskable safe zone), so no padding or letterboxing is added.
const bg = '#0D1018';
export default defineConfig({
  headLinkOptions: { preset: '2023' },
  preset: {
    ...minimal2023Preset,
    transparent: { ...minimal2023Preset.transparent, padding: 0 },
    maskable: { ...minimal2023Preset.maskable, padding: 0, resizeOptions: { background: bg } },
    apple: { ...minimal2023Preset.apple, padding: 0, resizeOptions: { background: bg } },
  },
  images: ['public/pacta-icon.png'],
});
