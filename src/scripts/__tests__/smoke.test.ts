import { describe, it, expect } from 'vitest';

// Trivial smoke test confirming the Vitest runner executes under the default
// `node` environment. Replaced/expanded by real suites as the Node Maps
// feature lands.
describe('vitest smoke', () => {
  it('runs the test runner', () => {
    expect(1 + 1).toBe(2);
  });

  it('has no DOM in the default (node) environment', () => {
    expect(typeof document).toBe('undefined');
  });
});
