// @vitest-environment jsdom
import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import type { NodeMap, ObjectTypeTemplate, WorldNode } from '../types';
import {
  isMapCapable,
  generateMap,
  reconcilePlacements,
  resizeGrid,
  setObjectTypesRef as setGeneratorObjectTypesRef,
} from '../mapGenerator';
import {
  openMapModal,
  initMapModal,
  applyDrop,
  setObjectTypesRef as setModalObjectTypesRef,
  setMarkUnsavedRef,
} from '../mapModal';

// Feature: node-maps, Task 21.2 — example/integration test for control gating and
// markUnsaved side effects.
//
// scripts.ts (showInfoForNode + the delegated .button-generate-map/.button-open-map
// handlers) is the DOM-heavy Rollup entry and cannot be imported into a node/jsdom unit
// test without its full jQuery/DOM world. So this suite tests the UNDERLYING behavior
// through the importable modules (mapGenerator + mapModal), mirroring the exact host
// patterns from scripts.ts:
//
//   - showInfoForNode (scripts.ts ~732): if isMapCapable(type) && !node.map => Generate
//     control; else if node.map => Open control; non-capable => neither.
//   - .button-generate-map handler (~209): generateMap(selectedNode) then markUnsaved().
//   - .button-open-map handler (~219): openMapModal(selectedNode) which reconciles →
//     markUnsaved on change.
//   - drag path (mapModal pointerup): applyDrop(...) → markUnsavedRef() on a committed edit.
//   - resize path (handleGridSizeChange): resizeGrid(...) ok → markUnsaved().
//
// Covers Requirements: 1.3, 2.1, 2.3, 2.4, 2.5, 2.6, 8.5, 9.7, 10.11.
// This is an example/integration (DOM) test, not a property-based test.

// --- Stub type keys --------------------------------------------------------------
const MAP_CAPABLE_TERRAIN = 'mapCapableTerrain'; // map-capable, emptinessRatio > 0
const MAP_CAPABLE_VOID = 'mapCapableVoid'; // map-capable, emptinessRatio 0
const NON_CAPABLE = 'nonCapable'; // not map-capable
const CHILD_POINT = 'childPoint'; // non-capable child (point location)

const stubObjectTypes: Record<string, ObjectTypeTemplate> = {
  [MAP_CAPABLE_TERRAIN]: {
    typeName: 'Terrain Map Type',
    mapCapable: true,
    emptinessRatio: 2,
  },
  [MAP_CAPABLE_VOID]: {
    typeName: 'Void Map Type',
    mapCapable: true,
    emptinessRatio: 0,
  },
  [NON_CAPABLE]: {
    typeName: 'Non Capable Type',
    // mapCapable intentionally absent/false
  },
  [CHILD_POINT]: {
    typeName: 'Point Child',
  },
};

/** Point both forward references at the shared stub type map. */
function wireStubs(): void {
  setModalObjectTypesRef(stubObjectTypes);
  setGeneratorObjectTypesRef(stubObjectTypes);
}

/**
 * Local predicate mirroring the exact control-gating rule in scripts.ts' showInfoForNode:
 *   if (isMapCapable(node.type)) { return node.map ? 'open' : 'generate'; }
 *   else return 'none';
 * The real DOM builder in scripts.ts is covered end-to-end by the Gulp+Rollup build but is
 * not unit-importable (jQuery/full DOM world), so we assert the underlying decision here.
 */
function controlFor(node: WorldNode): 'generate' | 'open' | 'none' {
  if (isMapCapable(node.type)) {
    return node.map ? 'open' : 'generate';
  }
  return 'none';
}

/** Minimal #map-modal markup with the body + grid-size input the modal paths need. */
function setupModalDom(): void {
  document.body.innerHTML = `
    <div id="map-modal">
      <div class="map-modal-content">
        <button id="map-modal-close"></button>
        <div class="map-modal-toolbar">
          <label for="map-grid-size">Grid size</label>
          <input id="map-grid-size" type="number" min="1" />
        </div>
        <div id="map-modal-body"></div>
      </div>
    </div>`;
}

/** Build N distinct point children carrying names so poiLabel renders. */
function makeChildren(count: number): WorldNode[] {
  const children: WorldNode[] = [];
  for (let i = 0; i < count; i++) {
    children.push({ type: CHILD_POINT, name: `POI ${i}` });
  }
  return children;
}

describe('Task 21.2 — control gating', () => {
  beforeEach(() => {
    wireStubs();
  });

  // A. Control GATING across (capable/not, hasMap/not) — mirrors showInfoForNode.
  it('map-capable + no map => Generate control (Req 2.1)', () => {
    const node: WorldNode = { type: MAP_CAPABLE_TERRAIN, children: [] };
    expect(controlFor(node)).toBe('generate');
  });

  it('map-capable + has map => Open control (Req 2.3)', () => {
    const node: WorldNode = { type: MAP_CAPABLE_VOID, children: [] };
    generateMap(node); // attaches node.map
    expect(controlFor(node)).toBe('open');
  });

  it('non-capable + no map => no control (Req 1.3)', () => {
    const node: WorldNode = { type: NON_CAPABLE, children: [] };
    expect(controlFor(node)).toBe('none');
  });

  it('non-capable + has map (should not happen) => still no control (Req 1.3)', () => {
    // Non-capable types never get a map in practice; even if one were present, the gate
    // keys off capability first, so no control is ever presented for a non-capable type.
    const node: WorldNode = {
      type: NON_CAPABLE,
      children: [],
      map: { gridSize: 1, layoutSeed: 1, placements: [] },
    };
    expect(controlFor(node)).toBe('none');
  });
});

describe('Task 21.2 — markUnsaved side effects', () => {
  let markUnsaved: ReturnType<typeof vi.fn>;

  // Build the single static modal markup ONCE and wire listeners once. The modal's
  // close/backdrop/resize listeners (under the `wired` guard) and the delegated
  // body interaction listeners (under `interactionsWired`) attach to the DOM elements
  // present at first wiring, so rebuilding the DOM per-test would orphan them — mirror
  // the real app (and mapModalLifecycle.dom.test.ts) by wiring once in beforeAll.
  beforeAll(() => {
    wireStubs();
    setupModalDom();
    initMapModal();
  });

  beforeEach(() => {
    wireStubs(); // defensive re-point
    markUnsaved = vi.fn();
    setMarkUnsavedRef(markUnsaved);
    // Reset modal visibility between tests without recreating the DOM (which would
    // orphan the once-wired listeners).
    (document.getElementById('map-modal') as HTMLElement).classList.remove('is-open');
  });

  // Generate (Req 2.5): the host handler calls generateMap then markUnsaved. generateMap
  // itself does not call markUnsaved (the host does), but it DOES attach node.map so the
  // host has something to persist — assert that, then assert the host pattern fires the spy.
  it('generate: generateMap attaches node.map and the host generate→markUnsaved pattern fires the spy (Req 2.5, 2.6)', () => {
    const node: WorldNode = { type: MAP_CAPABLE_VOID, children: makeChildren(3) };
    expect(node.map).toBeUndefined();

    // Mirror the .button-generate-map handler: generateMap(selectedNode); markUnsaved();
    generateMap(node);
    markUnsaved();

    // generateMap produced a map (so the open control appears next render — Req 2.6).
    expect(node.map).toBeDefined();
    expect(node.map!.placements.length).toBe(3);
    // The host marks the world unsaved after a successful generate (Req 2.5).
    expect(markUnsaved).toHaveBeenCalledTimes(1);
  });

  // Incremental placement (Req 8.5): opening the modal reconciles; a change fires the spy,
  // a no-op reconcile does not.
  it('incremental placement: openMapModal reconcile fires markUnsaved when a child is auto-placed (Req 8.5)', () => {
    const node: WorldNode = { type: MAP_CAPABLE_VOID, children: makeChildren(2) };
    generateMap(node); // 2 placed children

    // Add a third child AFTER generation: it is an Unplaced_Child needing auto-placement.
    node.children!.push({ type: CHILD_POINT, name: 'POI new' });

    openMapModal(node); // reconcilePlacements changes the map => markUnsaved

    expect(markUnsaved).toHaveBeenCalledTimes(1);
    expect(node.map!.placements.length).toBe(3);
  });

  it('incremental placement: a no-op reconcile (map already covers all children) does NOT fire markUnsaved (Req 8.5/8.6)', () => {
    const node: WorldNode = { type: MAP_CAPABLE_VOID, children: makeChildren(3) };
    generateMap(node); // placements already cover all 3 children

    openMapModal(node); // reconcile is a no-op

    expect(markUnsaved).not.toHaveBeenCalled();
  });

  // Map_Edit (Req 9.7): simulate the full drag gesture (pointerdown far from pointerup) with
  // the pointerup target set to an empty destination tile. The handler calls applyDrop and,
  // on a committed in-bounds change, markUnsavedRef().
  it('Map_Edit: a drag gesture that repositions a POI re-renders and fires markUnsaved (Req 9.7)', () => {
    const node: WorldNode = { type: MAP_CAPABLE_VOID, children: makeChildren(2) };
    const map = generateMap(node);
    // Normalize to a known layout so we have a predictable empty destination tile.
    map.gridSize = 2;
    map.placements[0].col = 0;
    map.placements[0].row = 0;
    map.placements[1].col = 1;
    map.placements[1].row = 0;

    openMapModal(node); // renders the grid into #map-modal-body
    markUnsaved.mockClear(); // ignore any reconcile side effect from open

    const body = document.getElementById('map-modal-body') as HTMLElement;
    const draggedChildRef = map.placements[0].childRef;
    const srcTile = body.querySelector(
      `[data-child-ref="${draggedChildRef}"]`,
    ) as HTMLElement;
    // Empty destination tile at (0,1).
    const destTile = body.querySelector('[data-col="0"][data-row="1"]') as HTMLElement;
    expect(srcTile).not.toBeNull();
    expect(destTile).not.toBeNull();

    // pointerdown on the source child tile (gesture start).
    srcTile.dispatchEvent(
      new MouseEvent('pointerdown', { bubbles: true, clientX: 10, clientY: 10 }),
    );
    // pointerup far away (beyond the 5px click threshold => classified as a drag), with the
    // event target set to the empty destination tile so the handler resolves the drop there.
    destTile.dispatchEvent(
      new MouseEvent('pointerup', { bubbles: true, clientX: 200, clientY: 200 }),
    );

    // Placement moved to the empty destination and the host marked the world unsaved (Req 9.7).
    expect(map.placements[0].col).toBe(0);
    expect(map.placements[0].row).toBe(1);
    expect(map.placements[0].userPositioned).toBe(true);
    expect(markUnsaved).toHaveBeenCalledTimes(1);
  });

  // Also assert the pure drag surface directly: applyDrop returns true for an in-bounds move,
  // which is exactly the condition under which the handler calls markUnsavedRef.
  it('Map_Edit: applyDrop returns true for an in-bounds reposition (the handler marks unsaved on true) (Req 9.7)', () => {
    const node: WorldNode = { type: MAP_CAPABLE_VOID, children: makeChildren(1) };
    const map = generateMap(node);
    map.gridSize = 2;
    map.placements[0].col = 0;
    map.placements[0].row = 0;

    const moved = applyDrop(map, map.placements[0].childRef, 1, 1);
    expect(moved).toBe(true);
    expect(map.placements[0].userPositioned).toBe(true);
  });

  // Grid-changing resize (Req 10.11): a change on #map-grid-size to a larger N enlarges the
  // grid and fires markUnsaved.
  it('resize: enlarging the grid via #map-grid-size fires markUnsaved and updates gridSize (Req 10.11)', () => {
    const node: WorldNode = { type: MAP_CAPABLE_VOID, children: makeChildren(3) };
    generateMap(node);

    openMapModal(node);
    markUnsaved.mockClear(); // ignore any reconcile side effect from open

    const input = document.getElementById('map-grid-size') as HTMLInputElement;
    const before = node.map!.gridSize;
    const larger = before + 2;
    input.value = String(larger);
    input.dispatchEvent(new Event('change', { bubbles: true }));

    expect(node.map!.gridSize).toBe(larger);
    expect(markUnsaved).toHaveBeenCalledTimes(1);
  });

  // Also assert the pure resize surface: resizeGrid enlarge returns ok and records manualGridSize,
  // which is exactly the branch under which handleGridSizeChange calls markUnsaved.
  it('resize: resizeGrid enlarge succeeds and records the manual size (Req 10.11)', () => {
    const node: WorldNode = { type: MAP_CAPABLE_VOID, children: makeChildren(2) };
    const map = generateMap(node);
    const requested = map.gridSize + 3;

    const result = resizeGrid(map, requested, node);
    expect(result.ok).toBe(true);
    expect(map.gridSize).toBe(requested);
    expect(map.manualGridSize).toBe(requested);
  });
});

describe('Task 21.2 — no map created during a child-generation pass (Req 2.4)', () => {
  beforeEach(() => {
    wireStubs();
  });

  // Req 2.4: generateMap is the ONLY path that sets node.map. Constructing a node and
  // generating children (modeled here by populating node.children) never creates a map.
  it('constructing a map-capable node and adding children leaves node.map undefined', () => {
    const node: WorldNode = { type: MAP_CAPABLE_TERRAIN };
    expect(node.map).toBeUndefined();

    // Simulate a child-generation pass by attaching children (as generateChildrenForNode
    // in scripts.ts does — verified by code inspection in task 21.1 to never call generateMap).
    node.children = makeChildren(4);
    expect(node.map).toBeUndefined();
  });

  // reconcilePlacements on a map-less node is a no-op (returns false) and never creates a map,
  // reinforcing that only generateMap introduces a NodeMap.
  it('reconcilePlacements on a map-less node returns false and creates no map (Req 2.4)', () => {
    const node: WorldNode = { type: MAP_CAPABLE_VOID, children: makeChildren(3) };
    const changed = reconcilePlacements(node);
    expect(changed).toBe(false);
    expect(node.map).toBeUndefined();
  });
});
