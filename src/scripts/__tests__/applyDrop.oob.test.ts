import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import type { NodeMap, MapPlacement } from '../types';
import { applyDrop } from '../mapModal';

// Feature: node-maps, Property 14: Out-of-bounds drop is a no-op
//
// Property 14: Out-of-bounds drop is a no-op.
// For any NodeMap, dropping a dragged placement outside the grid bounds leaves
// every placement's (col, row) and userPositioned flag unchanged.
//
// Validates: Requirements 9.5

/**
 * Builds a NodeMap of side length N (gridSize) populated with `count` placements on
 * distinct in-bounds tiles. Tiles are laid out in row-major order (cell index -> col,row)
 * so no two placements ever share a tile — a precondition for applyDrop's swap/move logic.
 * Each placement gets a unique childRef and an arbitrary userPositioned flag so the
 * snapshot comparison exercises both flag states.
 */
function buildMap(gridSize: number, count: number, userFlags: boolean[]): NodeMap {
  const placements: MapPlacement[] = [];
  for (let i = 0; i < count; i++) {
    placements.push({
      childRef: `c${i}`,
      col: i % gridSize,
      row: Math.floor(i / gridSize),
      userPositioned: userFlags[i] ?? false,
    });
  }
  return { gridSize, layoutSeed: 12345, placements };
}

/**
 * Order-preserving snapshot of the structurally significant per-placement fields that
 * Property 14 asserts are left unchanged: (col, row) and the userPositioned flag.
 */
function snapshot(map: NodeMap) {
  return map.placements.map((p) => ({
    childRef: p.childRef,
    col: p.col,
    row: p.row,
    userPositioned: p.userPositioned,
  }));
}

describe('Property 14: Out-of-bounds drop is a no-op', () => {
  it('leaves every placement col/row/userPositioned unchanged for OOB targets on all four sides', () => {
    fc.assert(
      fc.property(
        // Grid side length N (2..8 keeps grids small but with room for several tiles).
        fc.integer({ min: 2, max: 8 }),
        // How many of the N*N tiles are occupied by placements (at least one dragged POI).
        fc.integer({ min: 1, max: 8 }),
        // Per-placement userPositioned flags.
        fc.array(fc.boolean(), { minLength: 0, maxLength: 8 }),
        // Which side the out-of-bounds target lands on, plus a magnitude for how far out.
        fc.constantFrom('left', 'right', 'top', 'bottom'),
        fc.integer({ min: 0, max: 20 }),
        // In-bounds coordinate used to vary the "other" axis of the OOB target.
        fc.integer({ min: 0, max: 7 }),
        (n, rawCount, userFlags, side, overshoot, inAxis) => {
          const count = Math.min(rawCount, n * n);
          const map = buildMap(n, count, userFlags);

          // Pick an existing placement to "drag" so draggedChildRef resolves — isolating
          // the out-of-bounds branch rather than the unknown-ref branch.
          const draggedChildRef = map.placements[0].childRef;

          // Clamp the in-bounds axis into range so only the chosen axis is out of bounds.
          const within = Math.min(inAxis, n - 1);

          // Construct an out-of-bounds target: exactly one axis is pushed past the grid.
          let targetCol: number;
          let targetRow: number;
          switch (side) {
            case 'left':
              targetCol = -1 - overshoot; // col < 0
              targetRow = within;
              break;
            case 'right':
              targetCol = n + overshoot; // col >= N
              targetRow = within;
              break;
            case 'top':
              targetCol = within;
              targetRow = -1 - overshoot; // row < 0
              break;
            default: // 'bottom'
              targetCol = within;
              targetRow = n + overshoot; // row >= N
              break;
          }

          const before = snapshot(map);

          const changed = applyDrop(map, draggedChildRef, targetCol, targetRow);

          // Out-of-bounds drop performs no mutation and reports no change.
          expect(changed).toBe(false);

          const after = snapshot(map);

          // Every placement is byte-identical: same count, same (col,row), same flag.
          expect(after).toEqual(before);
        }
      ),
      { numRuns: 100 }
    );
  });
});
