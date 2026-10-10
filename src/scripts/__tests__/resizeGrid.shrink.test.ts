import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import type { MapPlacement, NodeMap, WorldNode } from '../types';
import { minGridSizeFor, resizeGrid, setObjectTypesRef } from '../mapGenerator';

// Feature: node-maps, Property 16: Shrink is safe — it refuses to drop any child and respects the floor
//
// Property 16: Shrink is safe — it refuses to drop any child and respects the floor.
// For a shrink request (N' < N):
//   - If any placement lies in a to-be-removed outer band (col >= N' or row >= N'),
//     the request is rejected with reason 'occupied' and the map is left completely
//     unchanged (gridSize and every placement identical to the snapshot). (Req 10.4, 10.5)
//   - Else if N' is below the all-children floor minGridSizeFor(childCount), the request
//     is rejected with reason 'belowFloor' carrying that floor, map unchanged. (Req 10.7)
//   - Otherwise the outer bands are removed: gridSize = N', manualGridSize = N', and
//     every surviving placement is unchanged. (Req 10.6, 10.10)
// The implementation checks OCCUPIED first, then belowFloor, so the expectation logic
// mirrors that precedence exactly.
//
// Validates: Requirements 10.4, 10.5, 10.6, 10.7, 10.10

// Minimal stub objectTypes — resizeGrid's math is driven entirely by `map`, but we wire
// a ref anyway to mirror the module's expected setup. The owning node's type need not be
// map-capable for the pure resize path.
setObjectTypesRef({
  continent: { typeName: 'Continent', mapCapable: true, emptinessRatio: 0 },
});

/**
 * Deep-clone a NodeMap for snapshotting (plain data, so JSON round-trip is sufficient).
 */
function snapshotMap(map: NodeMap): NodeMap {
  return JSON.parse(JSON.stringify(map));
}

/**
 * Build an N x N map with a set of placements, each on a unique in-range tile.
 * `placementCount` placements are laid out row-major so coordinates are distinct and
 * all lie within [0, N-1]. A subset of them is then (optionally) pushed into the outer
 * bands to exercise the 'occupied' rejection branch.
 */
interface Scenario {
  map: NodeMap;
  node: WorldNode;
  requestedN: number;
}

const scenarioArb: fc.Arbitrary<Scenario> = fc
  .integer({ min: 2, max: 10 }) // N (must be >= 2 so a smaller N' exists)
  .chain((n) =>
    fc.record({
      n: fc.constant(n),
      // requestedN strictly less than N (shrink).
      requestedN: fc.integer({ min: 1, max: n - 1 }),
      // Number of placements; capped at N*N so they fit.
      placementCount: fc.integer({ min: 0, max: n * n }),
      // Whether to deliberately place some POIs in the outer (to-be-removed) bands.
      forceOccupiedBand: fc.boolean(),
      layoutSeed: fc.integer({ min: 0, max: 2 ** 31 - 1 }),
    }),
  )
  .map(({ n, requestedN, placementCount, forceOccupiedBand, layoutSeed }) => {
    // Enumerate all cells row-major for deterministic unique assignment.
    const allCells: Array<{ col: number; row: number }> = [];
    for (let row = 0; row < n; row++) {
      for (let col = 0; col < n; col++) {
        allCells.push({ col, row });
      }
    }

    // Partition cells by whether they fall in the to-be-removed outer bands
    // (col >= requestedN || row >= requestedN).
    const inBand = allCells.filter((c) => c.col >= requestedN || c.row >= requestedN);
    const inInterior = allCells.filter((c) => c.col < requestedN && c.row < requestedN);

    // Choose cells for placements. To exercise all branches:
    //  - forceOccupiedBand && band has room => put at least one placement in a band.
    //  - otherwise prefer interior cells first (so survivors stay in range), spilling
    //    into bands only if the interior can't hold all placements.
    const chosen: Array<{ col: number; row: number }> = [];
    if (forceOccupiedBand && inBand.length > 0 && placementCount > 0) {
      chosen.push(inBand[0]);
    }
    const remainingNeeded = placementCount - chosen.length;
    const pool = [...inInterior, ...inBand].filter(
      (c) => !chosen.some((x) => x.col === c.col && x.row === c.row),
    );
    for (let i = 0; i < remainingNeeded && i < pool.length; i++) {
      chosen.push(pool[i]);
    }

    const placements: MapPlacement[] = chosen.map((c, i) => ({
      childRef: `ref-${i}`,
      col: c.col,
      row: c.row,
      ...(i % 3 === 0 ? { userPositioned: true } : {}),
    }));

    const map: NodeMap = {
      gridSize: n,
      layoutSeed,
      placements,
    };

    const node: WorldNode = { type: 'continent', name: 'root', map };

    return { map, node, requestedN };
  });

describe('Property 16: Shrink is safe — it refuses to drop any child and respects the floor', () => {
  it('rejects occupied/below-floor shrinks (map unchanged) and otherwise removes outer bands', () => {
    fc.assert(
      fc.property(scenarioArb, ({ map, node, requestedN }) => {
        const before = snapshotMap(map);
        const n = before.gridSize;

        // Precompute the expectation using the SAME precedence as the implementation:
        // occupied is checked BEFORE belowFloor.
        const occupied = before.placements.some(
          (p) => p.col >= requestedN || p.row >= requestedN,
        );
        const floor = minGridSizeFor(before.placements.length);

        const result = resizeGrid(map, requestedN, node);

        if (occupied) {
          // Rejected: reason 'occupied', map completely unchanged.
          expect(result.ok).toBe(false);
          expect(result).toMatchObject({ ok: false, reason: 'occupied', floor });
          expect(map.gridSize).toBe(before.gridSize);
          expect(map.placements).toEqual(before.placements);
          // manualGridSize must not have been introduced/changed.
          expect(map.manualGridSize).toBe(before.manualGridSize);
        } else if (requestedN < floor) {
          // Rejected: reason 'belowFloor', floor reported, map unchanged.
          expect(result.ok).toBe(false);
          expect(result).toMatchObject({ ok: false, reason: 'belowFloor', floor });
          expect(map.gridSize).toBe(before.gridSize);
          expect(map.placements).toEqual(before.placements);
          expect(map.manualGridSize).toBe(before.manualGridSize);
        } else {
          // Safe shrink: bands removed, grid + manual size recorded, survivors unchanged.
          expect(result.ok).toBe(true);
          expect(map.gridSize).toBe(requestedN);
          expect(map.manualGridSize).toBe(requestedN);
          // Every surviving placement is identical to its snapshot (none dropped, none
          // moved) and all lie within the new [0, requestedN-1] range.
          expect(map.placements).toEqual(before.placements);
          for (const p of map.placements) {
            expect(p.col).toBeLessThanOrEqual(requestedN - 1);
            expect(p.row).toBeLessThanOrEqual(requestedN - 1);
          }
        }

        // Sanity: requestedN was always a strict shrink.
        expect(requestedN).toBeLessThan(n);
      }),
      { numRuns: 100 },
    );
  });
});
