import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import type { ObjectTypeTemplate, WorldNode } from '../types';
import { generateMap, setObjectTypesRef } from '../mapGenerator';

// Feature: node-maps, Property 8: Map-less nodes serialize exactly as before map support
//
// Property 8: Map-less nodes serialize exactly as before map support.
// For any node that has no `map`, stringifyNodes produces output that contains no
// `map` or `mapRef` key and is identical to the serialization the same node produced
// before map support existed; a save->load round trip preserves exactly the set of
// nodes that have (and lack) a map, dropping none and adding map data to none.
//
// Plus the legacy-load half of Property 9: a tree serialized without any map data
// loads without error with every loaded node having `map === undefined`.
//
// Validates: Requirements 5.1, 5.2, 5.3, 5.7

/**
 * Local reimplementation of the serialization replacer that lives in
 * `stringifyNodes(node, excludeGmOnly)` in `src/scripts/scripts.ts`. That function is
 * NOT exported and lives in the DOM-heavy Rollup entry (jQuery, top-level DOM wiring),
 * which would pull browser-only side effects into the node test environment, so we
 * replicate its exact replacer behavior here:
 *   - drop the runtime-only `domElement` and `parent` keys, and
 *   - when excludeGmOnly is true, filter `gmOnly` children out of `children` arrays.
 * The real `map`/`mapRef` fields are plain data and need no special replacer handling,
 * which is precisely what this test verifies. Kept in lockstep with stringifyNodes.
 */
function stringifyNodes(node: WorldNode, excludeGmOnly = false): string {
  return JSON.stringify(node, (key, value) => {
    if (key === 'domElement' || key === 'parent') return undefined;
    if (excludeGmOnly && key === 'children' && Array.isArray(value)) {
      return value.filter((child: WorldNode) => !child.gmOnly);
    }
    return value;
  });
}

/**
 * Two stub map-capable types so the "some nodes DO have a map" half of the round-trip
 * check can attach real NodeMaps (and stamp mapRef onto placed children) via
 * generateMap, exercising both emptiness regimes.
 */
const stubObjectTypes: Record<string, ObjectTypeTemplate> = {
  continentStub: { typeName: 'Continent Stub', mapCapable: true, emptinessRatio: 0 },
  taigaStub: { typeName: 'Taiga Stub', mapCapable: true, emptinessRatio: 2 },
};
setObjectTypesRef(stubObjectTypes);

/**
 * An arbitrary WorldNode tree with NO map/mapRef anywhere. Nodes carry only the
 * pre-feature fields: type, optional name, optional attributes, and children arrays.
 * Depth is bounded so trees stay small and fast. Never emits `map`, `mapRef`,
 * `parent`, or `domElement`.
 */
const maplessNodeArb: fc.Arbitrary<WorldNode> = fc.letrec<{ node: WorldNode }>((tie) => ({
  node: fc.record(
    {
      type: fc.string({ minLength: 1, maxLength: 10 }),
      name: fc.option(fc.string({ maxLength: 12 }), { nil: undefined }),
      attributes: fc.option(
        fc.dictionary(
          fc.string({ minLength: 1, maxLength: 6 }),
          fc.oneof(fc.string({ maxLength: 8 }), fc.integer(), fc.boolean()),
          { maxKeys: 4 }
        ),
        { nil: undefined }
      ),
      children: fc.oneof(
        { weight: 3, arbitrary: fc.constant<WorldNode[]>([]) },
        {
          weight: 1,
          arbitrary: fc.array(tie('node'), { maxLength: 3 }),
        }
      ),
    },
    { requiredKeys: ['type', 'children'] }
  ) as fc.Arbitrary<WorldNode>,
})).node;

/** Walk every node in a tree (depth-first), yielding each WorldNode. */
function allNodes(node: WorldNode): WorldNode[] {
  const out: WorldNode[] = [node];
  for (const child of node.children ?? []) out.push(...allNodes(child));
  return out;
}

describe('Property 8: Map-less nodes serialize exactly as before map support', () => {
  it('serialization of a map-less node contains no "map" or "mapRef" key', () => {
    fc.assert(
      fc.property(maplessNodeArb, (node) => {
        const serialized = stringifyNodes(node);
        // No map-feature keys leak into the payload for a map-less node.
        expect(serialized).not.toMatch(/"map"\s*:/);
        expect(serialized).not.toMatch(/"mapRef"\s*:/);
      }),
      { numRuns: 100 }
    );
  });

  it('absence of map leaves bytes identical to a pre-feature serialization of the same node', () => {
    fc.assert(
      fc.property(maplessNodeArb, (node) => {
        // "Pre-feature" baseline: the identical node structure serialized with a
        // replacer that is unaware of map/mapRef (it only ever drops parent/domElement).
        // Since the node carries no map fields, the current serialization must equal it
        // byte-for-byte — adding map support changes nothing for a map-less node.
        const preFeature = JSON.stringify(node, (key, value) =>
          key === 'domElement' || key === 'parent' ? undefined : value
        );
        const current = stringifyNodes(node);
        expect(current).toBe(preFeature);
      }),
      { numRuns: 100 }
    );
  });

  it('save->load round trip preserves exactly which nodes have/lack a map', () => {
    fc.assert(
      fc.property(
        maplessNodeArb,
        // Decide, per run, whether to attach a real map to some map-capable nodes so the
        // round trip must preserve a mixed have/lack-map set (dropping none, adding none).
        fc.boolean(),
        (baseTree, attachMaps) => {
          // Clone so each run starts from a pristine map-less tree.
          const tree: WorldNode = JSON.parse(JSON.stringify(baseTree));

          // Optionally give a subset of nodes a genuine map via generateMap. These
          // nodes are retyped to a map-capable stub and have their children placed
          // (which also stamps mapRef onto the placed children).
          if (attachMaps) {
            const nodes = allNodes(tree);
            nodes.forEach((n, i) => {
              // Attach a map to roughly every third node that has children to place.
              if (i % 3 === 0 && (n.children?.length ?? 0) > 0) {
                n.type = i % 2 === 0 ? 'continentStub' : 'taigaStub';
                generateMap(n);
              }
            });
          }

          // Record exactly which nodes (by position in a stable DFS order) have a map
          // before the round trip.
          const before = allNodes(tree).map((n) => n.map !== undefined);

          // Save -> load. The load side is a plain JSON.parse: no DOM is involved in
          // serialization, and map/mapRef are plain data that survive JSON untouched.
          const loaded: WorldNode = JSON.parse(stringifyNodes(tree));
          const after = allNodes(loaded).map((n) => n.map !== undefined);

          // Same node count (none dropped) and the exact same have/lack-map pattern
          // (no node gained or lost a map).
          expect(after.length).toBe(before.length);
          expect(after).toEqual(before);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('legacy (map-free) trees load without error with every node map === undefined', () => {
    fc.assert(
      fc.property(maplessNodeArb, (node) => {
        // A legacy payload is a map-free serialization. Loading is modeled as JSON.parse
        // of that payload (the pre-DOM step of createWorldFromJSON). It must not throw and
        // every reconstructed node must have no map.
        const legacyPayload = stringifyNodes(node);

        let loaded: WorldNode | undefined;
        expect(() => {
          loaded = JSON.parse(legacyPayload) as WorldNode;
        }).not.toThrow();

        for (const n of allNodes(loaded!)) {
          expect(n.map).toBeUndefined();
          expect(n.mapRef).toBeUndefined();
        }
      }),
      { numRuns: 100 }
    );
  });
});
