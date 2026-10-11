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
  setGenerateChildrenRef,
} from '../mapModal';
import {
  setObjectTypesRef as setGeneratorObjectTypesRef,
  generateMap,
  assignChildRef,
} from '../mapGenerator';

// Feature: node-maps — "Generate Children" button in the map modal.
//
// Asserts:
//  - The button is hidden for a leaf type (no `children` ruleset) and shown for a type that
//    can generate children.
//  - Clicking it delegates to the host `generateChildrenForNode`, then the new children appear
//    as child tiles on the re-rendered grid (reconciliation auto-placed them) and the world is
//    marked unsaved.
//  - It works for the "drilled into an empty map-capable child" case: an empty child's map
//    starts with zero child tiles, and generating populates it.

const PARENT_TYPE = 'parentMapType'; // map-capable parent that can generate children
const CHILD_MAP_CAPABLE = 'childMapCapable'; // map-capable child that can also generate children
const CHILD_POINT = 'childPoint'; // leaf POI (no children ruleset)

const stubObjectTypes: Record<string, ObjectTypeTemplate> = {
  [PARENT_TYPE]: {
    typeName: 'Parent Map Type',
    mapCapable: true,
    emptinessRatio: 0,
    children: [{ type: CHILD_POINT, min: 2, max: 2 }],
  },
  [CHILD_MAP_CAPABLE]: {
    typeName: 'Map Capable Child',
    mapCapable: true,
    emptinessRatio: 0,
    children: [{ type: CHILD_POINT, min: 3, max: 3 }],
  },
  [CHILD_POINT]: {
    typeName: 'Point Child',
  },
};

function wireStubs(): void {
  setModalObjectTypesRef(stubObjectTypes);
  setGeneratorObjectTypesRef(stubObjectTypes);
}

/**
 * Minimal host-generator stub mirroring scripts.ts's generateChildrenForNode: append the
 * template's children to `node.children` and mark unsaved. We don't exercise the real DOM-tree
 * path here (that lives in scripts.ts) — the modal only cares that children get added and the
 * map is reconciled afterward.
 */
function makeHostGenerator(markUnsaved: () => void) {
  return (node: WorldNode): void => {
    if (!node.children) {
      node.children = [];
    }
    const template = stubObjectTypes[node.type];
    for (const childTemplate of template?.children ?? []) {
      const count = childTemplate.max ?? 0;
      for (let i = 0; i < count; i++) {
        node.children.push({ type: childTemplate.type as string, name: `gen#${i}`, parent: node });
      }
    }
    markUnsaved();
  };
}

let markUnsavedSpy: ReturnType<typeof vi.fn>;
let hostGenSpy: ReturnType<typeof vi.fn>;

function buildModalDom(): void {
  document.body.innerHTML = `
    <div id="map-modal">
      <div class="map-modal-content">
        <button id="map-modal-close" type="button">×</button>
        <div class="map-modal-toolbar">
          <button id="map-modal-parent" type="button">↑ Show parent</button>
          <button id="map-modal-generate" type="button">+ Generate Children</button>
          <input id="map-grid-size" type="number" />
        </div>
        <div id="map-modal-body"></div>
      </div>
    </div>
  `;
}

function bodyEl(): HTMLElement {
  return document.getElementById('map-modal-body') as HTMLElement;
}

function generateBtn(): HTMLButtonElement {
  return document.getElementById('map-modal-generate') as HTMLButtonElement;
}

/** Count rendered child tiles (occupied POIs) on the current grid. */
function childTileCount(): number {
  return bodyEl().querySelectorAll('.map-tile--child').length;
}

describe('mapModal "Generate Children" button (jsdom)', () => {
  beforeAll(() => {
    wireStubs();
    buildModalDom();
    initMapModal();
  });

  beforeEach(() => {
    wireStubs();
    markUnsavedSpy = vi.fn();
    hostGenSpy = vi.fn(makeHostGenerator(markUnsavedSpy));
    setMarkUnsavedRef(markUnsavedSpy);
    setShowInfoRef(vi.fn());
    setGenerateChildrenRef(hostGenSpy);
    (document.getElementById('map-modal') as HTMLElement).classList.remove('is-open');
  });

  it('is hidden for a leaf type and shown for a type that can generate children', () => {
    // Leaf child: give it an (empty) map so the modal can open on it.
    const leaf: WorldNode = { type: CHILD_POINT, name: 'Lonely POI' };
    leaf.map = { gridSize: 1, layoutSeed: 1, placements: [] };
    openMapModal(leaf);
    expect(generateBtn().style.display).toBe('none');

    // Generatable type: button is visible.
    const node: WorldNode = { type: PARENT_TYPE, name: 'Region', children: [] };
    generateMap(node);
    openMapModal(node);
    expect(generateBtn().style.display).not.toBe('none');
  });

  it('generates children into an empty map-capable node and renders them as tiles', () => {
    // Simulate drilling into an empty map-capable child: a map exists but has no children.
    const node: WorldNode = { type: CHILD_MAP_CAPABLE, name: 'Deepwood', children: [] };
    generateMap(node);
    openMapModal(node);

    expect(getCurrentMapNode()).toBe(node);
    expect(childTileCount()).toBe(0); // empty to start

    generateBtn().dispatchEvent(new MouseEvent('click', { bubbles: true }));

    // Host generator was invoked on the open node, children were added, and the re-rendered
    // grid now shows a tile per generated child.
    expect(hostGenSpy).toHaveBeenCalledWith(node);
    expect(node.children!.length).toBe(3);
    expect(childTileCount()).toBe(3);
    // Unsaved: once by the host generator, and reconcile added placements (so markUnsaved again).
    expect(markUnsavedSpy).toHaveBeenCalled();
  });

  it('preserves existing user-positioned placements when generating more children', () => {
    const existing: WorldNode = { type: CHILD_POINT, name: 'Pinned' };
    const node: WorldNode = { type: PARENT_TYPE, name: 'Region', children: [existing] };
    existing.parent = node;
    // Hand-build a map with the existing child pinned at a corner.
    const ref = assignChildRef(existing);
    node.map = {
      gridSize: 3,
      layoutSeed: 7,
      placements: [{ childRef: ref, col: 0, row: 0, userPositioned: true }],
    };

    openMapModal(node);
    generateBtn().dispatchEvent(new MouseEvent('click', { bubbles: true }));

    // The pinned placement is untouched.
    const pinned = node.map!.placements.find((p) => p.childRef === ref);
    expect(pinned).toBeDefined();
    expect(pinned!.col).toBe(0);
    expect(pinned!.row).toBe(0);
    expect(pinned!.userPositioned).toBe(true);

    // Two more children were generated and placed (total 3 children, 3 placements).
    expect(node.children!.length).toBe(3);
    expect(node.map!.placements.length).toBe(3);
  });

  it('does nothing when the open type cannot generate children', () => {
    const leaf: WorldNode = { type: CHILD_POINT, name: 'Lonely POI' };
    leaf.map = { gridSize: 1, layoutSeed: 1, placements: [] };
    openMapModal(leaf);

    // The button is hidden, but a programmatic click must still be a safe no-op.
    generateBtn().dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(hostGenSpy).not.toHaveBeenCalled();
  });
});
