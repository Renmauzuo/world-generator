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
import { setObjectTypesRef as setGeneratorObjectTypesRef } from '../mapGenerator';

// Feature: node-maps — diagram layout mode (mapLayout: 'diagram').
//
// A diagram-layout node (material plane, outer plane, planar layer) presents its children as a
// non-spatial cluster of discs instead of the cartographic grid. Asserts:
//  - Opening a diagram node renders one `.map-diagram-disc` per child, with the diagram body
//    modifier class, WITHOUT requiring a persisted `node.map`.
//  - Each disc carries the shared `.map-tile` + `data-child-ref` contract, planets get the
//    `--globe` skin, and map-capable children get `.map-tile--drillable`.
//  - Clicking a map-capable disc drills into that child (grid child → grid map; diagram child →
//    diagram), reusing the shared handlers — same behavior as grid tiles.
//  - The grid-size control is hidden in diagram mode.

const PLANE_DIAGRAM = 'planeDiagram'; // diagram-layout, children are layers
const LAYER_DIAGRAM = 'layerDiagram'; // diagram-layout, children are localities (grid)
const LOCALITY_GRID = 'localityGrid'; // grid-layout map-capable child
const PLANET_DIAGRAM_CHILD = 'planet'; // special-cased for the globe skin
const CONTINENT_GRID = 'continentGrid'; // grid-layout, map-capable (depth-2 nesting)
const REGION_GRID = 'regionGrid'; // grid-layout map-capable grandchild

const stubObjectTypes: Record<string, ObjectTypeTemplate> = {
  [PLANE_DIAGRAM]: {
    typeName: 'Plane',
    mapCapable: true,
    mapLayout: 'diagram',
    children: [{ type: LAYER_DIAGRAM, min: 2, max: 2 }],
  },
  [LAYER_DIAGRAM]: {
    typeName: 'Layer',
    mapCapable: true,
    mapLayout: 'diagram',
    children: [{ type: LOCALITY_GRID, min: 3, max: 3 }],
  },
  [LOCALITY_GRID]: {
    typeName: 'Locality',
    mapCapable: true,
    emptinessRatio: 2,
    children: [{ type: 'poi', min: 1, max: 1 }],
  },
  [PLANET_DIAGRAM_CHILD]: {
    typeName: 'Planet',
    mapCapable: true,
    emptinessRatio: 0,
    children: [{ type: CONTINENT_GRID, min: 1, max: 1 }],
  },
  [CONTINENT_GRID]: {
    typeName: 'Continent',
    mapCapable: true,
    emptinessRatio: 0,
    children: [{ type: REGION_GRID, min: 1, max: 3 }],
  },
  [REGION_GRID]: {
    typeName: 'Region',
    mapCapable: true,
    emptinessRatio: 2,
  },
  poi: { typeName: 'POI' },
};

function wireStubs(): void {
  setModalObjectTypesRef(stubObjectTypes);
  setGeneratorObjectTypesRef(stubObjectTypes);
}

function buildModalDom(): void {
  document.body.innerHTML = `
    <div id="map-modal">
      <div class="map-modal-content">
        <button id="map-modal-close" type="button">×</button>
        <div class="map-modal-toolbar">
          <button id="map-modal-parent" type="button">↑ Show parent</button>
          <button id="map-modal-generate" type="button">+ Generate Children</button>
          <label for="map-show-labels"><input id="map-show-labels" type="checkbox" checked />Labels</label>
          <div class="map-toolbar-break"></div>
          <label for="map-grid-size">Grid size:</label>
          <input id="map-grid-size" type="number" min="1" />
        </div>
        <div id="map-modal-body"></div>
      </div>
    </div>
  `;
}

function bodyEl(): HTMLElement {
  return document.getElementById('map-modal-body') as HTMLElement;
}

/** Build a plane with two layers, each with its own children, parent links wired. */
function buildPlane(): WorldNode {
  const plane: WorldNode = { type: PLANE_DIAGRAM, name: 'The Plane', children: [] };
  for (let i = 0; i < 2; i++) {
    const layer: WorldNode = { type: LAYER_DIAGRAM, name: `Layer ${i}`, parent: plane, children: [] };
    for (let j = 0; j < 3; j++) {
      layer.children!.push({ type: LOCALITY_GRID, name: `Loc ${i}-${j}`, parent: layer });
    }
    plane.children!.push(layer);
  }
  return plane;
}

describe('mapModal diagram layout (jsdom)', () => {
  beforeAll(() => {
    wireStubs();
    buildModalDom();
    initMapModal();
  });

  beforeEach(() => {
    wireStubs();
    setMarkUnsavedRef(vi.fn());
    setShowInfoRef(vi.fn());
    setGenerateChildrenRef(vi.fn());
    (document.getElementById('map-modal') as HTMLElement).classList.remove('is-open');
  });

  it('renders a disc per child without requiring a persisted node.map', () => {
    const plane = buildPlane();
    expect(plane.map).toBeUndefined();

    openMapModal(plane);

    expect(getCurrentMapNode()).toBe(plane);
    // Diagram body modifier applied, grid not used.
    expect(bodyEl().classList.contains('map-modal-body--diagram')).toBe(true);
    // One disc per layer.
    const discs = bodyEl().querySelectorAll('.map-diagram-disc');
    expect(discs.length).toBe(2);
    // Each disc carries the shared tile contract and the drillable affordance (layers are
    // map-capable), and no node.map was created (diagram is ephemeral).
    discs.forEach((d) => {
      expect(d.classList.contains('map-tile')).toBe(true);
      expect((d as HTMLElement).dataset.childRef).toBeTruthy();
      expect(d.classList.contains('map-tile--drillable')).toBe(true);
    });
    expect(plane.map).toBeUndefined();
  });

  it('hides the grid-size control in diagram mode', () => {
    const plane = buildPlane();
    openMapModal(plane);
    const input = document.getElementById('map-grid-size') as HTMLInputElement;
    expect(input.style.display).toBe('none');
  });

  it('gives planet children the globe skin and embeds a mini-map of their geography', () => {
    const mp: WorldNode = {
      type: PLANE_DIAGRAM, // reuse a diagram parent
      name: 'System',
      children: [{ type: PLANET_DIAGRAM_CHILD, name: 'Oerth' }],
    };
    const planet = mp.children![0];
    planet.parent = mp;
    expect(planet.map).toBeUndefined();

    openMapModal(mp);

    const disc = bodyEl().querySelector('.map-diagram-disc') as HTMLElement;
    // Globe skin applied.
    expect(disc.classList.contains('map-diagram-disc--globe')).toBe(true);
    // The planet's own grid map was generated on demand so the sphere has geography to show.
    expect(planet.map).toBeDefined();
    // A mini-grid preview is embedded in the disc (not a plain flat fill).
    expect(disc.classList.contains('map-diagram-disc--has-mini')).toBe(true);
    expect(disc.querySelector('.map-mini-grid')).not.toBeNull();
  });

  it('renders a depth-2 nested preview: continent cells show their own regions', () => {
    // Build a planet with a continent that itself has region children, so the depth-2 preview
    // can nest a mini-grid inside the continent's cell.
    const planet: WorldNode = { type: PLANET_DIAGRAM_CHILD, name: 'Oerth', children: [] };
    const continent: WorldNode = { type: CONTINENT_GRID, name: 'Faerun', parent: planet, children: [] };
    for (let i = 0; i < 3; i++) {
      continent.children!.push({ type: REGION_GRID, name: `Region ${i}`, parent: continent });
    }
    planet.children!.push(continent);

    const mp: WorldNode = { type: PLANE_DIAGRAM, name: 'System', children: [planet] };
    planet.parent = mp;

    openMapModal(mp);

    const disc = bodyEl().querySelector('.map-diagram-disc') as HTMLElement;
    // Top-level mini-grid (the planet's continents/oceans).
    const outerMini = disc.querySelector('.map-mini-grid') as HTMLElement;
    expect(outerMini).not.toBeNull();
    // Depth 2: the continent cell nests its OWN mini-grid (its regions), not a flat swatch.
    const nestedCell = outerMini.querySelector('.map-mini-cell--nested');
    expect(nestedCell).not.toBeNull();
    expect(nestedCell!.querySelector('.map-mini-grid')).not.toBeNull();
    // On-demand generation filled in the continent's map so there was sub-geography to draw.
    expect(continent.map).toBeDefined();
  });

  it('embeds a mini-map preview for grid children but not for diagram children', () => {
    // A plane's children are LAYER_DIAGRAM (diagram layout) — no grid map to preview.
    const plane = buildPlane();
    openMapModal(plane);
    bodyEl()
      .querySelectorAll('.map-diagram-disc')
      .forEach((d) => {
        expect(d.classList.contains('map-diagram-disc--has-mini')).toBe(false);
        expect(d.querySelector('.map-mini-grid')).toBeNull();
      });
    // The layers themselves stay mapless (diagram, rebuilt fresh).
    plane.children!.forEach((layer) => expect(layer.map).toBeUndefined());

    // A layer's children are LOCALITY_GRID (grid layout) — those discs DO preview a mini-map.
    const layer = plane.children![0];
    openMapModal(layer);
    bodyEl()
      .querySelectorAll('.map-diagram-disc')
      .forEach((d) => {
        expect(d.classList.contains('map-diagram-disc--has-mini')).toBe(true);
        expect(d.querySelector('.map-mini-grid')).not.toBeNull();
      });
  });

  it('click-drills a diagram disc into a grid child (same as grid tiles)', () => {
    // A layer (diagram) whose children are grid localities. Clicking a locality disc drills
    // into its grid map (generated on demand).
    const plane = buildPlane();
    const layer = plane.children![0];
    openMapModal(layer);

    expect(getCurrentMapNode()).toBe(layer);
    const disc = bodyEl().querySelector('.map-diagram-disc') as HTMLElement;
    const ref = disc.dataset.childRef!;
    const localityChild = layer.children!.find((c) => c.mapRef === ref)!;
    expect(localityChild).toBeDefined();

    // Simulate the shared click handler's gesture: pointerdown then pointerup on the disc.
    disc.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: 10, clientY: 10 }));
    disc.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, clientX: 10, clientY: 10 }));

    // Drilled into the grid locality: it's now the current node and got a grid map generated.
    expect(getCurrentMapNode()).toBe(localityChild);
    expect(localityChild.map).toBeDefined();
    // The grid body modifier replaced the diagram one on the drill-down.
    expect(bodyEl().classList.contains('map-modal-body--diagram')).toBe(false);
  });

  it('click-drills a diagram disc into another diagram child (plane → layer)', () => {
    const plane = buildPlane();
    openMapModal(plane);
    const disc = bodyEl().querySelector('.map-diagram-disc') as HTMLElement;
    const ref = disc.dataset.childRef!;
    const layerChild = plane.children!.find((c) => c.mapRef === ref)!;

    disc.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: 5, clientY: 5 }));
    disc.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, clientX: 5, clientY: 5 }));

    // Drilled into the layer (still a diagram): current node is the layer, no map generated,
    // body still in diagram mode showing the layer's localities.
    expect(getCurrentMapNode()).toBe(layerChild);
    expect(layerChild.map).toBeUndefined();
    expect(bodyEl().classList.contains('map-modal-body--diagram')).toBe(true);
    expect(bodyEl().querySelectorAll('.map-diagram-disc').length).toBe(3);
  });
});
