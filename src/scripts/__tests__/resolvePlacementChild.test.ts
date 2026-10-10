import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import type { MapPlacement, NodeMap, WorldNode } from '../types';
import { assignChildRef, resolvePlacementChild } from '../mapGenerator';

// Feature: node-maps, Property 10: Stable child references resolve while the child exists
//
// Property 10: Stable child references resolve while the child exists.
// For any NodeMap, each placement's childRef resolves to the represented current
// child via resolvePlacementChild, and that resolution still holds after a
// serialize/deserialize round trip for as long as the child remains in the node.
//
// Validates: Requirements 3.9

/**
 * Generates a set of distinct child WorldNodes. Each child is a plain data node
 * (no parent/domElement set) so the owning node can be JSON round-tripped directly.
 * The `name` disambiguates children in assertions; the index guarantees distinct
 * identity even when fast-check picks duplicate type strings.
 */
const childrenArb: fc.Arbitrary<WorldNode[]> = fc
  .array(
    fc.record({
      type: fc.string({ minLength: 1, maxLength: 10 }),
      name: fc.string({ maxLength: 12 }),
    }),
    { minLength: 0, maxLength: 8 }
  )
  .map((specs) =>
    specs.map((spec, i): WorldNode => ({
      type: spec.type,
      name: `${spec.name}#${i}`,
    }))
  );

/**
 * Builds a map-bearing node: assigns a stable childRef to each child via
 * assignChildRef (writing node.mapRef) and creates one MapPlacement per child
 * referencing that ref. Coordinates are irrelevant to Property 10 (resolution is
 * by childRef, not position) so they are laid out on a simple grid.
 */
function buildMapNode(children: WorldNode[]): WorldNode {
  const placements: MapPlacement[] = children.map((child, i) => ({
    childRef: assignChildRef(child),
    col: i,
    row: 0,
  }));
  const map: NodeMap = {
    gridSize: Math.max(1, children.length),
    layoutSeed: 123456789,
    placements,
  };
  return { type: 'continent', name: 'root', children, map };
}

describe('Property 10: Stable child references resolve while the child exists', () => {
  it('every childRef resolves to its child, before and after a JSON round-trip', () => {
    fc.assert(
      fc.property(childrenArb, (children) => {
        const node = buildMapNode(children);

        // Each placement's childRef resolves to the exact child it was built from.
        node.map!.placements.forEach((placement, i) => {
          const resolved = resolvePlacementChild(node, placement);
          expect(resolved).toBe(node.children![i]);
          expect(resolved!.mapRef).toBe(placement.childRef);
        });

        // JSON round-trip the node. Children carry no parent/domElement, so
        // JSON.stringify works directly; mapRef is a plain string that survives.
        const roundTripped: WorldNode = JSON.parse(JSON.stringify(node));

        // While the child remains in node.children, its placement's childRef still
        // resolves — now to the round-tripped child instance.
        roundTripped.map!.placements.forEach((placement, i) => {
          const resolved = resolvePlacementChild(roundTripped, placement);
          const expectedChild = roundTripped.children![i];
          expect(resolved).toBe(expectedChild);
          expect(resolved!.mapRef).toBe(placement.childRef);
          // Identity is preserved by matching mapRef, not array position: the
          // resolved child carries the same stable ref as the original child.
          expect(resolved!.mapRef).toBe(node.children![i].mapRef);
        });
      }),
      { numRuns: 100 }
    );
  });
});
