import type { MapPlacement, NodeMap, ObjectTypeTemplate, WorldNode } from './types';
import {
    classifyTile,
    generateMap,
    getEmptinessRatio,
    isMapCapable,
    reconcilePlacements,
    resizeGrid,
    resolvePlacementChild,
} from './mapGenerator';

/**
 * Forward reference to the host's `markUnsaved()` (defined in scripts.ts, the Rollup DOM
 * entry). Importing scripts.ts here would create a circular/heavy dependency, so we mirror
 * the `objectTypesRef` / `setObjectTypesRef` forward-reference pattern used elsewhere in
 * this module: a module-level no-op default plus a setter the host wires on DOM ready.
 * Until wired it is a harmless no-op, so the pure/jsdom tests need no host. (Req 8.5)
 */
let markUnsavedRef: () => void = () => {};
export function setMarkUnsavedRef(fn: () => void): void {
    markUnsavedRef = fn;
}

/**
 * Forward reference to the host's `showInfoForNode(node)` (defined in scripts.ts, the Rollup
 * DOM entry). Mirrors the `markUnsavedRef` pattern: a module-level no-op default plus a setter
 * the host wires on DOM ready. Click-select on a Child_Tile (Req 11.2) and the "select only"
 * fallback of double-click (Req 11.7) route the selection through the host's existing tree
 * selection mechanism so the main tree + info panel update exactly as a tree-node click would.
 * Until wired it is a harmless no-op, so the pure/jsdom tests need no host.
 */
let showInfoRef: (node: WorldNode) => void = () => {};
export function setShowInfoRef(fn: (node: WorldNode) => void): void {
    showInfoRef = fn;
}

/**
 * Forward reference to the host's `generateChildrenForNode(node)` (defined in scripts.ts, the
 * Rollup DOM entry). Same forward-reference pattern as `markUnsavedRef` / `showInfoRef`: a
 * no-op default plus a setter the host wires on DOM ready. Powers the modal's "Generate
 * Children" button — it reuses the host generator so the main tree DOM stays in sync, then the
 * modal reconciles + re-renders the map. Until wired it is a harmless no-op, so the pure/jsdom
 * tests need no host.
 */
let generateChildrenRef: (node: WorldNode) => void = () => {};
export function setGenerateChildrenRef(fn: (node: WorldNode) => void): void {
    generateChildrenRef = fn;
}

/**
 * The node whose Node_Map is currently displayed in the single `#map-modal`. Tracked so the
 * forthcoming click-select / drill-down (task 19.2) and drag/resize handlers (19.3 / 20.1)
 * can act on the active node. `undefined` while no map is open.
 */
let currentMapNode: WorldNode | undefined;

/** The node whose map is currently open in the modal, or `undefined` when none. */
export function getCurrentMapNode(): WorldNode | undefined {
    return currentMapNode;
}

/**
 * Whether child-tile labels are shown on the map. Toggled by the `#map-show-labels` checkbox
 * in the toolbar. Session-only UI state (not persisted); labels start visible. The toggle is
 * applied as a `map-hide-labels` class on `#map-modal-body` and the labels are hidden via CSS,
 * so flipping it is instant and survives `renderGrid` re-renders (drill-down, resize) without
 * threading state through the render path.
 */
let showLabels = true;

/**
 * Reflect the current `showLabels` state onto `#map-modal-body` by toggling the
 * `map-hide-labels` class. Called whenever a grid is rendered/opened so the body always matches
 * the checkbox. No-op when the body element is absent (jsdom tests without the markup).
 */
function syncLabelVisibility(): void {
    const body = document.getElementById('map-modal-body');
    if (body) {
        body.classList.toggle('map-hide-labels', !showLabels);
    }
}

/**
 * Handle a `change` on the `#map-show-labels` checkbox: update the `showLabels` state and
 * apply it to the grid. Pure UI state — not persisted (no `markUnsaved`).
 */
function handleShowLabelsChange(): void {
    const input = document.getElementById('map-show-labels') as HTMLInputElement | null;
    if (!input) {
        return;
    }
    showLabels = input.checked;
    syncLabelVisibility();
}

/**
 * One-time guard so the close-button and backdrop listeners attach exactly once, whether
 * the host calls `initMapModal()` on DOM ready or the first `openMapModal()` wires lazily.
 */
let wired = false;

/**
 * One-time guard so the delegated pointer/click/dblclick listeners on `#map-modal-body` are
 * attached exactly once. The body element is static markup that survives `renderGrid`
 * re-renders (which only replace its children), so delegated listeners keep working across
 * drill-downs and resizes without re-binding. Kept separate from `wired` (close/backdrop)
 * because the two sets of listeners live on different elements.
 */
let interactionsWired = false;

/**
 * In-flight pointer-gesture tracker for click-vs-drag discrimination (Req 11.3/11.4). Set on
 * `pointerdown` over a Child_Tile and consumed on `pointerup`. `childRef` identifies the
 * pressed placement; `startX`/`startY` are the pointer-down coordinates used to compute the
 * movement delta classified by `classifyGesture`. `undefined` when no gesture is in flight.
 */
let gestureStart: { childRef: string; startX: number; startY: number } | undefined;

/**
 * The floating "ghost" element that follows the cursor while a child tile is being dragged,
 * giving visual feedback for the move. Created lazily once a gesture crosses the drag
 * threshold (so a plain click never spawns one) and removed on pointerup/cancel. `undefined`
 * when no drag is in progress.
 */
let dragGhost: HTMLElement | undefined;

/** Remove the drag ghost if present. Safe to call unconditionally (idempotent). */
function clearDragGhost(): void {
    if (dragGhost) {
        dragGhost.remove();
        dragGhost = undefined;
    }
}

/**
 * Create the drag ghost for the pressed child tile and position it at the pointer. The ghost
 * is a lightweight labeled chip mirroring the dragged POI's name; it is appended to the modal
 * content and follows the cursor via `positionDragGhost`.
 */
function createDragGhost(label: string, x: number, y: number): void {
    clearDragGhost();
    const ghost = document.createElement('div');
    ghost.className = 'map-drag-ghost';
    ghost.textContent = label;
    document.body.appendChild(ghost);
    dragGhost = ghost;
    positionDragGhost(x, y);
}

/** Move the drag ghost so it trails just off the cursor. No-op when no ghost exists. */
function positionDragGhost(x: number, y: number): void {
    if (!dragGhost) {
        return;
    }
    dragGhost.style.left = `${x + 12}px`;
    dragGhost.style.top = `${y + 12}px`;
}

/**
 * Shared drag-suppression hook for task 19.3. When the drag/swap handler performs an
 * `applyDrop` (a completed Map_Edit), it calls `markGestureAsDrag()` so the subsequent
 * `pointerup` click-select is suppressed — keeping click-select and drag-reposition mutually
 * exclusive (Req 11.3/11.4). The flag is reset at every `pointerdown`. Task 19.3 should call
 * `markGestureAsDrag()` from its drop handler (before/when it mutates placements) rather than
 * reaching into this flag directly.
 */
let lastGestureWasDrag = false;

/**
 * Mark the current pointer gesture as a completed drag so the pending `pointerup` does NOT
 * also fire a click-select. Called by the drag/swap handler (task 19.3) when it applies a
 * Map_Edit via `applyDrop`. Exported so the drag wiring can live in its own code path.
 */
export function markGestureAsDrag(): void {
    lastGestureWasDrag = true;
}

/**
 * Resolve a tile element (a `.map-tile` with a `data-child-ref`) to its live child node:
 * read `tile.dataset.childRef`, find the matching placement in the currently open node's map,
 * then resolve it via `resolvePlacementChild`. Returns `undefined` for an empty/terrain/void
 * tile (no `data-child-ref`), a stale placement, or when no map is open — so callers can
 * safely ignore the gesture. Pure w.r.t. the DOM: reads only the tile dataset and module state.
 */
function resolveTileChild(tile: HTMLElement): WorldNode | undefined {
    const childRef = tile.dataset.childRef;
    if (!childRef) {
        return undefined;
    }
    return resolveChildByRef(currentMapNode, childRef);
}

/**
 * Resolve the live child node for a placement `childRef` on `node`'s map, or `undefined` if
 * the node/map is absent or the ref is stale (child removed). Shared by `resolveTileChild`
 * and the drag-ghost label lookup.
 */
function resolveChildByRef(node: WorldNode | undefined, childRef: string): WorldNode | undefined {
    const map = node?.map;
    if (!node || !map) {
        return undefined;
    }
    const placement = map.placements.find((p) => p.childRef === childRef);
    if (!placement) {
        return undefined;
    }
    return resolvePlacementChild(node, placement);
}

/**
 * Forward reference to the merged objectTypes map, wired up by objectTypes.ts after merge.
 * Lets the rendering helpers here read a child type's template metadata (tags, typeName)
 * without importing objectTypes directly (which would create a circular dependency).
 * Mirrors the setObjectTypesRef pattern in mapGenerator.ts / attributeGenerators.ts.
 */
let objectTypesRef: Record<string, ObjectTypeTemplate> = {};
export function setObjectTypesRef(ref: Record<string, ObjectTypeTemplate>): void {
    objectTypesRef = ref;
}

/**
 * Single default fallback color used to fill a Child_Tile when the child type declares no
 * explicit mapColor and carries no recognized terrain tag (or no tags at all). (Req 7.4)
 */
export const DEFAULT_MAP_COLOR = '#9e9e9e';

/** @deprecated Alias retained for existing imports; use DEFAULT_MAP_COLOR. */
export const DEFAULT_MINI_MAP_COLOR = DEFAULT_MAP_COLOR;

/**
 * Maps a recognized terrain tag (reusing the shared `tags` vocabulary) to a
 * representative Mini_Map fill color. Only terrain-descriptive tags are mapped —
 * structural/metadata tags like `region` or `continent` intentionally have no color
 * so they fall through to the default. The vocabulary mirrors the project's tag set:
 * water, fire, earth, air, forest, mountain, plains, desert, swamp, hills, cold,
 * underground, undead, evil, good. (Req 7.1)
 */
const tagColors: Record<string, string> = {
    water: '#2a6fb0',
    fire: '#c0392b',
    earth: '#8d6e4a',
    air: '#add8e6',
    forest: '#2e7d32',
    mountain: '#7f8c8d',
    plains: '#9acd32',
    desert: '#e0c068',
    swamp: '#4b6b43',
    hills: '#8fae5d',
    cold: '#dfeef5',
    underground: '#5a4b3b',
    undead: '#6b5b7b',
    evil: '#6e2639',
    good: '#f0e6b0',
};

/**
 * Representative fill color for a child Point_Of_Interest's Child_Tile, identifying what
 * the child's type is. Resolved in a fixed priority order (Req 7.2–7.4, 7.9):
 *   (a) an explicit `mapColor` declared on the child type's template; else
 *   (b) a color derived from the first recognized terrain tag on the type; else
 *   (c) the single default fallback color.
 * Applies to EVERY child, whether or not it is map-capable. Pure — reads only the
 * forward-referenced template map.
 */
export function mapColor(childNode: WorldNode): string {
    const template = childNode && objectTypesRef[childNode.type];
    // (a) explicit per-type map color wins.
    if (template?.mapColor) {
        return template.mapColor;
    }
    // (b) fall back to the first recognized terrain tag.
    const tags = template?.tags;
    if (tags) {
        for (const tag of tags) {
            const color = tagColors[tag];
            if (color) {
                return color;
            }
        }
    }
    // (c) default fallback.
    return DEFAULT_MAP_COLOR;
}

/** @deprecated Renamed to `mapColor` — every child tile is now colored, not only map-capable ones. */
export const miniMapColor = mapColor;

/**
 * Label for a rendered Point_Of_Interest: the child's display `name` when it is
 * non-empty (whitespace-only names are treated as empty), otherwise the child type's
 * `typeName` from its template. Pure — reads only the node and the forward-referenced
 * template map. (Req 6.7, 11.1)
 */
export function poiLabel(childNode: WorldNode): string {
    const name = childNode?.name;
    if (typeof name === 'string' && name.trim().length > 0) {
        return name;
    }
    return objectTypesRef[childNode?.type]?.typeName ?? '';
}

/**
 * Classifies a completed pointer gesture by the Euclidean magnitude of its movement
 * delta: a `'click'` when the movement is within the threshold, a `'drag'` otherwise.
 * The two outcomes are mutually exclusive for a single gesture, underpinning the
 * mutually-exclusive click-select vs. drag-reposition behavior.
 *
 * Boundary semantics: magnitude is compared as `sqrt(dx*dx + dy*dy) <= threshold`, so
 * a movement exactly equal to the threshold classifies as `'click'` (inclusive). Pure —
 * depends only on its arguments. (Req 11.3, 11.4)
 */
export function classifyGesture(dx: number, dy: number, threshold: number): 'click' | 'drag' {
    const magnitude = Math.sqrt(dx * dx + dy * dy);
    return magnitude <= threshold ? 'click' : 'drag';
}

/**
 * Applies a tile-snapped drag/drop of a placed Point_Of_Interest to a target tile,
 * mutating the map's placements in place. Returns whether a mutation actually happened.
 *
 * Behavior (Req 9.2, 9.3, 9.4, 9.5):
 *  - Out-of-bounds target (col/row outside `[0, gridSize-1]`): no mutation, returns false.
 *    The caller is responsible for returning the dragged POI to its origin tile.
 *  - Unknown `draggedChildRef` (no matching placement): no mutation, returns false.
 *  - Target is the dragged placement's own current tile: treated as a no-op, returns false
 *    (moving a POI onto its own tile changes nothing).
 *  - In-bounds empty target: the dragged placement moves to `(targetCol, targetRow)` and is
 *    marked `userPositioned`; all other placements are untouched. Returns true.
 *  - In-bounds target occupied by another placement: the two placements' coordinates are
 *    swapped and BOTH are marked `userPositioned`; no other flag on any placement is altered.
 *    Returns true.
 *
 * Pure with respect to inputs other than the mutated `map` — alters only the involved
 * placement(s)' `col`/`row`/`userPositioned`.
 */
export function applyDrop(
    map: NodeMap,
    draggedChildRef: string,
    targetCol: number,
    targetRow: number,
): boolean {
    // Out-of-bounds target => no mutation (caller snaps the POI back to its origin tile).
    if (
        targetCol < 0 ||
        targetRow < 0 ||
        targetCol >= map.gridSize ||
        targetRow >= map.gridSize
    ) {
        return false;
    }

    const dragged = map.placements.find((p) => p.childRef === draggedChildRef);
    if (!dragged) {
        return false;
    }

    // Dropping onto the dragged placement's own current tile changes nothing.
    if (dragged.col === targetCol && dragged.row === targetRow) {
        return false;
    }

    const occupant = map.placements.find(
        (p) => p !== dragged && p.col === targetCol && p.row === targetRow,
    );

    if (occupant) {
        // Swap the two placements' coordinates; mark both user-positioned.
        const originCol = dragged.col;
        const originRow = dragged.row;
        dragged.col = targetCol;
        dragged.row = targetRow;
        occupant.col = originCol;
        occupant.row = originRow;
        dragged.userPositioned = true;
        occupant.userPositioned = true;
        return true;
    }

    // Empty in-bounds target: move the dragged placement there.
    dragged.col = targetCol;
    dragged.row = targetRow;
    dragged.userPositioned = true;
    return true;
}

/**
 * Render a node's Node_Map as an N x N CSS grid into the single `#map-modal-body`
 * container. Pure DOM output — reads the node/map and the forward-referenced template
 * map (via isMapCapable), mutates only the modal body element. Safe to call under jsdom.
 *
 * Behavior (Req 6.3, 6.4, 6.7, 7.1, 7.2, 7.3, 7.4, 8.7):
 *  - Resolves `#map-modal-body`; if the host element is absent, returns without throwing.
 *  - If the node has no `map`, returns without throwing (nothing to render).
 *  - Clears the body and sets the `--map-grid-size` custom property to N so the CSS grid
 *    lays out N equal columns/rows (matches styles.scss).
 *  - Emits exactly N*N `.map-tile` cells in row-major order. Each cell carries `data-col`
 *    and `data-row`.
 *  - Tile kind: a cell is a `.map-tile--child` only when a placement occupies it AND that
 *    placement resolves to a live child. A placement whose child was removed (stale
 *    `childRef`) is treated as a freed/empty tile and classified via `classifyTile` as
 *    `.map-tile--terrain` (emptiness ratio > 0) or `.map-tile--void` (ratio 0) — never
 *    drawn as a POI, never throws (Req 8.7).
 *  - For a resolvable child the tile gets a `.map-tile-label` with `poiLabel(child)`, a
 *    `data-child-ref` of the placement's `childRef` (so drag/select handlers can identify it),
 *    and its resolved `mapColor(child)` set inline as `background-color` — every child tile is
 *    colored by type. A Map_Capable child additionally gets `.map-tile--drillable`, which adds
 *    the corner-fold affordance (and a zoom cursor) marking the tile as openable.
 */
/**
 * Build a non-interactive miniature of `node`'s own Node_Map, for embedding inside a child
 * tile on the parent map (nested preview). Strictly ONE level deep: grandchildren are drawn
 * as flat `mapColor` swatches only — a grandchild that is itself map-capable is NOT expanded
 * into a further nested grid, so recursion always terminates at depth 1.
 *
 * Returns a `.map-mini-grid` element laying out the child's N×N tiles (coloring child cells by
 * type, terrain/void cells by kind), or `undefined` when the node has no map. The element
 * carries no data-child-ref / labels / listeners — it is purely visual; all interaction stays
 * on the hosting parent tile.
 */
function buildMiniGrid(node: WorldNode): HTMLElement | undefined {
    const map = node?.map;
    if (!map) {
        return undefined;
    }

    const n = map.gridSize;
    const ratio = getEmptinessRatio(node.type);
    // The child's own color, used for its empty (terrain/void) preview cells — same rule as
    // the full grid, so a nested forest preview is forest-green between its grandchildren.
    const ownColor = mapColor(node);

    const byCell = new Map<string, MapPlacement>();
    for (const p of map.placements) {
        byCell.set(`${p.col},${p.row}`, p);
    }

    const grid = document.createElement('div');
    grid.className = 'map-mini-grid';
    grid.style.setProperty('--map-grid-size', String(n));

    for (let row = 0; row < n; row++) {
        for (let col = 0; col < n; col++) {
            const cell = document.createElement('div');
            cell.className = 'map-mini-cell';

            const placement = byCell.get(`${col},${row}`);
            const child = placement ? resolvePlacementChild(node, placement) : undefined;

            if (placement && child) {
                // Flat color swatch for the grandchild — one level deep, never nested further.
                cell.classList.add('map-mini-cell--child');
                cell.style.backgroundColor = mapColor(child);
            } else {
                const kind = classifyTile(map, col, row, ratio);
                const emptyKind = kind === 'child' ? (ratio > 0 ? 'terrain' : 'void') : kind;
                cell.classList.add(`map-mini-cell--${emptyKind}`);
                // Empty preview cells use the node's own color, matching the full-grid rule.
                cell.style.backgroundColor = ownColor;
            }

            grid.appendChild(cell);
        }
    }

    return grid;
}

export function renderGrid(node: WorldNode): void {
    const body = document.getElementById('map-modal-body');
    if (!body) {
        return;
    }

    const map = node?.map;
    // No map => nothing to render; clear any stale content and bail.
    if (!map) {
        body.innerHTML = '';
        return;
    }

    const n = map.gridSize;
    const ratio = getEmptinessRatio(node.type);

    // The node's own resolved color — the same color this type shows as a tile on its parent.
    // Empty cells (the type's own terrain/void filler) use it so a mapped node reads like its
    // mapless siblings (e.g. a forest's filler is forest-green, matching sibling forest tiles).
    const ownColor = mapColor(node);

    // Fast lookup from "col,row" -> placement for the node's placements.
    const byCell = new Map<string, MapPlacement>();
    for (const p of map.placements) {
        byCell.set(`${p.col},${p.row}`, p);
    }

    // Clear previous content and set the grid dimension custom property.
    body.innerHTML = '';
    body.style.setProperty('--map-grid-size', String(n));

    for (let row = 0; row < n; row++) {
        for (let col = 0; col < n; col++) {
            const tile = document.createElement('div');
            tile.className = 'map-tile';
            tile.dataset.col = String(col);
            tile.dataset.row = String(row);

            const placement = byCell.get(`${col},${row}`);
            // Resolve the placement's child up front: a stale placement (child removed)
            // is treated as a freed/empty tile, NOT a child tile (Req 8.7).
            const child = placement ? resolvePlacementChild(node, placement) : undefined;

            if (placement && child) {
                tile.classList.add('map-tile--child');
                tile.dataset.childRef = placement.childRef;

                // Every child tile is filled with its type's resolved Map_Color — the color
                // identifies what the tile is. This is the default/fallback presentation.
                tile.style.backgroundColor = mapColor(child);

                const label = document.createElement('span');
                label.className = 'map-tile-label';
                label.textContent = poiLabel(child);

                // A map-capable child additionally gets the drillable corner-fold affordance.
                // When that child has its own map, render a one-level-deep miniature of it in
                // place of the flat color so the parent map previews the child's layout.
                if (isMapCapable(child.type)) {
                    tile.classList.add('map-tile--drillable');
                    if (child.map) {
                        const mini = buildMiniGrid(child);
                        if (mini) {
                            tile.classList.add('map-tile--has-mini');
                            tile.appendChild(mini);
                        }
                    }
                }

                // Label sits above any mini-grid (appended last so it layers on top).
                tile.appendChild(label);
            } else {
                // Empty cell (no placement, or a stale/unresolved placement): classify as
                // terrain (ratio > 0) or void (ratio 0). Never throws on a stale ref.
                const kind = classifyTile(map, col, row, ratio);
                // classifyTile returns 'child' only for an occupied cell; a stale
                // placement still occupies the cell, so force the empty classification
                // here (terrain/void per ratio) to satisfy Req 8.7.
                const emptyKind = kind === 'child' ? (ratio > 0 ? 'terrain' : 'void') : kind;
                tile.classList.add(`map-tile--${emptyKind}`);
                // Fill the type's own empty tiles with its own color so a mapped node matches
                // how it appears as a tile on its parent (void tiles are faded via CSS opacity).
                tile.style.backgroundColor = ownColor;
            }

            body.appendChild(tile);
        }
    }

    // Keep label visibility in sync with the toolbar toggle across re-renders.
    syncLabelVisibility();
}

/**
 * Perform a double-click Drill_Down into a child's own Node_Map, swapping the single modal's
 * content in place (no stacking — Req 11.8). Behavior per Req 11.5/11.6:
 *  - Map_Capable child WITH a map: `openMapModal(child)` re-runs `reconcilePlacements` (which
 *    auto-places the child's Unplaced_Children and marks unsaved if it changed) and renders
 *    the child's map into the same `#map-modal`.
 *  - Map_Capable child WITHOUT a map: generate one on demand from the child's current children,
 *    attach it, mark the world unsaved, then drill down via `openMapModal(child)`.
 * The caller guarantees `isMapCapable(child.type)` is true before invoking this.
 */
function drillDownInto(child: WorldNode): void {
    if (!child.map) {
        // Generate a Node_Map on demand from the child's children at double-click time (Req 11.6).
        child.map = generateMap(child);
        markUnsavedRef();
    }
    // openMapModal reconciles (auto-placing any Unplaced_Children, Req 11.5) and swaps the
    // single modal's content to the child's map — no second modal is created (Req 11.8).
    openMapModal(child);
}

/**
 * Find the nearest map-capable ancestor of `node` that can host a map we can navigate up to.
 * Walks `node.parent` upward and returns the first ancestor whose type is map-capable, or
 * `undefined` when there is none (the current node is already the top-most map in its chain).
 */
function findMapParent(node: WorldNode | undefined): WorldNode | undefined {
    let p = node?.parent;
    while (p) {
        if (isMapCapable(p.type)) {
            return p;
        }
        p = p.parent;
    }
    return undefined;
}

/**
 * Navigate the single modal "up a level" to the current node's nearest map-capable ancestor.
 * Generates the parent's map on demand if it has none (so the user always lands on a real
 * map), then re-opens the modal on the parent — reusing the single `#map-modal` instance.
 * No-op when there is no map-capable ancestor (we are already at the top).
 */
function navigateToParent(): void {
    const parent = findMapParent(currentMapNode);
    if (!parent) {
        return;
    }
    if (!parent.map) {
        parent.map = generateMap(parent);
        markUnsavedRef();
    }
    openMapModal(parent);
}

/**
 * Enable/disable and show/hide the "Show parent" button based on whether the currently open
 * node has a map-capable ancestor to navigate up to. Hidden at the top of the chain so the
 * control never dead-ends.
 */
function syncParentButton(node: WorldNode | undefined): void {
    const btn = document.getElementById('map-modal-parent') as HTMLButtonElement | null;
    if (!btn) {
        return;
    }
    const hasParent = !!findMapParent(node);
    btn.style.display = hasParent ? '' : 'none';
}

/**
 * Whether the currently open node's type can generate children at all — i.e. its template
 * declares a `children` ruleset. Mirrors the host's `generateChildrenForNode`, which bails
 * when there are no child templates. Used to show the modal's "Generate Children" button only
 * where it would actually do something.
 */
function canGenerateChildren(node: WorldNode | undefined): boolean {
    const children = node && objectTypesRef[node.type]?.children;
    return Array.isArray(children) && children.length > 0;
}

/**
 * Show/hide the "Generate Children" button based on whether the open node can generate
 * children (its template declares a child ruleset). Hidden for leaf types so the control never
 * dead-ends. This naturally covers the "drilled into an empty map-capable child" case: the
 * button appears, inviting the user to populate the empty map.
 */
function syncGenerateButton(node: WorldNode | undefined): void {
    const btn = document.getElementById('map-modal-generate') as HTMLButtonElement | null;
    if (!btn) {
        return;
    }
    btn.style.display = canGenerateChildren(node) ? '' : 'none';
}

/**
 * Handle a click on the modal "Generate Children" button. Delegates to the host's
 * `generateChildrenForNode` (which mutates `node.children`, updates the main tree DOM, and
 * marks the world unsaved) on the currently open node, then reconciles the node's existing
 * Node_Map so the freshly generated children are auto-placed (preserving any
 * User_Positioned_Placement), and re-renders the grid in place. No-op when no map is open or
 * the type can't generate children.
 */
function handleGenerateChildren(): void {
    const node = currentMapNode;
    if (!node || !node.map || !canGenerateChildren(node)) {
        return;
    }

    // Reuse the host generator so the main tree stays in sync (it also calls markUnsaved).
    generateChildrenRef(node);

    // Fold the new children into the existing map, auto-placing Unplaced_Children while leaving
    // user-positioned ones put. markUnsaved again only if reconciliation actually changed the map.
    const changed = reconcilePlacements(node);
    if (changed) {
        markUnsavedRef();
    }

    renderGrid(node);
}

/**
 * Attach the delegated pointer/click/dblclick listeners to `#map-modal-body` exactly once
 * (guarded by `interactionsWired`). Delegation on the static body means these survive
 * `renderGrid` re-renders (drill-down, resize) without re-binding. Vanilla DOM so jsdom
 * tests (task 19.4) can dispatch synthetic events.
 *
 * Gesture flow (click-vs-drag mutual exclusivity, Req 11.3/11.4):
 *  - `pointerdown` on a tile carrying `data-child-ref`: reset `lastGestureWasDrag`, record the
 *    start coordinates and childRef in `gestureStart`.
 *  - `pointerup`: if a gesture is in flight, classify the movement delta via
 *    `classifyGesture(dx, dy, 5)`. A `'click'` that was NOT consumed as a drag resolves the
 *    tile's child and, for a map-capable child, drills into it (non-map children are no-ops).
 *    A `'drag'` (or a gesture flagged via `markGestureAsDrag`) performs no click action.
 *  - `dblclick` on a tile with `data-child-ref`: resolve the child; a Map_Capable child drills
 *    down (Req 11.5/11.6), a non-capable child is treated as select-only (Req 11.7).
 */
function wireBodyInteractions(): void {
    if (interactionsWired) {
        return;
    }
    const body = document.getElementById('map-modal-body');
    if (!body) {
        // Markup not present yet; leave unwired so a later init once the DOM exists can attach.
        return;
    }

    body.addEventListener('pointerdown', (e: PointerEvent) => {
        // Reset the shared drag flag at the start of every gesture.
        lastGestureWasDrag = false;
        gestureStart = undefined;

        const target = e.target as HTMLElement | null;
        const tile = target?.closest('.map-tile') as HTMLElement | null;
        const childRef = tile?.dataset.childRef;
        if (!tile || !childRef) {
            // Empty/terrain/void tile (or outside a tile): nothing to track.
            return;
        }
        gestureStart = { childRef, startX: e.clientX, startY: e.clientY };
    });

    // While a gesture is in flight, show/trail a ghost once movement crosses the drag
    // threshold — so a plain click never spawns one, but a drag gets live feedback.
    body.addEventListener('pointermove', (e: PointerEvent) => {
        const start = gestureStart;
        if (!start) {
            return;
        }
        const dx = e.clientX - start.startX;
        const dy = e.clientY - start.startY;
        if (classifyGesture(dx, dy, 5) !== 'drag') {
            return;
        }
        if (!dragGhost) {
            // Lazily create the ghost labeled with the dragged child's name.
            const child = currentMapNode && resolveChildByRef(currentMapNode, start.childRef);
            createDragGhost(child ? poiLabel(child) : '', e.clientX, e.clientY);
        } else {
            positionDragGhost(e.clientX, e.clientY);
        }
    });

    body.addEventListener('pointerup', (e: PointerEvent) => {
        const start = gestureStart;
        gestureStart = undefined;
        clearDragGhost();
        if (!start) {
            return;
        }

        const dx = e.clientX - start.startX;
        const dy = e.clientY - start.startY;
        const gesture = classifyGesture(dx, dy, 5);

        // DRAG-TO-REPOSITION (Req 9.1-9.5): a gesture that moved beyond the click threshold is
        // a completed drag of the pressed Point_Of_Interest. Perform the drop here (never a
        // click-select) so click and drag stay mutually exclusive (Req 11.3/11.4). We flag the
        // gesture as a drag so no stray selection fires, then resolve the drop target tile and
        // apply the placement mutation via the pure `applyDrop`.
        if (gesture === 'drag') {
            // Suppress any click-select for this gesture (coordinates with the 19.2 flag).
            markGestureAsDrag();

            const node = currentMapNode;
            const map = node?.map;
            if (!node || !map) {
                return;
            }

            // Resolve the drop target tile from the element under the pointer. In jsdom there is
            // no layout, so we rely on the event target's nearest `.map-tile` ancestor (the test
            // dispatches pointerup with its target set to the drop tile) rather than
            // document.elementFromPoint (which jsdom does not lay out).
            const target = e.target as HTMLElement | null;
            const dropTile = target?.closest('.map-tile') as HTMLElement | null;

            // Out-of-bounds drop (Req 9.5): the pointer came up outside any tile within the grid
            // body — e.g. over the toolbar, the backdrop, or elsewhere. No mutation; return the
            // dragged POI to its origin tile. Since placements are unchanged, a re-render snaps
            // it back to where it was. Do NOT markUnsaved (nothing changed).
            if (!dropTile || !body.contains(dropTile)) {
                renderGrid(node);
                return;
            }

            const targetCol = Number(dropTile.dataset.col);
            const targetRow = Number(dropTile.dataset.row);
            if (!Number.isInteger(targetCol) || !Number.isInteger(targetRow)) {
                // Malformed tile without usable coordinates: treat as out-of-bounds (snap back).
                renderGrid(node);
                return;
            }

            // Apply the drop: move onto an empty tile or swap with an occupied one (Req 9.2-9.4),
            // or no-op for an out-of-bounds / self-tile target (Req 9.5).
            const changed = applyDrop(map, start.childRef, targetCol, targetRow);

            // Re-render from the authoritative placements. On an in-bounds change this paints the
            // new/swapped positions; on a no-op (self-tile / rejected) it harmlessly snaps the
            // dragged POI back to its origin tile (Req 9.5).
            renderGrid(node);

            if (changed) {
                // Map_Edit committed: persist the edited tile coordinates (Req 9.7).
                markUnsavedRef();
            }
            return;
        }

        // A gesture flagged as a drag by the drag handler must NOT also select — mutual
        // exclusivity (Req 11.3/11.4). (Defensive: within this handler `gesture === 'drag'`
        // is already handled above; this guards against an externally-set flag.)
        if (lastGestureWasDrag) {
            return;
        }

        // CLICK-TO-DRILL: a within-threshold gesture on a map-capable child drills into its own
        // map (generating one on demand if absent). Non-map-capable children are intentionally
        // non-functional for now — selecting into the info panel was unintuitive while the modal
        // covers it, so a plain click there does nothing.
        const target = e.target as HTMLElement | null;
        const tile = target?.closest('.map-tile') as HTMLElement | null;
        if (!tile) {
            return;
        }
        const child = resolveTileChild(tile);
        if (!child) {
            return;
        }
        if (isMapCapable(child.type)) {
            drillDownInto(child);
        }
        // else: non-map-capable child — no-op.
    });

    // Double-click also drills (same as single click) for map-capable children, so the earlier
    // double-click muscle memory still works. Non-map-capable children remain non-functional.
    body.addEventListener('dblclick', (e: MouseEvent) => {
        const target = e.target as HTMLElement | null;
        const tile = target?.closest('.map-tile') as HTMLElement | null;
        if (!tile) {
            return;
        }
        const child = resolveTileChild(tile);
        if (child && isMapCapable(child.type)) {
            drillDownInto(child);
        }
    });

    interactionsWired = true;
}

/**
 * Reflect a node's current grid side length N in the `#map-grid-size` control, so the input
 * always shows the authoritative N whenever a map is displayed (on open, after a successful
 * resize, and after a drill-down which reuses `openMapModal`). No-op when the input or the
 * node's map is absent. (Req 10.1)
 */
function syncGridSizeInput(node: WorldNode): void {
    const input = document.getElementById('map-grid-size') as HTMLInputElement | null;
    if (!input || !node?.map) {
        return;
    }
    input.value = String(node.map.gridSize);
}

/**
 * Handle a `change` on the `#map-grid-size` control: validate the requested integer and apply
 * a manual resize to the currently open node's Node_Map via `resizeGrid`. (Req 10.1-10.7, 10.11)
 *
 *  - No open node / no map: ignore (nothing to resize).
 *  - Invalid request (non-integer, NaN, or < 1): revert the input to the current N and return
 *    without calling `resizeGrid` (Req 10.1).
 *  - `resizeGrid` → { ok: true }: re-render the grid, `markUnsaved` so the debounced auto-save
 *    persists the new side length + Manual_Grid_Size (Req 10.11), and sync the input to the
 *    (possibly clamped) current N.
 *  - `resizeGrid` → { ok: false }: alert the user with a reason-specific message (occupied vs.
 *    below-floor) and revert the input to the current, unchanged N (Req 10.5, 10.7, 10.11).
 */
function handleGridSizeChange(): void {
    const input = document.getElementById('map-grid-size') as HTMLInputElement | null;
    if (!input) {
        return;
    }

    const node = currentMapNode;
    const map = node?.map;
    if (!node || !map) {
        return;
    }

    const requested = Number.parseInt(input.value, 10);

    // Validate: must be a non-NaN integer >= 1 (Req 10.1). Revert on anything else.
    if (!Number.isInteger(requested) || requested < 1) {
        input.value = String(map.gridSize);
        return;
    }

    const result = resizeGrid(map, requested, node);

    if (result.ok) {
        // Grid changed (or equal): re-render and persist. `map.gridSize` is now authoritative.
        renderGrid(node);
        markUnsavedRef();
        input.value = String(map.gridSize);
        return;
    }

    // Rejected: inform the user, then revert the input to the current (unchanged) N (Req 10.11).
    // Read the failure fields off a widened view — with the project's non-strict tsconfig the
    // `ok` discriminant does not reliably narrow the union, so access them defensively.
    const failure = result as { ok: false; reason: 'occupied' | 'belowFloor'; floor: number };
    if (failure.reason === 'occupied') {
        window.alert(
            "Can't shrink: a point of interest occupies the area that would be removed.",
        );
    } else {
        window.alert(
            `Can't shrink below ${failure.floor}×${failure.floor}: not enough room for all points of interest.`,
        );
    }
    input.value = String(map.gridSize);
}

/**
 * Attach the close-button and backdrop listeners to the single `#map-modal`, mirroring the
 * `#statblock-modal` convention in scripts.ts:
 *  - `#map-modal-close` click removes `.is-open` (Req 6.5).
 *  - A click on the modal root itself (`e.target === e.currentTarget`, i.e. the backdrop
 *    outside the content area) removes `.is-open` (Req 6.6). Clicks that bubble up from the
 *    content are ignored because their `target` is the inner element, not the modal root.
 *
 * Idempotent via the module-level `wired` guard, so it is safe for the host to call this on
 * DOM ready AND for `openMapModal` to call it lazily. Vanilla DOM so it is jsdom-testable.
 */
export function initMapModal(): void {
    // Wire the delegated tile interactions on the static `#map-modal-body`. Guarded
    // independently so it attaches as soon as the body exists, even if the close/backdrop
    // wiring below bails (and vice versa).
    wireBodyInteractions();

    if (wired) {
        return;
    }

    const modal = document.getElementById('map-modal');
    if (!modal) {
        // No markup yet (e.g. called before the DOM exists). Leave `wired` false so a later
        // call once `#map-modal` is present can attach the listeners.
        return;
    }

    const closeBtn = document.getElementById('map-modal-close');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            modal.classList.remove('is-open');
        });
    }

    // Backdrop click: only the modal root itself (not a bubbled click from the content).
    modal.addEventListener('click', (e: MouseEvent) => {
        if (e.target === e.currentTarget) {
            modal.classList.remove('is-open');
        }
    });

    // Manual grid resize (Req 10): a `change` on the number input drives `resizeGrid` via the
    // handler, which validates, applies, re-renders/markUnsaved on success, or alerts + reverts
    // on rejection. Wired once alongside close/backdrop under the same `wired` guard.
    const gridSizeInput = document.getElementById('map-grid-size');
    if (gridSizeInput) {
        gridSizeInput.addEventListener('change', handleGridSizeChange);
    }

    // "Show parent" navigates the single modal up one level to the nearest map-capable ancestor.
    const parentBtn = document.getElementById('map-modal-parent');
    if (parentBtn) {
        parentBtn.addEventListener('click', navigateToParent);
    }

    // "Generate Children" populates the open node via the host generator, then reconciles and
    // re-renders the map so the new children appear as tiles.
    const generateBtn = document.getElementById('map-modal-generate');
    if (generateBtn) {
        generateBtn.addEventListener('click', handleGenerateChildren);
    }

    // Labels toggle: a `change` on the checkbox shows/hides child-tile labels via CSS.
    const showLabelsInput = document.getElementById('map-show-labels') as HTMLInputElement | null;
    if (showLabelsInput) {
        // Reflect the current state onto the checkbox (defaults to checked in markup).
        showLabelsInput.checked = showLabels;
        showLabelsInput.addEventListener('change', handleShowLabelsChange);
    }

    wired = true;
}

/**
 * Open (or re-open) the single `#map-modal` for a node that has a Node_Map.
 *
 * Steps (Req 6.2, 8.1, 8.1a, 8.5, 8.6, 11.8):
 *  1. Guard: if the node has no `map`, do nothing — the caller is responsible for having
 *     generated one first (info-panel "Open Map" only shows when `node.map` exists).
 *  2. `reconcilePlacements(node)` auto-places any Unplaced_Children and frees removed-child
 *     tiles; if it reports a change, call `markUnsavedRef()` so the debounced auto-save
 *     persists the added placements (Req 8.5). A no-op reconcile skips the save (Req 8.6).
 *  3. `renderGrid(node)` paints the N x N grid into `#map-modal-body`.
 *  4. Record the active node and add `.is-open` to the single `#map-modal` (reused across
 *     drill-down, never stacked — Req 11.8). Guards if the modal element is absent.
 *
 * Also lazily wires the close/backdrop listeners (via the `wired` guard) so interactions
 * work whether or not the host called `initMapModal()`. Vanilla DOM — jsdom-testable.
 */
export function openMapModal(node: WorldNode): void {
    // Guard: caller ensures a map exists / generates one before opening.
    if (!node?.map) {
        return;
    }

    const changed = reconcilePlacements(node);
    if (changed) {
        markUnsavedRef();
    }

    renderGrid(node);

    currentMapNode = node;

    // Reflect the current grid side length in the resize control so it always shows the
    // authoritative N (also covers drill-down, which reuses this function). (Req 10.1)
    syncGridSizeInput(node);

    // Show the "Show parent" button only when there's a map-capable ancestor to go up to.
    syncParentButton(node);

    // Show the "Generate Children" button only when the type can generate children.
    syncGenerateButton(node);

    // Ensure close/backdrop handlers are attached (idempotent).
    initMapModal();

    const modal = document.getElementById('map-modal');
    if (!modal) {
        return;
    }
    modal.classList.add('is-open');
}
