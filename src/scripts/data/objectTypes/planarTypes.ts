import type { ObjectTypeTemplate } from '../../types';
import { sourceKeys } from '@toolkit5e/base';
import { alignmentList, elementList } from '../constants';
import { collectAncestorTags } from '../../helpers';
import { deitySetup, avatarSetup, magicLevelValue } from '../../attributeGenerators';
import { getRegisteredNodes } from '../../nodeRegistry';
import {
    planarClusterNameGenerator,
    planarNameGenerator,
    materialPlaneNameGenerator,
    planetNameGenerator,
    deityNameGenerator,
    avatarNameGenerator
} from '../../nameGenerators';

// Forward reference — will be populated by the main objectTypes module after merge
let objectTypesRef: Record<string, ObjectTypeTemplate> = {};
export function setObjectTypesRef(ref: Record<string, ObjectTypeTemplate>) {
    objectTypesRef = ref;
}

export const planarTypes: Record<string, ObjectTypeTemplate> = {
    // Multiverse is the ultimate root object
    multiverse: {
        typeName: "Multiverse",
        children: [
            { type: "planarCluster", min: 1, max: 3 }
        ]
    },
    // Planar clusters are subdivisions of the multiverse, such as Outer Planes vs Inner Planes
    planarCluster: {
        typeName: "Planar Cluster",
        nameGenerator: planarClusterNameGenerator,
        children: [
            { type: "materialPlane", min: 0, max: 2 },
            { type: "plane", min: 4, max: 10 },
            { type: "demiPlane", min: 0, max: 10 }
        ]
    },
    // Only two types of planes currently: material planes such as the Prime, and "plane" for all others
    materialPlane: {
        typeName: "Material Plane",
        // Node Maps: diagram layout — a material plane has no cartography of its own; it shows
        // its planets as a solar-system-style "menu" of globes. Non-spatial, rebuilt fresh on
        // open (no persisted node.map). Drill into a planet for its cartographic grid map.
        mapCapable: true,
        mapLayout: 'diagram',
        nameGenerator: materialPlaneNameGenerator,
        // Root of the magic-level hierarchy: planets (and everything below) derive from this.
        attributes: { magicLevel: magicLevelValue },
        children: [
            { type: "planet", min: 1, max: 10 }
            //TODO: Moons, maybe? Or other celestial bodies
        ]
    },
    plane: {
        typeName: "Plane",
        // Node Maps: diagram layout — a plane is conceptually infinite with no map-like extent,
        // so it presents its layers as a diagram of discs rather than a grid. Drill into a layer
        // for that layer's own diagram of localities.
        mapCapable: true,
        mapLayout: 'diagram',
        categories: ['plane'],
        nameGenerator: planarNameGenerator,
        children: [
            { type: "planarLayer", min: 1, max: 10 },
            { type: "demiPlane", min: 0, max: 10 }
        ]
    },
    // Planar layers and demiplanes are sort of halfway between continent and world
    planet: {
        typeName: "Planet",
        tags: ['continent'],
        // Ocean-blue base so the planet reads as a world (its diagram globe tint, and the
        // void/surrounding-water on its own grid map). Without this it falls to the gray default.
        mapColor: '#2a6fb0',
        // Node Maps: planet-scale — continents and oceans tile the whole surface, so
        // every tile is one of them with no generic fill between (continent-like, ratio 0).
        mapCapable: true,
        emptinessRatio: 0,
        nameGenerator: planetNameGenerator,
        categories: ["geography"],
        children: [
            { type: "ocean", min: 1, max: 4 },
            // 1-7 continents but weighted toward the middle
            { type: "continent", weightedRange: { 1: 1, 2: 2, 3: 3, 4: 3, 5: 2, 6: 1, 7: 1 } }
        ]
    },
    demiPlane: {
        typeName: "Demiplane",
        // Node Maps: grid layout — like a planar layer (and a planet), a demiplane's localities
        // tile its surface, so it's a continent-like grid map (ratio 0), not a diagram.
        mapCapable: true,
        emptinessRatio: 0,
        categories: ['plane'],
        nameGenerator: planarNameGenerator,
        inheritAttributes: ["alignment", "element"],
        children: [
            {
                type: "land",
                min: 1,
                max: 1,
                conditions: [{ attribute: 'element', value: 'Water', match: false }]
            },
            {
                type: "ocean",
                min: 1,
                max: 1,
                conditions: [{ attribute: 'element', value: 'Water' }]
            },
            {
                type: "lavaLake",
                min: 0,
                max: 1,
                conditions: [{ attribute: 'element', value: 'Fire' }]
            },
            {
                type: "ashField",
                min: 0,
                max: 1,
                conditions: [{ attribute: 'element', value: 'Fire' }]
            },
            {
                type: "crystalCavern",
                min: 0,
                max: 1,
                conditions: [{ attribute: 'element', value: 'Earth' }]
            },
            {
                type: "cloudIsland",
                min: 0,
                max: 1,
                conditions: [{ attribute: 'element', value: 'Air' }]
            },
            {
                type: "radiantGrove",
                min: 0,
                max: 1,
                conditions: [{ attribute: 'element', value: 'Positive Energy' }]
            },
            {
                type: "necropolis",
                min: 0,
                max: 1,
                conditions: [{ attribute: 'element', value: 'Negative Energy' }]
            }
        ]
    },
    planarLayer: {
        typeName: "Planar Layer",
        // Node Maps: grid layout — a planar layer is the planar analog of a planet (its parent
        // plane is the analog of a material plane). Its localities (planar biomes, divine realms)
        // tile the layer the way continents/oceans tile a planet, so it's a continent-like grid
        // map (ratio 0, no generic fill between localities), NOT a diagram.
        mapCapable: true,
        emptinessRatio: 0,
        categories: ['plane'],
        nameGenerator: planarNameGenerator,
        inheritAttributes: ["alignment", "element"],
        children: [
            // Fire plane geography
            { type: 'lavaLake', min: 0, max: 3, conditions: [{ attribute: 'element', value: 'Fire' }] },
            { type: 'ashField', min: 0, max: 2, conditions: [{ attribute: 'element', value: 'Fire' }] },
            // Water plane geography
            { type: 'abyssalDepth', min: 0, max: 3, conditions: [{ attribute: 'element', value: 'Water' }] },
            { type: 'coralPalace', min: 0, max: 2, conditions: [{ attribute: 'element', value: 'Water' }] },
            // Earth plane geography
            { type: 'crystalCavern', min: 0, max: 3, conditions: [{ attribute: 'element', value: 'Earth' }] },
            { type: 'stoneForest', min: 0, max: 2, conditions: [{ attribute: 'element', value: 'Earth' }] },
            // Air plane geography
            { type: 'cloudIsland', min: 0, max: 3, conditions: [{ attribute: 'element', value: 'Air' }] },
            { type: 'stormFront', min: 0, max: 2, conditions: [{ attribute: 'element', value: 'Air' }] },
            // Positive energy geography
            { type: 'radiantGrove', min: 0, max: 3, conditions: [{ attribute: 'element', value: 'Positive Energy' }] },
            { type: 'lifeSpring', min: 0, max: 2, conditions: [{ attribute: 'element', value: 'Positive Energy' }] },
            // Negative energy geography
            { type: 'necropolis', min: 0, max: 3, conditions: [{ attribute: 'element', value: 'Negative Energy' }] },
            { type: 'boneWaste', min: 0, max: 2, conditions: [{ attribute: 'element', value: 'Negative Energy' }] },
            // Non-elemental planes get generic fantastical geography
            { type: 'chaosWaste', min: 0, max: 2, conditions: [{ attribute: 'element', value: 'None' }] },
            { type: 'etherealMeadow', min: 0, max: 2, conditions: [{ attribute: 'element', value: 'None' }] },
            // Alignment-based geography
            { type: 'infernalCitadel', min: 0, max: 2, conditions: [{ attribute: 'alignment', value: 'Lawful Evil' }, { attribute: 'alignment', value: 'Neutral Evil' }, { attribute: 'alignment', value: 'Chaotic Evil' }] },
            { type: 'celestialSpire', min: 0, max: 2, conditions: [{ attribute: 'alignment', value: 'Lawful Good' }, { attribute: 'alignment', value: 'Neutral Good' }, { attribute: 'alignment', value: 'Chaotic Good' }] },
            { type: 'abyssalFortress', min: 0, max: 2, conditions: [{ attribute: 'alignment', value: 'Chaotic Evil' }] },
            // Divine realms — at most one per layer
            { type: 'divineRealm', min: 0, max: 1 },
        ]
    },

    // Planar biomes — element-conditioned geography for planar layers and demiplanes
    lavaLake: {
        typeName: "Lava Lake",
        tags: ['fire'],
        // Node Maps: planar biome — molten terrain fills between the fire elementals.
        mapCapable: true,
        emptinessRatio: 2,
        children: [
            { type: 'fireElementalSolitary', min: 0, max: 3 },
            { type: 'avatar', min: 0, max: 1 }
        ]
    },
    ashField: {
        typeName: "Ash Field",
        tags: ['fire'],
        // Node Maps: planar biome — drifting ash terrain fills between the fire elementals.
        mapCapable: true,
        emptinessRatio: 2,
        children: [
            { type: 'fireElementalSolitary', min: 0, max: 2 },
            { type: 'avatar', min: 0, max: 1 }
        ]
    },
    abyssalDepth: {
        typeName: "Abyssal Depth",
        tags: ['water'],
        // Node Maps: planar biome — crushing deep-water terrain fills between the elementals.
        mapCapable: true,
        emptinessRatio: 2,
        children: [
            { type: 'waterElementalSolitary', min: 0, max: 3 },
            { type: 'sharkPack', min: 0, max: 1 },
            { type: 'avatar', min: 0, max: 1 }
        ]
    },
    coralPalace: {
        typeName: "Coral Palace",
        tags: ['water'],
        // Node Maps: planar structure — a built coral palace, so less open water between
        // its denizens (lower ratio than an open elemental expanse).
        mapCapable: true,
        emptinessRatio: 1,
        children: [
            { type: 'waterElementalSolitary', min: 0, max: 2 },
            { type: 'octopusDen', min: 0, max: 1 },
            { type: 'avatar', min: 0, max: 1 }
        ]
    },
    crystalCavern: {
        typeName: "Crystal Cavern",
        tags: ['earth', 'underground'],
        // Node Maps: planar structure — a crystalline cave system, moderately dense.
        mapCapable: true,
        emptinessRatio: 1,
        children: [
            { type: 'earthElementalSolitary', min: 0, max: 3 },
            { type: 'avatar', min: 0, max: 1 }
        ]
    },
    stoneForest: {
        typeName: "Stone Forest",
        tags: ['earth'],
        // Node Maps: planar biome — petrified-forest terrain fills between the elementals.
        mapCapable: true,
        emptinessRatio: 2,
        children: [
            { type: 'earthElementalSolitary', min: 0, max: 2 },
            { type: 'giantSpiderLair', min: 0, max: 1 },
            { type: 'avatar', min: 0, max: 1 }
        ]
    },
    cloudIsland: {
        typeName: "Cloud Island",
        tags: ['air'],
        // Node Maps: planar biome — open sky/cloud terrain fills between the elementals.
        mapCapable: true,
        emptinessRatio: 2,
        children: [
            { type: 'airElementalSolitary', min: 0, max: 3 },
            { type: 'eagleNest', min: 0, max: 2 },
            { type: 'avatar', min: 0, max: 1 }
        ]
    },
    stormFront: {
        typeName: "Storm Front",
        tags: ['air'],
        // Node Maps: planar biome — churning storm terrain fills between the elementals.
        mapCapable: true,
        emptinessRatio: 2,
        children: [
            { type: 'airElementalSolitary', min: 0, max: 2 },
            { type: 'avatar', min: 0, max: 1 }
        ]
    },
    radiantGrove: {
        typeName: "Radiant Grove",
        tags: ['forest'],
        // Node Maps: planar biome — radiant woodland terrain fills between the fey.
        mapCapable: true,
        emptinessRatio: 2,
        children: [
            { type: 'dryadGrove', min: 0, max: 2 },
            { type: 'awakenedTreeCopse', min: 0, max: 2 },
            { type: 'feyVillage', weightedRange: { 0: 60, 1: 40 } },
            { type: 'avatar', min: 0, max: 1 }
        ]
    },
    lifeSpring: {
        typeName: "Life Spring",
        tags: ['water'],
        // Node Maps: planar biome — teeming life-giving terrain fills between the fey.
        mapCapable: true,
        emptinessRatio: 2,
        children: [
            { type: 'naiadSpring', min: 0, max: 1 },
            { type: 'dryadGrove', min: 0, max: 1 },
            { type: 'feyVillage', weightedRange: { 0: 70, 1: 30 } },
            { type: 'avatar', min: 0, max: 1 }
        ]
    },
    necropolis: {
        typeName: "Necropolis",
        tags: ['undead'],
        // Node Maps: planar biome — a sprawling city of the dead; dense enough to warrant
        // a lower ratio than open wastes but still with grave-ground between the hordes.
        mapCapable: true,
        emptinessRatio: 1,
        children: [
            { type: 'shadowHaunt', min: 1, max: 3 },
            { type: 'skeletonCrypt', min: 0, max: 2 },
            { type: 'zombieHorde', min: 0, max: 2 },
            { type: 'ghoulPack', min: 0, max: 1 },
            { type: 'wightSolitary', min: 0, max: 1 },
            { type: 'wraithSolitary', min: 0, max: 1 },
            { type: 'cryptLord', min: 0, max: 1 },
            { type: 'dreadWraith', min: 0, max: 1 },
            { type: 'undeadCrypt', weightedRange: { 0: 60, 1: 40 } },
            { type: 'avatar', min: 0, max: 1 }
        ]
    },
    boneWaste: {
        typeName: "Bone Waste",
        tags: ['undead'],
        // Node Maps: planar biome — a desolate expanse of bones; wide open terrain between
        // the scattered undead, so a higher ratio keeps it feeling empty.
        mapCapable: true,
        emptinessRatio: 3,
        children: [
            { type: 'shadowHaunt', min: 0, max: 2 },
            { type: 'skeletonCrypt', min: 0, max: 1 },
            { type: 'zombieHorde', min: 0, max: 1 },
            { type: 'specterSolitary', min: 0, max: 2 },
            { type: 'undeadCrypt', weightedRange: { 0: 75, 1: 25 } },
            { type: 'avatar', min: 0, max: 1 }
        ]
    },
    chaosWaste: {
        typeName: "Chaos Waste",
        // Untagged, so give it an explicit color (roiling chaos purple-gray) since it has
        // no terrain tag to derive one from.
        mapColor: '#6d5a8c',
        // Node Maps: planar biome — a formless churning expanse; wide open with scattered
        // elementals and demons, so a higher ratio.
        mapCapable: true,
        emptinessRatio: 3,
        children: [
            { type: 'fireElementalSolitary', min: 0, max: 1 },
            { type: 'airElementalSolitary', min: 0, max: 1 },
            { type: 'earthElementalSolitary', min: 0, max: 1 },
            { type: 'waterElementalSolitary', min: 0, max: 1 },
            { type: 'demonHorde', min: 0, max: 2 },
            { type: 'demonWarband', min: 0, max: 1 },
            { type: 'avatar', min: 0, max: 1 }
        ]
    },
    etherealMeadow: {
        typeName: "Ethereal Meadow",
        // Untagged, so give it an explicit color (pale ethereal mist) since it has no
        // terrain tag to derive one from.
        mapColor: '#cfe8e4',
        // Node Maps: planar biome — a soft misty meadow; generic terrain fills between the fey.
        mapCapable: true,
        emptinessRatio: 2,
        children: [
            { type: 'dryadGrove', min: 0, max: 1 },
            { type: 'awakenedTreeCopse', min: 0, max: 1 },
            { type: 'feyVillage', weightedRange: { 0: 60, 1: 40 } },
            { type: 'avatar', min: 0, max: 1 }
        ]
    },
    infernalCitadel: {
        typeName: "Infernal Citadel",
        tags: ['evil'],
        // Node Maps: planar stronghold — a built, densely-garrisoned citadel, so little
        // open ground between the devils (low ratio).
        mapCapable: true,
        emptinessRatio: 1,
        children: [
            { type: 'devilPatrol', min: 1, max: 3 },
            { type: 'devilLegion', min: 0, max: 1 },
            { type: 'erinyesSolitary', min: 0, max: 1 },
            { type: 'pitFiendSolitary', min: 0, max: 1 },
            { type: 'devilBastion', weightedRange: { 0: 70, 1: 30 } },
            { type: 'avatar', min: 0, max: 1 }
        ]
    },
    abyssalFortress: {
        typeName: "Abyssal Fortress",
        tags: ['evil'],
        // Node Maps: planar stronghold — a teeming demonic fortress, densely packed (low ratio).
        mapCapable: true,
        emptinessRatio: 1,
        children: [
            { type: 'demonHorde', min: 1, max: 3 },
            { type: 'demonWarband', min: 0, max: 2 },
            { type: 'marilithSolitary', min: 0, max: 1 },
            { type: 'balorSolitary', min: 0, max: 1 },
            { type: 'demonicFortress', weightedRange: { 0: 70, 1: 30 } },
            { type: 'avatar', min: 0, max: 1 }
        ]
    },
    celestialSpire: {
        typeName: "Celestial Spire",
        tags: ['good'],
        // Node Maps: planar stronghold — a radiant celestial citadel, densely populated (low ratio).
        mapCapable: true,
        emptinessRatio: 1,
        children: [
            { type: 'angelSolitary', min: 1, max: 3 },
            { type: 'solarAngel', min: 0, max: 1 },
            { type: 'angelicCitadel', weightedRange: { 0: 70, 1: 30 } },
            { type: 'avatar', min: 0, max: 1 }
        ]
    },

    // Divine Realms — the seat of a deity's power, spawns on planar layers (max 1 per layer)
    divineRealm: {
        typeName: "Divine Realm",
        nameGenerator: planarNameGenerator,
        inheritAttributes: ["alignment", "element"],
        attributes: {
            alignment: alignmentList,
            element: elementList
        },
        children: [
            { type: 'greaterDeity', min: 0, max: 1 },
            { type: 'lesserDeity', min: 0, max: 2 },
            { type: 'demigod', min: 0, max: 3 },
            // Attendant creatures based on alignment
            { type: 'angelSolitary', min: 0, max: 2, conditions: [{ attribute: 'alignment', value: 'Lawful Good' }, { attribute: 'alignment', value: 'Neutral Good' }, { attribute: 'alignment', value: 'Chaotic Good' }] },
            { type: 'devilPatrol', min: 0, max: 1, conditions: [{ attribute: 'alignment', value: 'Lawful Evil' }, { attribute: 'alignment', value: 'Neutral Evil' }] },
            { type: 'demonHorde', min: 0, max: 1, conditions: [{ attribute: 'alignment', value: 'Chaotic Evil' }] },
        ]
    },

    // Deity tiers — dynamicCreature means creature/variant/legendary are resolved from node attributes.
    // customSetup handles domain selection, creature selection, and all derived attributes.
    greaterDeity: {
        typeName: "Greater Deity",
        nameGenerator: deityNameGenerator,
        source: sourceKeys.toolkit5e,
        dynamicCreature: true,
        registered: true,
        inheritAttributes: ["alignment", "element"],
        attributes: {
            alignment: 'Lawful Good',
            element: 'None',
            challengeRating: { min: 26, max: 30 },
        },
        customSetup: (node) => deitySetup(node, 5),
        children: [
            { type: 'lesserDeity', min: 0, max: 2 },
            { type: 'demigod', min: 0, max: 3 },
        ]
    },
    lesserDeity: {
        typeName: "Lesser Deity",
        nameGenerator: deityNameGenerator,
        source: sourceKeys.toolkit5e,
        dynamicCreature: true,
        registered: true,
        inheritAttributes: ["alignment", "element"],
        attributes: {
            alignment: 'Lawful Good',
            element: 'None',
            challengeRating: { min: 22, max: 26 },
        },
        customSetup: (node) => deitySetup(node, 5),
        children: [
            { type: 'demigod', min: 0, max: 2 },
        ]
    },
    demigod: {
        typeName: "Demigod",
        nameGenerator: deityNameGenerator,
        source: sourceKeys.toolkit5e,
        dynamicCreature: true,
        registered: true,
        inheritAttributes: ["alignment", "element"],
        attributes: {
            alignment: 'Lawful Good',
            element: 'None',
            challengeRating: { min: 20, max: 24 },
        },
        customSetup: (node) => deitySetup(node, 3),
    },

    // Avatars — manifestations of deities outside their home plane
    avatar: {
        typeName: "Avatar",
        nameGenerator: avatarNameGenerator,
        source: sourceKeys.toolkit5e,
        dynamicCreature: true,
        inheritAttributes: ["alignment", "element"],
        attributes: {
            alignment: 'Lawful Good',
            element: 'None',
            challengeRating: { min: 15, max: 22 },
        },
        customSetup: (node) => avatarSetup(node, getRegisteredNodes('greaterDeity', 'lesserDeity', 'demigod'), collectAncestorTags(node, objectTypesRef)),
    },
};
