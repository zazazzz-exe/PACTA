import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { fileURLToPath, URL } from 'node:url';

// The generated bindings live in ../packages/pacta. We alias the package name
// "pacta" to its built output (dist); its own node_modules resolves the
// @stellar/stellar-sdk subpath imports the bindings depend on.
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      // Auto-generate + inject icons and the apple-touch-icon link from
      // pwa-assets.config.ts.
      pwaAssets: { config: true },
      manifest: {
        name: 'PACTA',
        short_name: 'PACTA',
        description:
          'A non-custodial money app on Stellar. Hold, send, receive, convert, and send protected.',
        theme_color: '#F4F2EC',
        background_color: '#F4F2EC',
        display: 'standalone',
        start_url: '/',
        scope: '/',
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,woff,woff2,png,svg,ico}'],
        navigateFallback: '/index.html',
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        // The app ships as a single JS bundle larger than Workbox's 2 MiB
        // default precache limit; raise it so the whole app shell (needed
        // for offline support) is precached instead of silently skipped.
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
      },
      // Keep the service worker out of `npm run dev` to avoid caching surprises.
      devOptions: { enabled: false },
    }),
  ],
  resolve: {
    alias: {
      pacta: fileURLToPath(new URL('../packages/pacta/dist/index.js', import.meta.url)),
    },
  },
  define: {
    global: 'globalThis',
  },
  optimizeDeps: {
    esbuildOptions: {
      define: { global: 'globalThis' },
    },
  },
  server: {
    port: 5173,
    fs: {
      allow: [fileURLToPath(new URL('..', import.meta.url))],
    },
  },
});
