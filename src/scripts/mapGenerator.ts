import type { MapPlacement, NodeMap, ObjectTypeTemplate, WorldNode } from './types';
import { mulberry32 } from './helpers';

/**
 * Forward reference to the merged objectTypes map, wired up by objectTypes.ts after merge.
 * Lets the map-capability resolvers here read template metadata (mapCapable, emptinessRatio)
 * without importing objectTypes directly (which would create a circular dependency).
 * Mirrors the setObjectTypesRef pattern in attributeGenerators.ts.
 */
let objectTypesRef: Record<string, ObjectTypeTemplate> = {};
export function setObjectTypesRef(ref: Record<string, ObjectTypeTemplate>): void {
    objectTypesRef = ref;
}

/**
 * Resolves whether a node type is a Map_Capable_Type, solely from its template metadata.
 * Returns true if and only if the type's ObjectTypeTemplate declares `mapCapable === true`.
 * (Req 1.1)
 */
export function isMapCapable(type: string): boolean {
    return objectTypesRef[type]?.mapCapable === true;
}

/**
 * Resolves a map-capable type's emptiness ratio from its template metadata.
 * Returns the declared `emptinessRatio` when present, otherwise 0 (continent-like:
 * no Terrain_Tiles between children). (Req 1.5, 1.6)
 */
export function getEmptinessRatio(type: string): number {
    return objectTypesRef[type]?.emptinessRatio ?? 0;
}

/**
 * Smallest integer N such that N*N >= poiCount AND the resulting empty count
 * (N*N - poiCount) satisfies the emptiness ratio. For ratio `r`, the required
 * empty budget is `ceil(r * poiCount)`, so:
 *
 *   N = ceil(sqrt(poiCount + ceil(r * poiCount)))
 *
 * Floored at 1 so a zero-children map is a single-tile grid (the node's own
 * area — Terrain if ratio > 0 else Void). Deterministic in (poiCount, ratio).
 * (Req 2.7, 3.4, 3.6, 4.8)
 */
export function computeGridSize(poiCount: number, emptinessRatio: number): number {
    const requiredEmpty = Math.ceil(emptinessRatio * poiCount);
    const n = Math.ceil(Math.sqrt(poiCount + requiredEmpty));
    return Math.max(1, n);
}

/**
 * Smallest side length N whose grid (N*N cells) can hold all current child
 * placements — the floor enforced when the user shrinks the grid manually.
 * Equal to `ceil(sqrt(placementCount))`, floored at 1 so a childless map still
 * has at least a single tile. (Req 10.7)
 */
export function minGridSizeFor(placementCount: number): number {
    return Math.max(1, Math.ceil(Math.sqrt(placementCount)));
}

/**
 * Monotonic counter feeding the childRef generator. Combined with a timestamp and a
 * random component so ids are unique within a session and across saves, while staying
 * a plain, serialization-safe string. Reset is never needed — ids only need to be
 * unique among a single node's placements, and global uniqueness is a cheap bonus.
 */
let mapRefCounter = 0;

/**
 * Generate a short, unique, serialization-safe id for a Map_Placement's childRef.
 * Dependency-free (no crypto import required) and stable as a plain string through
 * JSON save/load. Used by generateMap (task 6.1) and incremental reconciliation
 * (task 8.1) when a placement is first created for a child. (Req 3.9, 5.6)
 */
export function generateChildRef(): string {
    mapRefCounter = (mapRefCounter + 1) >>> 0;
    const rand = Math.floor(Math.random() * 0x7fffffff).toString(36);
    return `c${mapRefCounter.toString(36)}-${rand}`;
}

/**
 * Assign a stable childRef to a child the first time it is placed on its parent's
 * Node_Map. Writes the generated id onto the child as `node.mapRef` (only for placed
 * children, so unplaced nodes and map-free worlds stay byte-for-byte unchanged) and
 * returns it for use as the placement's `childRef`. If the child already carries a
 * `mapRef` (e.g. it was placed before), that existing id is reused so repeated
 * placement never orphans an earlier reference. (Scheme B — Req 3.9, 5.2, 5.6)
 */
export function assignChildRef(child: WorldNode): string {
    if (typeof child.mapRef === 'string' && child.mapRef.length > 0) {
        return child.mapRef;
    }
    const ref = generateChildRef();
    child.mapRef = ref;
    return ref;
}

/**
 * Resolve the live child WorldNode represented by a Map_Placement, matching the
 * placement's `childRef` against each child's `mapRef` among `node.children`.
 * Returns the live child, or `undefined` when no current child carries that ref
 * (the child was removed — the placement is unresolved and its tile is treated as
 * freed/empty by rendering and reconciliation). (Req 5.6, 8.7)
 */
export function resolvePlacementChild(node: WorldNode, p: MapPlacement): WorldNode | undefined {
    if (!node.children || !p || typeof p.childRef !== 'string') {
        return undefined;
    }
    return node.children.find((child) => child.mapRef === p.childRef);
}

/**
 * A single grid cell coordinate used internally during layout generation.
 */
interface Cell {
    col: number;
    row: number;
}

/**
 * Build the full list of N*N cell coordinates in row-major order. The order is
 * fixed and deterministic so the seeded shuffle/sort below is the only source of
 * layout randomness.
 */
function buildCells(n: number): Cell[] {
    const cells: Cell[] = [];
    for (let row = 0; row < n; row++) {
        for (let col = 0; col < n; col++) {
            cells.push({ col, row });
        }
    }
    return cells;
}

/**
 * In-place seeded Fisher–Yates shuffle driven by the supplied prng stream.
 * Used for the "spread" layout — children scatter across the whole grid.
 */
function seededShuffle<T>(items: T[], prng: () => number): void {
    for (let i = items.length - 1; i > 0; i--) {
        const j = Math.floor(prng() * (i + 1));
        const tmp = items[i];
        items[i] = items[j];
        items[j] = tmp;
    }
}

/**
 * Order cells by distance from a seeded anchor cell for the "clustered" layout —
 * children bunch together near the anchor. Ties (equal squared distance) are
 * broken by a per-cell seeded key drawn from the same prng stream, so the result
 * stays fully deterministic in the seed while avoiding a fixed row-major bias.
 */
function clusterOrder(cells: Cell[], n: number, prng: () => number): Cell[] {
    // Seeded anchor cell.
    const anchorCol = Math.floor(prng() * n);
    const anchorRow = Math.floor(prng() * n);
    // Draw a seeded tie-break key for every cell (fixed draw order = determinism).
    const keyed = cells.map((cell) => ({ cell, key: prng() }));
    keyed.sort((a, b) => {
        const da =
            (a.cell.col - anchorCol) * (a.cell.col - anchorCol) +
            (a.cell.row - anchorRow) * (a.cell.row - anchorRow);
        const db =
            (b.cell.col - anchorCol) * (b.cell.col - anchorCol) +
            (b.cell.row - anchorRow) * (b.cell.row - anchorRow);
        if (da !== db) return da - db;
        return a.key - b.key;
    });
    return keyed.map((k) => k.cell);
}

/**
 * Generate a fresh Node_Map for a node and attach it to `node.map`.
 *
 * Every child of the node is treated as a Point_Of_Interest and placed on a
 * unique in-range tile. A fresh 32-bit seed is drawn once; a single mulberry32
 * stream then drives (in a fixed order) the clustered-vs-spread choice and the
 * tile assignment, so the layout is fully reproducible from the recorded seed
 * (Req 4.2). N is derived deterministically from the POI count and the type's
 * emptiness ratio (Req 3.4, 4.8). Each placed child is stamped with a stable
 * `mapRef` via `assignChildRef`, recorded as the placement's `childRef`
 * (Req 3.9). The zero-children case yields an empty placement list on a
 * single-tile grid representing only the node's own area (Req 2.7).
 *
 * (Req 2.2, 3.1, 3.2, 3.3, 3.5, 3.7, 3.8)
 */
export function generateMap(node: WorldNode): NodeMap {
    const children = node.children ?? [];
    const poiCount = children.length;

    // Fresh seed for this map; persisted so the layout is reproducible.
    const seed = Math.floor(Math.random() * 2 ** 32);
    const prng = mulberry32(seed);

    // Single per-map cluster/spread choice — the first draw from the stream (Req 3.8).
    const clustered = prng() < 0.5;

    const ratio = getEmptinessRatio(node.type);
    const n = computeGridSize(poiCount, ratio);

    const placements: MapPlacement[] = [];

    if (poiCount > 0) {
        const cells = buildCells(n);
        // Order cells by the chosen strategy, then take the first `poiCount`.
        let ordered: Cell[];
        if (clustered) {
            ordered = clusterOrder(cells, n, prng);
        } else {
            seededShuffle(cells, prng);
            ordered = cells;
        }
        for (let i = 0; i < poiCount; i++) {
            const cell = ordered[i];
            const child = children[i];
            placements.push({
                childRef: assignChildRef(child),
                col: cell.col,
                row: cell.row,
            });
        }
    }

    const map: NodeMap = {
        gridSize: n,
        layoutSeed: seed,
        placements,
    };
    node.map = map;
    return map;
}

/**
 * Classify a single grid cell as exactly one tile kind, derived (not stored) from
 * the map's placements and the type's emptiness ratio:
 *
 *  - 'child'   — some Map_Placement occupies the cell (col, row);
 *  - 'terrain' — the cell is empty and the type's emptiness ratio > 0 (generic
 *                biome fill between children, taiga-like);
 *  - 'void'    — the cell is empty and the emptiness ratio is 0 (square-completion
 *                padding only, continent-like).
 *
 * Pure and side-effect free. Used by rendering and by the tile-kind property test.
 * For a ratio-0 map no cell is ever classified 'terrain'. (Req 3.5, 3.7)
 */
export function classifyTile(
    map: NodeMap,
    col: number,
    row: number,
    emptinessRatio: number,
): 'child' | 'terrain' | 'void' {
    const occupied = map.placements.some((p) => p.col === col && p.row === row);
    if (occupied) {
        return 'child';
    }
    return emptinessRatio > 0 ? 'terrain' : 'void';
}

/**
 * Incremental reconciliation performed at modal open (Req 8). Brings a node's
 * existing Node_Map back in step with the node's current children WITHOUT ever
 * rebuilding the layout or disturbing the user's work:
 *
 *  1. Drop every placement whose `childRef` no longer resolves to a current child,
 *     freeing those tiles back into the empty pool BEFORE auto-placing, so a freed
 *     tile is available to a newly placed Unplaced_Child in the same pass (Req 8.1a).
 *  2. Grow the grid only as needed: the target side length is the max of the current
 *     gridSize, the Manual_Grid_Size floor, and the size `computeGridSize` wants for
 *     (surviving + unplaced) children at the type's emptiness ratio — never auto-shrink
 *     (Req 8.2, 10.8, 10.9).
 *  3. Auto-place each Unplaced_Child (a current child with no surviving placement) on
 *     an empty tile chosen deterministically from a sub-seed derived from `layoutSeed`
 *     plus the already-placed count, stamping its stable `mapRef` via `assignChildRef`
 *     (Req 8.1, 8.3, 3.9, 4.5).
 *  4. Leave every pre-existing/surviving placement — including every User_Positioned_
 *     Placement — unchanged in `(col, row)` and `userPositioned` (Req 8.4, 4.7).
 *
 * Seedless-map case (Req 4.6): if `layoutSeed` is missing/unrecoverable, a fresh seed
 * is drawn and recorded, used ONLY to derive the new placements. Existing placement
 * coordinates are never recomputed.
 *
 * Returns `true` iff the Node_Map changed (placements dropped and/or added, or the
 * grid grew); `false` when there was nothing to reconcile so the caller can skip
 * `markUnsaved()` (Req 8.6 — Property 12 no-op). (Properties 11, 12, 9)
 */
export function reconcilePlacements(node: WorldNode): boolean {
    const map = node.map;
    if (!map) {
        return false;
    }

    const children = node.children ?? [];
    let changed = false;

    // --- 1. Drop placements whose childRef no longer resolves (Req 8.1a, 8.7). ---
    const survivors: MapPlacement[] = [];
    for (const p of map.placements) {
        if (resolvePlacementChild(node, p)) {
            survivors.push(p);
        } else {
            changed = true; // a stale placement was dropped, freeing its tile
        }
    }

    // --- 2. Identify Unplaced_Children: current children with no surviving placement. ---
    const placedRefs = new Set<string>(survivors.map((p) => p.childRef));
    const unplaced = children.filter(
        (child) => typeof child.mapRef !== 'string' || !placedRefs.has(child.mapRef),
    );

    // Nothing stale and nothing to place => true no-op (Req 8.6, Property 12).
    if (!changed && unplaced.length === 0) {
        return false;
    }

    // --- 3. Determine the target grid side length N. ---
    // Fit (surviving + unplaced) POIs plus the type's required void, but never below
    // the current gridSize or the Manual_Grid_Size floor (Req 8.2, 10.8, 10.9).
    const ratio = getEmptinessRatio(node.type);
    const totalPoi = survivors.length + unplaced.length;
    const fitted = computeGridSize(totalPoi, ratio);
    const floor = Math.max(map.gridSize, map.manualGridSize ?? 0);
    const targetN = Math.max(floor, fitted);
    if (targetN !== map.gridSize) {
        map.gridSize = targetN;
        changed = true;
    }

    // Commit the survivor list (drops the stale placements) before adding new ones.
    map.placements = survivors;

    if (unplaced.length === 0) {
        // Only stale placements were dropped and/or the grid grew; no new placements.
        return changed;
    }

    // --- 4. Seedless-map case (Req 4.6): assign a fresh seed for the NEW derivations ---
    // only. Existing placement coordinates are never recomputed.
    if (typeof map.layoutSeed !== 'number' || !Number.isFinite(map.layoutSeed)) {
        map.layoutSeed = Math.floor(Math.random() * 2 ** 32);
        changed = true;
    }

    // --- 5. Auto-place each Unplaced_Child on an empty tile (Req 8.1, 8.3, 8.4). ---
    // Track occupied tiles as we go so no two placements ever share a cell.
    const occupied = new Set<string>();
    for (const p of map.placements) {
        occupied.add(`${p.col},${p.row}`);
    }

    const n = map.gridSize;
    const allCells = buildCells(n);

    for (const child of unplaced) {
        // Already-placed count is the stable per-child offset: it advances by one for
        // every child added, so each unplaced child draws from a distinct sub-stream
        // and later placements never disturb earlier ones (Req 4.5, 8.4).
        const alreadyPlaced = map.placements.length;
        const subSeed = ((map.layoutSeed >>> 0) + alreadyPlaced) >>> 0;
        const prng = mulberry32(subSeed);

        // Deterministic empty-cell selection: seeded-shuffle a fresh copy of the full
        // cell list, then take the first currently-unoccupied cell. Same (seed, offset,
        // occupancy) always yields the same tile.
        const candidates = allCells.slice();
        seededShuffle(candidates, prng);

        let chosen: Cell | undefined;
        for (const cell of candidates) {
            const key = `${cell.col},${cell.row}`;
            if (!occupied.has(key)) {
                chosen = cell;
                break;
            }
        }

        // Defensive: targetN was sized to fit every POI, so an empty cell always exists.
        // If none is somehow found, skip this child rather than overlap or throw.
        if (!chosen) {
            continue;
        }

        occupied.add(`${chosen.col},${chosen.row}`);
        map.placements.push({
            childRef: assignChildRef(child),
            col: chosen.col,
            row: chosen.row,
        });
        changed = true;
    }

    return changed;
}

/**
 * The discriminated result of a manual grid resize request. The success branch is
 * the bare `{ ok: true }`; the failure branch always carries a machine-readable
 * `reason` and the current all-children `floor` so the UI can both choose its
 * message and know the smallest side length it may offer. (Req 10.5, 10.7)
 */
export type ResizeResult = { ok: true } | { ok: false; reason: 'occupied' | 'belowFloor'; floor: number };

/**
 * Manual grid resize (Req 10). Pure core shared by the resize UI (task 20.1):
 *
 *  - Enlarge (`N' > N`): grow the grid by adding cells only at the high-index edge.
 *    `gridSize` and `manualGridSize` both become `N'`; every placement keeps its
 *    recorded `(col, row)`, `childRef`, and `userPositioned` flag, so the added
 *    high-index cells are all empty and classify as Terrain (ratio > 0) or Void
 *    (ratio = 0) via `classifyTile`. (Req 10.2, 10.3)
 *
 *  - Shrink (`N' < N`): the outer bands at indices `N' .. N-1` (any placement with
 *    `col >= N'` or `row >= N'`) are the cells that would be removed. Following the
 *    task's rejection order, we check for occupancy first, then the floor:
 *      1. If any placement sits in a to-be-removed band → reject `occupied`, leaving
 *         the grid and every placement completely unchanged. (Req 10.4, 10.5)
 *      2. Else if `N'` is below the all-children floor `minGridSizeFor(childCount)`
 *         → reject `belowFloor` with that floor, grid unchanged. (Req 10.7)
 *      3. Otherwise remove the outer bands: set `gridSize = N'` and record
 *         `manualGridSize = N'`. Surviving placements are untouched (they all sit at
 *         `col < N'` and `row < N'` by the occupancy check). (Req 10.6)
 *
 *  - Equal (`N' === N`): no grid change, but still a valid request — record nothing
 *    new and, crucially, never re-derive any placement from the seed. (Req 10.10)
 *
 * `childCount` for the floor is the number of placements currently on the map
 * (`map.placements.length`), matching task 9.1.
 *
 * In every branch, existing placements' `childRef` and `userPositioned` flags are
 * left untouched and no coordinate is ever recomputed from `layoutSeed` (Req 10.10).
 *
 * `requestedN` is defensively normalized (floored, NaN/non-finite guarded) so a bad
 * value can never throw or corrupt the grid; the UI (task 20.1) still validates an
 * integer `>= 1` before calling. A normalized value below the floor is reported as
 * `belowFloor` rather than throwing. (Req 10.1)
 *
 * @param map   the Node_Map to resize in place
 * @param requestedN the user-requested side length
 * @param node  the owning node (reserved for parity with the design signature and
 *              future ratio-aware behavior; the pure resize math needs only `map`)
 */
export function resizeGrid(map: NodeMap, requestedN: number, node: WorldNode): ResizeResult {
    void node; // signature parity with design; resize math is driven entirely by `map`.

    const childCount = map.placements.length;
    const floor = minGridSizeFor(childCount);

    // Defensive normalization: never trust the caller to have validated. Floor the
    // value and guard NaN / non-finite / < 1 by treating it as the smallest legal
    // request so we fail as `belowFloor` instead of throwing. (Req 10.1)
    let n = Math.floor(requestedN);
    if (!Number.isFinite(n) || n < 1) {
        n = 0; // forces the belowFloor path below (floor is always >= 1)
    }

    const current = map.gridSize;

    // --- Enlarge: add cells at the high-index edge, keep every placement. ---
    if (n > current) {
        map.gridSize = n;
        map.manualGridSize = n;
        return { ok: true };
    }

    // --- Equal: no grid change, no seed re-derivation (Req 10.10). ---
    if (n === current) {
        return { ok: true };
    }

    // --- Shrink: n < current. Check occupancy of the removed bands first (task order). ---
    const occupied = map.placements.some((p) => p.col >= n || p.row >= n);
    if (occupied) {
        return { ok: false, reason: 'occupied', floor };
    }

    // Then enforce the all-children floor.
    if (n < floor) {
        return { ok: false, reason: 'belowFloor', floor };
    }

    // Safe shrink: remove the outer bands. Survivors already lie within [0, n-1].
    map.gridSize = n;
    map.manualGridSize = n;
    return { ok: true };
}
