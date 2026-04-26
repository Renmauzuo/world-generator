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
