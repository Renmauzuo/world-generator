import { describe, it, expect } from 'vitest';
import { objectTypes } from '../data/objectTypes';

// Feature: node-maps — the explicit set of map-capable types.
//
// Requirement 1.2: map support is opt-in per type via `mapCapable: true` on the
// template. This test pins the current intended set so a type can't silently gain
// or lose a map. The set was expanded past the original pilot (continent +
// coniferousForest) to cover the planet, oceans/seas, and the major geographic
// region biomes.
//
// Emptiness-ratio invariant: types whose children tile their whole area with no
// generic fill are continent-like (ratio 0 — only square-completion Void between
// children); biome-like types whose children are scattered POIs in a sea of generic
// terrain carry ratio > 0 so Terrain_Tiles fill the gaps.
//
// Diagram-layout types (material planes, outer planes, planar layers) are map-capable but
// present a non-spatial globe/disc "menu" instead of a grid, so the emptiness-ratio invariant
// does not apply to them — they are listed separately.
//
// Validates: Requirements 1.1, 1.2, 1.5, 1.6

// Continent-like (composed-of-children, no generic terrain fill → ratio 0). Planar layers and
// demiplanes are the planar analog of a planet (their parent plane is the analog of a material
// plane), so they are continent-like grid maps, not diagrams.
const EXPECTED_RATIO_ZERO = ['continent', 'demiPlane', 'planarLayer', 'planet'];

// Diagram layout (non-spatial menu of discs; emptiness ratio does not apply). Only the
// plane-level containers whose children are planet-analogs: material planes and outer planes.
const EXPECTED_DIAGRAM = ['materialPlane', 'plane'];

// Biome-like (scattered POIs in generic terrain → ratio > 0). Covers both the
// material-plane regions and the planar biomes/localities (element-, energy-, and
// alignment-conditioned geography that hangs off planar layers / demiplanes).
// NOTE: planes and planar *layers* are intentionally NOT map-capable — they are
// conceptually infinite and want a different presentation than a finite grid.
const EXPECTED_RATIO_POSITIVE = [
    // Material-plane regions.
    'coast',
    'coniferousForest',
    'deciduousForest',
    'desert',
    'forgottenForest',
    'hills',
    'mountainRange',
    'ocean',
    'plains',
    'rainforest',
    'savanna',
    'sea',
    'swamp',
    'tundra',
    // Planar biomes / localities.
    'abyssalDepth',
    'abyssalFortress',
    'ashField',
    'boneWaste',
    'celestialSpire',
    'chaosWaste',
    'cloudIsland',
    'coralPalace',
    'crystalCavern',
    'etherealMeadow',
    'infernalCitadel',
    'lavaLake',
    'lifeSpring',
    'necropolis',
    'radiantGrove',
    'stoneForest',
    'stormFront',
];

const EXPECTED_MAP_CAPABLE = [
    ...EXPECTED_RATIO_ZERO,
    ...EXPECTED_RATIO_POSITIVE,
    ...EXPECTED_DIAGRAM,
].sort();

describe('map-capable type set', () => {
    it('exactly the expected types are mapCapable; every other type is not', () => {
        const mapCapableKeys = Object.keys(objectTypes)
            .filter((type) => objectTypes[type].mapCapable === true)
            .sort();

        expect(mapCapableKeys).toEqual(EXPECTED_MAP_CAPABLE);

        // Every other type is not map-capable (mapCapable is undefined or false).
        const capableSet = new Set(EXPECTED_MAP_CAPABLE);
        for (const [type, template] of Object.entries(objectTypes)) {
            if (capableSet.has(type)) continue;
            expect(template.mapCapable !== true).toBe(true);
        }
    });

    it('continent-like map-capable types have emptiness ratio 0', () => {
        for (const type of EXPECTED_RATIO_ZERO) {
            expect(objectTypes[type].emptinessRatio ?? 0).toBe(0);
        }
    });

    it('biome-like map-capable types have emptiness ratio greater than 0', () => {
        for (const type of EXPECTED_RATIO_POSITIVE) {
            expect(objectTypes[type].emptinessRatio ?? 0).toBeGreaterThan(0);
        }
    });

    it('diagram-layout types are map-capable with mapLayout "diagram"', () => {
        for (const type of EXPECTED_DIAGRAM) {
            expect(objectTypes[type].mapCapable).toBe(true);
            expect(objectTypes[type].mapLayout).toBe('diagram');
        }
    });

    it('grid-layout map-capable types are not flagged diagram', () => {
        for (const type of [...EXPECTED_RATIO_ZERO, ...EXPECTED_RATIO_POSITIVE]) {
            expect(objectTypes[type].mapLayout ?? 'grid').toBe('grid');
        }
    });
});
