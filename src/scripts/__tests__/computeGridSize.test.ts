import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { computeGridSize } from '../mapGenerator';

// Feature: node-maps, Property 2: N-sizing is minimal and satisfies the emptiness ratio
//
// Property 2: N-sizing is minimal and satisfies the emptiness ratio.
// For any non-negative child Point_Of_Interest count and non-negative emptiness
// ratio `r`, computeGridSize(count, r) returns an integer N such that
//   N² ≥ count + ceil(r * count)
// (the empty budget is met and every child has a tile) AND no smaller side length
// satisfies that inequality (minimality), with N ≥ 1. The same (count, r) always
// yields the same N.
//
// Minimality edge case: computeGridSize is floored at 1 so a zero-children map is a
// single-tile grid. For count = 0 the budget is 0 and (N-1)² = 0 would also satisfy
// the inequality, so the minimality assertion is only applied when N > 1.
//
// Validates: Requirements 3.4, 3.6, 4.8
describe('computeGridSize — Property 2: N-sizing is minimal and satisfies the emptiness ratio', () => {
  it('returns the minimal N ≥ 1 whose N² meets the count + emptiness budget, deterministically', () => {
    fc.assert(
      fc.property(
        // Non-negative POI counts; capped to keep N² well within safe-integer range.
        fc.integer({ min: 0, max: 100000 }),
        // Non-negative emptiness ratios, including 0 (continent-like) and fractional/large.
        fc.double({ min: 0, max: 100, noNaN: true }),
        (count, r) => {
          const n = computeGridSize(count, r);

          // N is a positive integer (floored at 1).
          expect(Number.isInteger(n)).toBe(true);
          expect(n).toBeGreaterThanOrEqual(1);

          // The budget: every child gets a tile plus the ratio's required empty space.
          const budget = count + Math.ceil(r * count);

          // Satisfies the inequality: N² covers the whole budget.
          expect(n * n).toBeGreaterThanOrEqual(budget);

          // Minimality: (N-1)² fails the inequality — but only when N > 1, since the
          // floor-at-1 means a zero/tiny budget still yields N = 1 even though 0² = 0
          // would technically satisfy a budget of 0.
          if (n > 1) {
            expect((n - 1) * (n - 1)).toBeLessThan(budget);
          }

          // Determinism: the same inputs always yield the same N.
          expect(computeGridSize(count, r)).toBe(n);
        }
      ),
      { numRuns: 100 }
    );
  });
});
