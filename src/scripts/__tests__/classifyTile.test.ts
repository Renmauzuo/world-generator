import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import type { ObjectTypeTemplate, WorldNode } from '../types';
import {
  classifyTile,
  generateMap,
  getEmptinessRatio,
  setObjectTypesRef,
} from '../mapGenerator';

// Feature: node-maps, Property 5: Every grid cell classifies to exactly one tile kind
//
// Property 5: Every grid cell classifies to exactly one tile kind.
// For any NodeMap, each of the N² cells is classified as exactly one of
// Child_Tile (a placement occupies it), Terrain_Tile (empty and the type's
// emptiness ratio > 0), or Void_Tile (empty and the ratio is 0); for a ratio-0
// map no cell is a Terrain_Tile.
//
// Validates: Requirements 3.5, 3.7

const KNOWN_KINDS = ['child', 'terrain', 'void'] as const;

/**
 * Builds a node with `count` plain-data children (no parent/domElement) of a
 * fixed map-capable type. The children are the Points_Of_Interest that
 * generateMap places; their contents are irrelevant to tile classification.
 */
function buildNode(count: number): WorldNode {
  const children: WorldNode[] = [];
  for (let i = 0; i < count; i++) {
    children.push({ type: 'poi', name: `child#${i}` });
  }
  return { type: 'mapType', name: 'root', children };
}

/**
 * Wires a single stub map-capable type ('mapType') carrying the given emptiness
 * ratio, so generateMap/getEmptinessRatio read it through the normal resolver.
 */
function wireRatio(ratio: number): void {
  const objectTypes: Record<string, ObjectTypeTemplate> = {
    mapType: { typeName: 'Map Type', mapCapable: true, emptinessRatio: ratio },
  };
  setObjectTypesRef(objectTypes);
}

describe('Property 5: Every grid cell classifies to exactly one tile kind', () => {
  it('every N² cell is exactly one of child/terrain/void, child iff occupied, and ratio-0 maps have no terrain', () => {
    fc.assert(
      fc.property(
        // POI count, including zero (single-tile own-area map).
        fc.integer({ min: 0, max: 40 }),
        // Emptiness ratio: 0 (continent-like) and > 0 (taiga-like) both exercised.
        fc.double({ min: 0, max: 20, noNaN: true }),
        (count, ratio) => {
          wireRatio(ratio);
          const node = buildNode(count);
          const map = generateMap(node);

          // The ratio the generator actually used (resolved from the stub).
          const resolvedRatio = getEmptinessRatio(node.type);
          const n = map.gridSize;

          // Set of occupied cells, keyed "col,row" — the ground truth for Child_Tiles.
          const occupied = new Set(map.placements.map((p) => `${p.col},${p.row}`));

          let childCells = 0;
          let terrainCells = 0;
          let voidCells = 0;

          for (let row = 0; row < n; row++) {
            for (let col = 0; col < n; col++) {
              const kind = classifyTile(map, col, row, resolvedRatio);

              // Exactly one of the three known kinds (the return type is a single
              // value, so "exactly one" means it is a member of the known set).
              expect(KNOWN_KINDS).toContain(kind);

              const isOccupied = occupied.has(`${col},${row}`);
              if (kind === 'child') {
                childCells++;
                // 'child' is returned iff a placement occupies the cell.
                expect(isOccupied).toBe(true);
              } else {
                // Non-child cells must be empty.
                expect(isOccupied).toBe(false);
                if (resolvedRatio > 0) {
                  // ratio > 0: every non-child cell is terrain, none void.
                  expect(kind).toBe('terrain');
                  terrainCells++;
                } else {
                  // ratio 0: every non-child cell is void, no terrain cell exists.
                  expect(kind).toBe('void');
                  voidCells++;
                }
              }
            }
          }

          // Child cells exactly match the placement count (one placement per POI).
          expect(childCells).toBe(map.placements.length);

          // The three kinds partition the whole N² grid.
          expect(childCells + terrainCells + voidCells).toBe(n * n);

          // A ratio-0 map has no Terrain_Tiles.
          if (resolvedRatio === 0) {
            expect(terrainCells).toBe(0);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
