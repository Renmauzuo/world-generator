import type { ObjectTypeTemplate } from '../types';
import { populationDensity, temperatureList, book } from './constants';
import { arrayWithMixed } from '../helpers';
import { categoryAttributes } from '../attributeGenerators';
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
    forgottenBiomeNameGenerator
} from '../nameGenerators';
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
            }
            //TODO: More demiplane geography
        ]
    },
    planarLayer: {
        typeName: "Planar Layer",
        categories: ['plane'],
        inheritAttributes: ["alignment", "element"]
        //TODO: Planar layer geography
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
        children: [
            { type: 'sharkPack', min: 0, max: 3 },
            { type: 'whalePod', min: 0, max: 2 },
            { type: 'shipwreck', min: 0, max: 2 }
        ]
    },
    abyssalTrench: {
        typeName: 'Abyssal Trench',
        children: [
            { type: 'shipwreck', min: 0, max: 1 }
        ]
    },
    lavaLake: {
        typeName: "Lava Lake",
        children: [
            { type: 'fireElementalSolitary', min: 0, max: 3 }
        ]
    },
    sea: {
        typeName: 'Sea',
        children: [
            { type: 'island', min: 0, max: 3 },
            { type: 'reef', min: 0, max: 3, conditions: [{ attribute: 'temperature', value: 'Warm' }] },
            { type: 'sharkPack', min: 0, max: 2 },
            { type: 'shipwreck', min: 0, max: 2 }
        ],
        attributes: {
            temperature: arrayWithMixed(temperatureList)
        },
        inheritAttributes: ["temperature"]
    },
    tundra: {
        typeName: 'Tundra',
        children: [
            { type: 'mammothBull', min: 2, max: 5 },
            { type: 'mammothHerd', min: 1, max: 3 },
            { type: 'wolfPack', min: 0, max: 3 },
            { type: 'bearSolitary', min: 0, max: 2 },
            { type: 'wolverineSolitary', min: 0, max: 2 }
        ]
    },
    rainforest: {
        typeName: "Rainforest",
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
            { type: 'crocodileDen', min: 0, max: 1 }
        ],
        attributes: {
            temperature: ['Warm']
        },
        inheritAttributes: ["temperature"]
    },
    deciduousForest: {
        typeName: "Deciduous Forest",
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
            { type: 'eagleNest', min: 0, max: 2 }
        ],
        attributes: {
            temperature: ['Temperate']
        },
        inheritAttributes: ["temperature"]
    },
    coniferousForest: {
        typeName: 'Coniferous Forest',
        nameGenerator: forestNameGenerator,
        children: [
            { type: 'forestClearing', min: 1, max: 3 },
            { type: 'forestGrove', min: 0, max: 2 },
            { type: 'wolfPack', min: 1, max: 4 },
            { type: 'bearSolitary', min: 0, max: 3 },
            { type: 'boarSounder', min: 0, max: 2 },
            { type: 'wolverineSolitary', min: 0, max: 2 },
            { type: 'spiderNest', min: 0, max: 1 },
            { type: 'eagleNest', min: 0, max: 2 }
        ],
        attributes: {
            temperature: arrayWithMixed(['Cold', 'Temperate'])
        },
        inheritAttributes: ["temperature"]
    },
    plains: {
        typeName: "Plains",
        categories: ['geography'],
        nameGenerator: plainsNameGenerator,
        children: [
            { type: 'horseHerd', min: 0, max: 4 },
            { type: 'boarSounder', min: 0, max: 2 },
            { type: 'wolfPack', min: 0, max: 2 },
            { type: 'eagleNest', min: 0, max: 3 },
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
            }
        ]
    },
    hills: {
        typeName: "Hills",
        categories: ['geography'],
        children: [
            { type: 'cave', min: 0, max: 3 },
            { type: 'bearSolitary', min: 0, max: 2 },
            { type: 'wolfPack', min: 0, max: 2 },
            { type: 'eagleNest', min: 0, max: 2 },
            { type: 'boarSounder', min: 0, max: 2 },
            { type: 'badgerSett', min: 0, max: 2 },
            { type: 'pantherSolitary', min: 0, max: 1 }
        ]
    },
    swamp: {
        typeName: "Swamp",
        categories: ['geography'],
        nameGenerator: swampNameGenerator,
        children: [
            { type: 'crocodileDen', min: 0, max: 2 },
            { type: 'alligatorDen', min: 0, max: 2 },
            { type: 'spiderNest', min: 0, max: 2 },
            { type: 'shadowHaunt', min: 0, max: 1 },
            { type: 'awakenedTreeCopse', min: 0, max: 1 }
        ]
    },
    desert: {
        typeName: "Desert",
        nameGenerator: desertNameGenerator,
        children: [
            { type: 'camelCaravan', min: 0, max: 2 },
            { type: 'giantSpiderLair', min: 0, max: 2 },
            { type: 'scorpionNest', min: 0, max: 2 }
        ]
    },
    savanna: {
        typeName: "Savanna",
        categories: ['geography'],
        nameGenerator: savannaNameGenerator,
        children: [
            { type: 'lionPride', min: 0, max: 3 },
            { type: 'hyenaPack', min: 0, max: 3 },
            { type: 'zebraHerd', min: 0, max: 4 },
            { type: 'elephantHerd', min: 0, max: 2 },
            { type: 'gorillaTroop', min: 0, max: 1 },
            { type: 'warthogSounder', min: 0, max: 2 },
            { type: 'vultureFlock', min: 0, max: 2 },
            { type: 'baboonTroop', min: 0, max: 2 },
            { type: 'jackalPack', min: 0, max: 2 }
        ]
    },
    lake: {
        typeName: "Lake",
        nameGenerator: lakeNameGenerator,
        children: [
            { type: 'naiadSpring', min: 0, max: 1 },
            { type: 'crocodileDen', min: 0, max: 1, conditions: [{ attribute: 'temperature', value: 'Cold', match: false }] }
        ],
        attributes: {
            temperature: temperatureList
        },
        inheritAttributes: ["temperature"]
    },
    river: {
        typeName: "River",
        nameGenerator: riverNameGenerator,
        children: [
            { type: 'crocodileDen', min: 0, max: 1, conditions: [{ attribute: 'temperature', value: 'Cold', match: false }] },
            { type: 'naiadSpring', min: 0, max: 1 }
        ],
        attributes: {
            temperature: temperatureList
        },
        inheritAttributes: ["temperature"]
    },
    coast: {
        typeName: "Coast",
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
            }
        ]
    },
    mountainRange: {
        typeName: "Mountain Range",
        nameGenerator: mountainRangeNameGenerator,
        children: [
            { type: 'mountain', min: 5, max: 20 },
            { type: 'mountainPass', min: 0, max: 3 },
            { type: 'cave', min: 0, max: 3 },
            { type: 'forgottenValley', min: 0, max: 1 }
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
            { type: 'cave', min: 0, max: 2 }
        ]
    },
    forgottenForest: {
        typeName: "Forgotten Forest",
        nameGenerator: forgottenBiomeNameGenerator,
        children: [
            { type: 'trexSolitary', min: 0, max: 2 },
            { type: 'triceratopsHerd', min: 1, max: 3 },
            { type: 'pterosaurFlock', min: 0, max: 2 },
            { type: 'apeTroop', min: 0, max: 2 },
            { type: 'gorillaTroop', min: 0, max: 1 },
            { type: 'spiderNest', min: 0, max: 2 },
            { type: 'boarSounder', min: 0, max: 2 },
            { type: 'awakenedTreeCopse', min: 0, max: 1 }
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
        children: [
            { type: 'wolfPack', min: 0, max: 1 },
            { type: 'bearSolitary', min: 0, max: 1 }
        ]
    },
    cave: {
        typeName: "Cave",
        nameGenerator: caveNameGenerator,
        children: [
            {
                type: { bearDen: 35, spiderNest: 25, wolfDen: 15, batColony: 15, shadowHaunt: 10 },
                min: 0,
                max: 1
            }
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
        children: [
            { type: 'sharkPack', min: 0, max: 1 }
        ]
    },
    lagoon: {
        typeName: 'Lagoon',
        children: [
            { type: 'crocodileSolitary', min: 0, max: 2 }
        ]
    },
    beach: {
        typeName: 'Beach',
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
        children: [
            { type: 'npcAcolyte', min: 1, max: 20 },
            { type: 'npcPriest', min: 0, max: 2 }
        ]
    },
    mountain: {
        typeName: 'Mountain',
        nameGenerator: mountainNameGenerator,
        children: [
            { type: 'cave', min: 0, max: 2 },
            { type: 'eagleNest', min: 0, max: 3 },
            { type: 'apeTroop', min: 0, max: 1 },
            { type: 'bearSolitary', min: 0, max: 1 }
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
    camelCaravan: {
        typeName: "Camel Caravan",
        children: [
            { type: 'camelSolitary', min: 3, max: 8 }
        ]
    },
    scorpionNest: {
        typeName: "Scorpion Nest",
        children: [
            { type: 'giantSpiderAdult', min: 1, max: 3 }
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
        attributes: { challengeRating: { min: .25, max: 1 } }
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
    mammothHerd: {
        typeName: "Mammoth Herd",
        children: [
            { type: 'mammothMatriarch', min: 1, max: 1 },
            { type: 'mammothCow', min: 1, max: 4 },
            { type: 'mammothJuvenile', min: 1, max: 4 },
            { type: 'mammothCalf', min: 0, max: 2 }
        ]
    },
    /*** Groups End ***/

    /*** Creatures Begin ***/
    // Individual creatures

    // NPCs
    npcAcolyte: {
        typeName: "Acolyte",
        referenceBook: book.monsterManual,
        referencePage: 342
    },
    npcPriest: {
        typeName: "Priest",
        creature: "priest",
        attributes: { challengeRating: { min: 2, max: 5 } }
    },

    // Wolves
    wolfAlpha: {
        typeName: "Alpha Wolf",
        creature: "wolf",
        attributes: { challengeRating: { min: 1, max: 3 } }
    },
    wolf: {
        typeName: "Wolf",
        creature: "wolf",
        attributes: { challengeRating: { min: .25, max: 1 } }
    },
    wolfPup: {
        typeName: "Wolf Pup",
        creature: "wolf",
        attributes: { challengeRating: { min: 0, max: 0 } }
    },

    // Bears
    bearSolitary: {
        typeName: "Bear",
        creature: "bear",
        attributes: { challengeRating: { min: .5, max: 2 } }
    },
    bearAdult: {
        typeName: "Bear",
        creature: "bear",
        attributes: { challengeRating: { min: .5, max: 2 } }
    },
    bearCub: {
        typeName: "Bear Cub",
        creature: "bear",
        attributes: { challengeRating: { min: 0, max: 0 } }
    },

    // Boars
    boarAdult: {
        typeName: "Boar",
        creature: "boar",
        attributes: { challengeRating: { min: .25, max: 2 } }
    },
    boarPiglet: {
        typeName: "Piglet",
        creature: "boar",
        attributes: { challengeRating: { min: 0, max: 0 } }
    },

    // Horses
    horseStallion: {
        typeName: "Stallion",
        creature: "horse",
        variant: "riding",
        attributes: { challengeRating: { min: .5, max: 2 } }
    },
    horseMare: {
        typeName: "Mare",
        creature: "horse",
        variant: "riding",
        attributes: { challengeRating: { min: .25, max: 1 } }
    },
    horseFoal: {
        typeName: "Foal",
        creature: "horse",
        variant: "riding",
        attributes: { challengeRating: { min: 0, max: 0 } }
    },

    // Sharks
    sharkAdult: {
        typeName: "Shark",
        creature: "shark",
        variant: "frenzy",
        attributes: { challengeRating: { min: .5, max: 5 } }
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
        attributes: { challengeRating: { min: .125, max: 1 } }
    },
    eaglet: {
        typeName: "Eaglet",
        creature: "eagle",
        attributes: { challengeRating: { min: 0, max: 0 } }
    },

    // Apes
    apeAdult: {
        typeName: "Ape",
        creature: "ape",
        attributes: { challengeRating: { min: .5, max: 7 } }
    },
    apeJuvenile: {
        typeName: "Young Ape",
        creature: "ape",
        attributes: { challengeRating: { min: .25, max: .5 } }
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
        attributes: { challengeRating: { min: .5, max: 5 } }
    },
    crocodileSolitary: {
        typeName: "Crocodile",
        creature: "crocodile",
        attributes: { challengeRating: { min: .5, max: 2 } }
    },

    // Fey
    dryadSolitary: {
        typeName: "Dryad",
        creature: "dryad",
        attributes: { challengeRating: { min: 1, max: 3 } }
    },
    naiadSolitary: {
        typeName: "Naiad",
        creature: "naiad",
        attributes: { challengeRating: { min: 2, max: 4 } }
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
        attributes: { challengeRating: { min: 0, max: 1 } }
    },

    // Undead
    shadowCreature: {
        typeName: "Shadow",
        creature: "shadow",
        attributes: { challengeRating: { min: .5, max: 3 } }
    },

    // Elementals
    fireElementalSolitary: {
        typeName: "Fire Elemental",
        creature: "fireElemental",
        attributes: { challengeRating: { min: 5, max: 8 } }
    },

    // Camels
    camelSolitary: {
        typeName: "Camel",
        creature: "camel",
        attributes: { challengeRating: { min: .125, max: .5 } }
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
        attributes: { challengeRating: { min: .25, max: .5 } }
    },

    // Hyenas (reskinned wolf — pack hunters with bite attacks)
    hyenaAdult: {
        typeName: "Hyena",
        creature: "wolf",
        attributes: { challengeRating: { min: .25, max: 1 } }
    },

    // Jackals (reskinned wolf at low CR)
    jackalAdult: {
        typeName: "Jackal",
        creature: "wolf",
        attributes: { challengeRating: { min: 0, max: .25 } }
    },

    // Zebras (reskinned riding horse)
    zebraStallion: {
        typeName: "Zebra Stallion",
        creature: "horse",
        variant: "riding",
        attributes: { challengeRating: { min: .5, max: 1 } }
    },
    zebraMare: {
        typeName: "Zebra Mare",
        creature: "horse",
        variant: "riding",
        attributes: { challengeRating: { min: .25, max: .5 } }
    },
    zebraFoal: {
        typeName: "Zebra Foal",
        creature: "horse",
        variant: "riding",
        attributes: { challengeRating: { min: 0, max: 0 } }
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
        attributes: { challengeRating: { min: .5, max: 1 } }
    },

    // Warthogs (reskinned boar — warm climate)
    warthogAdult: {
        typeName: "Warthog",
        creature: "boar",
        attributes: { challengeRating: { min: .25, max: 2 } }
    },
    warthogPiglet: {
        typeName: "Warthog Piglet",
        creature: "boar",
        attributes: { challengeRating: { min: 0, max: 0 } }
    },

    // Monkeys (reskinned baboon — tropical forest)
    monkeyAdult: {
        typeName: "Monkey",
        creature: "baboon",
        attributes: { challengeRating: { min: 0, max: 0 } }
    },

    // Baboons
    baboonAdult: {
        typeName: "Baboon",
        creature: "baboon",
        attributes: { challengeRating: { min: 0, max: .25 } }
    },

    // Vultures (reskinned eagle at low CR)
    vultureAdult: {
        typeName: "Vulture",
        creature: "eagle",
        attributes: { challengeRating: { min: 0, max: .125 } }
    },

    // Badgers
    badgerAdult: {
        typeName: "Badger",
        creature: "badger",
        attributes: { challengeRating: { min: 0, max: .25 } }
    },

    // Wolverines (reskinned badger at higher CR — cold forests)
    wolverineSolitary: {
        typeName: "Wolverine",
        creature: "badger",
        attributes: { challengeRating: { min: .25, max: 1 } }
    },

    // Bats
    batSwarm: {
        typeName: "Bat",
        creature: "bat",
        attributes: { challengeRating: { min: 0, max: .25 } }
    },

    // Alligators (reskinned crocodile — swamp)
    alligatorAdult: {
        typeName: "Alligator",
        creature: "crocodile",
        attributes: { challengeRating: { min: .5, max: 3 } }
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
        attributes: { challengeRating: { min: .5, max: .5 } }
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

// Mix in category attributes for all types that declare categories
for (const type in objectTypes) {
    const typeTemplate = objectTypes[type];
    if (typeTemplate.categories) {
        if (!typeTemplate.attributes) {
            typeTemplate.attributes = {};
        }
        for (const category of typeTemplate.categories) {
            Object.assign(typeTemplate.attributes, categoryAttributes[category]);
        }
    }
}
