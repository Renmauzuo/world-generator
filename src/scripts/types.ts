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
  referenceBook?: string;
  referencePage?: number;
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
}

export interface WorldNode {
  type: string;
  name?: string;
  parent?: WorldNode;
  children?: WorldNode[];
  attributes?: Record<string, any>;
  domElement?: JQuery;
}

export interface RaceData {
  str?: number;
  dex?: number;
  con?: number;
  int?: number;
  wis?: number;
  cha?: number;
}
