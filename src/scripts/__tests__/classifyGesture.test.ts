import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { classifyGesture } from '../mapModal';

// Feature: node-maps, Property 19: Pointer gesture classifies as click xor drag by movement threshold
//
// Property 19: Pointer gesture classifies as click xor drag by movement threshold.
// For arbitrary (dx, dy) movement deltas measured against a positive threshold,
// classifyGesture returns exactly one of 'click' or 'drag' (mutually exclusive),
// returning 'click' iff the Euclidean magnitude sqrt(dx² + dy²) is within the
// threshold (inclusive) and 'drag' when it is beyond. This underpins the
// mutually-exclusive click-select vs. drag-reposition behavior: a completed
// pointer gesture is never both a click and a drag.
//
// Validates: Requirements 11.3, 11.4

describe('Property 19: Pointer gesture classifies as click xor drag by movement threshold', () => {
  it('returns exactly one of click/drag, click iff magnitude <= threshold else drag', () => {
    fc.assert(
      fc.property(
        // Arbitrary movement deltas, including negatives and zero.
        fc.double({ min: -1000, max: 1000, noNaN: true }),
        fc.double({ min: -1000, max: 1000, noNaN: true }),
        // A positive movement threshold (the "small click threshold" of Req 11.2).
        fc.double({ min: Math.fround(0.0001), max: 500, noNaN: true }),
        (dx, dy, threshold) => {
          const result = classifyGesture(dx, dy, threshold);
          const magnitude = Math.sqrt(dx * dx + dy * dy);

          // Result is exactly one of the two known outcomes.
          expect(result === 'click' || result === 'drag').toBe(true);

          // The two outcomes are mutually exclusive: it is 'click' iff it is not 'drag'.
          const isClick = result === 'click';
          const isDrag = result === 'drag';
          expect(isClick).toBe(!isDrag);

          // 'click' within threshold (inclusive), 'drag' strictly beyond it.
          if (magnitude <= threshold) {
            expect(result).toBe('click');
          } else {
            expect(result).toBe('drag');
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('exercises deltas near the threshold boundary on both sides and exactly on it', () => {
    fc.assert(
      fc.property(
        fc.double({ min: Math.fround(0.1), max: 500, noNaN: true }),
        // Angle to spread the boundary delta around the circle of radius ~threshold.
        fc.double({ min: 0, max: Math.fround(2 * Math.PI), noNaN: true }),
        // Small signed epsilon nudging the magnitude just inside/outside/onto the edge.
        fc.constantFrom(-1e-6, 0, 1e-6),
        (threshold, angle, epsilon) => {
          // Construct a delta whose target magnitude is threshold + epsilon.
          const targetMag = threshold + epsilon;
          const dx = targetMag * Math.cos(angle);
          const dy = targetMag * Math.sin(angle);

          const result = classifyGesture(dx, dy, threshold);
          const magnitude = Math.sqrt(dx * dx + dy * dy);

          // Classification must agree with the inclusive-threshold rule regardless
          // of tiny floating-point drift between the intended and actual magnitude.
          expect(result).toBe(magnitude <= threshold ? 'click' : 'drag');

          // Mutual exclusivity holds at the boundary too.
          expect(result === 'click' || result === 'drag').toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });
});
