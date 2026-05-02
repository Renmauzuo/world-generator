import type { ObjectTypeTemplate } from '../types';
import { populationDensity, temperatureList, alignmentList, elementList } from './constants';
import { arrayWithMixed, collectAncestorTags } from '../helpers';
import { categoryAttributes, deitySetup, avatarSetup, npcSetup, templeSetup } from '../attributeGenerators';
import { getRegisteredNodes } from '../nodeRegistry';
import {
    planarClusterNameGenerator,
    planarNameGenerator,
    materialPlaneNameGenerator,
    continentNameGenerator,
    forestNameGenerator,
    mountainNameGenerator,
    mountainRangeNameGenerator,
    plainsNameGenerator,
    swampNameGenerator,
    desertNameGenerator,
    caveNameGenerator,
    lakeNameGenerator,
    riverNameGenerator,
    savannaNameGenerator,
    forgottenBiomeNameGenerator,
    dragonNameGenerator,
    extraplanarNameGenerator,
    feyNameGenerator,
    deityNameGenerator,
    avatarNameGenerator
} from '../nameGenerators';
import { npcNameGenerator } from '../npcNameGenerators';
export const objectTypes: Record<string, ObjectTypeTemplate> = {
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

    /*** Continents Begin ***/
    continent: {
        typeName: "Continent",
        categories: ["geography"],
        nameGenerator: continentNameGenerator,
        attributes: {
            temperature: temperatureList
        },
        children: [
            { type: 'sea', min: 0, max: 2 },
            {
                type: 'rainforest',
                min: 0,
                max: 5,
                conditions: [
                    { attribute: 'temperature', value: 'Warm' },
                    { attribute: 'temperature', value: 'Mixed' }
                ]
            },
            {
                type: 'deciduousForest',
                min: 0,
                max: 5,
                conditions: [
                    { attribute: 'temperature', value: 'Temperate' },
                    { attribute: 'temperature', value: 'Mixed' }
                ]
            },
            {
                type: 'coniferousForest',
                min: 0,
                max: 5,
                conditions: [{ attribute: 'temperature', value: 'Warm', match: false }]
            },
            {
                type: 'tundra',
                min: 0,
                max: 5,
                conditions: [
                    { attribute: 'temperature', value: 'Cold' },
                    { attribute: 'temperature', value: 'Mixed' }
                ]
            },
            { type: 'coast', min: 1, max: 3 },
            { type: 'mountainRange', min: 0, max: 3 },
            { type: 'plains', min: 0, max: 4 },
            { type: 'lake', min: 0, max: 3 },
            { type: 'river', min: 0, max: 4 },
            {
                type: 'swamp',
                min: 0,
                max: 3,
                conditions: [{ attribute: 'temperature', value: 'Cold', match: false }]
            },
            {
                type: 'desert',
                min: 0,
                max: 3,
                conditions: [
                    { attribute: 'temperature', value: 'Warm' },
                    { attribute: 'temperature', value: 'Mixed' }
                ]
            },
            { type: 'hills', min: 0, max: 3 },
            {
                type: 'savanna',
                min: 0,
                max: 3,
                conditions: [
                    { attribute: 'temperature', value: 'Warm' },
                    { attribute: 'temperature', value: 'Mixed' }
                ]
            },
            // Forgotten biomes — rare ancient pockets where dinosaurs survived
            {
                type: 'forgottenForest',
                min: 0,
                max: 1,
                conditions: [
                    { attribute: 'temperature', value: 'Warm' },
                    { attribute: 'temperature', value: 'Mixed' }
                ]
            }
        ]
    },
    ocean: {
        typeName: "Ocean",
        tags: ['water'],
        categories: ["geography"],
        children: [
            { type: 'archipelago', min: 0, max: 3 },
            { type: 'island', min: 0, max: 5 },
            { type: 'openOcean', min: 1, max: 3 },
            { type: 'abyssalTrench', min: 0, max: 3 },
            {
                type: 'reef',
                min: 0,
                max: 5,
                conditions: [{ attribute: 'temperature', value: 'Warm' }]
            },
            {
                type: 'forgottenIsland',
                min: 0,
                max: 1,
                conditions: [{ attribute: 'temperature', value: 'Warm' }]
            }
        ],
        attributes: {
            temperature: arrayWithMixed(temperatureList)
        }
    },
    /*** Continents End ***/

    /*** Regions Begin ***/
    // Regions are large areas within a continent or ocean, such as a forest or plains
    archipelago: {
        typeName: "Archipelago",
        children: [
            { type: "island", min: 5, max: 20 },
            { type: 'forgottenIsland', min: 0, max: 1 }
        ],
        attributes: {
            temperature: arrayWithMixed(temperatureList)
        },
        inheritAttributes: ["temperature"]
    },
    openOcean: {
        typeName: 'Open Ocean',
        tags: ['water'],
        children: [
            { type: 'sharkPack', min: 0, max: 3 },
            { type: 'whalePod', min: 0, max: 2 },
            { type: 'shipwreck', min: 0, max: 2 },
            { type: 'squidShoal', min: 0, max: 2 },
            { type: 'megalodon', min: 0, max: 1 },
            { type: 'avatar', min: 0, max: 1 }
        ]
    },
    abyssalTrench: {
        typeName: 'Abyssal Trench',
        tags: ['water', 'underground'],
        children: [
            { type: 'shipwreck', min: 0, max: 1 },
            { type: 'krakenLair', min: 0, max: 1 }
        ]
    },
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
        customSetup: (node) => avatarSetup(node, getRegisteredNodes('greaterDeity', 'lesserDeity', 'demigod'), collectAncestorTags(node, objectTypes)),
    },

    sea: {
        typeName: 'Sea',
        tags: ['water'],
        children: [
            { type: 'island', min: 0, max: 3 },
            { type: 'reef', min: 0, max: 3, conditions: [{ attribute: 'temperature', value: 'Warm' }] },
            { type: 'sharkPack', min: 0, max: 2 },
            { type: 'shipwreck', min: 0, max: 2 },
            { type: 'octopusDen', min: 0, max: 1 },
            { type: 'squidShoal', min: 0, max: 1 },
            { type: 'avatar', min: 0, max: 1 }
        ],
        attributes: {
            temperature: arrayWithMixed(temperatureList)
        },
        inheritAttributes: ["temperature"]
    },
    tundra: {
        typeName: 'Tundra',
        tags: ['cold'],
        children: [
            { type: 'mammothBull', min: 2, max: 5 },
            { type: 'mammothHerd', min: 1, max: 3 },
            { type: 'wolfPack', min: 0, max: 3 },
            { type: 'bearSolitary', min: 0, max: 2 },
            { type: 'wolverineSolitary', min: 0, max: 2 },
            { type: 'elkHerd', min: 0, max: 2 },
            { type: 'dreadWolf', min: 0, max: 1 },
            { type: 'dragonLairWhite', min: 0, max: 1 },
            { type: 'frostGiantPatrol', min: 0, max: 1 },
            { type: 'avatar', min: 0, max: 1 }
        ]
    },
    rainforest: {
        typeName: "Rainforest",
        tags: ['forest'],
        nameGenerator: forestNameGenerator,
        children: [
            { type: 'forestClearing', min: 1, max: 4 },
            { type: 'forestGrove', min: 0, max: 3 },
            { type: 'spiderNest', min: 0, max: 2 },
            { type: 'boarSounder', min: 0, max: 2 },
            { type: 'apeTroop', min: 0, max: 2 },
            { type: 'gorillaTroop', min: 0, max: 1 },
            { type: 'monkeyTroop', min: 0, max: 3 },
            { type: 'pantherSolitary', min: 0, max: 2 },
            { type: 'tigerSolitary', min: 0, max: 1 },
            { type: 'dryadGrove', min: 0, max: 1 },
            { type: 'awakenedTreeCopse', min: 0, max: 1 },
            { type: 'crocodileDen', min: 0, max: 1 },
            { type: 'constrictorSnakeNest', min: 0, max: 2 },
            { type: 'owlNest', min: 0, max: 1 },
            { type: 'poisonousSnakeNest', min: 0, max: 2 },
            { type: 'giantWaspNest', min: 0, max: 1 },
            { type: 'avatar', min: 0, max: 1 }
        ],
        attributes: {
            temperature: ['Warm']
        },
        inheritAttributes: ["temperature"]
    },
    deciduousForest: {
        typeName: "Deciduous Forest",
        tags: ['forest'],
        nameGenerator: forestNameGenerator,
        children: [
            { type: 'forestClearing', min: 1, max: 4 },
            { type: 'forestGrove', min: 0, max: 3 },
            { type: 'wolfPack', min: 0, max: 3 },
            { type: 'bearSolitary', min: 0, max: 2 },
            { type: 'boarSounder', min: 0, max: 2 },
            { type: 'spiderNest', min: 0, max: 2 },
            { type: 'pantherSolitary', min: 0, max: 1 },
            { type: 'badgerSett', min: 0, max: 2 },
            { type: 'dryadGrove', min: 0, max: 1 },
            { type: 'awakenedTreeCopse', min: 0, max: 1 },
            { type: 'eagleNest', min: 0, max: 2 },
            { type: 'elkHerd', min: 0, max: 2 },
            { type: 'owlNest', min: 0, max: 2 },
            { type: 'giantWaspNest', min: 0, max: 1 },
            { type: 'direBoar', min: 0, max: 1 },
            { type: 'dragonLairGreen', min: 0, max: 1 },
            { type: 'avatar', min: 0, max: 1 }
        ],
        attributes: {
            temperature: ['Temperate']
        },
        inheritAttributes: ["temperature"]
    },
    coniferousForest: {
        typeName: 'Coniferous Forest',
        tags: ['forest', 'cold'],
        nameGenerator: forestNameGenerator,
        children: [
            { type: 'forestClearing', min: 1, max: 3 },
            { type: 'forestGrove', min: 0, max: 2 },
            { type: 'wolfPack', min: 1, max: 4 },
            { type: 'bearSolitary', min: 0, max: 3 },
            { type: 'boarSounder', min: 0, max: 2 },
            { type: 'wolverineSolitary', min: 0, max: 2 },
            { type: 'spiderNest', min: 0, max: 1 },
            { type: 'eagleNest', min: 0, max: 2 },
            { type: 'elkHerd', min: 0, max: 3 },
            { type: 'owlNest', min: 0, max: 2 },
            { type: 'worgPack', min: 0, max: 1 },
            { type: 'dreadWolf', min: 0, max: 1 },
            { type: 'avatar', min: 0, max: 1 }
        ],
        attributes: {
            temperature: arrayWithMixed(['Cold', 'Temperate'])
        },
        inheritAttributes: ["temperature"]
    },
    plains: {
        typeName: "Plains",
        tags: ['plains'],
        categories: ['geography'],
        nameGenerator: plainsNameGenerator,
        children: [
            { type: 'horseHerd', min: 0, max: 4 },
            { type: 'boarSounder', min: 0, max: 2 },
            { type: 'wolfPack', min: 0, max: 2 },
            { type: 'eagleNest', min: 0, max: 3 },
            { type: 'elkHerd', min: 0, max: 2 },
            { type: 'hawkAdult', min: 0, max: 2 },
            {
                type: { plainsTownSmall: 30, plainsVillage: 30, plainsHamlet: 25, plainsThorp: 15 },
                min: 0,
                max: 2,
                conditions: [{ attribute: 'populationDensity', value: populationDensity.low }]
            },
            {
                type: { plainsTownLarge: 10, plainsTownSmall: 25, plainsVillage: 30, plainsHamlet: 25, plainsThorp: 10 },
                min: 1,
                max: 3,
                conditions: [{ attribute: 'populationDensity', value: populationDensity.average }]
            },
            {
                type: { plainsCitySmall: 10, plainsTownLarge: 20, plainsTownSmall: 25, plainsVillage: 25, plainsHamlet: 15, plainsThorp: 5 },
                min: 2,
                max: 4,
                conditions: [{ attribute: 'populationDensity', value: populationDensity.high }]
            },
            { type: 'avatar', min: 0, max: 1 }
        ]
    },
    hills: {
        typeName: "Hills",
        tags: ['hills'],
        categories: ['geography'],
        inheritAttributes: ["temperature"],
        children: [
            { type: 'cave', min: 0, max: 3 },
            { type: 'bearSolitary', min: 0, max: 2 },
            { type: 'wolfPack', min: 0, max: 2 },
            { type: 'eagleNest', min: 0, max: 2 },
            { type: 'boarSounder', min: 0, max: 2 },
            { type: 'badgerSett', min: 0, max: 2 },
            { type: 'pantherSolitary', min: 0, max: 1 },
            { type: 'goatHerd', min: 0, max: 2 },
            { type: 'hawkAdult', min: 0, max: 2 },
            { type: 'direBoar', min: 0, max: 1 },
            { type: 'dragonLairCopper', min: 0, max: 1 },
            { type: 'avatar', min: 0, max: 1 }
        ]
    },
    swamp: {
        typeName: "Swamp",
        tags: ['swamp'],
        categories: ['geography'],
        inheritAttributes: ["temperature"],
        nameGenerator: swampNameGenerator,
        children: [
            { type: 'crocodileDen', min: 0, max: 2 },
            { type: 'alligatorDen', min: 0, max: 2 },
            { type: 'spiderNest', min: 0, max: 2 },
            { type: 'shadowHaunt', min: 0, max: 1 },
            { type: 'awakenedTreeCopse', min: 0, max: 1 },
            { type: 'constrictorSnakeNest', min: 0, max: 2 },
            { type: 'giantToadDen', min: 0, max: 2 },
            { type: 'dragonLairBlack', min: 0, max: 1 },
            { type: 'avatar', min: 0, max: 1 }
        ]
    },
    desert: {
        typeName: "Desert",
        tags: ['desert'],
        inheritAttributes: ["temperature"],
        nameGenerator: desertNameGenerator,
        children: [
            { type: 'camelCaravan', min: 0, max: 2 },
            { type: 'giantSpiderLair', min: 0, max: 2 },
            { type: 'scorpionNest', min: 0, max: 2 },
            { type: 'poisonousSnakeNest', min: 0, max: 2 },
            { type: 'dragonLairBlue', min: 0, max: 1 },
            { type: 'dragonLairBrass', min: 0, max: 1 },
            { type: 'avatar', min: 0, max: 1 }
        ]
    },
    savanna: {
        typeName: "Savanna",
        tags: ['plains'],
        categories: ['geography'],
        inheritAttributes: ["temperature"],
        nameGenerator: savannaNameGenerator,
        children: [
            { type: 'lionPride', min: 0, max: 3 },
            { type: 'hyenaPack', min: 0, max: 3 },
            { type: 'zebraHerd', min: 0, max: 4 },
            { type: 'elephantHerd', min: 0, max: 2 },
            { type: 'rhinoCrash', min: 0, max: 2 },
            { type: 'gorillaTroop', min: 0, max: 1 },
            { type: 'warthogSounder', min: 0, max: 2 },
            { type: 'vultureFlock', min: 0, max: 2 },
            { type: 'baboonTroop', min: 0, max: 2 },
            { type: 'jackalPack', min: 0, max: 2 },
            { type: 'poisonousSnakeNest', min: 0, max: 1 },
            { type: 'avatar', min: 0, max: 1 }
        ]
    },
    lake: {
        typeName: "Lake",
        tags: ['water'],
        nameGenerator: lakeNameGenerator,
        children: [
            { type: 'naiadSpring', min: 0, max: 1 },
            { type: 'crocodileDen', min: 0, max: 1, conditions: [{ attribute: 'temperature', value: 'Cold', match: false }] },
            { type: 'giantToadDen', min: 0, max: 1, conditions: [{ attribute: 'temperature', value: 'Cold', match: false }] }
        ],
        attributes: {
            temperature: temperatureList
        },
        inheritAttributes: ["temperature"]
    },
    river: {
        typeName: "River",
        tags: ['water'],
        nameGenerator: riverNameGenerator,
        children: [
            { type: 'crocodileDen', min: 0, max: 1, conditions: [{ attribute: 'temperature', value: 'Cold', match: false }] },
            { type: 'naiadSpring', min: 0, max: 1 },
            { type: 'constrictorSnakeNest', min: 0, max: 1, conditions: [{ attribute: 'temperature', value: 'Cold', match: false }] },
            { type: 'giantToadDen', min: 0, max: 1, conditions: [{ attribute: 'temperature', value: 'Cold', match: false }] }
        ],
        attributes: {
            temperature: temperatureList
        },
        inheritAttributes: ["temperature"]
    },
    coast: {
        typeName: "Coast",
        tags: ['water'],
        categories: ['geography'],
        children: [
            { type: 'beach', min: 1, max: 3 },
            { type: 'coastalCliff', min: 0, max: 3 },
            { type: 'sharkPack', min: 0, max: 1 },
            {
                type: { coastalCitySmall: 1, coastalTownLarge: 9, coastalTownSmall: 30, coastalVillage: 25, coastalHamlet: 20, coastalThorp: 15 },
                min: 1,
                max: 1,
                conditions: [{ attribute: 'populationDensity', value: populationDensity.low }]
            },
            {
                type: { coastalMetropolis: 1, coastalCityLarge: 4, coastalCitySmall: 10, coastalTownLarge: 15, coastalTownSmall: 20, coastalVillage: 20, coastalHamlet: 20, coastalThorp: 10 },
                min: 1,
                max: 3,
                conditions: [{ attribute: 'populationDensity', value: populationDensity.average }]
            },
            {
                type: { coastalMetropolis: 5, coastalCityLarge: 15, coastalCitySmall: 20, coastalTownLarge: 20, coastalTownSmall: 15, coastalVillage: 10, coastalHamlet: 9, coastalThorp: 6 },
                min: 2,
                max: 4,
                conditions: [{ attribute: 'populationDensity', value: populationDensity.high }]
            },
            { type: 'dragonLairGold', min: 0, max: 1 },
            { type: 'dragonLairBronze', min: 0, max: 1 }
        ]
    },
    mountainRange: {
        typeName: "Mountain Range",
        tags: ['mountain'],
        inheritAttributes: ["temperature"],
        nameGenerator: mountainRangeNameGenerator,
        children: [
            { type: 'mountain', min: 5, max: 20 },
            { type: 'mountainPass', min: 0, max: 3 },
            { type: 'cave', min: 0, max: 3 },
            { type: 'forgottenValley', min: 0, max: 1 },
            { type: 'dragonLairRed', min: 0, max: 1 },
            { type: 'dragonLairWhite', min: 0, max: 1 },
            { type: 'dragonLairSilver', min: 0, max: 1 },
            { type: 'avatar', min: 0, max: 1 }
        ]
    },
    /*** Regions End ***/

    /*** Forgotten Biomes Begin ***/
    // Rare ancient pockets where civilization hasn't reached and prehistoric creatures survived
    forgottenIsland: {
        typeName: "Forgotten Island",
        nameGenerator: forgottenBiomeNameGenerator,
        children: [
            { type: 'trexSolitary', min: 0, max: 1 },
            { type: 'triceratopsHerd', min: 0, max: 2 },
            { type: 'pterosaurFlock', min: 1, max: 3 },
            { type: 'apeTroop', min: 0, max: 2 },
            { type: 'gorillaTroop', min: 0, max: 1 },
            { type: 'giantSpiderLair', min: 0, max: 2 },
            { type: 'beach', min: 1, max: 2 },
            { type: 'cave', min: 0, max: 2 },
            { type: 'plesiosaurusAdult', min: 0, max: 2 }
        ]
    },
    forgottenForest: {
        typeName: "Forgotten Forest",
        tags: ['forest'],
        nameGenerator: forgottenBiomeNameGenerator,
        children: [
            { type: 'trexSolitary', min: 0, max: 2 },
            { type: 'triceratopsHerd', min: 1, max: 3 },
            { type: 'pterosaurFlock', min: 0, max: 2 },
            { type: 'apeTroop', min: 0, max: 2 },
            { type: 'gorillaTroop', min: 0, max: 1 },
            { type: 'spiderNest', min: 0, max: 2 },
            { type: 'boarSounder', min: 0, max: 2 },
            { type: 'awakenedTreeCopse', min: 0, max: 1 },
            { type: 'broodmother', min: 0, max: 1 }
        ]
    },
    forgottenValley: {
        typeName: "Forgotten Valley",
        nameGenerator: forgottenBiomeNameGenerator,
        children: [
            { type: 'trexSolitary', min: 0, max: 1 },
            { type: 'triceratopsHerd', min: 1, max: 3 },
            { type: 'pterosaurFlock', min: 1, max: 3 },
            { type: 'bearSolitary', min: 0, max: 2 },
            { type: 'eagleNest', min: 0, max: 2 },
            { type: 'cave', min: 0, max: 2 }
        ]
    },
    /*** Forgotten Biomes End ***/

    /*** Localities Begin ***/
    // Small areas within a region such as settlements or significant geographic features
    island: {
        typeName: 'Island',
        children: [
            {
                type: 'reef',
                min: 0,
                max: 1,
                conditions: [{ attribute: 'temperature', value: 'Warm' }],
                requiredSibling: 'lagoon'
            },
            { type: 'beach', min: 1, max: 2 },
            { type: 'cave', min: 0, max: 1 }
        ],
        attributes: {
            temperature: temperatureList
        },
        inheritAttributes: ["temperature"]
    },
    forestClearing: {
        typeName: "Forest Clearing",
        children: [
            { type: 'awakenedShrub', min: 0, max: 3 }
        ]
    },
    forestGrove: {
        typeName: "Grove",
        children: [
            { type: 'awakenedTree', min: 0, max: 2 },
            { type: 'awakenedShrub', min: 0, max: 3 }
        ]
    },
    coastalCliff: {
        typeName: "Coastal Cliff",
        children: [
            { type: 'eagleNest', min: 0, max: 2 },
            { type: 'cave', min: 0, max: 1 }
        ]
    },
    mountainPass: {
        typeName: "Mountain Pass",
        tags: ['mountain'],
        children: [
            { type: 'wolfPack', min: 0, max: 1 },
            { type: 'bearSolitary', min: 0, max: 1 }
        ]
    },
    cave: {
        typeName: "Cave",
        tags: ['underground'],
        nameGenerator: caveNameGenerator,
        attributes: {
            temperature: temperatureList
        },
        inheritAttributes: ["temperature"],
        children: [
            {
                type: { bearDen: 30, spiderNest: 20, wolfDen: 15, batColony: 15, ratWarren: 10, shadowHaunt: 5, goblinWarband: 3, ogreGang: 2 },
                min: 0,
                max: 1
            },
            {
                type: {
                    dragonLairRed: 2, dragonLairBlack: 2, dragonLairBlue: 2, dragonLairGreen: 2, dragonLairWhite: 2,
                    dragonLairGold: 1, dragonLairSilver: 1, dragonLairBronze: 1, dragonLairBrass: 1, dragonLairCopper: 1
                },
                weightedRange: { 0: 90, 1: 10 }
            },
            { type: 'frostGiantPatrol', min: 0, max: 1, conditions: [{ attribute: 'temperature', value: 'Cold' }] }
        ]
    },
    shipwreck: {
        typeName: "Shipwreck"
    },
    naiadSpring: {
        typeName: "Fey Spring",
        children: [
            { type: 'naiadSolitary', min: 1, max: 3 }
        ]
    },
    //TODO: Coastal settlement children
    coastalMetropolis: {
        typeName: "Coastal Metropolis",
        categories: ['settlement'],
        children: [
            { type: 'districtTemple', min: 1, max: 2 }
        ]
    },
    coastalCityLarge: {
        typeName: "Large Coastal City",
        categories: ['settlement'],
        children: [
            { type: 'districtTemple', weightedRange: { 1: 75, 2: 25 } }
        ]
    },
    coastalCitySmall: {
        typeName: "Small Coastal City",
        categories: ['settlement'],
        children: [
            { type: 'districtTemple', min: 1, max: 1 }
        ]
    },
    coastalTownLarge: {
        typeName: "Large Coastal Town",
        categories: ['settlement'],
        children: [
            { type: 'temple', min: 1, max: 2 }
        ]
    },
    coastalTownSmall: {
        typeName: "Small Coastal Town",
        categories: ['settlement'],
        children: [
            { type: 'temple', min: 0, max: 1 }
        ]
    },
    coastalVillage: {
        typeName: "Coastal Village",
        categories: ['settlement'],
        children: [
            { type: 'temple', min: 0, max: 1 }
        ]
    },
    coastalHamlet: {
        typeName: "Coastal Hamlet",
        categories: ['settlement']
    },
    coastalThorp: {
        typeName: "Coastal Thorp",
        categories: ['settlement']
    },
    // Plains settlements
    plainsCitySmall: {
        typeName: "Small City",
        categories: ['settlement'],
        children: [
            { type: 'districtTemple', min: 1, max: 1 }
        ]
    },
    plainsTownLarge: {
        typeName: "Large Town",
        categories: ['settlement'],
        children: [
            { type: 'temple', min: 1, max: 2 }
        ]
    },
    plainsTownSmall: {
        typeName: "Small Town",
        categories: ['settlement'],
        children: [
            { type: 'temple', min: 0, max: 1 }
        ]
    },
    plainsVillage: {
        typeName: "Village",
        categories: ['settlement']
    },
    plainsHamlet: {
        typeName: "Hamlet",
        categories: ['settlement']
    },
    plainsThorp: {
        typeName: "Thorp",
        categories: ['settlement']
    },
    districtTemple: {
        typeName: "Temple District",
        children: [
            { type: 'temple', min: 2, max: 3 }
        ]
    },
    /*** Localities End ***/

    /*** Points of Interest Begin ***/
    // Points of interest found within a locality
    reef: {
        typeName: 'Reef',
        tags: ['water'],
        children: [
            { type: 'sharkPack', min: 0, max: 1 },
            { type: 'octopusDen', min: 0, max: 2 }
        ]
    },
    lagoon: {
        typeName: 'Lagoon',
        tags: ['water'],
        children: [
            { type: 'crocodileSolitary', min: 0, max: 2 }
        ]
    },
    beach: {
        typeName: 'Beach',
        tags: ['water'],
        children: [
            { type: 'crocodileSolitary', min: 0, max: 1, conditions: [{ attribute: 'temperature', value: 'Cold', match: false }] }
        ],
        attributes: {
            temperature: temperatureList
        },
        inheritAttributes: ["temperature"]
    },
    temple: {
        typeName: "Temple",
        nameGenerator: (node) => 'Temple of ' + (node.attributes?.worship || 'the Divine'),
        attributes: { worship: '' },
        customSetup: (node) => templeSetup(node, getRegisteredNodes('greaterDeity', 'lesserDeity', 'demigod')),
        children: [
            { type: 'npcAcolyte', min: 1, max: 20 },
            { type: 'npcPriest', min: 0, max: 2 }
        ]
    },
    mountain: {
        typeName: 'Mountain',
        tags: ['mountain'],
        nameGenerator: mountainNameGenerator,
        children: [
            { type: 'cave', min: 0, max: 2 },
            { type: 'eagleNest', min: 0, max: 3 },
            { type: 'apeTroop', min: 0, max: 1 },
            { type: 'bearSolitary', min: 0, max: 1 },
            { type: 'goatHerd', min: 0, max: 2 },
            { type: 'owlNest', min: 0, max: 1 },
            { type: 'thunderbird', min: 0, max: 1 }
        ]
    },
    /*** Points of Interest End ***/

    /*** Groups Begin ***/
    // Groups of creatures
    wolfPack: {
        typeName: "Wolf Pack",
        children: [
            { type: 'wolfAlpha', min: 1, max: 1 },
            { type: 'wolf', min: 2, max: 6 },
            { type: 'wolfPup', min: 0, max: 3 }
        ]
    },
    wolfDen: {
        typeName: "Wolf Den",
        children: [
            { type: 'wolfAlpha', min: 1, max: 1 },
            { type: 'wolf', min: 1, max: 4 },
            { type: 'wolfPup', min: 1, max: 4 }
        ]
    },
    bearDen: {
        typeName: "Bear Den",
        children: [
            { type: 'bearAdult', min: 1, max: 1 },
            { type: 'bearCub', min: 0, max: 3 }
        ]
    },
    boarSounder: {
        typeName: "Boar Sounder",
        children: [
            { type: 'boarAdult', min: 2, max: 5 },
            { type: 'boarPiglet', min: 0, max: 4 }
        ]
    },
    horseHerd: {
        typeName: "Horse Herd",
        children: [
            { type: 'horseStallion', min: 1, max: 1 },
            { type: 'horseMare', min: 2, max: 6 },
            { type: 'horseFoal', min: 0, max: 3 }
        ]
    },
    sharkPack: {
        typeName: "Shark Pack",
        children: [
            { type: 'sharkAdult', min: 2, max: 5 }
        ]
    },
    squidShoal: {
        typeName: "Squid Shoal",
        children: [
            { type: 'squidAdult', min: 2, max: 6 }
        ]
    },
    worgPack: {
        typeName: "Worg Pack",
        children: [
            { type: 'worgAdult', min: 2, max: 5 }
        ]
    },
    whalePod: {
        typeName: "Whale Pod",
        children: [
            { type: 'whaleAdult', min: 2, max: 6 }
        ]
    },
    spiderNest: {
        typeName: "Spider Nest",
        children: [
            { type: 'giantSpiderAdult', min: 2, max: 6 }
        ]
    },
    eagleNest: {
        typeName: "Eagle Nest",
        children: [
            { type: 'eagleAdult', min: 1, max: 2 },
            { type: 'eaglet', min: 0, max: 3 }
        ]
    },
    apeTroop: {
        typeName: "Ape Troop",
        children: [
            { type: 'apeAdult', min: 2, max: 6 },
            { type: 'apeJuvenile', min: 0, max: 3 }
        ]
    },
    dryadGrove: {
        typeName: "Dryad Grove",
        children: [
            { type: 'dryadSolitary', min: 1, max: 3 },
            { type: 'awakenedTree', min: 0, max: 2 },
            { type: 'awakenedShrub', min: 0, max: 4 }
        ]
    },
    awakenedTreeCopse: {
        typeName: "Awakened Copse",
        children: [
            { type: 'awakenedTree', min: 1, max: 4 },
            { type: 'awakenedShrub', min: 1, max: 6 }
        ]
    },
    crocodileDen: {
        typeName: "Crocodile Den",
        children: [
            { type: 'crocodileAdult', min: 1, max: 4 }
        ]
    },
    shadowHaunt: {
        typeName: "Shadow Haunt",
        children: [
            { type: 'shadowCreature', min: 2, max: 6 }
        ]
    },
    skeletonCrypt: {
        typeName: "Skeleton Crypt",
        children: [
            { type: 'skeletonSolitary', min: 3, max: 8 }
        ]
    },
    zombieHorde: {
        typeName: "Zombie Horde",
        children: [
            { type: 'zombieSolitary', min: 2, max: 6 }
        ]
    },
    ghoulPack: {
        typeName: "Ghoul Pack",
        children: [
            { type: 'ghoulSolitary', min: 2, max: 4 }
        ]
    },
    demonHorde: {
        typeName: "Demon Horde",
        children: [
            { type: 'dretchSolitary', min: 3, max: 8 },
            { type: 'quasitSolitary', min: 0, max: 2 },
            { type: 'vrockSolitary', min: 0, max: 1 }
        ]
    },
    demonWarband: {
        typeName: "Demon Warband",
        children: [
            { type: 'vrockSolitary', min: 1, max: 3 },
            { type: 'hezrouSolitary', min: 0, max: 2 },
            { type: 'glabrezuSolitary', min: 0, max: 1 },
            { type: 'nalfeshneeSolitary', min: 0, max: 1 }
        ]
    },
    devilPatrol: {
        typeName: "Devil Patrol",
        children: [
            { type: 'lemureSolitary', min: 2, max: 5 },
            { type: 'impSolitary', min: 0, max: 2 },
            { type: 'beardedDevilSolitary', min: 0, max: 1 }
        ]
    },
    devilLegion: {
        typeName: "Devil Legion",
        children: [
            { type: 'beardedDevilSolitary', min: 1, max: 3 },
            { type: 'barbedDevilSolitary', min: 0, max: 2 },
            { type: 'chainDevilSolitary', min: 0, max: 1 },
            { type: 'boneDevilSolitary', min: 0, max: 1 },
            { type: 'hornedDevilSolitary', min: 0, max: 1 }
        ]
    },
    goblinWarband: {
        typeName: "Goblin Warband",
        children: [
            { type: 'goblinChief', min: 0, max: 1 },
            { type: 'goblinVeteran', min: 0, max: 2 },
            { type: 'goblinSolitary', min: 2, max: 6 },
            { type: 'goblinRunt', min: 0, max: 4 },
            { type: 'worgAdult', min: 0, max: 2 }
        ]
    },
    frostGiantPatrol: {
        typeName: "Frost Giant Patrol",
        children: [
            { type: 'frostGiantSolitary', min: 1, max: 3 }
        ]
    },
    ogreGang: {
        typeName: "Ogre Gang",
        children: [
            { type: 'ogreSolitary', min: 1, max: 3 }
        ]
    },
    camelCaravan: {
        typeName: "Camel Caravan",
        children: [
            { type: 'camelSolitary', min: 3, max: 8 }
        ]
    },
    scorpionNest: {
        typeName: "Scorpion Nest",
        children: [
            { type: 'giantScorpionAdult', min: 1, max: 3 }
        ]
    },
    giantSpiderLair: {
        typeName: "Giant Spider Lair",
        children: [
            { type: 'giantSpiderAdult', min: 1, max: 4 }
        ]
    },
    // Reskinned creature groups
    lionPride: {
        typeName: "Lion Pride",
        children: [
            { type: 'lionMale', min: 1, max: 2 },
            { type: 'lionFemale', min: 2, max: 6 },
            { type: 'lionCub', min: 0, max: 4 }
        ]
    },
    tigerSolitary: {
        // Tigers are solitary — just a single creature node that spawns in forests
        typeName: "Tiger",
        creature: "saberToothedTiger",
        attributes: { challengeRating: { min: 1, max: 3 } }
    },
    pantherSolitary: {
        typeName: "Panther",
        creature: "saberToothedTiger",
        attributes: { challengeRating: [.25, .5, 1] }
    },
    hyenaPack: {
        typeName: "Hyena Pack",
        children: [
            { type: 'hyenaAdult', min: 3, max: 8 }
        ]
    },
    jackalPack: {
        typeName: "Jackal Pack",
        children: [
            { type: 'jackalAdult', min: 2, max: 6 }
        ]
    },
    zebraHerd: {
        typeName: "Zebra Herd",
        children: [
            { type: 'zebraStallion', min: 1, max: 1 },
            { type: 'zebraMare', min: 3, max: 8 },
            { type: 'zebraFoal', min: 0, max: 3 }
        ]
    },
    gorillaTroop: {
        typeName: "Gorilla Troop",
        children: [
            { type: 'gorillaSilverback', min: 1, max: 1 },
            { type: 'gorillaAdult', min: 2, max: 5 },
            { type: 'gorillaJuvenile', min: 0, max: 3 }
        ]
    },
    warthogSounder: {
        typeName: "Warthog Sounder",
        children: [
            { type: 'warthogAdult', min: 2, max: 5 },
            { type: 'warthogPiglet', min: 0, max: 4 }
        ]
    },
    monkeyTroop: {
        typeName: "Monkey Troop",
        children: [
            { type: 'monkeyAdult', min: 4, max: 12 }
        ]
    },
    baboonTroop: {
        typeName: "Baboon Troop",
        children: [
            { type: 'baboonAdult', min: 4, max: 10 }
        ]
    },
    vultureFlock: {
        typeName: "Vulture Flock",
        children: [
            { type: 'vultureAdult', min: 2, max: 6 }
        ]
    },
    badgerSett: {
        typeName: "Badger Sett",
        children: [
            { type: 'badgerAdult', min: 1, max: 3 }
        ]
    },
    batColony: {
        typeName: "Bat Colony",
        children: [
            { type: 'batSwarm', min: 3, max: 12 }
        ]
    },
    alligatorDen: {
        typeName: "Alligator Den",
        children: [
            { type: 'alligatorAdult', min: 1, max: 4 }
        ]
    },
    constrictorSnakeNest: {
        typeName: "Snake Nest",
        children: [
            { type: 'constrictorSnakeAdult', min: 1, max: 4 }
        ]
    },
    poisonousSnakeNest: {
        typeName: "Viper Nest",
        children: [
            { type: 'poisonousSnakeAdult', min: 1, max: 4 }
        ]
    },
    giantToadDen: {
        typeName: "Toad Den",
        children: [
            { type: 'giantToadAdult', min: 1, max: 3 }
        ]
    },
    giantWaspNest: {
        typeName: "Wasp Nest",
        children: [
            { type: 'giantWaspAdult', min: 2, max: 6 }
        ]
    },
    // Dinosaur groups
    triceratopsHerd: {
        typeName: "Triceratops Herd",
        children: [
            { type: 'triceratopsAdult', min: 2, max: 5 },
            { type: 'triceratopsJuvenile', min: 0, max: 3 }
        ]
    },
    pterosaurFlock: {
        typeName: "Pterosaur Flock",
        children: [
            { type: 'pterosaurAdult', min: 2, max: 6 }
        ]
    },
    elephantHerd: {
        typeName: "Elephant Herd",
        children: [
            { type: 'elephantMatriarch', min: 1, max: 1 },
            { type: 'elephantCow', min: 1, max: 4 },
            { type: 'elephantJuvenile', min: 1, max: 4 },
            { type: 'elephantCalf', min: 0, max: 2 }
        ]
    },
    elkHerd: {
        typeName: "Elk Herd",
        children: [
            { type: 'elkBull', min: 1, max: 2 },
            { type: 'elkCow', min: 2, max: 6 },
            { type: 'elkCalf', min: 0, max: 3 }
        ]
    },
    goatHerd: {
        typeName: "Mountain Goat Herd",
        children: [
            { type: 'goatAdult', min: 3, max: 8 }
        ]
    },
    mammothHerd: {
        typeName: "Mammoth Herd",
        children: [
            { type: 'mammothMatriarch', min: 1, max: 1 },
            { type: 'mammothCow', min: 1, max: 4 },
            { type: 'mammothJuvenile', min: 1, max: 4 },
            { type: 'mammothCalf', min: 0, max: 2 }
        ]
    },
    octopusDen: {
        typeName: "Octopus Den",
        children: [
            { type: 'octopusAdult', min: 1, max: 3 }
        ]
    },
    owlNest: {
        typeName: "Owl Nest",
        children: [
            { type: 'owlAdult', min: 1, max: 2 },
            { type: 'owlet', min: 0, max: 3 }
        ]
    },
    rhinoCrash: {
        typeName: "Rhinoceros Crash",
        children: [
            { type: 'rhinoAdult', min: 1, max: 4 }
        ]
    },
    ratWarren: {
        typeName: "Rat Warren",
        children: [
            { type: 'ratAdult', min: 3, max: 10 }
        ]
    },
    /*** Groups End ***/

    /*** Creatures Begin ***/
    // Individual creatures

    // NPCs
    npcAcolyte: {
        typeName: "Acolyte",
        nameGenerator: npcNameGenerator,
        creature: "priest",
        variant: "healer",
        inheritAttributes: ["worship"],
        customSetup: (node) => npcSetup(node, getRegisteredNodes('greaterDeity', 'lesserDeity', 'demigod')),
        attributes: { challengeRating: [.25, .5, 1], worship: '', alignment: '' }
    },
    npcPriest: {
        typeName: "Priest",
        nameGenerator: npcNameGenerator,
        creature: "priest",
        variant: "healer",
        inheritAttributes: ["worship"],
        customSetup: (node) => npcSetup(node, getRegisteredNodes('greaterDeity', 'lesserDeity', 'demigod')),
        attributes: { challengeRating: { min: 2, max: 5 }, worship: '', alignment: '' }
    },

    // Wolves
    wolfAlpha: {
        typeName: "Alpha Wolf",
        creature: "wolf",
        variant: "wolf",
        attributes: { challengeRating: { min: 1, max: 3 } }
    },
    wolf: {
        typeName: "Wolf",
        creature: "wolf",
        variant: "wolf",
        attributes: { challengeRating: [.25, .5, 1] }
    },
    wolfPup: {
        typeName: "Wolf Pup",
        creature: "wolf",
        variant: "wolf",
        attributes: { challengeRating: [0] }
    },

    // Bears
    bearSolitary: {
        typeName: "Bear",
        creature: "bear",
        attributes: { challengeRating: [.5, 1, 2] }
    },
    bearAdult: {
        typeName: "Bear",
        creature: "bear",
        attributes: { challengeRating: [.5, 1, 2] }
    },
    bearCub: {
        typeName: "Bear Cub",
        creature: "bear",
        attributes: { challengeRating: [0] }
    },

    // Boars
    boarAdult: {
        typeName: "Boar",
        creature: "boar",
        attributes: { challengeRating: [.25, .5, 1, 2] }
    },
    boarPiglet: {
        typeName: "Piglet",
        creature: "boar",
        attributes: { challengeRating: [0] }
    },

    // Horses
    horseStallion: {
        typeName: "Stallion",
        creature: "horse",
        variant: "riding",
        attributes: { challengeRating: [.5, 1, 2] }
    },
    horseMare: {
        typeName: "Mare",
        creature: "horse",
        variant: "riding",
        attributes: { challengeRating: [.25, .5, 1] }
    },
    horseFoal: {
        typeName: "Foal",
        creature: "horse",
        variant: "riding",
        attributes: { challengeRating: [0] }
    },

    // Sharks
    sharkAdult: {
        typeName: "Shark",
        creature: "shark",
        variant: "frenzy",
        attributes: { challengeRating: [.5, 1, 2, 3, 4, 5] }
    },

    // Whales
    whaleAdult: {
        typeName: "Whale",
        creature: "killerWhale",
        attributes: { challengeRating: { min: 3, max: 6 } }
    },

    // Eagles
    eagleAdult: {
        typeName: "Eagle",
        creature: "eagle",
        attributes: { challengeRating: [.125, .25, .5, 1] }
    },
    eaglet: {
        typeName: "Eaglet",
        creature: "eagle",
        attributes: { challengeRating: [0] }
    },

    // Apes
    apeAdult: {
        typeName: "Ape",
        creature: "ape",
        attributes: { challengeRating: [.5, 1, 2, 3, 4, 5, 6, 7] }
    },
    apeJuvenile: {
        typeName: "Young Ape",
        creature: "ape",
        attributes: { challengeRating: [.25, .5] }
    },

    // Giant Spiders
    giantSpiderAdult: {
        typeName: "Giant Spider",
        creature: "giantSpider",
        attributes: { challengeRating: { min: 1, max: 3 } }
    },

    // Crocodiles
    crocodileAdult: {
        typeName: "Crocodile",
        creature: "crocodile",
        attributes: { challengeRating: [.5, 1, 2, 3, 4, 5] }
    },
    crocodileSolitary: {
        typeName: "Crocodile",
        creature: "crocodile",
        attributes: { challengeRating: [.5, 1, 2] }
    },

    // Fey
    dryadSolitary: {
        typeName: "Dryad",
        nameGenerator: feyNameGenerator,
        creature: "dryad",
        attributes: { challengeRating: { min: 1, max: 3 }, alignment: 'Neutral' }
    },
    naiadSolitary: {
        typeName: "Naiad",
        nameGenerator: feyNameGenerator,
        creature: "naiad",
        attributes: { challengeRating: { min: 2, max: 4 }, alignment: 'Neutral' }
    },

    // Plants
    awakenedTree: {
        typeName: "Awakened Tree",
        creature: "awakenedPlant",
        variant: "tree",
        attributes: { challengeRating: { min: 2, max: 4 } }
    },
    awakenedShrub: {
        typeName: "Awakened Shrub",
        creature: "awakenedPlant",
        variant: "shrub",
        attributes: { challengeRating: [0, .125, .25, .5, 1] }
    },

    // Undead
    shadowCreature: {
        typeName: "Shadow",
        creature: "shadow",
        attributes: { challengeRating: [.5, 1, 2, 3], alignment: 'Chaotic Evil' }
    },

    // Skeletons
    skeletonSolitary: {
        typeName: "Skeleton",
        creature: "skeleton",
        attributes: { challengeRating: [.25, .5, 1], alignment: 'Lawful Evil' }
    },

    // Zombies
    zombieSolitary: {
        typeName: "Zombie",
        creature: "zombie",
        attributes: { challengeRating: [.25, .5, 1], alignment: 'Neutral Evil' }
    },

    // Ghouls
    ghoulSolitary: {
        typeName: "Ghoul",
        creature: "ghoul",
        attributes: { challengeRating: { min: 1, max: 3 }, alignment: 'Chaotic Evil' }
    },

    // Specters
    specterSolitary: {
        typeName: "Specter",
        creature: "wraith",
        attributes: { challengeRating: { min: 1, max: 2 }, alignment: 'Neutral Evil' }
    },

    // Wights
    wightSolitary: {
        typeName: "Wight",
        creature: "wight",
        attributes: { challengeRating: { min: 3, max: 5 }, alignment: 'Neutral Evil' }
    },

    // Crypt Lord (legendary wight)
    cryptLord: {
        typeName: "Crypt Lord",
        creature: "wight",
        legendary: 3,
        attributes: { challengeRating: { min: 6, max: 10 }, alignment: 'Neutral Evil' }
    },

    // Wraiths
    wraithSolitary: {
        typeName: "Wraith",
        creature: "wraith",
        attributes: { challengeRating: { min: 5, max: 8 }, alignment: 'Neutral Evil' }
    },

    // Dread Wraith (legendary wraith)
    dreadWraith: {
        typeName: "Dread Wraith",
        creature: "wraith",
        legendary: 3,
        attributes: { challengeRating: { min: 8, max: 12 }, alignment: 'Neutral Evil' }
    },

    // Elementals
    fireElementalSolitary: {
        typeName: "Fire Elemental",
        creature: "fireElemental",
        attributes: { challengeRating: { min: 5, max: 8 } }
    },
    waterElementalSolitary: {
        typeName: "Water Elemental",
        creature: "waterElemental",
        attributes: { challengeRating: { min: 5, max: 8 } }
    },
    airElementalSolitary: {
        typeName: "Air Elemental",
        creature: "airElemental",
        attributes: { challengeRating: { min: 5, max: 8 } }
    },
    earthElementalSolitary: {
        typeName: "Earth Elemental",
        creature: "earthElemental",
        attributes: { challengeRating: { min: 5, max: 8 } }
    },

    // Giants
    frostGiantSolitary: {
        typeName: "Frost Giant",
        creature: "giant",
        attributes: { challengeRating: { min: 8, max: 12 } }
    },
    ogreSolitary: {
        typeName: "Ogre",
        creature: "ogre",
        attributes: { challengeRating: { min: 2, max: 5 } }
    },

    // Goblins
    goblinRunt: {
        typeName: "Goblin Runt",
        creature: "goblin",
        variant: "goblin",
        attributes: { challengeRating: [0, .125] }
    },
    goblinSolitary: {
        typeName: "Goblin",
        creature: "goblin",
        variant: "goblin",
        attributes: { challengeRating: [.25, .5, 1] }
    },
    goblinVeteran: {
        typeName: "Goblin Veteran",
        creature: "goblin",
        variant: "goblin",
        attributes: { challengeRating: { min: 2, max: 4 } }
    },
    goblinChief: {
        typeName: "Goblin Chief",
        creature: "goblin",
        variant: "goblin",
        attributes: { challengeRating: { min: 4, max: 6 } }
    },

    // Demons
    dretchSolitary: {
        typeName: "Dretch",
        nameGenerator: extraplanarNameGenerator,
        creature: "dretch",
        attributes: { challengeRating: [.25, .5, 1, 2], alignment: 'Chaotic Evil' }
    },
    quasitSolitary: {
        typeName: "Quasit",
        nameGenerator: extraplanarNameGenerator,
        creature: "quasit",
        attributes: { challengeRating: { min: 1, max: 3 }, alignment: 'Chaotic Evil' }
    },

    // Higher-CR Demons
    vrockSolitary: {
        typeName: "Vrock",
        nameGenerator: extraplanarNameGenerator,
        creature: "vrock",
        attributes: { challengeRating: { min: 6, max: 8 }, alignment: 'Chaotic Evil' }
    },
    hezrouSolitary: {
        typeName: "Hezrou",
        nameGenerator: extraplanarNameGenerator,
        creature: "hezrou",
        attributes: { challengeRating: { min: 8, max: 10 }, alignment: 'Chaotic Evil' }
    },
    glabrezuSolitary: {
        typeName: "Glabrezu",
        nameGenerator: extraplanarNameGenerator,
        creature: "glabrezu",
        attributes: { challengeRating: { min: 9, max: 12 }, alignment: 'Chaotic Evil' }
    },
    nalfeshneeSolitary: {
        typeName: "Nalfeshnee",
        nameGenerator: extraplanarNameGenerator,
        creature: "nalfeshnee",
        attributes: { challengeRating: { min: 13, max: 15 }, alignment: 'Chaotic Evil' }
    },
    marilithSolitary: {
        typeName: "Marilith",
        nameGenerator: extraplanarNameGenerator,
        creature: "marilith",
        legendary: 3,
        attributes: { challengeRating: { min: 14, max: 18 }, alignment: 'Chaotic Evil' }
    },
    balorSolitary: {
        typeName: "Balor",
        nameGenerator: extraplanarNameGenerator,
        creature: "balor",
        legendary: 3,
        attributes: { challengeRating: { min: 17, max: 22 }, alignment: 'Chaotic Evil' }
    },

    // Devils
    impSolitary: {
        typeName: "Imp",
        nameGenerator: extraplanarNameGenerator,
        creature: "imp",
        attributes: { challengeRating: { min: 1, max: 3 }, alignment: 'Lawful Evil' }
    },

    // Higher-CR Devils
    lemureSolitary: {
        typeName: "Lemure",
        nameGenerator: extraplanarNameGenerator,
        creature: "lemure",
        attributes: { challengeRating: [0, .125, .25, .5, 1], alignment: 'Lawful Evil' }
    },
    beardedDevilSolitary: {
        typeName: "Bearded Devil",
        nameGenerator: extraplanarNameGenerator,
        creature: "beardedDevil",
        attributes: { challengeRating: { min: 3, max: 5 }, alignment: 'Lawful Evil' }
    },
    barbedDevilSolitary: {
        typeName: "Barbed Devil",
        nameGenerator: extraplanarNameGenerator,
        creature: "barbedDevil",
        attributes: { challengeRating: { min: 5, max: 7 }, alignment: 'Lawful Evil' }
    },
    chainDevilSolitary: {
        typeName: "Chain Devil",
        nameGenerator: extraplanarNameGenerator,
        creature: "chainDevil",
        attributes: { challengeRating: { min: 8, max: 10 }, alignment: 'Lawful Evil' }
    },
    boneDevilSolitary: {
        typeName: "Bone Devil",
        nameGenerator: extraplanarNameGenerator,
        creature: "boneDevil",
        attributes: { challengeRating: { min: 9, max: 11 }, alignment: 'Lawful Evil' }
    },
    hornedDevilSolitary: {
        typeName: "Horned Devil",
        nameGenerator: extraplanarNameGenerator,
        creature: "hornedDevil",
        attributes: { challengeRating: { min: 11, max: 13 }, alignment: 'Lawful Evil' }
    },
    erinyesSolitary: {
        typeName: "Erinyes",
        nameGenerator: extraplanarNameGenerator,
        creature: "erinyes",
        attributes: { challengeRating: { min: 12, max: 14 }, alignment: 'Lawful Evil' }
    },
    iceDevilSolitary: {
        typeName: "Ice Devil",
        nameGenerator: extraplanarNameGenerator,
        creature: "iceDevil",
        attributes: { challengeRating: { min: 14, max: 16 }, alignment: 'Lawful Evil' }
    },
    pitFiendSolitary: {
        typeName: "Pit Fiend",
        nameGenerator: extraplanarNameGenerator,
        creature: "pitFiend",
        legendary: 3,
        attributes: { challengeRating: { min: 18, max: 22 }, alignment: 'Lawful Evil' }
    },

    // Angels
    angelSolitary: {
        typeName: "Angel",
        nameGenerator: extraplanarNameGenerator,
        creature: "angel",
        attributes: { challengeRating: { min: 10, max: 16 }, alignment: 'Lawful Good' }
    },
    solarAngel: {
        typeName: "Solar",
        nameGenerator: extraplanarNameGenerator,
        creature: "angel",
        legendary: 3,
        attributes: { challengeRating: { min: 18, max: 24 }, alignment: 'Lawful Good' }
    },

    // Camels
    camelSolitary: {
        typeName: "Camel",
        creature: "camel",
        attributes: { challengeRating: [.125, .25, .5] }
    },

    // Mastiffs
    mastiffAdult: {
        typeName: "Mastiff",
        creature: "mastiff",
        attributes: { challengeRating: [.125, .25, .5] }
    },

    // Big Cats (reskinned saber-toothed tiger)
    lionMale: {
        typeName: "Male Lion",
        creature: "saberToothedTiger",
        attributes: { challengeRating: { min: 2, max: 4 } }
    },
    lionFemale: {
        typeName: "Lioness",
        creature: "saberToothedTiger",
        attributes: { challengeRating: { min: 1, max: 2 } }
    },
    lionCub: {
        typeName: "Lion Cub",
        creature: "saberToothedTiger",
        attributes: { challengeRating: [.25, .5] }
    },

    // Hyenas (reskinned wolf — pack hunters with bite attacks)
    hyenaAdult: {
        typeName: "Hyena",
        creature: "wolf",
        variant: "wolf",
        attributes: { challengeRating: [.25, .5, 1] }
    },

    // Jackals (reskinned wolf at low CR)
    jackalAdult: {
        typeName: "Jackal",
        creature: "wolf",
        variant: "wolf",
        attributes: { challengeRating: [0, .125, .25] }
    },

    // Zebras (reskinned riding horse)
    zebraStallion: {
        typeName: "Zebra Stallion",
        creature: "horse",
        variant: "riding",
        attributes: { challengeRating: [.5, 1] }
    },
    zebraMare: {
        typeName: "Zebra Mare",
        creature: "horse",
        variant: "riding",
        attributes: { challengeRating: [.25, .5] }
    },
    zebraFoal: {
        typeName: "Zebra Foal",
        creature: "horse",
        variant: "riding",
        attributes: { challengeRating: [0] }
    },

    // Gorillas (reskinned ape at higher CR)
    gorillaSilverback: {
        typeName: "Silverback Gorilla",
        creature: "ape",
        attributes: { challengeRating: { min: 5, max: 7 } }
    },
    gorillaAdult: {
        typeName: "Gorilla",
        creature: "ape",
        attributes: { challengeRating: { min: 2, max: 4 } }
    },
    gorillaJuvenile: {
        typeName: "Young Gorilla",
        creature: "ape",
        attributes: { challengeRating: [.5, 1] }
    },

    // Warthogs (reskinned boar — warm climate)
    warthogAdult: {
        typeName: "Warthog",
        creature: "boar",
        attributes: { challengeRating: [.25, .5, 1, 2] }
    },
    warthogPiglet: {
        typeName: "Warthog Piglet",
        creature: "boar",
        attributes: { challengeRating: [0] }
    },

    // Monkeys (reskinned baboon — tropical forest)
    monkeyAdult: {
        typeName: "Monkey",
        creature: "baboon",
        attributes: { challengeRating: [0] }
    },

    // Baboons
    baboonAdult: {
        typeName: "Baboon",
        creature: "baboon",
        attributes: { challengeRating: [0, .125, .25] }
    },

    // Vultures
    vultureAdult: {
        typeName: "Vulture",
        creature: "vulture",
        attributes: { challengeRating: [0, .125, .25, .5, 1] }
    },

    // Hawks
    hawkAdult: {
        typeName: "Hawk",
        creature: "hawk",
        variant: "hawk",
        attributes: { challengeRating: [0, .125] }
    },

    // Badgers
    badgerAdult: {
        typeName: "Badger",
        creature: "badger",
        attributes: { challengeRating: [0, .125, .25] }
    },

    // Wolverines (reskinned badger at higher CR — cold forests)
    wolverineSolitary: {
        typeName: "Wolverine",
        creature: "badger",
        attributes: { challengeRating: [.25, .5, 1] }
    },

    // Weasels
    weaselAdult: {
        typeName: "Weasel",
        creature: "weasel",
        attributes: { challengeRating: [0, .125] }
    },

    // Worgs
    worgAdult: {
        typeName: "Worg",
        creature: "wolf",
        variant: "worg",
        attributes: { challengeRating: [.5, 1, 2] }
    },

    // Bats
    batSwarm: {
        typeName: "Bat",
        creature: "bat",
        attributes: { challengeRating: [0, .125, .25] }
    },

    // Alligators (reskinned crocodile — swamp)
    alligatorAdult: {
        typeName: "Alligator",
        creature: "crocodile",
        attributes: { challengeRating: [.5, 1, 2, 3] }
    },

    // Constrictor Snakes
    constrictorSnakeAdult: {
        typeName: "Constrictor Snake",
        creature: "constrictorSnake",
        attributes: { challengeRating: [.25, .5, 1, 2] }
    },

    // Dinosaurs (found in Forgotten biomes)
    trexSolitary: {
        typeName: "Tyrannosaurus Rex",
        creature: "trex",
        attributes: { challengeRating: { min: 6, max: 10 } }
    },
    triceratopsAdult: {
        typeName: "Triceratops",
        creature: "elephant",
        variant: "triceratops",
        attributes: { challengeRating: { min: 4, max: 7 } }
    },
    triceratopsJuvenile: {
        typeName: "Young Triceratops",
        creature: "elephant",
        variant: "triceratops",
        attributes: { challengeRating: { min: 1, max: 3 } }
    },
    pterosaurAdult: {
        typeName: "Pterosaur",
        creature: "quetzalcoatlus",
        attributes: { challengeRating: { min: 2, max: 5 } }
    },

    // Elk
    elkBull: {
        typeName: "Elk Bull",
        creature: "elk",
        attributes: { challengeRating: { min: 1, max: 2 } }
    },
    elkCow: {
        typeName: "Elk Cow",
        creature: "elk",
        attributes: { challengeRating: [.25, .5, 1] }
    },
    elkCalf: {
        typeName: "Elk Calf",
        creature: "elk",
        attributes: { challengeRating: [0] }
    },

    // Goats (mountain goats)
    goatAdult: {
        typeName: "Mountain Goat",
        creature: "goat",
        attributes: { challengeRating: [0, .125, .25, .5] }
    },

    // Owls
    owlAdult: {
        typeName: "Owl",
        creature: "owl",
        attributes: { challengeRating: [.125, .25] }
    },
    owlet: {
        typeName: "Owlet",
        creature: "owl",
        attributes: { challengeRating: [0] }
    },

    // Plesiosaurus (aquatic dinosaur — forgotten biomes)
    plesiosaurusAdult: {
        typeName: "Plesiosaurus",
        creature: "plesiosaurus",
        attributes: { challengeRating: { min: 2, max: 5 } }
    },

    // Poisonous Snakes
    poisonousSnakeAdult: {
        typeName: "Poisonous Snake",
        creature: "poisonousSnake",
        attributes: { challengeRating: [.125, .25] }
    },

    // Octopuses
    octopusAdult: {
        typeName: "Octopus",
        creature: "cephalopod",
        variant: "octopus",
        attributes: { challengeRating: [0, .125, .25, .5, 1] }
    },

    // Squids (reskinned octopus — faster, open-water variant)
    squidAdult: {
        typeName: "Squid",
        creature: "cephalopod",
        variant: "squid",
        attributes: { challengeRating: [0, .125, .25, .5, 1] }
    },

    // Kraken (legendary deep-water encounter)
    krakenLair: {
        typeName: "Kraken",
        creature: "kraken",
        legendary: 3,
        attributes: { challengeRating: { min: 20, max: 25 }, alignment: 'Chaotic Evil' }
    },

    // Legendary creatures — rare, high-CR mythological beasts
    // Legendary creatures — rare, high-CR mythological beasts
    dreadWolf: {
        typeName: "Dread Wolf",
        creature: "wolf",
        variant: "wolf",
        legendary: 3,
        attributes: { challengeRating: { min: 8, max: 12 } }
    },
    direBoar: {
        typeName: "Dire Boar",
        creature: "boar",
        legendary: 3,
        attributes: { challengeRating: { min: 6, max: 10 } }
    },
    thunderbird: {
        typeName: "Thunderbird",
        creature: "eagle",
        legendary: 3,
        attributes: { challengeRating: { min: 6, max: 10 } }
    },
    broodmother: {
        typeName: "Broodmother",
        creature: "giantSpider",
        legendary: 3,
        attributes: { challengeRating: { min: 6, max: 10 } }
    },
    megalodon: {
        typeName: "Megalodon",
        creature: "shark",
        variant: "frenzy",
        legendary: 3,
        attributes: { challengeRating: { min: 8, max: 12 } }
    },

    // Dragons — rare lair encounters, adults and ancients are legendary
    dragonLairRed: {
        typeName: "Red Dragon",
        nameGenerator: dragonNameGenerator,
        creature: "dragon",
        variant: "red",
        legendary: 3,
        attributes: { challengeRating: { min: 10, max: 24 }, alignment: 'Chaotic Evil' }
    },
    dragonLairBlack: {
        typeName: "Black Dragon",
        nameGenerator: dragonNameGenerator,
        creature: "dragon",
        variant: "black",
        legendary: 3,
        attributes: { challengeRating: { min: 7, max: 21 }, alignment: 'Chaotic Evil' }
    },
    dragonLairBlue: {
        typeName: "Blue Dragon",
        nameGenerator: dragonNameGenerator,
        creature: "dragon",
        variant: "blue",
        legendary: 3,
        attributes: { challengeRating: { min: 9, max: 23 }, alignment: 'Chaotic Evil' }
    },
    dragonLairGreen: {
        typeName: "Green Dragon",
        nameGenerator: dragonNameGenerator,
        creature: "dragon",
        variant: "green",
        legendary: 3,
        attributes: { challengeRating: { min: 8, max: 22 }, alignment: 'Chaotic Evil' }
    },
    dragonLairWhite: {
        typeName: "White Dragon",
        nameGenerator: dragonNameGenerator,
        creature: "dragon",
        variant: "white",
        legendary: 3,
        attributes: { challengeRating: { min: 6, max: 20 }, alignment: 'Chaotic Evil' }
    },
    dragonLairGold: {
        typeName: "Gold Dragon",
        nameGenerator: dragonNameGenerator,
        creature: "dragon",
        variant: "gold",
        legendary: 3,
        attributes: { challengeRating: { min: 10, max: 24 }, alignment: 'Lawful Good' }
    },
    dragonLairSilver: {
        typeName: "Silver Dragon",
        nameGenerator: dragonNameGenerator,
        creature: "dragon",
        variant: "silver",
        legendary: 3,
        attributes: { challengeRating: { min: 9, max: 23 }, alignment: 'Lawful Good' }
    },
    dragonLairBronze: {
        typeName: "Bronze Dragon",
        nameGenerator: dragonNameGenerator,
        creature: "dragon",
        variant: "bronze",
        legendary: 3,
        attributes: { challengeRating: { min: 8, max: 22 }, alignment: 'Lawful Good' }
    },
    dragonLairBrass: {
        typeName: "Brass Dragon",
        nameGenerator: dragonNameGenerator,
        creature: "dragon",
        variant: "brass",
        legendary: 3,
        attributes: { challengeRating: { min: 6, max: 20 }, alignment: 'Lawful Good' }
    },
    dragonLairCopper: {
        typeName: "Copper Dragon",
        nameGenerator: dragonNameGenerator,
        creature: "dragon",
        variant: "copper",
        legendary: 3,
        attributes: { challengeRating: { min: 7, max: 21 }, alignment: 'Lawful Good' }
    },

    // Rhinoceros
    rhinoAdult: {
        typeName: "Rhinoceros",
        creature: "rhinoceros",
        attributes: { challengeRating: { min: 2, max: 5 } }
    },

    // Rats
    ratAdult: {
        typeName: "Rat",
        creature: "rat",
        attributes: { challengeRating: [0, .125] }
    },

    // Giant Scorpions
    giantScorpionAdult: {
        typeName: "Giant Scorpion",
        creature: "giantScorpion",
        attributes: { challengeRating: { min: 3, max: 5 } }
    },

    // Giant Toads
    giantToadAdult: {
        typeName: "Giant Toad",
        creature: "giantToad",
        attributes: { challengeRating: { min: 1, max: 3 } }
    },

    // Giant Wasps
    giantWaspAdult: {
        typeName: "Giant Wasp",
        creature: "giantWasp",
        attributes: { challengeRating: [.5, 1, 2] }
    },

    // Elephants & Mammoths
    elephantBull: {
        typeName: "Elephant Bull",
        creature: "elephant",
        variant: "elephant",
        attributes: { challengeRating: { min: 6, max: 8 } }
    },
    elephantMatriarch: {
        typeName: "Elephant Matriarch",
        creature: "elephant",
        variant: "elephant",
        attributes: { challengeRating: { min: 5, max: 7 } }
    },
    elephantCow: {
        typeName: "Elephant Cow",
        creature: "elephant",
        variant: "elephant",
        attributes: { challengeRating: { min: 3, max: 5 } }
    },
    elephantJuvenile: {
        typeName: "Juvenile Elephant",
        creature: "elephant",
        variant: "elephant",
        attributes: { challengeRating: { min: 1, max: 3 } }
    },
    elephantCalf: {
        typeName: "Elephant Calf",
        creature: "elephant",
        variant: "elephant",
        attributes: { challengeRating: [.5] }
    },
    mammothBull: {
        typeName: "Mammoth Bull",
        creature: "elephant",
        variant: "elephant",
        attributes: { challengeRating: { min: 8, max: 10 } }
    },
    mammothMatriarch: {
        typeName: "Mammoth Matriarch",
        creature: "elephant",
        variant: "elephant",
        attributes: { challengeRating: { min: 7, max: 9 } }
    },
    mammothCow: {
        typeName: "Mammoth Cow",
        creature: "elephant",
        variant: "elephant",
        attributes: { challengeRating: { min: 6, max: 8 } }
    },
    mammothJuvenile: {
        typeName: "Juvenile Mammoth",
        creature: "elephant",
        variant: "elephant",
        attributes: { challengeRating: { min: 2, max: 6 } }
    },
    mammothCalf: {
        typeName: "Mammoth Calf",
        creature: "elephant",
        variant: "elephant",
        attributes: { challengeRating: { min: 1, max: 1 } }
    },
    /*** Creatures End ***/

    land: {
        typeName: "Land"
    }
};

// Mix in category attributes for all types that declare categories.
// Type-specific attributes take precedence — category attributes are only added if not already defined.
for (const type in objectTypes) {
    const typeTemplate = objectTypes[type];
    if (typeTemplate.categories) {
        if (!typeTemplate.attributes) {
            typeTemplate.attributes = {};
        }
        for (const category of typeTemplate.categories) {
            for (const attr in categoryAttributes[category]) {
                if (!(attr in typeTemplate.attributes)) {
                    typeTemplate.attributes[attr] = categoryAttributes[category][attr];
                }
            }
        }
    }
}
