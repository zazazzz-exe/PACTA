import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { fileURLToPath, URL } from 'node:url';
import { readFileSync } from 'node:fs';
import { rpcCspError } from './src/lib/cspGuard';

// Fails `vite build` when VITE_MAINNET_RPC_URL points at a host the CSP in
// ../vercel.json does not allow, so a misconfigured RPC breaks the deploy
// loudly instead of silently breaking every mainnet RPC call in the browser.
function cspRpcGuard(): Plugin {
  return {
    name: 'pacta-csp-rpc-guard',
    apply: 'build',
    configResolved(config) {
      const env = loadEnv(config.mode, config.envDir || process.cwd(), 'VITE_');
      const vercel = JSON.parse(
        readFileSync(fileURLToPath(new URL('../vercel.json', import.meta.url)), 'utf8'),
      ) as { headers: Array<{ source: string; headers: Array<{ key: string; value: string }> }> };
      const csp =
        vercel.headers
          .find((h) => h.source === '/(.*)')
          ?.headers.find((h) => h.key === 'Content-Security-Policy')?.value ?? '';
      const err = rpcCspError(env.VITE_MAINNET_RPC_URL, csp);
      if (err) throw new Error(err);
    },
  };
}

// The generated bindings live in ../packages/pacta. We alias the package name
// "pacta" to its built output (dist); its own node_modules resolves the
// @stellar/stellar-sdk subpath imports the bindings depend on.
export default defineConfig({
  plugins: [
    cspRpcGuard(),
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
        theme_color: '#0D1018',
        background_color: '#0D1018',
        display: 'standalone',
        start_url: '/',
        scope: '/',
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,woff,woff2,png,svg,ico}'],
        // The page itself is never served from the precache: every visit while
        // online loads the latest index.html (and so the latest deploy's
        // hashed assets) from the network, falling back to the last copy only
        // when offline. Without this, visitors kept seeing the previous deploy.
        globIgnores: ['index.html'],
        navigateFallback: null,
        runtimeCaching: [
          {
            urlPattern: ({ request }) => request.mode === 'navigate',
            handler: 'NetworkFirst',
            options: {
              cacheName: 'pacta-pages',
              networkTimeoutSeconds: 4,
              expiration: { maxEntries: 5 },
            },
          },
          {
            // Hashed build files never change, so keep whatever a visit loaded.
            // This keeps the page working offline right after a deploy, before
            // the new precache has finished installing.
            urlPattern: ({ url, sameOrigin }) => sameOrigin && url.pathname.startsWith('/assets/'),
            handler: 'CacheFirst',
            options: { cacheName: 'pacta-assets', expiration: { maxEntries: 150 } },
          },
        ],
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
