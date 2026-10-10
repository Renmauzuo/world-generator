import { defineConfig } from 'vitest/config';

// Node Maps feature (and future suites) run under Vitest.
//
// The default test environment is `node` — the bulk of the suite is pure/
// deterministic logic (seeded PRNG, grid sizing, generation, reconciliation,
// resize, reference resolution) that needs no DOM.
//
// DOM/integration suites opt in per file via a docblock at the top of the file:
//     // @vitest-environment jsdom
// Vitest reads that comment and runs just that file under jsdom, so DOM tests
// live alongside the pure tests without a separate project or config.
export default defineConfig({
  test: {
    environment: 'node',
    // Single-run by default; `vitest run` never enters watch mode.
    include: [
      'src/**/*.{test,spec}.{ts,tsx}',
      'src/**/__tests__/**/*.{test,spec}.{ts,tsx}',
    ],
  },
});
