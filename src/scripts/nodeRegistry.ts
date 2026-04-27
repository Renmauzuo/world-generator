import type { WorldNode } from './types';

/**
 * Global registry of nodes indexed by type. Only node types explicitly registered
 * are tracked. Provides O(1) lookups for cross-tree references
 * (e.g. avatars referencing deities, NPCs referencing a patron deity).
 */
const registry: Map<string, WorldNode[]> = new Map();

/**
 * Adds a node to the registry under its type key.
 * Only call this for node types that should be registered (check template.registered).
 */
export function registerNode(node: WorldNode): void {
    if (!registry.has(node.type)) {
        registry.set(node.type, []);
    }
    registry.get(node.type)!.push(node);
}

/** Returns all registered nodes of the given type(s). */
export function getRegisteredNodes(...types: string[]): WorldNode[] {
    const result: WorldNode[] = [];
    for (const type of types) {
        const nodes = registry.get(type);
        if (nodes) {
            result.push(...nodes);
        }
    }
    return result;
}

/** Clears the entire registry. Call when generating a new world or loading a saved one. */
export function clearRegistry(): void {
    registry.clear();
}

/**
 * Recursively registers all nodes in a tree that have registered types.
 * Used after loading/importing a world from JSON.
 * @param node - Root of the tree to scan
 * @param registeredTypes - Set of type keys that should be registered
 */
export function registerTree(node: WorldNode, registeredTypes: Set<string>): void {
    if (registeredTypes.has(node.type)) {
        registerNode(node);
    }
    if (node.children) {
        for (const child of node.children) {
            registerTree(child, registeredTypes);
        }
    }
}
