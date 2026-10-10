import type { MonsterID } from '@toolkit5e/monster-scaler';

// Shared types for the world generator

export interface WeightedRange {
  [key: string]: number;
}

export interface MinMax {
  min: number;
  max: number;
}

export interface Condition {
  /** The attribute key on the node to check */
  attribute: string;
  /** The value to compare against */
  value: string;
  /** Whether the attribute should match (true) or not match (false) the value. Defaults to true. */
  match?: boolean;
}

export interface ChildTemplate {
  type: string | WeightedRange;
  min?: number;
  max?: number;
  weightedRange?: WeightedRange;
  /** One or more conditions evaluated as OR — child is valid if any condition passes */
  conditions?: Condition[];
  requiredSibling?: string;
}

export interface ObjectTypeTemplate {
  typeName: string;
  categories?: string[];
  nameGenerator?: (node: WorldNode) => string;
  attributes?: Record<string, any>;
  children?: ChildTemplate[];
  inheritAttributes?: string[];
  creature?: MonsterID;
  variant?: string;
  legendary?: 3 | 5;
  /**
   * When true, creature/variant/legendary are resolved dynamically from node attributes
   * instead of from the template. The node's attributes must include `creature` (MonsterID),
   * and optionally `variant` and `legendary`.
   */
  dynamicCreature?: boolean;
  /**
   * Content source id (see `sources` in `@toolkit5e/base`, e.g. `'srd'`, `'toolkit5e'`).
   * Omit to treat this type as the default source (SRD). Users can toggle sources on/off
   * in the control panel; types whose resolved source is disabled are skipped during generation.
   * For creature-backed types, the creature/variant's own source takes precedence when resolving.
   */
  source?: string;
  /**
   * Optional setup function called after attributes are generated and before the name generator.
   * Use for complex multi-attribute logic where derived attributes depend on other attributes.
   * The node's basic attributes (including inherited ones) are already populated when this runs.
   */
  customSetup?: (node: WorldNode) => void;
  /**
   * When true, this node type is added to the global node registry on creation.
   * Other nodes can query the registry to reference nodes of this type across the tree
   * (e.g. avatars referencing deities, NPCs referencing a patron deity).
   */
  registered?: boolean;
  /**
   * Static metadata tags describing what this type represents (e.g. `['water']`, `['forest']`).
   * Not stored on nodes or editable by users — purely for code to reference when making
   * context-aware decisions (e.g. avatar deity selection based on biome).
   */
  tags?: string[];
  /**
   * Speciation identity for beast types. All node types representing the same animal concept
   * share a speciationId (e.g. 'mammoth' for mammothHerd, mammothBull, mammothCalf).
   * Used as the key in the species registry so related types share a species pool.
   * Types without this field don't participate in speciation.
   */
  speciationId?: string;
  /**
   * When true, nodes of this type may carry a Node_Map (a 2D tile-grid layout of
   * their children). Resolved solely from the template — adding map support to a
   * type requires NO change to the WorldNode data structure. (Req 1.1, 1.4)
   */
  mapCapable?: boolean;
  /**
   * Ratio of generic empty space (Terrain_Tiles) to child Points_Of_Interest for a
   * map-capable type. 0 = continent-like (no terrain between children; non-child
   * tiles are square-completion Void only). > 0 = taiga-like (generic terrain fills
   * between children). Defaults to 0 when absent. (Req 1.5, 1.6, 3.6)
   */
  emptinessRatio?: number;
  /**
   * Optional explicit map tile color (any CSS color string) for this type. Highest-priority
   * source in the Map_Color resolution order: an explicit mapColor wins over a terrain-tag
   * color, which in turn wins over the single default fallback. Optional on every type —
   * types without it fall back to tags then the default, so it is backward-compatible.
   * (Req 7.2, 7.9)
   */
  mapColor?: string;
}

export interface WorldNode {
  type: string;
  name?: string;
  parent?: WorldNode;
  children?: WorldNode[];
  attributes?: Record<string, any>;
  domElement?: JQuery;
  /**
   * When true, this node (and its subtree) is GM-only content. It can be excluded
   * from player-facing exports via the "Export (Players)" option. Purely a sharing/visibility
   * flag — not an attribute, not used by the generator.
   */
  gmOnly?: boolean;
  /**
   * Optional 2D spatial layout of this node's children. Absent on nodes without a
   * map; absent nodes serialize byte-for-byte as before map support existed.
   * Contains NO live parent/domElement references — children are referenced by a
   * stable id string. (Req 1.3, 5.1, 5.2, 5.5)
   */
  map?: NodeMap;
  /**
   * Stable reference id written onto a child node once it is placed on its parent's
   * Node_Map, matched by `MapPlacement.childRef`. Present only on children that are
   * actually placed, so unplaced nodes and map-free worlds stay byte-for-byte
   * unchanged. Plain string — serializes with the existing replacer. (Req 3.9, 5.5, 5.6)
   */
  mapRef?: string;
}

/**
 * Structured layout data attached to a WorldNode. Pure data — safe to JSON.stringify
 * with the existing replacer (no parent/domElement keys).
 */
export interface NodeMap {
  /** Current grid side length N (tiles per side). Derived or manually set. (Req 3.4) */
  gridSize: number;
  /**
   * User-set side length floor. Absent until the user manually resizes. Automatic
   * sizing never reduces gridSize below this; incremental placement may grow beyond.
   * (Req 10.2, 10.6, 10.8)
   */
  manualGridSize?: number;
  /**
   * Integer seed from which all layout randomness derives. Persists through save/load.
   * (Req 4.3) If absent/unrecoverable on load, recorded placement coords are used as-is. (Req 4.6)
   */
  layoutSeed: number;
  /** One entry per placed child Point_Of_Interest. (Req 3.1) */
  placements: MapPlacement[];
}

/**
 * Where a single child node sits on the grid. Tile kinds (Child/Terrain/Void) are
 * NOT stored — they are derived at render time. Only child placements are persisted.
 */
export interface MapPlacement {
  /**
   * Stable reference to the represented child node that survives save/load and
   * remains resolvable while the child exists. Matched against the child's `mapRef`.
   * (Req 3.9, 5.6)
   */
  childRef: string;
  /** Integer tile coordinate, 0..N-1 inclusive. (Req 3.2) */
  col: number;
  row: number;
  /**
   * True when the tile was set by a manual Map_Edit (drag/swap). A user-positioned
   * placement's recorded tile is authoritative over any seed-derived tile. (Req 4.7, 9.4)
   */
  userPositioned?: boolean;
}

export interface RaceData {
  str?: number;
  dex?: number;
  con?: number;
  int?: number;
  wis?: number;
  cha?: number;
  /** Weighted alignment bias for random NPC alignment selection. Keys are alignment strings, values are relative weights. */
  alignmentBias?: Record<string, number>;
}
