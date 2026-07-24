import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config';

// Generates the icon set (64, 192, 512, maskable 512, apple-touch 180) from the
// PACTA mark. pacta.svg already has a full-bleed background, so the maskable
// variant renders without letterboxing.
export default defineConfig({
  headLinkOptions: { preset: '2023' },
  preset: minimal2023Preset,
  images: ['public/pacta.svg'],
});
