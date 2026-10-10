# Implementation Plan: Node Maps

## Overview

Build the Node Maps feature incrementally, bottom-up: shared types first, then the pure/deterministic core (seeded PRNG, grid sizing, generation, incremental reconciliation, resize, reference resolution) with its property-based tests written alongside each unit, then backward-compatible serialization, then template metadata and `objectTypes` wiring, then the modal markup/styles, rendering, interactions (drag/swap, click-select, drill-down, resize UI), and finally the info-panel host wiring. Each task builds on the previous ones and wires itself in as it lands — no orphaned code and no big-bang integration at the end.

The design uses TypeScript throughout; all tasks are TypeScript (plus Pug and SCSS for markup/styles). The project currently has **no test runner** — an early task sets up Vitest + fast-check with a single-run (non-watch) script. Property-based tests use `fast-check` with `fc.assert(..., { numRuns: 100 })` (minimum 100 iterations), one test per design property, each tagged `// Feature: node-maps, Property N: <text>`.

## Tasks

- [x] 1. Set up test runner and testing dependencies
  - [x] 1.1 Install and configure Vitest + fast-check with a single-run script
    - Add `vitest`, `fast-check`, and `jsdom` as devDependencies in `package.json`
    - Add a `vitest.config.ts` with `test.environment` defaulting to `node` and a per-file `jsdom` opt-in for DOM/integration suites (via `// @vitest-environment jsdom` docblock)
    - Add a `"test": "vitest run"` script (single execution, never watch) and a `"test:dom"` run script if a separate jsdom project is used
    - Create a `src/scripts/__tests__/` (or `test/`) directory and a trivial smoke test to confirm the runner executes
    - _Requirements: (tooling prerequisite for all property/example/DOM tests)_

- [x] 2. Add shared types for maps
  - [x] 2.1 Extend `types.ts` with map template metadata and node fields
    - Add optional `mapCapable?: boolean` and `emptinessRatio?: number` to `ObjectTypeTemplate`
    - Add optional `map?: NodeMap` and `mapRef?: string` to `WorldNode`
    - Add `NodeMap` interface (`gridSize`, optional `manualGridSize`, `layoutSeed`, `placements: MapPlacement[]`) and `MapPlacement` interface (`childRef`, `col`, `row`, optional `userPositioned`)
    - Keep all new fields optional so map-less nodes are structurally unchanged
    - _Requirements: 1.1, 1.4, 1.5, 1.6, 5.1, 5.2, 5.5_
    - _Properties: 1, 7, 8_

- [x] 3. Implement the seeded PRNG
  - [x] 3.1 Add `mulberry32` to `helpers.ts`
    - Implement `export function mulberry32(seed: number): () => number` returning a deterministic generator of floats in `[0, 1)`
    - Keep it isolated from `rand`/`weightedRand` (those stay on `Math.random()`) so general world-gen is untouched
    - _Requirements: 4.3_
    - _Properties: 6_

  - [x] 3.2 Write property test for seeded PRNG determinism
    - **Property 6: Layout is deterministic in the seed** (PRNG layer — same seed yields the identical float stream)
    - Assert that two generators created from the same integer seed emit identical sequences, and that outputs lie in `[0, 1)`
    - `fc.assert(..., { numRuns: 100 })`; tag `// Feature: node-maps, Property 6: Layout is deterministic in the seed`
    - **Validates: Requirements 4.3, 4.2, 4.5**

- [x] 4. Implement grid sizing and capability resolvers (pure core)
  - [x] 4.1 Create `mapGenerator.ts` with capability resolvers and `setObjectTypesRef` wiring
    - Add a module-level `objectTypesRef` plus `export function setObjectTypesRef(ref)` mirroring `attributeGenerators.ts`
    - Implement `isMapCapable(type)` (true iff template `mapCapable === true`) and `getEmptinessRatio(type)` (template `emptinessRatio` when declared, else `0`)
    - _Requirements: 1.1, 1.5, 1.6_
    - _Properties: 1_

  - [x] 4.2 Implement `computeGridSize(poiCount, emptinessRatio)` and `minGridSizeFor(placementCount)`
    - `computeGridSize` returns `ceil(sqrt(poiCount + ceil(r * poiCount)))`, floored at `1` (so a zero-children map is a single-tile grid)
    - `minGridSizeFor` returns the smallest `N` whose `N*N` holds all current child placements (the resize floor)
    - Deterministic in `(count, ratio)`
    - _Requirements: 2.7, 3.4, 3.6, 4.8, 10.7_
    - _Properties: 2_

  - [x] 4.3 Write property test for capability/emptiness resolution
    - **Property 1: Map-capability resolves solely from template metadata**
    - Wire a stub `objectTypesRef` via `setObjectTypesRef`; generate type keys with/without `mapCapable` and with/without `emptinessRatio`
    - `fc.assert(..., { numRuns: 100 })`; tag `// Feature: node-maps, Property 1: Map-capability resolves solely from template metadata`
    - **Validates: Requirements 1.1, 1.5, 1.6**

  - [x] 4.4 Write property test for N-sizing
    - **Property 2: N-sizing is minimal and satisfies the emptiness ratio**
    - For arbitrary non-negative `count` and ratio `r`, assert `N² ≥ count + ceil(r*count)`, `(N-1)²` fails the inequality (minimality), and `N ≥ 1`; same inputs always yield same `N`
    - `fc.assert(..., { numRuns: 100 })`; tag `// Feature: node-maps, Property 2: N-sizing is minimal and satisfies the emptiness ratio`
    - **Validates: Requirements 3.4, 3.6, 4.8**

- [x] 5. Implement stable child reference resolution
  - [x] 5.1 Implement `resolvePlacementChild(node, placement)` and childRef assignment
    - Generate a short unique id for a placement when first created and write it onto the placed child as `node.mapRef` (only for placed children)
    - `resolvePlacementChild` matches `placement.childRef` against `child.mapRef` among `node.children`, returning the live child or `undefined`
    - _Requirements: 3.9, 5.6, 8.7_
    - _Properties: 10, 9_

  - [x] 5.2 Write property test for stable reference resolution
    - **Property 10: Stable child references resolve while the child exists**
    - Build a node + placements, assert each `childRef` resolves to its child, and still resolves after a JSON round-trip while the child remains
    - `fc.assert(..., { numRuns: 100 })`; tag `// Feature: node-maps, Property 10: Stable child references resolve while the child exists`
    - **Validates: Requirements 3.9**

- [x] 6. Implement map generation (seeded, clustered-vs-spread)
  - [x] 6.1 Implement `generateMap(node)` with seeded placement algorithm
    - Pick a fresh seed `Math.floor(Math.random() * 2**32)`; build `prng = mulberry32(seed)`
    - Draw the single `clustered = prng() < 0.5` choice; build all `N²` cells; spread via seeded Fisher–Yates, cluster via seeded anchor + distance sort
    - Create exactly one `MapPlacement` per POI child on a unique in-range tile; assign/record `childRef` + `mapRef` via task 5.1; attach the `NodeMap` (with `gridSize`, `layoutSeed`, `placements`) to `node.map`
    - Handle the zero-children case (empty `placements`, `gridSize = 1`)
    - _Requirements: 2.2, 2.7, 3.1, 3.2, 3.3, 3.5, 3.7, 3.8, 3.9, 4.2_
    - _Properties: 3, 4, 5, 6_

  - [x] 6.2 Implement tile-kind classification helper
    - Add a pure `classifyTile(map, col, row, emptinessRatio)` → `'child' | 'terrain' | 'void'`: child iff a placement occupies the cell; else terrain when ratio > 0, else void
    - Used by rendering and by the tile-kind property test
    - _Requirements: 3.5, 3.7_
    - _Properties: 5_

  - [x] 6.3 Write property test for one-placement-per-POI generation
    - **Property 3: Generation produces one placement per POI child**
    - For arbitrary child sets (including zero), assert placement count equals POI count and `node.map` is attached
    - `fc.assert(..., { numRuns: 100 })`; tag `// Feature: node-maps, Property 3: Generation produces one placement per POI child`
    - **Validates: Requirements 2.2, 2.7, 3.1**

  - [x] 6.4 Write property test for unique in-range tiles
    - **Property 4: Placements occupy unique, in-range integer tiles**
    - For generated maps, assert every `(col,row)` is an integer in `[0, N-1]` and no two placements share a tile
    - `fc.assert(..., { numRuns: 100 })`; tag `// Feature: node-maps, Property 4: Placements occupy unique, in-range integer tiles`
    - **Validates: Requirements 3.2, 3.3, 8.3**

  - [x] 6.5 Write property test for tile-kind classification
    - **Property 5: Every grid cell classifies to exactly one tile kind**
    - Assert each of the `N²` cells is exactly one of child/terrain/void and that a ratio-0 map has no terrain cells
    - `fc.assert(..., { numRuns: 100 })`; tag `// Feature: node-maps, Property 5: Every grid cell classifies to exactly one tile kind`
    - **Validates: Requirements 3.5, 3.7**

  - [x] 6.6 Write property test for deterministic layout from seed
    - **Property 6: Layout is deterministic in the seed** (generator layer)
    - Derive the layout twice from an identical seed + fixed child set; assert identical `(col,row)` per child and identical cluster/spread choice
    - `fc.assert(..., { numRuns: 100 })`; tag `// Feature: node-maps, Property 6: Layout is deterministic in the seed`
    - **Validates: Requirements 3.8, 4.2, 4.5**

- [x] 7. Checkpoint - pure generation core
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Implement incremental reconciliation
  - [x] 8.1 Implement `reconcilePlacements(node)`
    - Drop placements whose `childRef` no longer resolves (freeing their tiles into the empty pool) before auto-placing (Req 8.1a)
    - Auto-place each Unplaced_Child onto an empty tile using a sub-seed derived from `layoutSeed` + already-placed count; grow `N` only as needed, never below `max(current gridSize, manualGridSize ?? 0)`
    - Leave every pre-existing placement (incl. `userPositioned`) unchanged; return `true` iff the map changed
    - Handle the seedless map case (Req 4.6): assign a fresh seed only for the new derivations, never touching recorded coordinates
    - _Requirements: 4.5, 4.6, 4.7, 8.1, 8.1a, 8.2, 8.3, 8.4, 8.6, 10.8, 10.9_
    - _Properties: 11, 12, 9_

  - [x] 8.2 Write property test for incremental placement stability
    - **Property 11: Incremental auto-placement places all unplaced children while preserving existing placements**
    - Assert every current POI child ends with a placement, `N` never drops below `max(current, manualGridSize)` while fitting all children + required void, and every pre-existing placement (incl. userPositioned) keeps its `(col,row)` and flag
    - `fc.assert(..., { numRuns: 100 })`; tag `// Feature: node-maps, Property 11: Incremental auto-placement places all unplaced children while preserving existing placements`
    - **Validates: Requirements 4.5, 4.7, 8.1, 8.2, 8.4, 10.8, 10.9**

  - [x] 8.3 Write property test for reconcile no-op
    - **Property 12: Reconciliation is a no-op when there is nothing to place**
    - For a map whose placements already cover exactly the current POI children, assert `reconcilePlacements` adds nothing and leaves the map structurally unchanged (returns `false`)
    - `fc.assert(..., { numRuns: 100 })`; tag `// Feature: node-maps, Property 12: Reconciliation is a no-op when there is nothing to place`
    - **Validates: Requirements 8.6**

  - [x] 8.4 Write property test for stale-reference tolerance
    - **Property 9: Loading tolerates legacy and stale-reference data** (stale-reference half; legacy half covered in task 10.3)
    - For maps whose placements reference removed children, assert reconciliation/classification completes without error, keeps resolvable placements, and treats unresolved tiles as freed/empty
    - `fc.assert(..., { numRuns: 100 })`; tag `// Feature: node-maps, Property 9: Loading tolerates legacy and stale-reference data`
    - **Validates: Requirements 5.6, 8.7**

- [x] 9. Implement manual grid resize (pure core)
  - [x] 9.1 Implement `resizeGrid(map, requestedN, node)`
    - Enlarge (`N' > N`): set `gridSize = N'`, record `manualGridSize = N'`, keep all placements; new high-index cells classify as empty (terrain if ratio > 0 else void)
    - Shrink (`N' < N`): reject with `{ ok: false, reason: 'occupied' }` if any placement sits at `col ≥ N'` or `row ≥ N'`; reject with `{ ok: false, reason: 'belowFloor', floor }` if `N' < minGridSizeFor(childCount)`; otherwise remove outer bands, set `gridSize = N'`, record `manualGridSize = N'`
    - Equal (`N' === N`): no grid change but never re-derive any placement from the seed (Req 10.10)
    - Return a discriminated `{ ok: true } | { ok: false; reason; floor }`
    - _Requirements: 10.2, 10.3, 10.4, 10.5, 10.6, 10.7, 10.8, 10.10_
    - _Properties: 15, 16_

  - [x] 9.2 Write property test for enlarge
    - **Property 15: Enlarge preserves placements and records the manual size**
    - For `N' > N`, assert `gridSize = N'`, `manualGridSize = N'`, every placement unchanged, and added cells classify as empty per ratio
    - `fc.assert(..., { numRuns: 100 })`; tag `// Feature: node-maps, Property 15: Enlarge preserves placements and records the manual size`
    - **Validates: Requirements 10.2, 10.3, 10.10**

  - [x] 9.3 Write property test for shrink safety
    - **Property 16: Shrink is safe — it refuses to drop any child and respects the floor**
    - For `N' < N`, assert rejection (grid + placements unchanged) when a placement lies in the removed bands or `N'` is below the all-children floor; otherwise bands removed, `manualGridSize = N'`, survivors unchanged
    - `fc.assert(..., { numRuns: 100 })`; tag `// Feature: node-maps, Property 16: Shrink is safe — it refuses to drop any child and respects the floor`
    - **Validates: Requirements 10.4, 10.5, 10.6, 10.7, 10.10**

- [x] 10. Implement backward-compatible serialization and load reconciliation
  - [x] 10.1 Add a defensive map hook to `recursivePostParseProcess` in `scripts.ts`
    - On load, clamp any out-of-range placement coordinates into `[0, N-1]` and de-dupe colliding coordinates without throwing; perform no new seed derivation here (authoritative reconcile happens at modal open)
    - Leave the existing `JSON.stringify` replacer in `stringifyNodes` unchanged (it already drops `parent`/`domElement`; `map`/`mapRef` are plain data)
    - _Requirements: 4.4, 4.6, 5.3, 5.4, 5.5_
    - _Properties: 7, 9_

  - [x] 10.2 Write property test for NodeMap round-trip
    - **Property 7: NodeMap survives a serialize/deserialize round-trip**
    - For arbitrary NodeMaps (with `manualGridSize`, userPositioned placements, arbitrary seed), assert serialize-with-replacer → parse yields structural equality in `gridSize`, `manualGridSize`, `layoutSeed`, and each placement's `childRef`/`col`/`row`/`userPositioned`; and the serialized text contains no `parent`/`domElement` keys
    - `fc.assert(..., { numRuns: 100 })`; tag `// Feature: node-maps, Property 7: NodeMap survives a serialize/deserialize round-trip`
    - **Validates: Requirements 4.3, 4.4, 5.4, 5.5, 9.8, 10.12**

  - [x] 10.3 Write property test for map-less byte-for-byte serialization and legacy load
    - **Property 8: Map-less nodes serialize exactly as before map support** (plus the legacy-load half of **Property 9**)
    - For nodes with no `map`, assert the serialization contains no `map`/`mapRef` key and equals a pre-feature serialization of the same node; a save→load round trip preserves exactly which nodes have/lack a map (dropping none, adding none); legacy (map-free) trees load without error with every node `map === undefined`
    - `fc.assert(..., { numRuns: 100 })`; tag `// Feature: node-maps, Property 8: Map-less nodes serialize exactly as before map support`
    - **Validates: Requirements 5.1, 5.2, 5.3, 5.7**

- [x] 11. Checkpoint - serialization and reconciliation
  - Ensure all tests pass, ask the user if questions arise.

- [x] 12. Wire template metadata and objectTypes reference
  - [x] 12.1 Declare map metadata on the two geography types
    - In `geographyTypes.ts`, set `mapCapable: true, emptinessRatio: 0` on `continent` and `mapCapable: true` with a high `emptinessRatio` on `coniferousForest`
    - _Requirements: 1.2, 1.5, 1.6_
    - _Properties: 1_

  - [x] 12.2 Wire `setObjectTypesRef` for `mapGenerator` in `objectTypes.ts`
    - Import and call `mapGenerator`'s `setObjectTypesRef(objectTypes)` alongside the existing partial-file ref wiring
    - _Requirements: 1.1, 1.4_
    - _Properties: 1_

  - [x] 12.3 Write example test for the fixed map-capable type set
    - Assert exactly `continent` and `coniferousForest` are `mapCapable` in `objectTypes`, every other type is not, and `continent`'s ratio is 0 while `coniferousForest`'s is > 0
    - _Requirements: 1.2_

- [x] 13. Implement mini-map color and label helpers (pure)
  - [x] 13.1 Implement `miniMapColor(childNode)` and the POI label helper in `mapModal.ts`
    - `miniMapColor` maps the child type's recognized terrain tags (reusing the `tags` vocabulary) to a color, with a single default fallback color
    - Add a pure `poiLabel(childNode)` returning the child `name` when non-empty, else the child type's `typeName`
    - _Requirements: 6.7, 7.1, 7.4, 11.1_
    - _Properties: 17, 18_

  - [x] 13.2 Write property test for the label rule
    - **Property 17: POI label follows the name-or-type rule**
    - Assert `poiLabel` returns the name when non-empty (including whitespace-only edge cases) and the type's `typeName` otherwise
    - `fc.assert(..., { numRuns: 100 })`; tag `// Feature: node-maps, Property 17: POI label follows the name-or-type rule`
    - **Validates: Requirements 6.7, 11.1**

  - [x] 13.3 Write property test for mini-map color derivation
    - **Property 18: Mini-map color derives from tags with a default fallback**
    - Assert `miniMapColor` returns the tag-mapped color when a recognized tag exists and the default color otherwise
    - `fc.assert(..., { numRuns: 100 })`; tag `// Feature: node-maps, Property 18: Mini-map color derives from tags with a default fallback`
    - **Validates: Requirements 7.1, 7.4**

- [x] 14. Implement the gesture classifier (pure)
  - [x] 14.1 Implement a pointer gesture classifier in `mapModal.ts`
    - Add a pure `classifyGesture(dx, dy, threshold)` → `'click' | 'drag'`: `click` when movement magnitude is within the threshold, `drag` otherwise
    - This underpins mutually-exclusive click-select vs. drag-reposition outcomes
    - _Requirements: 11.3, 11.4_
    - _Properties: 19_

  - [x] 14.2 Write property test for gesture classification
    - **Property 19: Pointer gesture classifies as click xor drag by movement threshold**
    - For arbitrary `(dx, dy)` deltas around the threshold, assert the classifier returns `click` within threshold and `drag` beyond, and the two are mutually exclusive
    - `fc.assert(..., { numRuns: 100 })`; tag `// Feature: node-maps, Property 19: Pointer gesture classifies as click xor drag by movement threshold`
    - **Validates: Requirements 11.3, 11.4**

- [x] 15. Implement drag/swap placement mutation (pure)
  - [x] 15.1 Implement `applyDrop(map, draggedChildRef, targetCol, targetRow)` in `mapModal.ts`
    - In-bounds empty target: set the dragged placement's `(col,row)` to target, mark it `userPositioned`, leave others unchanged
    - In-bounds occupied target: swap the two placements' coordinates, mark both `userPositioned`, no other flag altered
    - Out-of-bounds target: no mutation at all (caller returns the POI to its origin tile)
    - _Requirements: 9.2, 9.3, 9.4, 9.5_
    - _Properties: 13, 14_

  - [x] 15.2 Write property test for drag-to-reposition and swap
    - **Property 13: Drag-to-reposition moves or swaps exactly the involved placements**
    - Assert empty-target move changes only the dragged placement; occupied-target swap exchanges exactly the two; both set `userPositioned`, no other flag changes
    - `fc.assert(..., { numRuns: 100 })`; tag `// Feature: node-maps, Property 13: Drag-to-reposition moves or swaps exactly the involved placements`
    - **Validates: Requirements 9.2, 9.3, 9.4**

  - [x] 15.3 Write property test for out-of-bounds drop
    - **Property 14: Out-of-bounds drop is a no-op**
    - Assert an out-of-bounds target leaves every placement's `(col,row)` and `userPositioned` flag unchanged
    - `fc.assert(..., { numRuns: 100 })`; tag `// Feature: node-maps, Property 14: Out-of-bounds drop is a no-op`
    - **Validates: Requirements 9.5**

- [x] 16. Checkpoint - all pure functions and 19 properties
  - Ensure all tests pass, ask the user if questions arise.

- [x] 17. Add modal markup and styles
  - [x] 17.1 Add `#map-modal` to `index.pug`
    - Mirror `#statblock-modal`: `.map-modal-content` with `button#map-modal-close`, a `.map-modal-toolbar` holding a `label` + `input#map-grid-size[type=number][min=1]`, and a `#map-modal-body`
    - Exactly one `#map-modal` instance (reused across drill-down)
    - _Requirements: 6.1, 6.5, 6.6, 10.1_

  - [x] 17.2 Add map styles to `styles.scss`
    - CSS-grid tile grid under `#map-modal`; visually distinct Child/Terrain/Void tile classes; mini-map flat-fill style; modal + backdrop styles mirroring `#statblock-modal`
    - _Requirements: 6.3, 6.4, 7.1_

- [x] 18. Implement grid rendering in the modal
  - [x] 18.1 Implement `renderGrid(node)` in `mapModal.ts`
    - Render the `N x N` CSS grid into `#map-modal-body`; classify each cell via `classifyTile` and apply distinct Child/Terrain/Void classes
    - Draw each resolvable POI on its recorded tile with its label (`poiLabel`); skip unresolved placements (freed/empty tile) without throwing
    - Fill a map-capable child's Child_Tile with a flat `miniMapColor` Mini_Map (no nested grid, no own controls); render a non-capable child as a plain point location
    - _Requirements: 6.3, 6.4, 6.7, 7.1, 7.2, 7.3, 7.4, 8.7_

  - [x] 18.2 Write DOM/integration test for tile distinction and mini-map structure (jsdom)
    - Assert Child/Terrain/Void tiles carry distinct CSS classes; a non-capable child renders as a point (no mini-map); a mini-map fill exposes no controls, no nested grid, and no independent drag handler; a stale placement renders as an empty tile without error
    - _Requirements: 6.4, 7.2, 7.3, 8.7, 9.6_

- [x] 19. Implement modal open/close/drill-down lifecycle
  - [x] 19.1 Implement `openMapModal(node)` and close/backdrop wiring in `mapModal.ts`
    - `openMapModal` runs `reconcilePlacements` (calling `markUnsaved` when it changes the map), then `renderGrid`, then adds `.is-open` to the single `#map-modal`
    - Wire `#map-modal-close` click and backdrop click (`e.target === this`) to remove `.is-open`
    - _Requirements: 6.2, 6.5, 6.6, 8.1, 8.1a, 8.5, 8.6, 11.8_

  - [x] 19.2 Implement click-select and double-click drill-down handlers
    - Use `classifyGesture` to distinguish a click (select the child via the existing tree selection / `showInfoForNode`, modal stays open) from a completed drag (Map_Edit, no selection) — mutually exclusive
    - Double-click on a map-capable child with a map → `reconcilePlacements` + swap the single modal's content to the child's map (drill-down, no stacking); map-capable child without a map → `generateMap` on demand, `markUnsaved`, then drill down; non-capable child → treat as select only
    - _Requirements: 11.2, 11.3, 11.4, 11.5, 11.6, 11.7, 11.8_

  - [x] 19.3 Wire drag/swap pointer handlers to `applyDrop`
    - On drop, call `applyDrop`; on an in-bounds change, re-render and `markUnsaved`; on out-of-bounds, return the POI to its origin tile; present no drag affordance on the Mini_Map fill while still allowing the hosting Child_Tile to be dragged
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7_

  - [x] 19.4 Write DOM/integration test for modal lifecycle and drill-down (jsdom)
    - Assert a single `#map-modal`, open adds `.is-open`, close button and backdrop (`e.target === this`) remove it; drill-down swaps content without stacking a second modal; click selects via `showInfoForNode` with the modal staying open; double-click drill-down generates a map on demand when absent; non-capable double-click selects only
    - _Requirements: 6.2, 6.5, 6.6, 11.2, 11.5, 11.6, 11.7, 11.8_

- [x] 20. Implement resize UI wiring
  - [x] 20.1 Wire `input#map-grid-size` to `resizeGrid`
    - On change, validate the integer (`≥ 1`, non-NaN); call `resizeGrid`; on `{ ok: true }` re-render and `markUnsaved`; on `{ ok: false }` inform the user (occupied-children vs. below-floor message) and revert the input to the current `N`
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7, 10.11_

  - [x] 20.2 Write DOM/integration test for resize UI (jsdom)
    - Assert enlarge updates the grid and records manual size; shrink-into-occupied and below-floor requests are rejected with a user message and the input reverts; a grid-changing resize fires `markUnsaved`
    - _Requirements: 10.1, 10.5, 10.7, 10.11_

- [x] 21. Implement info-panel host controls
  - [x] 21.1 Add generate-map / open-map controls to `showInfoForNode` in `scripts.ts`
    - After existing fields: if `isMapCapable(node.type)` and `!node.map`, append a `.button-generate-map`; if `node.map`, append a `.button-open-map`; render neither for non-capable types
    - Add delegated handlers (mirroring `.button-view-statblock`): generate → `generateMap`, attach, `markUnsaved`, re-render info panel so the open control appears; open → `openMapModal`
    - Confirm no `NodeMap` is created during node creation or child-generation passes
    - _Requirements: 1.3, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 6.1_
    - _Properties: 3_

  - [x] 21.2 Write example test for control gating and markUnsaved side effects
    - Assert control presence across (capable/not, hasMap/not) combinations; no control for non-capable types; a `markUnsaved` spy fires on generate, incremental placement, Map_Edit, and grid-changing resize; no map is created during a child-generation pass
    - _Requirements: 1.3, 2.1, 2.3, 2.4, 2.5, 2.6, 8.5, 9.7, 10.11_

- [x] 22. Final checkpoint - full feature integration
  - Ensure all tests pass (property, example, and jsdom DOM suites) and the Gulp+Rollup build compiles, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional/test sub-tasks and can be skipped for a faster MVP, but the core property tests (6, 2, 7, 8, 4, 11, 12, 15, 16) are the highest-value coverage called out in the design and should not be skipped.
- Each task references specific requirement sub-clauses and, where applicable, the design properties it implements/validates.
- Property-based tests use `fast-check` with `fc.assert(..., { numRuns: 100 })` and are tagged `// Feature: node-maps, Property N: <text>`; each of the 19 design properties has exactly one property-based test.
- UI-gating, modal lifecycle, mini-map structure, and click/drill-down wiring are covered by example/jsdom DOM integration tests per the design's Testing Strategy.
- The serialization replacer in `stringifyNodes` stays unchanged; task 10.3 verifies byte-for-byte equality for map-less nodes.

## Requirements coverage

- Req 1: tasks 2.1, 4.1, 12.1, 12.2, 12.3, 21.1
- Req 2: tasks 6.1, 21.1, 21.2
- Req 3: tasks 4.2, 5.1, 6.1, 6.2
- Req 4: tasks 3.1, 6.1, 8.1, 10.1
- Req 5: tasks 2.1, 5.1, 10.1, 10.2, 10.3
- Req 6: tasks 13.1, 17.1, 18.1, 19.1
- Req 7: tasks 13.1, 17.2, 18.1
- Req 8: tasks 8.1, 19.1
- Req 9: tasks 15.1, 19.3
- Req 10: tasks 9.1, 17.1, 20.1
- Req 11: tasks 13.1, 14.1, 19.2

## Properties coverage

- Property 1 → 4.3; Property 2 → 4.4; Property 3 → 6.3; Property 4 → 6.4; Property 5 → 6.5; Property 6 → 3.2, 6.6; Property 7 → 10.2; Property 8 → 10.3; Property 9 → 8.4 (stale), 10.3 (legacy); Property 10 → 5.2; Property 11 → 8.2; Property 12 → 8.3; Property 13 → 15.2; Property 14 → 15.3; Property 15 → 9.2; Property 16 → 9.3; Property 17 → 13.2; Property 18 → 13.3; Property 19 → 14.2

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "2.1"] },
    { "id": 1, "tasks": ["3.1", "4.1", "17.1"] },
    { "id": 2, "tasks": ["3.2", "4.2", "4.3", "5.1", "12.1", "17.2"] },
    { "id": 3, "tasks": ["4.4", "5.2", "6.1", "6.2", "12.2", "13.1", "14.1"] },
    { "id": 4, "tasks": ["6.3", "6.4", "6.5", "6.6", "8.1", "9.1", "12.3", "13.2", "13.3", "14.2", "15.1"] },
    { "id": 5, "tasks": ["8.2", "8.3", "8.4", "9.2", "9.3", "10.1", "15.2", "15.3", "18.1"] },
    { "id": 6, "tasks": ["10.2", "10.3", "18.2", "19.1"] },
    { "id": 7, "tasks": ["19.2", "19.3", "20.1", "21.1"] },
    { "id": 8, "tasks": ["19.4", "20.2", "21.2"] }
  ]
}
```
