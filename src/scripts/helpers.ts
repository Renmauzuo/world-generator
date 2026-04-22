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
