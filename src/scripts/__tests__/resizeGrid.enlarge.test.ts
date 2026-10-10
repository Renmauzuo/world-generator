import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import type { MapPlacement, NodeMap, ObjectTypeTemplate, WorldNode } from '../types';
import {
  classifyTile,
  getEmptinessRatio,
  resizeGrid,
  setObjectTypesRef,
} from '../mapGenerator';

// Feature: node-maps, Property 15: Enlarge preserves placements and records the manual size
//
// Property 15: Enlarge preserves placements and records the manual size.
// For any NodeMap and requested side length N' > N, resizeGrid sets gridSize = N',
// records manualGridSize = N', keeps every placement's (col, row), childRef, and
// userPositioned flag unchanged, and the newly added high-index cells classify as
// empty (Terrain where ratio > 0, Void where ratio = 0).
//
// Validates: Requirements 10.2, 10.3, 10.10

/**
 * Wires a single stub map-capable type ('mapType') carrying the given emptiness
 * ratio, so getEmptinessRatio reads it through the normal resolver. Exercises both
 * the ratio-0 (continent-like → Void) and ratio-> 0 (taiga-like → Terrain) edges.
 */
function wireRatio(ratio: number): void {
  const objectTypes: Record<string, ObjectTypeTemplate> = {
    mapType: { typeName: 'Map Type', mapCapable: true, emptinessRatio: ratio },
  };
  setObjectTypesRef(objectTypes);
}

/**
 * Deterministically lay out `placementCount` placements on unique in-range tiles of
 * an N x N grid in row-major order (so no two share a cell and all sit at col/row < N).
 * Marks every other placement userPositioned so the "flag unchanged" assertion has
 * both true and false (and undefined) cases to preserve.
 */
function buildPlacements(placementCount: number, n: number): MapPlacement[] {
  const placements: MapPlacement[] = [];
  for (let i = 0; i < placementCount; i++) {
    const col = i % n;
    const row = Math.floor(i / n);
    const p: MapPlacement = { childRef: `c${i}`, col, row };
    if (i % 2 === 0) {
      p.userPositioned = true;
    }
    placements.push(p);
  }
  return placements;
}

/** A snapshot of a placement's observable fields for before/after comparison. */
function snapshot(placements: MapPlacement[]) {
  return placements.map((p) => ({
    childRef: p.childRef,
    col: p.col,
    row: p.row,
    userPositioned: p.userPositioned,
  }));
}

describe('Property 15: Enlarge preserves placements and records the manual size', () => {
  it('sets gridSize/manualGridSize to N\u2032, leaves every placement unchanged, and classifies added cells as empty', () => {
    fc.assert(
      fc.property(
        // Current side length N (>= 1).
        fc.integer({ min: 1, max: 20 }),
        // Growth delta so requested N' = N + delta is strictly greater than N.
        fc.integer({ min: 1, max: 20 }),
        // Number of placements to fit within the current N x N grid.
        fc.integer({ min: 0, max: 400 }),
        // Emptiness ratio: 0 (Void edge) and > 0 (Terrain edge) both exercised.
        fc.double({ min: 0, max: 10, noNaN: true }),
        (n, delta, rawCount, ratio) => {
          wireRatio(ratio);

          // Keep placements within the current grid (unique cells, col/row < n).
          const placementCount = Math.min(rawCount, n * n);
          const requestedN = n + delta; // strictly > n → enlarge path

          const map: NodeMap = {
            gridSize: n,
            layoutSeed: 12345,
            placements: buildPlacements(placementCount, n),
          };
          const node: WorldNode = { type: 'mapType', name: 'root' };

          const before = snapshot(map.placements);

          const result = resizeGrid(map, requestedN, node);

          // Enlarge always succeeds.
          expect(result.ok).toBe(true);

          // gridSize and manualGridSize both become the requested value (Req 10.2).
          expect(map.gridSize).toBe(requestedN);
          expect(map.manualGridSize).toBe(requestedN);

          // Every placement unchanged in childRef, (col, row), and userPositioned flag.
          expect(snapshot(map.placements)).toEqual(before);

          // Newly added high-index cells (col >= n or row >= n) are empty and classify
          // as Terrain where ratio > 0, else Void — never 'child' (Req 10.3).
          const resolvedRatio = getEmptinessRatio(node.type);
          const expectedEmptyKind = resolvedRatio > 0 ? 'terrain' : 'void';
          for (let row = 0; row < requestedN; row++) {
            for (let col = 0; col < requestedN; col++) {
              if (col >= n || row >= n) {
                expect(classifyTile(map, col, row, resolvedRatio)).toBe(expectedEmptyKind);
              }
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
