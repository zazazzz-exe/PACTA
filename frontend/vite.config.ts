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
      // 'prompt' so the app picks the moment to switch versions (lib/pwaUpdate.ts):
      // never mid-action, right away on a fresh load.
      registerType: 'prompt',
      injectRegister: false,
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
