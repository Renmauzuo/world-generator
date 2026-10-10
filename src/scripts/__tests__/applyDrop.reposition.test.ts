import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import type { MapPlacement, NodeMap } from '../types';
import { applyDrop } from '../mapModal';

// Feature: node-maps, Property 13: Drag-to-reposition moves or swaps exactly the involved placements
//
// Property 13: Drag-to-reposition moves or swaps exactly the involved placements.
// For any NodeMap, dropping a dragged placement on an in-bounds empty tile sets that
// placement's (col,row) to the target and leaves all other placements unchanged;
// dropping on an in-bounds tile occupied by another placement exchanges exactly those
// two placements' coordinates; and in both cases every placement whose coordinate
// changed is marked userPositioned, with no other placement's flag altered.
//
// Validates: Requirements 9.2, 9.3, 9.4

interface Scenario {
  map: NodeMap;
  draggedRef: string;
  targetCol: number;
  targetRow: number;
  // The ref of the placement already occupying the target tile, or null if empty.
  occupantRef: string | null;
}

/**
 * Snapshot of a placement's mutable state, keyed by childRef, for before/after
 * comparison. Captures col/row and the userPositioned flag exactly.
 */
type Snapshot = Record<string, { col: number; row: number; userPositioned?: boolean }>;

function snapshot(placements: MapPlacement[]): Snapshot {
  const snap: Snapshot = {};
  for (const p of placements) {
    snap[p.childRef] = { col: p.col, row: p.row, userPositioned: p.userPositioned };
  }
  return snap;
}

/**
 * Builds a scenario: a NodeMap with `count` placements on distinct in-bounds tiles of
 * an N x N grid, a chosen dragged placement, and an in-bounds target tile that is
 * guaranteed != the dragged placement's own cell. The `occupied` flag decides whether
 * the target coincides with another placement (swap case) or is empty (move case).
 *
 * Distinct tiles are produced by taking the first `count` cells of a shuffled list of
 * all N*N cells, so every placement sits on a unique integer tile in [0, N-1].
 */
const scenarioArb: fc.Arbitrary<Scenario> = fc
  .record({
    gridSize: fc.integer({ min: 2, max: 6 }),
    // Up to N*N placements will be clamped to the number of available cells below.
    rawCount: fc.integer({ min: 1, max: 36 }),
    cellOrder: fc.array(fc.double({ min: 0, max: 1, noNaN: true }), {
      minLength: 36,
      maxLength: 36,
    }),
    draggedPick: fc.double({ min: 0, max: 1, noNaN: true }),
    occupied: fc.boolean(),
    occupantPick: fc.double({ min: 0, max: 1, noNaN: true }),
    emptyPick: fc.double({ min: 0, max: 1, noNaN: true }),
    // Pre-existing userPositioned flags vary per placement to prove unrelated flags
    // are never touched.
    flagSeeds: fc.array(fc.boolean(), { minLength: 36, maxLength: 36 }),
  })
  .map((raw): Scenario => {
    const N = raw.gridSize;
    // Build every in-bounds cell, then order it deterministically by the random keys.
    const allCells: Array<{ col: number; row: number }> = [];
    for (let row = 0; row < N; row++) {
      for (let col = 0; col < N; col++) {
        allCells.push({ col, row });
      }
    }
    const keyed = allCells.map((cell, i) => ({ cell, key: raw.cellOrder[i] ?? 0 }));
    keyed.sort((a, b) => a.key - b.key);
    const ordered = keyed.map((k) => k.cell);

    const totalCells = ordered.length; // N*N
    // Need at least 2 cells to form a swap; clamp count to available cells.
    const count = Math.max(1, Math.min(raw.rawCount, totalCells));

    const placements: MapPlacement[] = ordered.slice(0, count).map((cell, i) => ({
      childRef: `c${i}`,
      col: cell.col,
      row: cell.row,
      userPositioned: raw.flagSeeds[i] ? true : undefined,
    }));

    const map: NodeMap = {
      gridSize: N,
      layoutSeed: 42,
      placements,
    };

    // Pick the dragged placement.
    const draggedIdx = Math.min(count - 1, Math.floor(raw.draggedPick * count));
    const dragged = placements[draggedIdx];
    const draggedRef = dragged.childRef;

    // Decide swap vs move. Swap requires another placement to target. If there is
    // only one placement, fall back to the move case.
    const canSwap = count >= 2 && raw.occupied;

    if (canSwap) {
      // Choose an occupant placement other than the dragged one.
      const others = placements.filter((p) => p.childRef !== draggedRef);
      const occIdx = Math.min(others.length - 1, Math.floor(raw.occupantPick * others.length));
      const occupant = others[occIdx];
      return {
        map,
        draggedRef,
        targetCol: occupant.col,
        targetRow: occupant.row,
        occupantRef: occupant.childRef,
      };
    }

    // Move case: pick an empty in-bounds tile that is not the dragged placement's own
    // cell and not occupied by any placement. If the grid is fully packed (count ==
    // totalCells), there is no empty tile, so target another placement's cell instead
    // (which turns this into a swap); guard that below by reporting the occupant.
    const occupiedSet = new Set(placements.map((p) => `${p.col},${p.row}`));
    const emptyCells = ordered.filter((c) => !occupiedSet.has(`${c.col},${c.row}`));

    if (emptyCells.length > 0) {
      const emptyIdx = Math.min(
        emptyCells.length - 1,
        Math.floor(raw.emptyPick * emptyCells.length),
      );
      const target = emptyCells[emptyIdx];
      return {
        map,
        draggedRef,
        targetCol: target.col,
        targetRow: target.row,
        occupantRef: null,
      };
    }

    // Fully packed grid: target a different placement's cell (swap case).
    const others = placements.filter((p) => p.childRef !== draggedRef);
    const occupant = others[Math.min(others.length - 1, Math.floor(raw.occupantPick * others.length))];
    return {
      map,
      draggedRef,
      targetCol: occupant.col,
      targetRow: occupant.row,
      occupantRef: occupant.childRef,
    };
  });

describe('Property 13: Drag-to-reposition moves or swaps exactly the involved placements', () => {
  it('empty-target move changes only the dragged placement; occupied-target swap exchanges exactly two; both set userPositioned, no other flag changes', () => {
    fc.assert(
      fc.property(scenarioArb, (scenario) => {
        const { map, draggedRef, targetCol, targetRow, occupantRef } = scenario;

        const before = snapshot(map.placements);
        const draggedOrigin = { col: before[draggedRef].col, row: before[draggedRef].row };

        const changed = applyDrop(map, draggedRef, targetCol, targetRow);

        // Target != dragged's own cell by construction, and the target is always
        // in-bounds, so applyDrop always mutates (move or swap).
        expect(changed).toBe(true);

        const after = snapshot(map.placements);

        if (occupantRef === null) {
          // MOVE case (Req 9.2): dragged moves to the target.
          expect(after[draggedRef].col).toBe(targetCol);
          expect(after[draggedRef].row).toBe(targetRow);
          // Dragged is now userPositioned (Req 9.4).
          expect(after[draggedRef].userPositioned).toBe(true);

          // Every OTHER placement is unchanged in col/row AND userPositioned flag.
          for (const ref of Object.keys(before)) {
            if (ref === draggedRef) continue;
            expect(after[ref].col).toBe(before[ref].col);
            expect(after[ref].row).toBe(before[ref].row);
            expect(after[ref].userPositioned).toBe(before[ref].userPositioned);
          }
        } else {
          // SWAP case (Req 9.3): dragged takes the occupant's old cell; occupant takes
          // the dragged placement's old origin cell.
          expect(after[draggedRef].col).toBe(targetCol);
          expect(after[draggedRef].row).toBe(targetRow);
          expect(after[occupantRef].col).toBe(draggedOrigin.col);
          expect(after[occupantRef].row).toBe(draggedOrigin.row);

          // Both involved placements are userPositioned (Req 9.4).
          expect(after[draggedRef].userPositioned).toBe(true);
          expect(after[occupantRef].userPositioned).toBe(true);

          // Every placement other than the two involved is wholly unchanged.
          for (const ref of Object.keys(before)) {
            if (ref === draggedRef || ref === occupantRef) continue;
            expect(after[ref].col).toBe(before[ref].col);
            expect(after[ref].row).toBe(before[ref].row);
            expect(after[ref].userPositioned).toBe(before[ref].userPositioned);
          }
        }
      }),
      { numRuns: 100 },
    );
  });
});
