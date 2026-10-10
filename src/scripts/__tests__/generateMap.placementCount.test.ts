import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import type { ObjectTypeTemplate, WorldNode } from '../types';
import { generateMap, setObjectTypesRef } from '../mapGenerator';

// Feature: node-maps, Property 3: Generation produces one placement per POI child
//
// Property 3: Generation produces one placement per POI child.
// For any node, generateMap(node) produces exactly one Map_Placement per
// Point_Of_Interest child (so the number of Child_Tiles equals the POI count at
// generation time, including zero), and attaches the resulting NodeMap to the node.
//
// Validates: Requirements 2.2, 2.7, 3.1

/**
 * Two stub map-capable types exercise both emptiness regimes:
 *  - 'continentStub'  — emptinessRatio 0 (continent-like: no terrain between children)
 *  - 'taigaStub'      — emptinessRatio 2 (> 0, taiga-like: generic terrain between children)
 * generateMap reads the node's type via the objectTypesRef to resolve the ratio, so
 * wiring these stubs lets the test cover both ratio = 0 and ratio > 0 paths.
 */
const stubObjectTypes: Record<string, ObjectTypeTemplate> = {
  continentStub: { typeName: 'Continent Stub', mapCapable: true, emptinessRatio: 0 },
  taigaStub: { typeName: 'Taiga Stub', mapCapable: true, emptinessRatio: 2 },
};
setObjectTypesRef(stubObjectTypes);

/**
 * Generates an arbitrary array of child WorldNodes (0 to 12, inclusive) — the POIs
 * to be placed. Each child is a plain data node (no parent/domElement) so generateMap
 * can stamp a mapRef freely. The index guarantees distinct identity.
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

describe('Property 3: Generation produces one placement per POI child', () => {
  it('placement count equals POI count (including zero) and node.map is attached', () => {
    fc.assert(
      fc.property(
        childrenArb,
        // Pick one of the two stub types so both emptiness ratios (0 and > 0) are exercised.
        fc.constantFrom('continentStub', 'taigaStub'),
        (children, type) => {
          const node: WorldNode = { type, children };

          const map = generateMap(node);

          // node.map is attached and is the same object generateMap returned.
          expect(node.map).toBeDefined();
          expect(node.map).toBe(map);

          // Exactly one placement per POI child — including the zero-children case.
          expect(map.placements.length).toBe(children.length);
          expect(node.map!.placements.length).toBe(children.length);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('attaches a map with an empty placement list for a childless node', () => {
    fc.assert(
      fc.property(fc.constantFrom('continentStub', 'taigaStub'), (type) => {
        const node: WorldNode = { type, children: [] };

        const map = generateMap(node);

        expect(node.map).toBeDefined();
        expect(map.placements.length).toBe(0);
        // Zero-children map still represents the node's own area on a single tile.
        expect(map.gridSize).toBeGreaterThanOrEqual(1);
      }),
      { numRuns: 100 }
    );
  });
});
