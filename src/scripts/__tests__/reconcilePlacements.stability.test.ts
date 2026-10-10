import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import type { MapPlacement, NodeMap, ObjectTypeTemplate, WorldNode } from '../types';
import {
  assignChildRef,
  computeGridSize,
  generateMap,
  getEmptinessRatio,
  reconcilePlacements,
  resizeGrid,
  resolvePlacementChild,
  setObjectTypesRef,
} from '../mapGenerator';

// Feature: node-maps, Property 11: Incremental auto-placement places all unplaced children while preserving existing placements
//
// Property 11: Incremental auto-placement places all unplaced children while
// preserving existing placements.
// For any NodeMap and the node's current children, reconcilePlacements results in
// every current POI child having a placement, grows N only as needed so it is never
// below max(current gridSize, manualGridSize) while fitting all children plus the
// ratio's required void, and leaves every pre-existing placement unchanged in
// (col, row) and userPositioned flag — including every User_Positioned_Placement,
// which is authoritative over any seed-derived tile.
//
// Validates: Requirements 4.5, 4.7, 8.1, 8.2, 8.4, 10.8, 10.9

/**
 * Two stub map-capable types exercise both emptiness regimes:
 *  - 'continentStub' — emptinessRatio 0 (continent-like: no terrain between children)
 *  - 'taigaStub'     — emptinessRatio 2 (> 0, taiga-like: generic terrain between children)
 * reconcilePlacements reads the node's type via objectTypesRef to resolve the ratio,
 * so wiring these stubs covers both the ratio = 0 and ratio > 0 grid-sizing paths.
 */
const stubObjectTypes: Record<string, ObjectTypeTemplate> = {
  continentStub: { typeName: 'Continent Stub', mapCapable: true, emptinessRatio: 0 },
  taigaStub: { typeName: 'Taiga Stub', mapCapable: true, emptinessRatio: 2 },
};
setObjectTypesRef(stubObjectTypes);

/**
 * Generates distinct child WorldNodes. Each is a plain data node (no parent/
 * domElement) and the index guarantees distinct identity even when fast-check
 * repeats a type/name string.
 */
function makeChildren(count: number, prefix: string): WorldNode[] {
  const out: WorldNode[] = [];
  for (let i = 0; i < count; i++) {
    out.push({ type: 'poi', name: `${prefix}#${i}` });
  }
  return out;
}

describe('Property 11: Incremental auto-placement places all unplaced children while preserving existing placements', () => {
  it('places every unplaced child, grows N only as needed (never below the floor), and leaves pre-existing placements untouched', () => {
    fc.assert(
      fc.property(
        // Number of children that exist on the node when the map is first generated.
        fc.integer({ min: 0, max: 10 }),
        // Number of brand-new children added afterward (the Unplaced_Children).
        fc.integer({ min: 0, max: 10 }),
        // Which pre-existing placements to mark userPositioned, by a bitmask-ish seed.
        fc.integer({ min: 0, max: 0xffff }),
        // Optional manual grid size floor (0 = none set).
        fc.integer({ min: 0, max: 8 }),
        // Type under test: both emptiness regimes.
        fc.constantFrom('continentStub', 'taigaStub'),
        (initialCount, newCount, userMask, manualN, type) => {
          // --- Build a node with an existing, fully-generated map. ---
          const initialChildren = makeChildren(initialCount, 'init');
          const node: WorldNode = { type, children: initialChildren.slice() };
          generateMap(node);
          const map = node.map as NodeMap;

          // Mark a deterministic subset of pre-existing placements userPositioned,
          // giving them concrete authoritative coords (as a Map_Edit would).
          map.placements.forEach((p, i) => {
            if ((userMask >> (i % 16)) & 1) {
              p.userPositioned = true;
            }
          });

          // Optionally record a Manual_Grid_Size floor by performing a real manual
          // enlarge via resizeGrid — the only path that sets manualGridSize in
          // production. This preserves the production invariant that gridSize is
          // always >= manualGridSize (resizeGrid sets both together), rather than
          // inflating manualGridSize above gridSize (which can never happen for real
          // and would make a no-op reconcile spuriously look like it violated the
          // floor). We only ever grow, so no placement is disturbed.
          if (manualN > 0) {
            const target = Math.max(manualN, map.gridSize);
            if (target > map.gridSize) {
              resizeGrid(map, target, node);
            } else {
              map.manualGridSize = target;
            }
          }

          // Snapshot pre-existing placements by childRef -> {col,row,userPositioned}.
          const snapshot = new Map<string, { col: number; row: number; userPositioned: boolean }>();
          for (const p of map.placements) {
            snapshot.set(p.childRef, {
              col: p.col,
              row: p.row,
              userPositioned: p.userPositioned === true,
            });
          }
          const prevGridSize = map.gridSize;
          const manualGridSize = map.manualGridSize ?? 0;
          const floor = Math.max(prevGridSize, manualGridSize);

          // --- Add brand-new, unreferenced children (no mapRef). ---
          const newChildren = makeChildren(newCount, 'new');
          node.children = initialChildren.concat(newChildren);

          const totalChildren = node.children.length;
          const ratio = getEmptinessRatio(type);

          // --- Reconcile. ---
          const changed = reconcilePlacements(node);

          const reconciled = node.map as NodeMap;

          // 1. Every current POI child now has a resolvable placement.
          for (const child of node.children) {
            const placement = reconciled.placements.find(
              (p) => resolvePlacementChild(node, p) === child,
            );
            expect(placement).toBeDefined();
          }
          // Exactly one placement per current child (no duplicates, no stale left).
          expect(reconciled.placements.length).toBe(totalChildren);

          // 2. Grid grows only as needed and never below the floor; fits all
          //    children plus the ratio's required void.
          expect(reconciled.gridSize).toBeGreaterThanOrEqual(floor);
          const requiredFit = computeGridSize(totalChildren, ratio);
          expect(reconciled.gridSize).toBeGreaterThanOrEqual(requiredFit);
          // "Only as needed": never larger than the max of the floor and the fit.
          expect(reconciled.gridSize).toBe(Math.max(floor, requiredFit));

          // All placements sit on unique, in-range integer tiles.
          const seen = new Set<string>();
          for (const p of reconciled.placements) {
            expect(Number.isInteger(p.col)).toBe(true);
            expect(Number.isInteger(p.row)).toBe(true);
            expect(p.col).toBeGreaterThanOrEqual(0);
            expect(p.row).toBeGreaterThanOrEqual(0);
            expect(p.col).toBeLessThan(reconciled.gridSize);
            expect(p.row).toBeLessThan(reconciled.gridSize);
            const key = `${p.col},${p.row}`;
            expect(seen.has(key)).toBe(false);
            seen.add(key);
          }

          // 3. Every pre-existing placement keeps its exact (col,row) and
          //    userPositioned flag — matched by childRef.
          for (const [childRef, before] of snapshot) {
            const after = reconciled.placements.find((p) => p.childRef === childRef);
            expect(after).toBeDefined();
            expect(after!.col).toBe(before.col);
            expect(after!.row).toBe(before.row);
            expect(after!.userPositioned === true).toBe(before.userPositioned);
          }

          // Sanity: if there were truly unplaced children or a grid growth, the map
          // reports as changed.
          if (newCount > 0 || reconciled.gridSize !== prevGridSize) {
            expect(changed).toBe(true);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('preserves userPositioned coords as authoritative even when they clash with seed-derived placement regions', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 6 }),
        fc.integer({ min: 1, max: 8 }),
        fc.constantFrom('continentStub', 'taigaStub'),
        (initialCount, newCount, type) => {
          // Construct a NodeMap directly with pre-existing placements whose childRef
          // matches children's mapRef, forcing a specific authoritative layout.
          const initialChildren = makeChildren(initialCount, 'init');
          const placements: MapPlacement[] = initialChildren.map((child, i) => ({
            childRef: assignChildRef(child),
            col: i, // all on row 0 initially
            row: 0,
            userPositioned: true,
          }));
          const n = computeGridSize(initialCount, getEmptinessRatio(type));
          const gridSize = Math.max(n, initialCount); // ensure the row-0 line fits
          const map: NodeMap = {
            gridSize,
            layoutSeed: 2894771002,
            placements,
          };
          const node: WorldNode = {
            type,
            name: 'root',
            children: initialChildren.concat(makeChildren(newCount, 'new')),
            map,
          };

          // Snapshot the authoritative userPositioned placements.
          const snapshot = placements.map((p) => ({
            childRef: p.childRef,
            col: p.col,
            row: p.row,
          }));
          const floor = Math.max(gridSize, map.manualGridSize ?? 0);

          reconcilePlacements(node);
          const reconciled = node.map as NodeMap;

          // Every userPositioned placement is untouched and still authoritative.
          for (const before of snapshot) {
            const after = reconciled.placements.find((p) => p.childRef === before.childRef);
            expect(after).toBeDefined();
            expect(after!.col).toBe(before.col);
            expect(after!.row).toBe(before.row);
            expect(after!.userPositioned).toBe(true);
          }

          // All current children placed, grid never below floor, tiles unique.
          expect(reconciled.placements.length).toBe(node.children!.length);
          expect(reconciled.gridSize).toBeGreaterThanOrEqual(floor);
          const seen = new Set<string>();
          for (const p of reconciled.placements) {
            const key = `${p.col},${p.row}`;
            expect(seen.has(key)).toBe(false);
            seen.add(key);
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});
