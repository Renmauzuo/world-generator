// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import type { NodeMap, ObjectTypeTemplate, WorldNode } from '../types';
import {
  renderGrid,
  mapColor,
  DEFAULT_MAP_COLOR,
  setObjectTypesRef as setModalObjectTypesRef,
} from '../mapModal';
import { setObjectTypesRef as setGeneratorObjectTypesRef } from '../mapGenerator';

// Feature: node-maps, Task 18.2 — DOM/integration test for tile distinction and
// child-tile coloring / drillable affordance (jsdom).
//
// Asserts (per Requirements 6.4, 7.1-7.7, 8.7, 9.6):
//  - Child / Terrain / Void tiles carry distinct CSS classes.
//  - EVERY child tile is colored by type (inline background-color) regardless of
//    map-capability; a non-map-capable child carries NO drillable affordance.
//  - A map-capable child tile additionally carries .map-tile--drillable (the corner-fold
//    affordance) and exposes no controls (no <button>/<input>/<select>), no nested grid
//    (no inner .map-tile / nested #map-modal-body), and no independent drag handler.
//  - A stale placement (childRef resolving to no child) renders as an empty tile
//    (terrain/void, never a POI) and renderGrid does not throw.
//
// This is an example/integration (DOM) test, not a property-based test.

// --- Stub type keys --------------------------------------------------------------
const MAP_TYPE_TERRAIN = 'mapTypeTerrain'; // map-capable parent, emptinessRatio > 0
const MAP_TYPE_VOID = 'mapTypeVoid'; // map-capable parent, emptinessRatio 0
const CHILD_MAP_CAPABLE = 'childMapCapable'; // map-capable child (mini-map fill)
const CHILD_POINT = 'childPoint'; // non-map-capable child (point location)

// A recognized terrain tag so miniMapColor returns a non-default color for the
// map-capable child.
const CHILD_MAP_CAPABLE_TAG = 'forest';

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
  [CHILD_MAP_CAPABLE]: {
    typeName: 'Map Capable Child',
    mapCapable: true,
    tags: [CHILD_MAP_CAPABLE_TAG],
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
 * Build a parent node of `parentType` with a known set of children and a NodeMap
 * placing them on fixed tiles, plus one stale placement whose childRef resolves to
 * no child. Grid is big enough (3x3) to leave empty cells for terrain/void.
 *
 * Layout (3x3):
 *   (0,0) map-capable child  -> mini-map tile
 *   (1,0) non-capable child  -> point tile
 *   (2,2) STALE placement    -> empty tile (child removed)
 *   all other cells          -> empty (terrain if ratio>0 else void)
 */
function buildNode(parentType: string): WorldNode {
  const mapChild: WorldNode = { type: CHILD_MAP_CAPABLE, name: 'Deepwood', mapRef: 'ref-map' };
  const pointChild: WorldNode = { type: CHILD_POINT, name: 'Old Mill', mapRef: 'ref-point' };

  const map: NodeMap = {
    gridSize: 3,
    layoutSeed: 123,
    placements: [
      { childRef: 'ref-map', col: 0, row: 0 },
      { childRef: 'ref-point', col: 1, row: 0 },
      // Stale: no child carries this mapRef => unresolved placement.
      { childRef: 'ref-removed', col: 2, row: 2 },
    ],
  };

  return {
    type: parentType,
    name: 'Root',
    children: [mapChild, pointChild],
    map,
  };
}

function setupBody(): HTMLElement {
  document.body.innerHTML = '<div id="map-modal-body"></div>';
  return document.getElementById('map-modal-body') as HTMLElement;
}

describe('renderGrid DOM — tile distinction and mini-map structure', () => {
  beforeEach(() => {
    wireStubs();
    setupBody();
  });

  it('emits N*N tiles with data-col/data-row and the --map-grid-size custom property', () => {
    const node = buildNode(MAP_TYPE_TERRAIN);
    renderGrid(node);

    const body = document.getElementById('map-modal-body') as HTMLElement;
    const tiles = body.querySelectorAll('.map-tile');
    expect(tiles.length).toBe(9); // 3x3
    expect(body.style.getPropertyValue('--map-grid-size')).toBe('3');

    // Every tile carries integer col/row data attributes.
    tiles.forEach((t) => {
      expect((t as HTMLElement).dataset.col).toBeDefined();
      expect((t as HTMLElement).dataset.row).toBeDefined();
    });
  });

  it('Child, Terrain, and Void tiles carry distinct CSS classes', () => {
    // Terrain variant (ratio > 0): empty cells are terrain, no void.
    const terrainNode = buildNode(MAP_TYPE_TERRAIN);
    renderGrid(terrainNode);
    let body = document.getElementById('map-modal-body') as HTMLElement;

    const childTiles = body.querySelectorAll('.map-tile--child');
    const terrainTiles = body.querySelectorAll('.map-tile--terrain');
    const voidTilesInTerrain = body.querySelectorAll('.map-tile--void');

    // Two resolvable children => exactly two child tiles. The stale placement is NOT
    // a child tile. 9 total - 2 children = 7 empty cells, all terrain (ratio > 0).
    expect(childTiles.length).toBe(2);
    expect(terrainTiles.length).toBe(7);
    expect(voidTilesInTerrain.length).toBe(0);

    // Child vs terrain classes are mutually exclusive on any single tile.
    body.querySelectorAll('.map-tile').forEach((t) => {
      const isChild = t.classList.contains('map-tile--child');
      const isTerrain = t.classList.contains('map-tile--terrain');
      const isVoid = t.classList.contains('map-tile--void');
      const kinds = [isChild, isTerrain, isVoid].filter(Boolean).length;
      expect(kinds).toBe(1); // exactly one kind modifier per tile
    });

    // Void variant (ratio 0): empty cells are void, no terrain.
    setupBody();
    const voidNode = buildNode(MAP_TYPE_VOID);
    renderGrid(voidNode);
    body = document.getElementById('map-modal-body') as HTMLElement;

    expect(body.querySelectorAll('.map-tile--child').length).toBe(2);
    expect(body.querySelectorAll('.map-tile--void').length).toBe(7);
    expect(body.querySelectorAll('.map-tile--terrain').length).toBe(0);
  });

  it('a non-map-capable child renders as a colored child tile with NO drillable affordance', () => {
    const node = buildNode(MAP_TYPE_TERRAIN);
    renderGrid(node);
    const body = document.getElementById('map-modal-body') as HTMLElement;

    const pointTile = body.querySelector('[data-child-ref="ref-point"]') as HTMLElement;
    expect(pointTile).not.toBeNull();
    // It is a colored child tile, not drillable.
    expect(pointTile.classList.contains('map-tile--child')).toBe(true);
    expect(pointTile.classList.contains('map-tile--drillable')).toBe(false);
    // Every child tile is colored by type (inline background-color set). (Req 7.1)
    expect(pointTile.style.backgroundColor).not.toBe('');

    // It still carries a label with the child's name.
    const label = pointTile.querySelector('.map-tile-label');
    expect(label?.textContent).toBe('Old Mill');
  });

  it('a map-capable child tile is drillable, colored, and exposes no controls/nested grid/drag handler', () => {
    const node = buildNode(MAP_TYPE_TERRAIN);
    renderGrid(node);
    const body = document.getElementById('map-modal-body') as HTMLElement;

    const miniMap = body.querySelector('[data-child-ref="ref-map"]') as HTMLElement;
    expect(miniMap).not.toBeNull();
    // Map-capable child: a colored child tile carrying the drillable corner-fold affordance.
    expect(miniMap.classList.contains('map-tile--child')).toBe(true);
    expect(miniMap.classList.contains('map-tile--drillable')).toBe(true);

    // Inline background-color is the resolved (non-default) type color.
    const expectedColor = mapColor(node.children![0]);
    expect(expectedColor).not.toBe(DEFAULT_MAP_COLOR);
    expect(miniMap.style.backgroundColor).not.toBe('');

    // No controls inside the child tile fill.
    expect(miniMap.querySelector('button')).toBeNull();
    expect(miniMap.querySelector('input')).toBeNull();
    expect(miniMap.querySelector('select')).toBeNull();

    // No nested grid: no inner .map-tile and no nested #map-modal-body.
    expect(miniMap.querySelector('.map-tile')).toBeNull();
    expect(miniMap.querySelector('#map-modal-body')).toBeNull();

    // No independent drag handler / affordance on the tile fill itself: renderGrid adds
    // only classes + a label, so there is no separate inner draggable element and no
    // draggable="true" marker emitted by renderGrid.
    expect(miniMap.querySelector('[draggable="true"]')).toBeNull();
    expect(miniMap.getAttribute('draggable')).toBeNull();

    // The only child element of the mini-map tile is its label span.
    const children = Array.from(miniMap.children);
    expect(children.length).toBe(1);
    expect(children[0].classList.contains('map-tile-label')).toBe(true);
  });

  it('a stale placement renders as an empty tile (not a POI) and renderGrid does not throw', () => {
    const node = buildNode(MAP_TYPE_TERRAIN);

    expect(() => renderGrid(node)).not.toThrow();

    const body = document.getElementById('map-modal-body') as HTMLElement;

    // The stale placement sits at (2,2). That cell must NOT be a child tile and must
    // carry no child-ref / label / mini-map.
    const staleCell = body.querySelector('[data-col="2"][data-row="2"]') as HTMLElement;
    expect(staleCell).not.toBeNull();
    expect(staleCell.classList.contains('map-tile--child')).toBe(false);
    expect(staleCell.classList.contains('map-tile--drillable')).toBe(false);
    expect(staleCell.dataset.childRef).toBeUndefined();
    expect(staleCell.querySelector('.map-tile-label')).toBeNull();

    // It is an empty tile — terrain here (ratio > 0).
    expect(staleCell.classList.contains('map-tile--terrain')).toBe(true);

    // No tile anywhere references the removed child's ref.
    expect(body.querySelector('[data-child-ref="ref-removed"]')).toBeNull();
  });
});
