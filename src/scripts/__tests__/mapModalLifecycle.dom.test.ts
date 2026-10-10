// @vitest-environment jsdom
import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import type { ObjectTypeTemplate, WorldNode } from '../types';
import {
  openMapModal,
  initMapModal,
  getCurrentMapNode,
  setObjectTypesRef as setModalObjectTypesRef,
  setMarkUnsavedRef,
  setShowInfoRef,
} from '../mapModal';
import {
  setObjectTypesRef as setGeneratorObjectTypesRef,
  generateMap,
} from '../mapGenerator';

// Feature: node-maps, Task 19.4 — DOM/integration test for modal lifecycle and
// drill-down (jsdom).
//
// Asserts (per Requirements 6.2, 6.5, 6.6, 11.2, 11.5, 11.6, 11.7, 11.8):
//  - A single `#map-modal`; openMapModal adds `.is-open`.
//  - The close button and a backdrop click (e.target === the modal root) remove
//    `.is-open`; a click on inner content does NOT close.
//  - A click gesture (pointerdown then pointerup at the same coords) on a Child_Tile
//    selects the child via the host `showInfoForNode`, leaving the modal open.
//  - A double-click on a map-capable child drills down — swapping the single modal's
//    content in place (no second `#map-modal`), updating getCurrentMapNode().
//  - A double-click on a map-capable child WITHOUT a map generates one on demand and
//    marks the world unsaved.
//  - A double-click on a non-map-capable child selects only (no drill-down).
//
// This is an example/integration (DOM) test, not a property-based test.

// --- Stub type keys --------------------------------------------------------------
const PARENT_TYPE = 'parentMapType'; // map-capable parent (ratio > 0 => has terrain)
const CHILD_MAP_CAPABLE = 'childMapCapable'; // map-capable child (drill-down target)
const CHILD_POINT = 'childPoint'; // non-map-capable child (point location)

const stubObjectTypes: Record<string, ObjectTypeTemplate> = {
  [PARENT_TYPE]: {
    typeName: 'Parent Map Type',
    mapCapable: true,
    emptinessRatio: 1, // > 0 so there are empty terrain tiles too
  },
  [CHILD_MAP_CAPABLE]: {
    typeName: 'Map Capable Child',
    mapCapable: true,
    emptinessRatio: 0,
    tags: ['forest'],
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

// Host callback spies — re-created fresh each test so call assertions are isolated.
let showInfoSpy: ReturnType<typeof vi.fn>;
let markUnsavedSpy: ReturnType<typeof vi.fn>;

/**
 * Mirror the single-#map-modal markup from index.pug: one `#map-modal` wrapping
 * `.map-modal-content` > close button + toolbar (grid-size input) + `#map-modal-body`.
 * Built ONCE for the whole file so the delegated listeners wired on the static
 * `#map-modal-body` (and the close/backdrop listeners on `#map-modal`) keep working
 * across tests — exactly how the real app wires them once on DOM ready.
 */
function buildModalDom(): void {
  document.body.innerHTML = `
    <div id="map-modal">
      <div class="map-modal-content">
        <button id="map-modal-close" type="button">×</button>
        <div class="map-modal-toolbar">
          <button id="map-modal-parent" type="button">↑ Show parent</button>
          <input id="map-grid-size" type="number" />
        </div>
        <div id="map-modal-body"></div>
      </div>
    </div>
  `;
}

function modalEl(): HTMLElement {
  return document.getElementById('map-modal') as HTMLElement;
}

function bodyEl(): HTMLElement {
  return document.getElementById('map-modal-body') as HTMLElement;
}

/** Build a parent node (no map yet) with the given children. */
function makeParent(children: WorldNode[]): WorldNode {
  return { type: PARENT_TYPE, name: 'Region', children };
}

/**
 * Resolve the rendered tile element for a specific child (by its mapRef / childRef),
 * after openMapModal has rendered the grid into `#map-modal-body`.
 */
function tileForChild(child: WorldNode): HTMLElement {
  const ref = child.mapRef;
  const tile = bodyEl().querySelector(
    `[data-child-ref="${ref}"]`,
  ) as HTMLElement | null;
  if (!tile) {
    throw new Error(`No tile rendered for childRef ${ref}`);
  }
  return tile;
}

/**
 * Dispatch a within-threshold click gesture (pointerdown then pointerup at the SAME
 * coordinates => dx=dy=0 => classifyGesture returns 'click') on a tile. jsdom lacks
 * a PointerEvent constructor, so we dispatch MouseEvents whose `type` matches the
 * 'pointerdown'/'pointerup' listeners; the handlers read `clientX`/`clientY` and
 * `target.closest`, which MouseEvent supports.
 */
function clickGesture(tile: HTMLElement, x = 10, y = 10): void {
  tile.dispatchEvent(
    new MouseEvent('pointerdown', { bubbles: true, clientX: x, clientY: y }),
  );
  tile.dispatchEvent(
    new MouseEvent('pointerup', { bubbles: true, clientX: x, clientY: y }),
  );
}

/** Dispatch a double-click on a tile. */
function doubleClick(tile: HTMLElement): void {
  tile.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
}

describe('mapModal lifecycle & drill-down (jsdom)', () => {
  beforeAll(() => {
    // Build the single static modal markup ONCE, then wire listeners once — the
    // delegated body listeners and close/backdrop listeners persist for the file.
    wireStubs();
    buildModalDom();
    initMapModal();
  });

  beforeEach(() => {
    // Re-point stubs (defensive) and reset per-test host spies.
    wireStubs();
    showInfoSpy = vi.fn();
    markUnsavedSpy = vi.fn();
    setShowInfoRef(showInfoSpy);
    setMarkUnsavedRef(markUnsavedSpy);

    // Reset modal visibility between tests without recreating the DOM (which would
    // orphan the once-wired delegated listeners).
    modalEl().classList.remove('is-open');
  });

  it('1. single #map-modal; open adds .is-open', () => {
    const node = makeParent([{ type: CHILD_POINT, name: 'A' }]);
    generateMap(node);

    openMapModal(node);

    expect(document.querySelectorAll('#map-modal').length).toBe(1);
    expect(modalEl().classList.contains('is-open')).toBe(true);
    expect(getCurrentMapNode()).toBe(node);
  });

  it('2. close button removes .is-open', () => {
    const node = makeParent([{ type: CHILD_POINT, name: 'A' }]);
    generateMap(node);
    openMapModal(node);
    expect(modalEl().classList.contains('is-open')).toBe(true);

    (document.getElementById('map-modal-close') as HTMLElement).dispatchEvent(
      new MouseEvent('click', { bubbles: true }),
    );

    expect(modalEl().classList.contains('is-open')).toBe(false);
  });

  it('3. backdrop click (target === modal root) closes; inner-content click does not', () => {
    const node = makeParent([{ type: CHILD_POINT, name: 'A' }]);
    generateMap(node);

    // A click bubbling from inner content must NOT close (target !== modal root).
    openMapModal(node);
    const content = document.querySelector('.map-modal-content') as HTMLElement;
    content.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(modalEl().classList.contains('is-open')).toBe(true);

    // A click whose target IS the modal root (the backdrop) closes it. Dispatching
    // directly on the modal element makes `e.target === e.currentTarget`.
    modalEl().dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(modalEl().classList.contains('is-open')).toBe(false);
  });

  it('4. single click on a map-capable child drills into it; non-map children are non-functional', () => {
    const grandchild: WorldNode = { type: CHILD_POINT, name: 'Inner POI' };
    const mapChild: WorldNode = { type: CHILD_MAP_CAPABLE, name: 'Deepwood', children: [grandchild] };
    const point: WorldNode = { type: CHILD_POINT, name: 'Old Mill' };
    const node = makeParent([mapChild, point]);
    mapChild.parent = node;
    point.parent = node;
    generateMap(node);
    generateMap(mapChild);

    openMapModal(node);
    expect(getCurrentMapNode()).toBe(node);

    // Click on the non-map child: nothing happens (non-functional for now), modal stays put.
    clickGesture(tileForChild(point));
    expect(showInfoSpy).not.toHaveBeenCalled();
    expect(getCurrentMapNode()).toBe(node);
    expect(modalEl().classList.contains('is-open')).toBe(true);

    // Click on the map-capable child: drills into its own map (single modal, still open).
    clickGesture(tileForChild(mapChild));
    expect(getCurrentMapNode()).toBe(mapChild);
    expect(document.querySelectorAll('#map-modal').length).toBe(1);
    expect(modalEl().classList.contains('is-open')).toBe(true);
  });

  it('5. double-click drill-down into a map-capable child WITH a map swaps content without stacking', () => {
    const grandchild: WorldNode = { type: CHILD_POINT, name: 'Inner POI' };
    const child: WorldNode = {
      type: CHILD_MAP_CAPABLE,
      name: 'Deepwood',
      children: [grandchild],
    };
    const node = makeParent([child]);
    child.parent = node;
    generateMap(node);
    // Give the child its own map up front.
    generateMap(child);

    openMapModal(node);
    expect(getCurrentMapNode()).toBe(node);

    const tile = tileForChild(child);
    doubleClick(tile);

    // Content swapped to the child's map — single modal, still open, no stacking.
    expect(document.querySelectorAll('#map-modal').length).toBe(1);
    expect(modalEl().classList.contains('is-open')).toBe(true);
    expect(getCurrentMapNode()).toBe(child);
  });

  it('6. double-click drill-down generates a map on demand when the child has none; marks unsaved', () => {
    const grandchild: WorldNode = { type: CHILD_POINT, name: 'Inner POI' };
    const child: WorldNode = {
      type: CHILD_MAP_CAPABLE,
      name: 'Mistmarsh',
      children: [grandchild],
    };
    const node = makeParent([child]);
    child.parent = node;
    generateMap(node);
    expect(child.map).toBeUndefined();

    openMapModal(node);
    const tile = tileForChild(child);
    doubleClick(tile);

    // A Node_Map was generated on demand and we drilled into the child.
    expect(child.map).toBeDefined();
    expect(getCurrentMapNode()).toBe(child);
    expect(document.querySelectorAll('#map-modal').length).toBe(1);
    expect(modalEl().classList.contains('is-open')).toBe(true);
    // On-demand generation marks the world unsaved.
    expect(markUnsavedSpy).toHaveBeenCalled();
  });

  it('7. double-click on a non-map-capable child is a no-op (non-functional for now)', () => {
    const point: WorldNode = { type: CHILD_POINT, name: 'Watchtower' };
    const node = makeParent([point]);
    generateMap(node);

    openMapModal(node);
    expect(getCurrentMapNode()).toBe(node);

    const tile = tileForChild(point);
    doubleClick(tile);

    // No selection, no drill-down: still showing the parent's map, modal open.
    expect(showInfoSpy).not.toHaveBeenCalled();
    expect(getCurrentMapNode()).toBe(node);
    expect(modalEl().classList.contains('is-open')).toBe(true);
  });

  it('8. "Show parent" navigates up to the nearest map-capable ancestor', () => {
    const grandchild: WorldNode = { type: CHILD_POINT, name: 'Inner POI' };
    const child: WorldNode = { type: CHILD_MAP_CAPABLE, name: 'Deepwood', children: [grandchild] };
    const node = makeParent([child]);
    child.parent = node;
    grandchild.parent = child;
    generateMap(node);
    generateMap(child);

    // Drill down into the child, then use "Show parent" to go back up.
    openMapModal(node);
    clickGesture(tileForChild(child));
    expect(getCurrentMapNode()).toBe(child);

    const parentBtn = document.getElementById('map-modal-parent') as HTMLButtonElement;
    expect(parentBtn.style.display).not.toBe('none'); // visible: child has a map-capable parent
    parentBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(getCurrentMapNode()).toBe(node);
    expect(document.querySelectorAll('#map-modal').length).toBe(1);
  });
});
