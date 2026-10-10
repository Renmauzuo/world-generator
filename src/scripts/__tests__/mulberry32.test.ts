import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { mulberry32 } from '../helpers';

// Feature: node-maps, Property 6: Layout is deterministic in the seed
//
// PRNG layer: the same integer seed must yield the identical float stream, and
// every emitted float must lie in [0, 1). This is the foundation that makes the
// map layout reproducible across reopens and save/load.
//
// Validates: Requirements 4.3, 4.2, 4.5
describe('mulberry32 — Property 6: Layout is deterministic in the seed', () => {
  it('emits the identical sequence from the same seed, with outputs in [0, 1)', () => {
    fc.assert(
      fc.property(
        // 32-bit unsigned integer seeds, plus a small draw count per run.
        fc.integer({ min: 0, max: 0xffffffff }),
        fc.integer({ min: 1, max: 64 }),
        (seed, draws) => {
          const a = mulberry32(seed);
          const b = mulberry32(seed);

          for (let i = 0; i < draws; i++) {
            const x = a();
            const y = b();

            // Same seed => identical stream.
            expect(x).toBe(y);

            // Outputs lie in [0, 1).
            expect(x).toBeGreaterThanOrEqual(0);
            expect(x).toBeLessThan(1);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
