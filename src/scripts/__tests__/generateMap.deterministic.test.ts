import { afterEach, describe, it, expect, vi } from 'vitest';
import fc from 'fast-check';
import type { WorldNode } from '../types';
import { generateMap, classifyTile, getEmptinessRatio } from '../mapGenerator';

// Feature: node-maps, Property 6: Layout is deterministic in the seed
//
// Property 6 (generator layer): Layout is deterministic in the seed.
// For any layout seed and fixed child set, deriving the layout twice assigns each
// child the identical (col, row) and makes the identical clustered-versus-spread
// choice.
//
// generateMap draws its OWN fresh seed internally via Math.floor(Math.random() * 2**32),
// so a seed cannot be injected directly. Instead we stub Math.random to a single fixed
// float chosen per fast-check run: both generateMap calls then draw the identical seed
// and run the identical mulberry32 stream, so the whole layout derivation is reproduced.
// This exercises the real generateMap (seed draw, cluster/spread choice, cell ordering,
// placement assignment) rather than reconstructing the private algorithm.
//
// The clustered-vs-spread choice is `prng() < 0.5` — the first draw off the seeded
// stream. We assert it indirectly: identical seeds reproduce identical placements, which
// can only happen if the same branch (cluster or spread) was taken both times.
//
// Validates: Requirements 3.8, 4.2, 4.5

afterEach(() => {
  vi.restoreAllMocks();
});

/**
 * Builds a fresh node with `count` distinct children. A fresh set is used for each
 * generateMap call so childRef/mapRef assignment starts clean (generateMap stamps
 * mapRef onto placed children); identity across the two runs is compared positionally
 * by index, which is exactly the generation order generateMap uses.
 */
function makeNode(type: string, count: number): WorldNode {
  const children: WorldNode[] = [];
  for (let i = 0; i < count; i++) {
    children.push({ type: 'poi', name: `child#${i}` });
  }
  return { type, name: 'root', children };
}

describe('generateMap — Property 6: Layout is deterministic in the seed', () => {
  it('derives the identical (col,row) per child and the identical cluster/spread choice from an identical seed', () => {
    fc.assert(
      fc.property(
        // Node type: both map-capable (ratio 0 and ratio > 0 via stub) and unknown
        // types resolve a ratio through getEmptinessRatio (defaulting to 0), which is
        // all generateMap needs — we don't depend on objectTypes being wired here.
        fc.constantFrom('continent', 'coniferousForest', 'unknownType'),
        // POI count, including zero (empty placements) and larger clustered/spread grids.
        fc.integer({ min: 0, max: 12 }),
        // The fixed float Math.random returns for the whole run. This fully determines
        // the drawn seed (Math.floor(x * 2**32)) and every subsequent internal draw.
        fc.double({ min: 0, max: 1, noNaN: true, maxExcluded: true }),
        (type, count, fixedRandom) => {
          const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(fixedRandom);

          const node1 = makeNode(type, count);
          const node2 = makeNode(type, count);

          const map1 = generateMap(node1);
          const map2 = generateMap(node2);

          randomSpy.mockRestore();

          // Same seed drawn both times (Math.random fixed → same Math.floor(x*2**32)).
          expect(map1.layoutSeed).toBe(map2.layoutSeed);

          // Same grid size (deterministic in count + ratio).
          expect(map1.gridSize).toBe(map2.gridSize);

          // One placement per POI child, same order.
          expect(map1.placements.length).toBe(count);
          expect(map2.placements.length).toBe(count);

          // Each child (by generation index) lands on the identical (col, row).
          for (let i = 0; i < count; i++) {
            expect(map2.placements[i].col).toBe(map1.placements[i].col);
            expect(map2.placements[i].row).toBe(map1.placements[i].row);
          }

          // Identical implied cluster/spread choice: the full tile layout is a
          // function of (seed, count, ratio) only via the single cluster/spread
          // branch, so identical placements across both runs confirm the identical
          // branch was taken. Compare the derived tile-kind grid as an extra guard
          // that both maps classify every cell identically.
          const ratio = getEmptinessRatio(type);
          for (let c = 0; c < map1.gridSize; c++) {
            for (let r = 0; r < map1.gridSize; r++) {
              expect(classifyTile(map2, c, r, ratio)).toBe(
                classifyTile(map1, c, r, ratio),
              );
            }
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});
