import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import type { MapPlacement, NodeMap, ObjectTypeTemplate, WorldNode } from '../types';
import {
  assignChildRef,
  classifyTile,
  generateChildRef,
  getEmptinessRatio,
  reconcilePlacements,
  resolvePlacementChild,
  setObjectTypesRef,
} from '../mapGenerator';

// Feature: node-maps, Property 9: Loading tolerates legacy and stale-reference data
//
// Property 9 (stale-reference half): For any NodeMap whose placements reference
// children that no longer exist among the node's current children,
// reconciliation/classification completes without error, keeps every placement
// whose child exists, and treats each unresolved placement's tile as freed
// (empty). The legacy (map-free load) half is covered by task 10.3.
//
// Validates: Requirements 5.6, 8.7

/**
 * Wires a single stub map-capable type carrying the given emptiness ratio, so
 * reconcilePlacements/getEmptinessRatio/classifyTile read it through the normal
 * resolver (no objectTypes import, matching the setObjectTypesRef pattern).
 */
function wireRatio(ratio: number): void {
  const objectTypes: Record<string, ObjectTypeTemplate> = {
    mapType: { typeName: 'Map Type', mapCapable: true, emptinessRatio: ratio },
    poi: { typeName: 'Point of Interest' },
  };
  setObjectTypesRef(objectTypes);
}

/**
 * Builds a node whose Node_Map contains a mix of placements:
 *  - `resolvableCount` placements whose childRef DOES correspond to a current child
 *    (the child is stamped with that same mapRef via assignChildRef, so it resolves);
 *  - `staleCount` placements whose childRef corresponds to NO current child
 *    (a removed/legacy reference — resolvePlacementChild returns undefined).
 *
 * There are NO unplaced children: every current child is already placed by a
 * resolvable placement. This is the "simple" scenario the task calls for — with
 * only stale placements to drop and nothing to auto-place, reconciliation should
 * drop all stale placements and leave only the resolvable ones.
 *
 * Tiles are laid out row-major on a grid just large enough to hold every placement
 * (resolvable + stale) uniquely, so the starting map is internally consistent.
 */
function buildStaleNode(
  resolvableCount: number,
  staleCount: number,
  ratio: number,
): WorldNode {
  const total = resolvableCount + staleCount;
  // A grid big enough to give every initial placement a unique cell.
  const n = Math.max(1, Math.ceil(Math.sqrt(total)));

  const children: WorldNode[] = [];
  const placements: MapPlacement[] = [];

  const coordOf = (i: number) => ({ col: i % n, row: Math.floor(i / n) });

  // Resolvable placements: create a real child and point a placement at it.
  for (let i = 0; i < resolvableCount; i++) {
    const child: WorldNode = { type: 'poi', name: `kept#${i}` };
    const childRef = assignChildRef(child); // stamps child.mapRef
    children.push(child);
    const { col, row } = coordOf(i);
    placements.push({ childRef, col, row });
  }

  // Stale placements: reference ids that no current child carries. We generate a
  // fresh id but DO NOT create (or keep) any child for it — the child was "removed".
  for (let i = 0; i < staleCount; i++) {
    const staleRef = generateChildRef();
    const { col, row } = coordOf(resolvableCount + i);
    placements.push({ childRef: staleRef, col, row });
  }

  const map: NodeMap = {
    gridSize: n,
    layoutSeed: 0xC0FFEE,
    placements,
  };

  return { type: 'mapType', name: 'root', children, map };
}

describe('Property 9: Loading tolerates legacy and stale-reference data (stale-reference half)', () => {
  it('reconciliation drops stale placements, keeps resolvable ones, and freed tiles classify as empty', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 20 }), // resolvable (surviving) placements
        fc.integer({ min: 0, max: 20 }), // stale (removed-child) placements
        fc.double({ min: 0, max: 10, noNaN: true }), // emptiness ratio
        (resolvableCount, staleCount, ratio) => {
          wireRatio(ratio);

          const node = buildStaleNode(resolvableCount, staleCount, ratio);
          const map = node.map!;

          // The grid size before reconciliation — it must never shrink on its own.
          const gridSizeBefore = map.gridSize;

          // Snapshot the resolvable placements' tiles before reconciliation so we
          // can assert survivors are left exactly where they were.
          const survivorTilesBefore = new Map<string, { col: number; row: number }>();
          for (const p of map.placements) {
            if (resolvePlacementChild(node, p)) {
              survivorTilesBefore.set(p.childRef, { col: p.col, row: p.row });
            }
          }
          // The tiles that WILL be freed (occupied only by stale placements).
          const freedTiles: Array<{ col: number; row: number }> = [];
          for (const p of map.placements) {
            if (!resolvePlacementChild(node, p)) {
              freedTiles.push({ col: p.col, row: p.row });
            }
          }

          // Reconciliation must complete without throwing (Req 8.7).
          expect(() => reconcilePlacements(node)).not.toThrow();

          const resolvedRatio = getEmptinessRatio(node.type);

          // Every remaining placement resolves to a current child — no stale
          // placement remains (Req 5.6, 8.7).
          for (const p of map.placements) {
            expect(resolvePlacementChild(node, p)).toBeDefined();
          }

          // Exactly the resolvable placements survive (none dropped, none added —
          // there are no unplaced children in this scenario).
          expect(map.placements.length).toBe(resolvableCount);

          // Surviving placements keep their original tile coordinate.
          for (const p of map.placements) {
            const before = survivorTilesBefore.get(p.childRef);
            expect(before).toBeDefined();
            expect(p.col).toBe(before!.col);
            expect(p.row).toBe(before!.row);
          }

          // classifyTile over the WHOLE grid completes without error, and each of
          // the freed tiles (former stale placements) is now empty — terrain or
          // void per the ratio, never 'child' (Req 8.7). We only assert emptiness
          // for freed tiles not re-occupied by a surviving placement.
          const occupied = new Set(map.placements.map((p) => `${p.col},${p.row}`));
          const n = map.gridSize;
          for (let row = 0; row < n; row++) {
            for (let col = 0; col < n; col++) {
              const kind = classifyTile(map, col, row, resolvedRatio);
              expect(['child', 'terrain', 'void']).toContain(kind);
            }
          }
          for (const tile of freedTiles) {
            if (occupied.has(`${tile.col},${tile.row}`)) {
              // Defensive: a survivor should never sit on a stale-only tile in this
              // scenario, but if coordinates coincided, skip the emptiness check.
              continue;
            }
            const kind = classifyTile(map, tile.col, tile.row, resolvedRatio);
            expect(kind).not.toBe('child');
            expect(kind).toBe(resolvedRatio > 0 ? 'terrain' : 'void');
          }

          // The grid never shrinks on its own: dropping stale placements frees
          // their tiles but leaves the grid at least as large as it was.
          expect(map.gridSize).toBeGreaterThanOrEqual(gridSizeBefore);
        },
      ),
      { numRuns: 100 },
    );
  });
});
