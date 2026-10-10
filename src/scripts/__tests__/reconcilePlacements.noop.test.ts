import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import type { ObjectTypeTemplate, WorldNode } from '../types';
import { generateMap, reconcilePlacements, setObjectTypesRef } from '../mapGenerator';

// Feature: node-maps, Property 12: Reconciliation is a no-op when there is nothing to place
//
// Property 12: Reconciliation is a no-op when there is nothing to place.
// For any NodeMap whose placements already cover exactly the node's current POI
// children (no unplaced children and no stale placements), reconcilePlacements adds
// no placements and leaves the NodeMap structurally unchanged (returns false).
//
// Validates: Requirements 8.6

/**
 * Two stub map-capable types exercise both emptiness regimes, since reconcilePlacements
 * reads the node's type via objectTypesRef to resolve the ratio when sizing the grid:
 *  - 'continentStub' — emptinessRatio 0 (continent-like)
 *  - 'taigaStub'     — emptinessRatio 2 (> 0, taiga-like)
 */
const stubObjectTypes: Record<string, ObjectTypeTemplate> = {
  continentStub: { typeName: 'Continent Stub', mapCapable: true, emptinessRatio: 0 },
  taigaStub: { typeName: 'Taiga Stub', mapCapable: true, emptinessRatio: 2 },
};
setObjectTypesRef(stubObjectTypes);

/**
 * Generates an arbitrary array of child WorldNodes (0 to 12, inclusive) — including
 * the empty (zero-children) case. Each child is a plain data node; the index
 * guarantees distinct identity even when fast-check repeats a type/name string.
 */
const childrenArb: fc.Arbitrary<WorldNode[]> = fc
  .array(
    fc.record({
      type: fc.string({ minLength: 1, maxLength: 10 }),
      name: fc.string({ maxLength: 12 }),
    }),
    { minLength: 0, maxLength: 12 }
  )
  .map((specs) =>
    specs.map((spec, i): WorldNode => ({
      type: spec.type,
      name: `${spec.name}#${i}`,
    }))
  );

/**
 * A deep, order-preserving snapshot of the structurally significant fields of a
 * NodeMap: gridSize, manualGridSize, layoutSeed, and the placements array content
 * (each placement's childRef / col / row / userPositioned). This is what "left
 * structurally unchanged" means for Property 12.
 */
function snapshotMap(node: WorldNode) {
  const map = node.map!;
  return {
    gridSize: map.gridSize,
    manualGridSize: map.manualGridSize,
    layoutSeed: map.layoutSeed,
    placements: map.placements.map((p) => ({
      childRef: p.childRef,
      col: p.col,
      row: p.row,
      userPositioned: p.userPositioned,
    })),
  };
}

describe('Property 12: Reconciliation is a no-op when there is nothing to place', () => {
  it('returns false and leaves the map structurally unchanged when placements already cover all children', () => {
    fc.assert(
      fc.property(
        childrenArb,
        // Pick one of the two stub types so both emptiness ratios (0 and > 0) are exercised.
        fc.constantFrom('continentStub', 'taigaStub'),
        (children, type) => {
          const node: WorldNode = { type, children };

          // generateMap places exactly one placement per child, covering every current
          // POI child with no stale refs — the precondition for Property 12.
          generateMap(node);

          const before = snapshotMap(node);

          const changed = reconcilePlacements(node);

          // Nothing to place and nothing stale => reconciliation is a no-op.
          expect(changed).toBe(false);

          const after = snapshotMap(node);

          // Structurally unchanged: same grid size, manual size, seed, and placements.
          expect(after.gridSize).toBe(before.gridSize);
          expect(after.manualGridSize).toBe(before.manualGridSize);
          expect(after.layoutSeed).toBe(before.layoutSeed);
          expect(after.placements.length).toBe(before.placements.length);
          expect(after.placements).toEqual(before.placements);
        }
      ),
      { numRuns: 100 }
    );
  });
});
