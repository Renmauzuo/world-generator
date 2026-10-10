import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import type { ObjectTypeTemplate, WorldNode } from '../types';
import { generateMap, setObjectTypesRef } from '../mapGenerator';

// Feature: node-maps, Property 4: Placements occupy unique, in-range integer tiles
//
// Property 4: Placements occupy unique, in-range integer tiles.
// For any NodeMap produced by generateMap, every placement's (col, row) are
// integers in [0, N-1] and no two placements share a tile.
//
// Validates: Requirements 3.2, 3.3, 8.3

/**
 * The two map-capable type keys exercised here: one continent-like (emptiness
 * ratio 0 — no terrain between children) and one taiga-like (ratio > 0 — generic
 * terrain fills between children). Stubbing both ensures the uniqueness/in-range
 * invariant holds regardless of how N is derived from the ratio.
 */
const RATIO_ZERO_TYPE = 'continentStub';
const RATIO_POS_TYPE = 'forestStub';

const objectTypesStub: Record<string, ObjectTypeTemplate> = {
  [RATIO_ZERO_TYPE]: { typeName: 'Continent Stub', mapCapable: true, emptinessRatio: 0 },
  [RATIO_POS_TYPE]: { typeName: 'Forest Stub', mapCapable: true, emptinessRatio: 2.5 },
};

/**
 * Arbitrary array of plain child WorldNodes (including the empty array). Children
 * only need to be distinct object references — generateMap stamps each with a
 * mapRef and places exactly one per child.
 */
const childrenArb: fc.Arbitrary<WorldNode[]> = fc
  .nat({ max: 40 })
  .map((count) =>
    Array.from({ length: count }, (_unused, i) => ({
      type: 'childStub',
      name: `child-${i}`,
    }))
  );

const typeArb: fc.Arbitrary<string> = fc.constantFrom(RATIO_ZERO_TYPE, RATIO_POS_TYPE);

describe('Property 4: Placements occupy unique, in-range integer tiles', () => {
  it('every placement is an integer tile in [0, N-1] with no two sharing a tile', () => {
    setObjectTypesRef(objectTypesStub);

    fc.assert(
      fc.property(typeArb, childrenArb, (type, children) => {
        const node: WorldNode = { type, children };
        const map = generateMap(node);

        const n = node.map!.gridSize;
        expect(map).toBe(node.map);

        for (const p of map.placements) {
          // Integer coordinates.
          expect(Number.isInteger(p.col)).toBe(true);
          expect(Number.isInteger(p.row)).toBe(true);
          // In range [0, N-1].
          expect(p.col).toBeGreaterThanOrEqual(0);
          expect(p.col).toBeLessThanOrEqual(n - 1);
          expect(p.row).toBeGreaterThanOrEqual(0);
          expect(p.row).toBeLessThanOrEqual(n - 1);
        }

        // No two placements share a tile.
        const occupied = new Set(map.placements.map((p) => `${p.col},${p.row}`));
        expect(occupied.size).toBe(map.placements.length);
      }),
      { numRuns: 100 }
    );
  });
});
