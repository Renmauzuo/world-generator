import type { ObjectTypeTemplate } from '../../types';
import { alignmentList, elementList } from '../constants';
import { collectAncestorTags } from '../../helpers';
import { deitySetup, avatarSetup } from '../../attributeGenerators';
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
        nameGenerator: materialPlaneNameGenerator,
        children: [
            { type: "planet", min: 1, max: 10 }
            //TODO: Moons, maybe? Or other celestial bodies
        ]
    },
    plane: {
        typeName: "Plane",
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
        children: [
            { type: 'fireElementalSolitary', min: 0, max: 3 },
            { type: 'avatar', min: 0, max: 1 }
        ]
    },
    ashField: {
        typeName: "Ash Field",
        tags: ['fire'],
        children: [
            { type: 'fireElementalSolitary', min: 0, max: 2 },
            { type: 'avatar', min: 0, max: 1 }
        ]
    },
    abyssalDepth: {
        typeName: "Abyssal Depth",
        tags: ['water'],
        children: [
            { type: 'waterElementalSolitary', min: 0, max: 3 },
            { type: 'sharkPack', min: 0, max: 1 },
            { type: 'avatar', min: 0, max: 1 }
        ]
    },
    coralPalace: {
        typeName: "Coral Palace",
        tags: ['water'],
        children: [
            { type: 'waterElementalSolitary', min: 0, max: 2 },
            { type: 'octopusDen', min: 0, max: 1 },
            { type: 'avatar', min: 0, max: 1 }
        ]
    },
    crystalCavern: {
        typeName: "Crystal Cavern",
        tags: ['earth', 'underground'],
        children: [
            { type: 'earthElementalSolitary', min: 0, max: 3 },
            { type: 'avatar', min: 0, max: 1 }
        ]
    },
    stoneForest: {
        typeName: "Stone Forest",
        tags: ['earth'],
        children: [
            { type: 'earthElementalSolitary', min: 0, max: 2 },
            { type: 'giantSpiderLair', min: 0, max: 1 },
            { type: 'avatar', min: 0, max: 1 }
        ]
    },
    cloudIsland: {
        typeName: "Cloud Island",
        tags: ['air'],
        children: [
            { type: 'airElementalSolitary', min: 0, max: 3 },
            { type: 'eagleNest', min: 0, max: 2 },
            { type: 'avatar', min: 0, max: 1 }
        ]
    },
    stormFront: {
        typeName: "Storm Front",
        tags: ['air'],
        children: [
            { type: 'airElementalSolitary', min: 0, max: 2 },
            { type: 'avatar', min: 0, max: 1 }
        ]
    },
    radiantGrove: {
        typeName: "Radiant Grove",
        tags: ['forest'],
        children: [
            { type: 'dryadGrove', min: 0, max: 2 },
            { type: 'awakenedTreeCopse', min: 0, max: 2 },
            { type: 'avatar', min: 0, max: 1 }
        ]
    },
    lifeSpring: {
        typeName: "Life Spring",
        tags: ['water'],
        children: [
            { type: 'naiadSpring', min: 0, max: 1 },
            { type: 'dryadGrove', min: 0, max: 1 },
            { type: 'avatar', min: 0, max: 1 }
        ]
    },
    necropolis: {
        typeName: "Necropolis",
        tags: ['undead'],
        children: [
            { type: 'shadowHaunt', min: 1, max: 3 },
            { type: 'skeletonCrypt', min: 0, max: 2 },
            { type: 'zombieHorde', min: 0, max: 2 },
            { type: 'ghoulPack', min: 0, max: 1 },
            { type: 'wightSolitary', min: 0, max: 1 },
            { type: 'wraithSolitary', min: 0, max: 1 },
            { type: 'cryptLord', min: 0, max: 1 },
            { type: 'dreadWraith', min: 0, max: 1 },
            { type: 'avatar', min: 0, max: 1 }
        ]
    },
    boneWaste: {
        typeName: "Bone Waste",
        tags: ['undead'],
        children: [
            { type: 'shadowHaunt', min: 0, max: 2 },
            { type: 'skeletonCrypt', min: 0, max: 1 },
            { type: 'zombieHorde', min: 0, max: 1 },
            { type: 'specterSolitary', min: 0, max: 2 },
            { type: 'avatar', min: 0, max: 1 }
        ]
    },
    chaosWaste: {
        typeName: "Chaos Waste",
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
        children: [
            { type: 'dryadGrove', min: 0, max: 1 },
            { type: 'awakenedTreeCopse', min: 0, max: 1 },
            { type: 'avatar', min: 0, max: 1 }
        ]
    },
    infernalCitadel: {
        typeName: "Infernal Citadel",
        tags: ['evil'],
        children: [
            { type: 'devilPatrol', min: 1, max: 3 },
            { type: 'devilLegion', min: 0, max: 1 },
            { type: 'erinyesSolitary', min: 0, max: 1 },
            { type: 'pitFiendSolitary', min: 0, max: 1 },
            { type: 'avatar', min: 0, max: 1 }
        ]
    },
    abyssalFortress: {
        typeName: "Abyssal Fortress",
        tags: ['evil'],
        children: [
            { type: 'demonHorde', min: 1, max: 3 },
            { type: 'demonWarband', min: 0, max: 2 },
            { type: 'marilithSolitary', min: 0, max: 1 },
            { type: 'balorSolitary', min: 0, max: 1 },
            { type: 'avatar', min: 0, max: 1 }
        ]
    },
    celestialSpire: {
        typeName: "Celestial Spire",
        tags: ['good'],
        children: [
            { type: 'angelSolitary', min: 1, max: 3 },
            { type: 'solarAngel', min: 0, max: 1 },
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
