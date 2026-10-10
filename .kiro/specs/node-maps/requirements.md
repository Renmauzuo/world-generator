# Requirements Document

## Introduction

Node Maps adds a spatial dimension to the world generator. The current node-based tree is good for ideation and notes, but it lacks a sense of physicality. This feature lets certain node types — geographical regions, to start — carry a **map**: a 2D arrangement of their child nodes within the parent's bounds, viewed in a modal.

The design balances two realities of this project:

- **Selective randomization** — a map is one more thing the tool fills in that the user can later refine. Maps are generated on demand, never forced.
- **Backward compatibility** — every existing save predates maps. Maps must be an optional, nullable part of a node that older saves simply lack, and that is created only when the user asks for it.

Maps are stored as structured layout data on the node (persisted through save/load) and rendered visually in a modal. Every child's tile on a parent map is filled with a representative color resolved from the child's type — identifying what the tile is — rather than a scaled-down rendering of the child's own map. A child whose type is itself map-capable additionally carries a distinct drillable corner-fold affordance, signalling that the tile has its own map and can be opened.

The layout model is a **discrete square tile grid**. A map is an N x N grid of square, uniform unit tiles, where N grows to fit the node's children plus the generic terrain the type calls for. Every tile is one of three kinds:

- a **child tile** — a tile occupied by a single Point_Of_Interest child;
- a **terrain tile** — a generic, non-void tile representing the node's own biome filling the space between children (for example "generic taiga"), part of the region's representable area;
- a **void tile** — padding that squares off the grid, outside the content and not part of the region's representable area.

How much terrain fills the space between children is governed by a per-type **emptiness ratio** (a children-to-empty-space ratio). A continent has an emptiness ratio of 0: anything inside its borders is one of its children, so there are no generic terrain tiles between them — the only non-child tiles are the void tiles unavoidably needed to complete the square. A taiga has a high emptiness ratio: many generic taiga terrain tiles sit between its children. As more children are added, the grid grows in width and height — N increases so the square still fits every child plus the void demanded by the emptiness ratio — and the grid never shrinks automatically.

Whether children end up **clustered together or spaced apart** is chosen per generated map by the Map_Generator, derived from the map's layout seed so the choice is stable across reopens and save/load. It is not a per-type knob; the only per-type knob is the emptiness ratio.

A map is generated **once** — the first time the user asks for it — and then maintained by hand. There is no regenerate action; the random layout is only ever a starting point. Inside the full-size modal the user can drag a placed point of interest to another tile, letting them compose a particular arrangement rather than accept the random one. Dragging is tile-snapped: a child moves from its current tile to the target tile. A manually repositioned placement becomes **user-authored**: its recorded tile is authoritative over any seed-derived tile.

When a node gains new children after its map exists, those children are **auto-placed** incrementally: the next time the map is opened, any current child that has no placement yet is added at a seed-derived tile — growing the grid if needed to fit it plus the emptiness ratio's void requirement — while every existing placement (including hand-dragged ones) is left on exactly the same tile. Children that have been removed free their tiles, which become void tiles; the grid does not shrink on its own. This keeps the map in step with the node's contents without ever rebuilding the whole layout or disturbing the user's work.

In the same hand-editing spirit, the user can also **manually resize the grid** from the modal — setting the grid's side length N up or down for a particular node when a looser or tighter arrangement is wanted. Enlarging always works and just adds empty tiles at the grid's high-index edge; shrinking peels off the outermost rows and columns, but is refused when a child occupies the area that would be removed, so no placement is ever lost. A manually set size is recorded on the node and acts as a floor: the automatic sizing never shrinks the grid below it, though auto-placement of later children can still grow the grid beyond it when they would not otherwise fit.

To keep the initial scope tractable, maps are enabled for **one or two geographical region types only** (the continent, with an emptiness ratio of 0, plus one terrain-bearing region such as taiga with a high emptiness ratio). The data model, generation, serialization, and rendering are designed so additional types can opt in later by adding template metadata — no structural changes required.

## Glossary

- **World_Generator**: The browser application as a whole.
- **WorldNode**: The core tree data structure. Has `type`, optional `name`, optional `attributes`, optional `children`, and runtime-only `parent`/`domElement`. The object serialized to JSON on save.
- **Node_Map** (or **Map**): Optional structured layout data attached to a WorldNode describing the square tile grid arrangement of that node's children (and terrain/void tiles). Nullable/absent on nodes that have no map.
- **Map_Capable_Type**: A node type whose `ObjectTypeTemplate` declares it may have a map (via template metadata). Initially a small set of geographical region types.
- **Map_Grid** (or **Grid**): The square N x N arrangement of tiles that a Node_Map lays its children out on. N is the grid's side length in tiles. Every cell of the grid holds exactly one Tile.
- **Manual_Grid_Size**: An optional, user-set side length N recorded on a Node_Map when the user manually resizes the Map_Grid. The Manual_Grid_Size acts as a floor for the automatic sizing: the automatic sizing never reduces N below the Manual_Grid_Size, though incremental auto-placement may grow N beyond it. Absent until the user performs a manual resize; persists through save and load.
- **Tile**: A single cell of the Map_Grid, addressed by an integer (column, row). Tiles are uniform unit squares. Every Tile is exactly one of three kinds: a Child_Tile, a Terrain_Tile, or a Void_Tile.
- **Child_Tile**: A Tile occupied by a single Point_Of_Interest child. Each Point_Of_Interest child occupies exactly one Child_Tile, and no two children share a Tile.
- **Terrain_Tile**: A generic, non-void Tile representing the node's own biome (for example "generic taiga") filling space between children. Terrain_Tiles are part of the region's representable area. Their quantity is governed by the type's Emptiness_Ratio.
- **Void_Tile**: A padding Tile that squares off the grid. A Void_Tile lies outside the content and is not part of the region's representable area; it exists only so the grid remains a complete N x N square.
- **Emptiness_Ratio**: Per-type metadata, declared in template metadata, giving the ratio of generic empty space to children for a Map_Capable_Type. A ratio of 0 means no Terrain_Tiles between children (continent-like: void tiles appear only as unavoidable square-completion padding). A ratio greater than 0 means generic empty terrain is generated between children (taiga-like: void tiles render as the type's generic terrain). The Emptiness_Ratio is the only per-type layout knob; whether children cluster or spread is derived from the layout seed by the Map_Generator, not configured per type.
- **Map_Placement**: One entry in a Map describing where a single child node sits — a reference to the child plus its tile coordinate, an integer (column, row), within the Map_Grid. A placement may carry a **user-positioned flag** marking that its tile was set by a manual edit rather than derived from the layout seed.
- **Map_Edit**: A manual repositioning of a single Map_Placement performed by the user dragging the represented Point_Of_Interest to another tile within the Map_Modal. A Map_Edit sets the placement's tile coordinate to the drop tile and marks the placement user-positioned.
- **User_Positioned_Placement**: A Map_Placement whose tile coordinate was set by a Map_Edit. Its recorded tile is authoritative over any seed-derived tile for that placement, and it is treated as a user-authored layout element.
- **Unplaced_Child**: A current Point_Of_Interest child of a node that has no corresponding Map_Placement in that node's Node_Map — typically a child added after the map was first generated. Unplaced children are the targets of incremental auto-placement.
- **Map_Generator**: The code that produces a Map's layout data for a node — the one-time initial layout from the node's children at generation time, and the incremental tile assignments for Unplaced_Children added later.
- **Map_Modal**: The modal UI that displays a node's map at full size.
- **Map_Color**: The resolved representative fill color of a child's Child_Tile on the parent map, identifying what the child's type is. The Map_Color is resolved per child type in a fixed order: (a) an explicit per-type map color declared in the child type's template metadata (the optional Map_Color_Field); else (b) a color derived from the child type's terrain tags; else (c) a single default fallback color. Every Child_Tile is filled with its child type's Map_Color, whether or not that child is a Map_Capable_Type. A Map_Color fill draws no child tile grid of its own and exposes no controls of its own; it is not independently draggable or selectable as a nested map. The Child_Tile carrying a Map_Color fill still responds to pointer interactions (hover, click, double-click) as governed by Requirement 11.
- **Map_Color_Field**: An optional per-type field in an ObjectTypeTemplate's metadata declaring an explicit Map_Color for that type. The Map_Color_Field is the highest-priority source in the Map_Color resolution order. It MAY be declared on any node type and is not required: a type without a Map_Color_Field falls back to its terrain tags and then to the default fallback color, so the field is backward-compatible with every existing type.
- **Drillable_Affordance**: A distinct corner-fold visual marker rendered on a Child_Tile whose represented child is a Map_Capable_Type, indicating that the tile has its own map and can be opened through Drill_Down (Requirement 11.5 and Requirement 11.6). The Drillable_Affordance identifies that a tile is drillable; it is distinct from the Map_Color, which identifies what the tile is. A Child_Tile whose represented child is not a Map_Capable_Type carries no Drillable_Affordance.
- **Drill_Down**: The action of navigating the single Map_Modal instance to display a child's own Node_Map in place of the currently displayed Node_Map, triggered by double-clicking a Child_Tile whose represented child is a Map_Capable_Type. If the child has no Node_Map yet, the Drill_Down first generates one on demand (as the generate-map control in Requirement 2 would) and then displays it.
- **Points_Of_Interest** (POI): The child nodes that are explicitly placed on a map in Child_Tiles (as opposed to terrain or void tiles).
- **Save_Payload**: The JSON produced when the user saves or exports a world.

## Requirements

### Requirement 1: Map-capable node types

**User Story:** As a world builder, I want only certain geographical node types to support maps, so that the feature starts small and maps appear only where physical arrangement makes sense.

#### Acceptance Criteria

1. THE World_Generator SHALL classify a node type as a Map_Capable_Type if and only if that type's ObjectTypeTemplate declares map support through static template metadata.
2. THE World_Generator SHALL enable map support for exactly one or two geographical region types in the initial release, and SHALL classify every other node type as not a Map_Capable_Type.
3. WHERE a node type is not a Map_Capable_Type, THE World_Generator SHALL present no generate-map control and no open-map control for nodes of that type and SHALL attach no Node_Map to those nodes.
4. THE World_Generator SHALL resolve whether a node type is a Map_Capable_Type solely from its ObjectTypeTemplate metadata, without any addition to or modification of the WorldNode data structure when a new type opts in.
5. WHERE a Map_Capable_Type declares an Emptiness_Ratio in its template metadata, THE World_Generator SHALL apply that declared Emptiness_Ratio when generating and rendering maps for nodes of that type.
6. IF a Map_Capable_Type declares no Emptiness_Ratio in its template metadata, THEN THE World_Generator SHALL apply an Emptiness_Ratio of 0, so that nodes of that type generate no Terrain_Tiles between children (continent-like behavior).

### Requirement 2: On-demand map generation

**User Story:** As a world builder, I want a map generated only when I ask and only once, so that generation stays cheap, existing worlds are untouched until I opt in, and the map I then shape by hand is never thrown away.

#### Acceptance Criteria

1. WHILE the selected node is a Map_Capable_Type that has no Node_Map, THE World_Generator SHALL present a single generate-map control that creates the node's Node_Map.
2. WHEN the user activates the generate-map control for a node that has no Node_Map, THE Map_Generator SHALL create a Node_Map from the set of children present on that node at the time of activation and attach the Node_Map to the node.
3. WHILE the selected node is a Map_Capable_Type that already has a Node_Map, THE World_Generator SHALL present no generate-map control for that node, so that an existing Node_Map is never rebuilt from scratch.
4. THE World_Generator SHALL NOT create a Node_Map for any node during initial node creation or during any child-generation pass.
5. WHEN the Map_Generator successfully creates a Node_Map, THE World_Generator SHALL mark the world as having unsaved changes so that the debounced auto-save persists the new Node_Map.
6. WHEN the Map_Generator successfully creates a Node_Map, THE World_Generator SHALL present the control to open the Map_Modal for that node.
7. IF the user activates the generate-map control for a node that has zero children at the time of activation, THEN THE Map_Generator SHALL create and attach a Node_Map containing zero Map_Placements that represents only the node's own area, and THE World_Generator SHALL mark the world as having unsaved changes.

### Requirement 3: Map layout generation

**User Story:** As a world builder, I want a node's map to lay out its children on a square tile grid, so that the arrangement reflects the node's contents and grows as children are added.

#### Acceptance Criteria

1. WHEN the Map_Generator generates a Node_Map for a node, THE Map_Generator SHALL create exactly one Map_Placement, occupying exactly one Child_Tile, for each child node that is a Point_Of_Interest, so that the number of Child_Tiles equals the number of child Points_Of_Interest at generation time.
2. THE Map_Generator SHALL express every Map_Placement position as an integer tile coordinate (column, row) within the Map_Grid, where column and row each fall in the range 0 to N-1 inclusive and are independent of any pixel or display dimension.
3. WHEN the Map_Generator places a Point_Of_Interest, THE Map_Generator SHALL assign it exactly one tile coordinate within the Map_Grid, and SHALL NOT assign that tile coordinate to any other Map_Placement, so that no two children occupy the same Tile.
4. WHEN the Map_Generator generates a Node_Map, THE Map_Generator SHALL make the Map_Grid square with side length N, where N is the smallest integer such that N squared is greater than or equal to the child Point_Of_Interest count AND the resulting void count, equal to N squared minus the child Point_Of_Interest count, satisfies the type's Emptiness_Ratio.
5. WHERE a Map_Capable_Type has an Emptiness_Ratio of 0, THE Map_Generator SHALL generate no Terrain_Tiles, so that every non-Void_Tile in the grid is a Child_Tile and the only non-child tiles are the Void_Tiles required to complete the square.
6. WHERE a Map_Capable_Type has an Emptiness_Ratio greater than 0, THE Map_Generator SHALL grow N until the void count, equal to N squared minus the child Point_Of_Interest count, meets the empty-space quantity implied by that Emptiness_Ratio, and SHALL render those empty tiles as the type's generic terrain.
7. WHEN the Map_Generator has assigned every Child_Tile, THE Map_Generator SHALL designate each remaining cell of the N x N grid as an empty tile, rendering empty tiles as Terrain_Tiles where the Emptiness_Ratio is greater than 0 and as Void_Tiles where the Emptiness_Ratio is 0, so that every cell of the square grid is a Child_Tile, a Terrain_Tile, or a Void_Tile.
8. WHEN the Map_Generator assigns tile coordinates to the Child_Tiles, THE Map_Generator SHALL derive from the layout seed whether the children are clustered together or spread apart across the Map_Grid.
9. WHEN the Map_Generator creates a Map_Placement, THE Map_Generator SHALL record an identifier of the represented child node that persists through save and load and that remains resolvable to that child for as long as the child exists in the node.

### Requirement 4: Deterministic, stable layout

**User Story:** As a world builder, I want a map's layout to be stable once generated and reproducible from the same inputs, so that reopening a saved map shows the same arrangement and newly auto-placed children land predictably.

#### Acceptance Criteria

1. WHEN a Node_Map is displayed more than once, THE World_Generator SHALL render every Map_Placement on the same tile coordinate on each display, except where a Map_Edit or an incremental auto-placement has changed that placement between displays.
2. WHEN the Map_Generator derives tile coordinates for the same set of children twice from an identical layout seed, THE Map_Generator SHALL assign each child the identical integer (column, row) and SHALL make the identical clustered-versus-spread choice on both occasions.
3. THE Map_Generator SHALL record in the Node_Map the layout seed from which any layout randomness is derived, so that the seed persists through save and load.
4. WHEN a saved Node_Map is loaded, THE World_Generator SHALL reproduce each Map_Placement tile coordinate as the identical integer (column, row) recorded before saving, so that the loaded map renders identically to the map before saving.
5. THE Map_Generator SHALL use the layout seed solely to derive tile coordinates for the node's initial Map_Placements and for the incremental placement of Unplaced_Children, and SHALL NOT use the layout seed to rebuild a Node_Map's existing Map_Placements.
6. IF a loaded Node_Map has no recoverable layout seed, THEN THE World_Generator SHALL render the Node_Map from the tile coordinates already recorded on its Map_Placements without deriving any new tile coordinates.
7. WHERE a Map_Placement is a User_Positioned_Placement, THE World_Generator SHALL render that placement on its recorded tile coordinate and SHALL treat that recorded tile coordinate as authoritative over any tile coordinate the layout seed would derive for the same placement.
8. THE Map_Generator SHALL derive the grid side length N deterministically from the child Point_Of_Interest count and the type's Emptiness_Ratio, so that the same count and ratio always yield the same N.

### Requirement 5: Backward-compatible serialization

**User Story:** As a returning user, I want my existing saved worlds to keep loading, so that adding maps never breaks my data.

#### Acceptance Criteria

1. WHEN a world is saved or exported, THE World_Generator SHALL include each node's Node_Map in the Save_Payload for exactly those nodes that have a Node_Map, with no map field present for nodes that have none.
2. WHERE a node has no Node_Map, THE World_Generator SHALL produce a Save_Payload for that node that contains no map data and that is byte-for-byte identical to the Save_Payload the same node produced before map support existed.
3. WHEN the World_Generator loads a Save_Payload created before maps existed, THE World_Generator SHALL complete loading without throwing an error, attach every node from the payload to the tree, and treat each loaded node as having no Node_Map.
4. WHEN the World_Generator loads a Save_Payload that contains Node_Map data, THE World_Generator SHALL reconstruct each Node_Map so that its grid size N, any Manual_Grid_Size, layout seed, placements, references, integer tile coordinates, and tile kinds (Child_Tile, Terrain_Tile, Void_Tile) are structurally equal to the Node_Map that was saved, yielding an identical rendering (round-trip property).
5. WHEN the World_Generator serializes a node, THE World_Generator SHALL exclude the runtime-only references parent and domElement from both the node and its Node_Map, consistent with the existing serialization replacer.
6. WHEN the World_Generator loads a Node_Map whose Map_Placements reference children (by their stable child reference) that no longer exist among the node's current children, THE World_Generator SHALL complete loading without throwing an error and SHALL render the map with only the placements whose referenced children exist, omitting the unresolved placements.
7. WHEN a Save_Payload is saved and then loaded without modification, THE World_Generator SHALL preserve every node that has no Node_Map unchanged, neither dropping the node nor adding map data to it.

### Requirement 6: Map modal display

**User Story:** As a world builder, I want to view a node's map in a modal, so that I can see the spatial arrangement without crowding the info panel.

#### Acceptance Criteria

1. WHERE the selected node is a Map_Capable_Type and has a Node_Map, THE World_Generator SHALL present a control to open the Map_Modal for that node.
2. WHEN the user activates the open-map control, THE World_Generator SHALL display the node's Node_Map as the single open Map_Modal instance.
3. WHILE the Map_Modal is displaying a Node_Map, THE Map_Modal SHALL render the Map_Grid as a square of N x N tiles and SHALL render each Point_Of_Interest on the tile coordinate recorded in its Map_Placement.
4. WHILE the Map_Modal is displaying a Node_Map, THE Map_Modal SHALL render Child_Tiles, Terrain_Tiles, and Void_Tiles as visually distinct kinds of tile, so that generic terrain is distinguishable from both occupied tiles and square-completion padding.
5. WHEN the user activates the Map_Modal close control, THE Map_Modal SHALL close so that no Map_Modal instance remains displayed.
6. WHEN the user activates the Map_Modal backdrop outside the map content area, THE Map_Modal SHALL close so that no Map_Modal instance remains displayed.
7. WHILE the Map_Modal is displaying a Node_Map, THE Map_Modal SHALL label each rendered Point_Of_Interest with the represented child node's display name when that name is non-empty, and otherwise with the child node's type display name.

### Requirement 7: Child tile coloring

**User Story:** As a world builder, I want every child's tile shown in a color that reflects its type on the parent map, so that I get a sense of the world's variety at a glance regardless of whether a child has its own map.

#### Acceptance Criteria

1. WHILE the Map_Modal is displaying a Node_Map, THE Map_Modal SHALL fill every Child_Tile with the Map_Color resolved for the represented child's type, whether or not that child is a Map_Capable_Type.
2. WHEN the Map_Modal resolves a Child_Tile's Map_Color, THE Map_Modal SHALL use the explicit Map_Color declared in the child type's Map_Color_Field where the child type declares one.
3. WHERE the child type declares no Map_Color_Field, THE Map_Modal SHALL derive the Child_Tile's Map_Color from the child type's terrain tags.
4. IF the child type declares no Map_Color_Field and no terrain tag yields a color, THEN THE Map_Modal SHALL fill the Child_Tile with a single default fallback color.
5. THE Map_Modal SHALL render every Map_Color fill as exposing no controls of its own and not rendering the child's own tile grid, and SHALL govern pointer interactions on the hosting Child_Tile through Requirement 11 rather than through the Map_Color fill.
6. WHERE a Child_Tile's represented child is a Map_Capable_Type, THE Map_Modal SHALL render a Drillable_Affordance as a distinct corner-fold marker on that Child_Tile, indicating that the tile has its own map and can be opened.
7. WHERE a Child_Tile's represented child is not a Map_Capable_Type, THE Map_Modal SHALL render that Child_Tile without a Drillable_Affordance.
8. WHILE the pointer hovers over a Child_Tile that carries a Drillable_Affordance, THE Map_Modal SHALL present a pointer cursor hint indicating that the tile can be opened.
9. WHERE a node type declares a Map_Color_Field, THE World_Generator SHALL resolve that type's Map_Color from the declared field, and WHERE a node type declares no Map_Color_Field, THE World_Generator SHALL resolve that type's Map_Color from its terrain tags and then the default fallback color, so that declaring a Map_Color_Field is optional per type and no type is required to declare one.

### Requirement 8: Incremental child placement

**User Story:** As a world builder, I want a node's children to appear on its map automatically as I add them, so that the map stays in step with the node's contents without me rebuilding it or losing my hand-placed layout.

#### Acceptance Criteria

1. WHEN the user opens the Map_Modal for a node whose Node_Map is missing a Map_Placement for one or more of the node's current Point_Of_Interest children, THE Map_Generator SHALL create one Map_Placement for each such Unplaced_Child, assigning it a seed-derived tile coordinate consistent with Requirement 3 and Requirement 4, and add those placements to the Node_Map.
1a. WHEN the user opens the Map_Modal for a node whose Node_Map has both Map_Placements referencing removed children and one or more Unplaced_Children, THE Map_Generator SHALL add the tiles freed by the removed children's placements to the empty-tile pool before auto-placing the Unplaced_Children, so that those freed tiles are available for assignment to the newly placed Unplaced_Children during the same open operation.
2. WHEN the Map_Generator auto-places one or more Unplaced_Children and the Map_Grid cannot fit the new Child_Tiles plus the void required by the type's Emptiness_Ratio, THE Map_Generator SHALL grow N so that the square fits every Child_Tile plus that required void, and SHALL NOT reduce N below the greater of its current value and the Node_Map's Manual_Grid_Size.
3. WHEN the Map_Generator auto-places one or more Unplaced_Children, THE Map_Generator SHALL assign each Unplaced_Child to an empty tile not occupied by any existing Map_Placement, so that no two children occupy the same Tile.
4. WHEN the Map_Generator auto-places one or more Unplaced_Children, THE Map_Generator SHALL leave every pre-existing Map_Placement — including every User_Positioned_Placement — unchanged in tile coordinate and user-positioned flag.
5. WHEN the Map_Generator auto-places one or more Unplaced_Children, THE World_Generator SHALL mark the world as having unsaved changes so that the debounced auto-save persists the added placements.
6. WHEN the user opens the Map_Modal for a node whose Node_Map has no Unplaced_Children, THE Map_Generator SHALL add no Map_Placements and SHALL leave the Node_Map unchanged.
7. IF a Node_Map is displayed while one or more of its Map_Placements reference a child that is no longer present among the node's current children, THEN THE Map_Modal SHALL render every Map_Placement whose referenced child exists, SHALL designate the freed tile of each absent child's former placement as an empty tile, and SHALL complete rendering without raising an error or terminating early.

### Requirement 9: Interactive map editing (drag-to-reposition)

**User Story:** As a world builder, I want to drag placed points of interest to new tiles inside the full-size map, so that I can compose a particular arrangement instead of accepting the randomly generated one.

#### Acceptance Criteria

1. WHILE the Map_Modal is displaying a Node_Map, THE Map_Modal SHALL allow the user to drag any Point_Of_Interest rendered from a Map_Placement from its current Tile toward another Tile within the Map_Grid.
2. WHEN the user drops a dragged Point_Of_Interest on a Tile within the Map_Grid that holds no Point_Of_Interest, THE Map_Modal SHALL set that Point_Of_Interest's Map_Placement tile coordinate to the drop Tile's (column, row), performing a Map_Edit.
3. WHEN the user drops a dragged Point_Of_Interest on a Tile within the Map_Grid that is occupied by another Point_Of_Interest, THE Map_Modal SHALL swap the two Points_Of_Interest by setting the dragged Point_Of_Interest's Map_Placement to the drop Tile's (column, row) and the displaced Point_Of_Interest's Map_Placement to the dragged Point_Of_Interest's origin Tile, performing a Map_Edit on both placements.
4. WHEN the user completes a Map_Edit, THE Map_Modal SHALL mark each Map_Placement changed by that Map_Edit as a User_Positioned_Placement.
5. IF the user drops a dragged Point_Of_Interest outside the bounds of the Map_Grid, THEN THE Map_Modal SHALL return the dragged Point_Of_Interest to its origin Tile and SHALL leave every Map_Placement tile coordinate unchanged.
6. WHERE a child's Child_Tile is filled with a Map_Color, THE World_Generator SHALL present no drag affordance that initiates an independent drag of the child's inner contents from that fill, while still allowing the hosting Child_Tile to be dragged to reposition it on the parent Map_Grid under Requirement 9.1 through Requirement 9.5, so that repositioning operates on the parent grid rather than on the Map_Color fill as its own nested grid.
7. WHEN the user completes a Map_Edit, THE World_Generator SHALL mark the world as having unsaved changes so that the debounced auto-save persists the edited tile coordinates.
8. WHEN a Node_Map containing one or more User_Positioned_Placements is saved and then loaded without modification, THE World_Generator SHALL reproduce each User_Positioned_Placement at its edited tile coordinate and SHALL preserve its user-positioned flag (round-trip property).

### Requirement 10: Manual grid resize

**User Story:** As a world builder, I want to manually set a node's map grid size up or down, so that I can make a particular node's arrangement looser or tighter without losing any placed children.

#### Acceptance Criteria

1. WHILE the Map_Modal is displaying a Node_Map, THE Map_Modal SHALL present a control that lets the user set the Map_Grid side length N to an integer value, as a per-node manual override distinct from the automatic sizing.
2. WHEN the user sets the Map_Grid side length to a value greater than the current N, THE World_Generator SHALL increase N to the requested value, SHALL add the new cells at the high-index edge so that every existing Map_Placement keeps its recorded (column, row) tile coordinate, and SHALL record the requested value as the Node_Map's Manual_Grid_Size.
3. WHEN the World_Generator enlarges the Map_Grid, THE World_Generator SHALL designate each newly added cell as an empty tile, rendering it as a Terrain_Tile where the type's Emptiness_Ratio is greater than 0 and as a Void_Tile where the Emptiness_Ratio is 0, consistent with Requirement 3.
4. WHEN the user sets the Map_Grid side length to a value less than the current N, THE World_Generator SHALL identify the outermost rows and columns to be removed as the tiles at column index N-1 and row index N-1, applied repeatedly for each unit of decrease.
5. IF the user sets the Map_Grid side length to a value less than the current N and any tile within the rows and columns to be removed is a Child_Tile, THEN THE World_Generator SHALL reject the resize, SHALL leave the Map_Grid and every Map_Placement unchanged, and SHALL inform the user that children occupy tiles in the area to be removed and must be moved inward first.
6. WHEN the user sets the Map_Grid side length to a value less than the current N and every tile within the rows and columns to be removed is a Terrain_Tile or a Void_Tile, THE World_Generator SHALL reduce N to the requested value, SHALL remove those outer rows and columns, and SHALL record the requested value as the Node_Map's Manual_Grid_Size.
7. THE World_Generator SHALL constrain the manual Map_Grid side length to a floor equal to the smallest integer N whose N x N grid can hold every current Child_Tile, and SHALL reject any requested value below that floor while leaving the Map_Grid unchanged.
8. WHILE a Node_Map has a Manual_Grid_Size, THE World_Generator SHALL treat the Manual_Grid_Size as a minimum for the Map_Grid side length and SHALL NOT allow the automatic sizing to reduce N below the Manual_Grid_Size.
9. WHEN incremental auto-placement under Requirement 8 cannot fit the node's Child_Tiles plus the void required by the Emptiness_Ratio within a Map_Grid whose side length equals the Manual_Grid_Size, THE Map_Generator SHALL grow N beyond the Manual_Grid_Size as needed to fit them.
10. WHEN the user issues a manual resize request, THE World_Generator SHALL leave every existing Map_Placement's recorded child reference and user-positioned flag unchanged and SHALL NOT re-derive any existing Map_Placement's tile coordinate from the layout seed, consistent with Requirement 4, applying this guarantee unconditionally even when the requested side length equals the current N and no change to the Map_Grid occurs.
11. WHEN the user completes a manual resize that changes the Map_Grid, THE World_Generator SHALL mark the world as having unsaved changes so that the debounced auto-save persists the new side length and Manual_Grid_Size.
12. WHEN a Node_Map that has a Manual_Grid_Size is saved and then loaded without modification, THE World_Generator SHALL reproduce the identical Manual_Grid_Size and the identical Map_Grid side length N, so that the loaded map renders at the same size (round-trip property).

### Requirement 11: On-map child interactions (hover, select, drill-down)

**User Story:** As a world builder, I want to interact with the children shown on a map, so that I can see what each tile represents, select a child in the tree, and navigate into a child's own map.

#### Acceptance Criteria

1. WHILE the Map_Modal is displaying a Node_Map and the pointer hovers over a Child_Tile, THE Map_Modal SHALL surface the represented child node's display name when that name is non-empty, and otherwise the represented child node's type display name, consistent with the labeling rule in Requirement 6.7.
2. WHEN the user performs a press and release on a single Child_Tile with no pointer movement beyond a small click threshold, THE World_Generator SHALL select the represented child node in the main world tree and info panel through the existing tree selection mechanism, exactly as a click on that node in the tree would, and THE Map_Modal SHALL remain open and continue displaying the same Node_Map.
3. WHEN the user drags a Point_Of_Interest and completes a Map_Edit under Requirement 9, THE World_Generator SHALL NOT select the represented child node, so that a completed drag reposition does not also perform the click-select of Requirement 11.2.
4. WHEN the user performs the click-select of Requirement 11.2 on a Child_Tile, THE World_Generator SHALL NOT perform a Map_Edit for that interaction, so that a click and a drag reposition are mutually exclusive outcomes of a single pointer gesture.
5. WHEN the user double-clicks a Child_Tile whose represented child is a Map_Capable_Type that already has a Node_Map, THE World_Generator SHALL perform a Drill_Down that displays the represented child's Node_Map as the single open Map_Modal instance in place of the currently displayed Node_Map, and SHALL incrementally auto-place the represented child's Unplaced_Children consistent with Requirement 8.
6. WHEN the user double-clicks a Child_Tile whose represented child is a Map_Capable_Type that has no Node_Map, THE World_Generator SHALL create a Node_Map for the represented child from that child's children at the time of the double-click, SHALL mark the world as having unsaved changes, and SHALL perform a Drill_Down that displays the newly created Node_Map as the single open Map_Modal instance.
7. WHEN the user double-clicks a Child_Tile whose represented child is not a Map_Capable_Type, THE World_Generator SHALL perform no Drill_Down and SHALL treat the interaction as the selection described in Requirement 11.2.
8. WHILE the Map_Modal is displaying a Node_Map reached through a Drill_Down, THE World_Generator SHALL keep exactly one Map_Modal instance open, so that a Drill_Down navigates the single modal rather than stacking an additional Map_Modal, consistent with Requirement 6.2.
