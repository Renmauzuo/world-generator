// Shared types for the world generator

export interface WeightedRange {
  [key: string]: number;
}

export interface MinMax {
  min: number;
  max: number;
}

export interface Prerequisite {
  attribute: string;
  operator: string;
  value: string;
}

export interface ChildTemplate {
  type: string | WeightedRange;
  min?: number;
  max?: number;
  weightedRange?: WeightedRange;
  requirement?: string;
  prerequisites?: Prerequisite[];
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
  creature?: string;
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
