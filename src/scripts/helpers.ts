import type { WorldNode, WeightedRange } from './types';
import type { ObjectTypeTemplate } from './types';

export function rand(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1) + min);
}

export function randFromArray<T>(array: T[]): T {
    return array[rand(0, array.length - 1)];
}

export function weightedRand(weights: WeightedRange): string {
    let weightTotal = 0;
    let sum = 0;
    const r = Math.random();
    for (const i in weights) {
        weightTotal += weights[i];
    }
    for (const i in weights) {
        sum += weights[i] / weightTotal;
        if (r <= sum) return i;
    }
    // Fallback: return last key
    return Object.keys(weights)[Object.keys(weights).length - 1];
}

export function shouldInheritAttribute(
    parent: WorldNode | undefined,
    template: ObjectTypeTemplate,
    attribute: string
): boolean {
    // Check if this is an inherited attribute for this type
    if (!template.inheritAttributes || !template.inheritAttributes.includes(attribute)) {
        return false;
    }

    // Make sure there is a parent with this attribute
    if (!parent || !parent.attributes || !parent.attributes[attribute]) {
        return false;
    }

    // If parent has a "mixed" value let child choose for itself
    if (parent.attributes[attribute] === "Mixed") {
        return false;
    }

    return true;
}

export function capitalize(string: string): string {
    return string.substring(0, 1).toUpperCase() + string.substring(1);
}

export function spacesFromCamelCase(string: string): string {
    return string.replace(/([A-Z])/g, ' $1');
}

/** Prefixes "Mixed" to an array of possible values.
 *  Used for heritable values so children can have mixed values rather than all inheriting from the parent. */
export function arrayWithMixed(array: string[]): string[] {
    return ["Mixed"].concat(array);
}

/**
 * Collects all tags from a node's ancestor chain by walking up the parent references.
 * Returns a Set of unique tag strings gathered from each ancestor's ObjectTypeTemplate.
 * Requires objectTypes to be passed in to avoid circular imports.
 */
export function collectAncestorTags(
    node: WorldNode,
    typeMap: Record<string, ObjectTypeTemplate>
): Set<string> {
    const tags = new Set<string>();
    let current: WorldNode | undefined = node;
    while (current) {
        const template = typeMap[current.type];
        if (template?.tags) {
            for (const tag of template.tags) {
                tags.add(tag);
            }
        }
        current = current.parent;
    }
    return tags;
}

/**
 * Resolves the effective magic level for a node by walking up the ancestor chain.
 * The nearest `magicLevel` attribute wins. Reaching a planar node (one with an `element`
 * attribute) first means outer planes, which are magical regardless, so returns 'High'.
 * Returns undefined when nothing applies (e.g. old saves), meaning "don't gate".
 */
export function getMagicLevel(node: WorldNode | undefined): string | undefined {
    let current = node;
    while (current) {
        const attrs = current.attributes;
        if (attrs?.magicLevel) return attrs.magicLevel;
        if (attrs?.element !== undefined) return 'High';
        current = current.parent;
    }
    return undefined;
}

/**
 * Decides what actually spawns for a child type under a given magic level.
 * Returns the type itself, its mundane variant, or null (skip).
 */
export function resolveMagicSpawn(
    type: string,
    level: string | undefined,
    typeMap: Record<string, ObjectTypeTemplate>,
    chances: Record<string, Record<'minor' | 'major', number>>,
    explicitRule = false
): string | null {
    const template = typeMap[type];
    if (!template?.magic || !level) return type;
    // `explicitRule`: the parent's child template already gates this spawn with its own
    // magicLevel conditions, so it owns the probability. Only the No Magic floor applies.
    // Otherwise fall back to the default per-level chance.
    const chance = level === 'None' ? 0 : explicitRule ? 1 : (chances[level]?.[template.magic] ?? 1);
    if (Math.random() < chance) return type;
    return template.mundaneVariant ?? null;
}

/**
 * Deterministic 32-bit seeded PRNG (mulberry32). Returns a generator function
 * that yields floats in the range [0, 1).
 *
 * Used ONLY by the Node Maps layout generator (mapGenerator.ts) so map
 * arrangements can be reproduced from a persisted integer seed. It is kept
 * separate from `rand`/`weightedRand` (which stay on `Math.random()`) so
 * general world generation is untouched.
 *
 * Feeding the same seed yields the identical stream of outputs, so re-deriving
 * coordinates for the same child set produces identical layouts.
 */
export function mulberry32(seed: number): () => number {
    let state = seed >>> 0;
    return function (): number {
        state = (state + 0x6d2b79f5) >>> 0;
        let t = state;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}
