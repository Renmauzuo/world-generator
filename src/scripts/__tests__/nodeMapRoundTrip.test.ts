import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import type { MapPlacement, NodeMap, WorldNode } from '../types';

// Feature: node-maps, Property 7: NodeMap survives a serialize/deserialize round-trip
//
// Property 7: NodeMap survives a serialize/deserialize round-trip.
// For any NodeMap (including one with a manualGridSize, user-positioned placements,
// and an arbitrary layout seed), serializing the owning node with the existing
// replacer and then parsing yields a NodeMap structurally equal in gridSize,
// manualGridSize, layoutSeed, and every placement's childRef, col, row, and
// userPositioned flag; and the serialized output contains no `parent` or
// `domElement` keys.
//
// Validates: Requirements 4.3, 4.4, 5.4, 5.5, 9.8, 10.12

/**
 * Mirror of the key-dropping replacer in `stringifyNodes` (src/scripts/scripts.ts).
 *
 * `stringifyNodes` lives in the Rollup entry point, which is not exported and pulls
 * in jQuery/DOM-heavy modules that make importing it in a node-env test infeasible.
 * The replacer's only relevant behavior for this property is that it drops the live
 * `parent` and `domElement` back-references (the GM-only `children` filter is
 * orthogonal to maps). `map`/`mapRef`/placements are all plain data, so a round trip
 * through this replacer must preserve the NodeMap exactly — that is precisely what
 * Property 7 asserts.
 */
function stringifyNodesReplica(node: WorldNode): string {
  return JSON.stringify(node, (key, value) => {
    if (key === 'domElement' || key === 'parent') return undefined;
    return value;
  });
}

/** Arbitrary non-NaN integer layout seed across the full uint32 range (and beyond). */
const arbSeed = fc.integer({ min: -2_147_483_648, max: 4_294_967_295 });

/**
 * Arbitrary MapPlacement with a non-empty childRef, integer col/row, and an optional
 * userPositioned flag (sometimes absent, sometimes true — the two production states).
 */
const arbPlacement: fc.Arbitrary<MapPlacement> = fc.record(
  {
    childRef: fc.string({ minLength: 1, maxLength: 12 }),
    col: fc.integer({ min: 0, max: 32 }),
    row: fc.integer({ min: 0, max: 32 }),
    userPositioned: fc.option(fc.constant(true), { nil: undefined }),
  },
  { requiredKeys: ['childRef', 'col', 'row'] },
);

/**
 * Arbitrary NodeMap: random gridSize, optional manualGridSize, arbitrary seed, and a
 * list of placements with unique childRefs (childRefs are unique per map in
 * production — this keeps the structural comparison unambiguous).
 */
const arbNodeMap: fc.Arbitrary<NodeMap> = fc
  .record(
    {
      gridSize: fc.integer({ min: 1, max: 32 }),
      manualGridSize: fc.option(fc.integer({ min: 1, max: 32 }), { nil: undefined }),
      layoutSeed: arbSeed,
      placements: fc.uniqueArray(arbPlacement, {
        maxLength: 20,
        selector: (p) => p.childRef,
      }),
    },
    { requiredKeys: ['gridSize', 'layoutSeed', 'placements'] },
  );

describe('Property 7: NodeMap survives a serialize/deserialize round-trip', () => {
  it('preserves gridSize, manualGridSize, layoutSeed, and every placement field through serialize/parse, with no parent/domElement keys', () => {
    fc.assert(
      fc.property(arbNodeMap, fc.string(), (map, childName) => {
        // Attach the map to a node, and deliberately give the node live
        // parent/domElement-like back-references to prove the replacer drops them.
        const node: WorldNode = {
          type: 'continent',
          name: 'Root',
          map,
          children: [
            {
              type: 'poi',
              name: childName,
              // These are the exact keys the replacer must strip.
              parent: undefined as unknown as WorldNode,
              domElement: {} as unknown as JQuery,
            },
          ],
        };
        // A cyclic parent reference is the real-world shape; set it so a naive
        // JSON.stringify would throw without the replacer.
        node.children![0].parent = node;
        node.parent = node;

        const serialized = stringifyNodesReplica(node);

        // The serialized text must contain no parent/domElement keys.
        expect(serialized).not.toContain('"parent"');
        expect(serialized).not.toContain('"domElement"');

        const parsed = JSON.parse(serialized) as WorldNode;
        const roundTripped = parsed.map as NodeMap;

        // Structural equality of the scalar NodeMap fields.
        expect(roundTripped.gridSize).toBe(map.gridSize);
        expect(roundTripped.manualGridSize).toBe(map.manualGridSize);
        expect(roundTripped.layoutSeed).toBe(map.layoutSeed);

        // Each placement's childRef/col/row/userPositioned survives in order.
        expect(roundTripped.placements.length).toBe(map.placements.length);
        for (let i = 0; i < map.placements.length; i++) {
          const before = map.placements[i];
          const after = roundTripped.placements[i];
          expect(after.childRef).toBe(before.childRef);
          expect(after.col).toBe(before.col);
          expect(after.row).toBe(before.row);
          // Absent and `true` are the only production states; both must round-trip
          // to the same value (undefined stays undefined, true stays true).
          expect(after.userPositioned).toBe(before.userPositioned);
        }
      }),
      { numRuns: 100 },
    );
  });
});
