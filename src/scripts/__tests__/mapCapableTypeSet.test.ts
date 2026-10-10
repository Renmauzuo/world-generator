import { describe, it, expect } from 'vitest';
import { objectTypes } from '../data/objectTypes';

// Feature: node-maps, Task 12.3: example test for the fixed map-capable type set.
//
// Requirement 1.2: map support is enabled for exactly one or two geographical
// region types in the initial release — here, `continent` and `coniferousForest`.
// Every other node type must NOT be map-capable. The continent is continent-like
// (emptinessRatio 0 — no terrain tiles between children) while the coniferous
// forest is taiga-like (emptinessRatio > 0 — generic terrain fills the gaps).
//
// Validates: Requirements 1.2

describe('fixed map-capable type set', () => {
    it('exactly continent and coniferousForest are mapCapable; every other type is not', () => {
        const mapCapableKeys = Object.keys(objectTypes)
            .filter((type) => objectTypes[type].mapCapable === true)
            .sort();

        expect(mapCapableKeys).toEqual(['coniferousForest', 'continent']);

        // Every other type is not map-capable (mapCapable is undefined or false).
        for (const [type, template] of Object.entries(objectTypes)) {
            if (type === 'continent' || type === 'coniferousForest') continue;
            expect(template.mapCapable !== true).toBe(true);
        }
    });

    it("continent's emptiness ratio is 0 and coniferousForest's is greater than 0", () => {
        expect(objectTypes.continent.emptinessRatio).toBe(0);
        expect(objectTypes.coniferousForest.emptinessRatio).toBeGreaterThan(0);
    });
});
