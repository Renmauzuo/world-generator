// @vitest-environment jsdom
import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest';
import type { NodeMap, ObjectTypeTemplate, WorldNode } from '../types';
import {
  openMapModal,
  initMapModal,
  setObjectTypesRef as setModalObjectTypesRef,
  setMarkUnsavedRef,
} from '../mapModal';
import { setObjectTypesRef as setGeneratorObjectTypesRef } from '../mapGenerator';

// Feature: node-maps, Task 20.2 — DOM/integration test for the manual-resize UI (jsdom).
//
// Under test: the `change` handler on `#map-grid-size` wired inside `initMapModal`
// (`handleGridSizeChange`). The handler reads the currently open node via
// `getCurrentMapNode` (set by `openMapModal`), validates an integer >= 1, calls
// `resizeGrid`, and on success re-renders + `markUnsaved` + syncs the input; on
// failure it `window.alert`s a reason-specific message and reverts the input.
//
// Asserts (per Requirements 10.1, 10.5, 10.7, 10.11):
//  - Enlarge updates the grid and records Manual_Grid_Size; a grid-changing resize
//    fires `markUnsaved` and the input reflects the new N (Req 10.2/10.3/10.11).
//  - Shrink-into-occupied is rejected with the occupied alert, grid unchanged, the
//    input reverts, and `markUnsaved` does NOT fire for the rejected resize (Req 10.5/10.11).
//  - Invalid input (0 / negative / non-numeric) reverts the input to the current N and
//    does not call resizeGrid/markUnsaved/alert (Req 10.1).
//
// This is an example/integration (DOM) test, not a property-based test.
//
// NOTE on the belowFloor rejection branch (Req 10.7): a *pure* belowFloor rejection
// (requested N' below the all-children floor F = ceil(sqrt(childCount)) WITHOUT any
// placement in the removed bands) is UNREACHABLE by construction given the
// implementation's rejection precedence and the uniqueness of child tiles:
//   - `resizeGrid` checks occupancy of the removed bands (col >= N' || row >= N')
//     BEFORE checking the floor.
//   - belowFloor means N' < ceil(sqrt(count)), i.e. N'^2 < count. By pigeonhole, count
//     placements cannot all fit within the [0, N'-1]^2 sub-grid (which holds only N'^2
//     distinct cells and placements never share a cell), so at least one placement must
//     sit at col >= N' or row >= N' — i.e. in a removed band — making the request fail
//     as 'occupied' first.
// Therefore belowFloor-without-occupied cannot be exercised through this UI handler;
// the floor rejection message is covered by the pure resizeGrid unit tests. Here we
// instead cover the two UI-reachable rejection/validation branches: occupied and
// invalid-input.

// --- Stub type keys --------------------------------------------------------------
const MAP_TYPE_TERRAIN = 'mapTypeTerrain'; // map-capable parent, emptinessRatio > 0
const MAP_TYPE_VOID = 'mapTypeVoid'; // map-capable parent, emptinessRatio 0
const CHILD_POINT = 'childPoint'; // non-map-capable child (point location)

const stubObjectTypes: Record<string, ObjectTypeTemplate> = {
  [MAP_TYPE_TERRAIN]: {
    typeName: 'Terrain Map Type',
    mapCapable: true,
    emptinessRatio: 2, // > 0 => empty cells classify as terrain
  },
  [MAP_TYPE_VOID]: {
    typeName: 'Void Map Type',
    mapCapable: true,
    emptinessRatio: 0, // 0 => empty cells classify as void
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
 * Install the single `#map-modal` with its body and the `#map-grid-size` number input,
 * mirroring the real markup the handler reads. Built ONCE for the suite: `initMapModal`
 * attaches the `change` listener to the live `#map-grid-size` exactly once (module-level
 * `wired` guard), so the input element and its listener must persist across tests — just
 * as the real app has a single, long-lived modal in the page. Returns the input element.
 */
function setupDom(): HTMLInputElement {
  document.body.innerHTML = `
    <div id="map-modal">
      <button id="map-modal-close"></button>
      <input id="map-grid-size" type="number" min="1" />
      <div id="map-modal-body"></div>
    </div>
  `;
  return document.getElementById('map-grid-size') as HTMLInputElement;
}

/**
 * Build a map-capable parent node with `children` placed on the supplied tiles. The
 * caller controls exact coordinates so the occupied bands are deterministic.
 */
function buildNode(
  parentType: string,
  gridSize: number,
  children: WorldNode[],
  placements: NodeMap['placements'],
): WorldNode {
  const map: NodeMap = {
    gridSize,
    layoutSeed: 123,
    placements,
  };
  return {
    type: parentType,
    name: 'Root',
    children,
    map,
  };
}

/** Make a point child with a stable mapRef so its placement resolves. */
function pointChild(ref: string, name: string): WorldNode {
  return { type: CHILD_POINT, name, mapRef: ref };
}

/** Set the input's value and dispatch a native `change` event, as the UI would. */
function dispatchResize(input: HTMLInputElement, value: string): void {
  input.value = value;
  input.dispatchEvent(new Event('change', { bubbles: true }));
}

describe('resize UI (jsdom) — #map-grid-size change handler', () => {
  let input: HTMLInputElement;
  let markUnsaved: ReturnType<typeof vi.fn>;
  let alertSpy: ReturnType<typeof vi.spyOn>;

  beforeAll(() => {
    // Build the single modal + input ONCE and wire the change handler onto the live
    // `#map-grid-size`. `initMapModal` binds the listener exactly once (module `wired`
    // guard), so re-creating the input per test would orphan the listener.
    input = setupDom();
    initMapModal();
  });

  beforeEach(() => {
    wireStubs();
    // Fresh markUnsaved + alert spies per test, re-wired through the forward references.
    markUnsaved = vi.fn();
    setMarkUnsavedRef(markUnsaved);
    alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
  });

  afterEach(() => {
    alertSpy.mockRestore();
  });

  it('enlarge updates the grid, records Manual_Grid_Size, fires markUnsaved, and syncs the input (Req 10.2/10.3/10.11)', () => {
    const n = 3;
    // One POI well within the grid so enlarging is unconstrained.
    const child = pointChild('ref-a', 'Alpha');
    const node = buildNode(MAP_TYPE_TERRAIN, n, [child], [
      { childRef: 'ref-a', col: 0, row: 0 },
    ]);

    openMapModal(node);
    // openMapModal reconciles + renders; opening with everything already placed is a
    // no-op reconcile, so markUnsaved should not have fired yet.
    markUnsaved.mockClear();
    expect(input.value).toBe(String(n)); // input reflects current N on open

    dispatchResize(input, String(n + 2));

    expect(node.map!.gridSize).toBe(n + 2);
    expect(node.map!.manualGridSize).toBe(n + 2);
    expect(markUnsaved).toHaveBeenCalledTimes(1); // grid-changing resize marks unsaved
    expect(input.value).toBe(String(n + 2)); // input synced to the new authoritative N
    expect(alertSpy).not.toHaveBeenCalled();

    // The grid actually grew: (n+2)*(n+2) tiles rendered.
    const body = document.getElementById('map-modal-body') as HTMLElement;
    expect(body.querySelectorAll('.map-tile').length).toBe((n + 2) * (n + 2));
  });

  it('shrink into an occupied band is rejected: occupied alert, grid unchanged, input reverts, no markUnsaved (Req 10.5/10.11)', () => {
    const n = 3;
    // A POI sits at the high-index edge (col === n-1). Shrinking to n-1 would remove
    // the band at index n-1, which this POI occupies => occupied rejection.
    const edgeChild = pointChild('ref-edge', 'Edge');
    const cornerChild = pointChild('ref-corner', 'Corner');
    const node = buildNode(MAP_TYPE_TERRAIN, n, [edgeChild, cornerChild], [
      { childRef: 'ref-edge', col: n - 1, row: 0 },
      { childRef: 'ref-corner', col: 0, row: 0 },
    ]);

    openMapModal(node);
    markUnsaved.mockClear();

    dispatchResize(input, String(n - 1));

    // Grid and placements unchanged.
    expect(node.map!.gridSize).toBe(n);
    expect(node.map!.manualGridSize).toBeUndefined();
    // User informed with the exact occupied message.
    expect(alertSpy).toHaveBeenCalledTimes(1);
    expect(alertSpy).toHaveBeenCalledWith(
      "Can't shrink: a point of interest occupies the area that would be removed.",
    );
    // Input reverted to the current (unchanged) N.
    expect(input.value).toBe(String(n));
    // A rejected resize must NOT mark unsaved.
    expect(markUnsaved).not.toHaveBeenCalled();
  });

  it('invalid input (0) reverts the input to the current N and does not resize/markUnsaved/alert (Req 10.1)', () => {
    const n = 2;
    const child = pointChild('ref-a', 'Alpha');
    const node = buildNode(MAP_TYPE_VOID, n, [child], [
      { childRef: 'ref-a', col: 0, row: 0 },
    ]);

    openMapModal(node);
    markUnsaved.mockClear();

    for (const bad of ['0', '-1', 'abc', '']) {
      dispatchResize(input, bad);
      expect(node.map!.gridSize).toBe(n); // never resized
      expect(input.value).toBe(String(n)); // reverted to current N
    }

    expect(node.map!.manualGridSize).toBeUndefined();
    expect(markUnsaved).not.toHaveBeenCalled();
    expect(alertSpy).not.toHaveBeenCalled();
  });

  it('a non-integer-but-numeric request is treated as its floored integer when valid (Req 10.1 guard)', () => {
    // Number.parseInt('4.9', 10) === 4, so '4.9' is accepted as 4 (an enlarge from 3).
    const n = 3;
    const child = pointChild('ref-a', 'Alpha');
    const node = buildNode(MAP_TYPE_TERRAIN, n, [child], [
      { childRef: 'ref-a', col: 0, row: 0 },
    ]);

    openMapModal(node);
    markUnsaved.mockClear();

    dispatchResize(input, '4.9');

    expect(node.map!.gridSize).toBe(4);
    expect(node.map!.manualGridSize).toBe(4);
    expect(markUnsaved).toHaveBeenCalledTimes(1);
    expect(input.value).toBe('4');
    expect(alertSpy).not.toHaveBeenCalled();
  });
});
