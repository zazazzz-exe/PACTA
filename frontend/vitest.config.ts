import { defineConfig } from 'vitest/config';
import { fileURLToPath, URL } from 'node:url';

// Mirrors vite.config.ts: the generated bindings live in ../packages/pacta.
// Alias the package name "pacta" to its built output (dist) so tests that
// import lib/contract.ts (and therefore "pacta") resolve under Vitest too.
export default defineConfig({
  resolve: {
    alias: {
      pacta: fileURLToPath(new URL('../packages/pacta/dist/index.js', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
