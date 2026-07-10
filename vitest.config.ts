import { defineConfig } from 'vitest/config';

// Tests for the repo-root serverless (KYC) layer. The frontend has its own
// tooling; this scopes to api/ only.
export default defineConfig({
  test: {
    include: ['api/**/*.test.ts'],
    environment: 'node',
  },
});
