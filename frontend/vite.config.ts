import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

// The generated bindings live in ../packages/pacta. We alias the package name
// "pacta" to its built output (dist); its own node_modules resolves the
// @stellar/stellar-sdk subpath imports the bindings depend on.
export default defineConfig({
  plugins: [react()],
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
      // allow importing the bindings package that lives outside frontend/
      allow: [fileURLToPath(new URL('..', import.meta.url))],
    },
  },
});
