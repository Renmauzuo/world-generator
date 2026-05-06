import type { ObjectTypeTemplate } from '../../types';
import { populationDensity, temperatureList } from '../constants';
import { arrayWithMixed } from '../../helpers';
import {
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
} from '../../nameGenerators';

export const geographyTypes: Record<string, ObjectTypeTemplate> = {
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
        categories: ['geography'],
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
            // Settlements
            { type: { village: 40, hamlet: 40, thorp: 20 }, weightedRange: { 0: 60, 1: 40 }, conditions: [{ attribute: 'populationDensity', value: populationDensity.low }] },
            { type: { townSmall: 15, village: 35, hamlet: 35, thorp: 15 }, min: 1, max: 2, conditions: [{ attribute: 'populationDensity', value: populationDensity.average }] },
            { type: { townLarge: 10, townSmall: 25, village: 35, hamlet: 20, thorp: 10 }, min: 1, max: 3, conditions: [{ attribute: 'populationDensity', value: populationDensity.high }] },
            // NPC wilderness groups
            { type: 'banditPatrol', min: 0, max: 1 },
            { type: 'banditCamp', weightedRange: { 0: 75, 1: 25 } },
            { type: 'scoutParty', weightedRange: { 0: 60, 1: 40 } },
            { type: 'merchantCaravan', weightedRange: { 0: 70, 1: 30 }, conditions: [{ attribute: 'populationDensity', value: populationDensity.average }, { attribute: 'populationDensity', value: populationDensity.high }] },
            { type: 'guardPatrol', weightedRange: { 0: 70, 1: 30 }, conditions: [{ attribute: 'populationDensity', value: populationDensity.average }, { attribute: 'populationDensity', value: populationDensity.high }] },
            { type: 'monsterHunters', weightedRange: { 0: 85, 1: 15 } },
            // Profession commoners
            { type: 'npcLumberjack', min: 0, max: 2, conditions: [{ attribute: 'populationDensity', value: populationDensity.average }, { attribute: 'populationDensity', value: populationDensity.high }] },
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
        categories: ['geography'],
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
            // Settlements
            { type: { village: 40, hamlet: 40, thorp: 20 }, weightedRange: { 0: 60, 1: 40 }, conditions: [{ attribute: 'populationDensity', value: populationDensity.low }] },
            { type: { townSmall: 15, village: 35, hamlet: 35, thorp: 15 }, min: 1, max: 2, conditions: [{ attribute: 'populationDensity', value: populationDensity.average }] },
            { type: { townLarge: 10, townSmall: 25, village: 35, hamlet: 20, thorp: 10 }, min: 1, max: 3, conditions: [{ attribute: 'populationDensity', value: populationDensity.high }] },
            // NPC wilderness groups
            { type: 'banditPatrol', min: 0, max: 1 },
            { type: 'banditCamp', weightedRange: { 0: 75, 1: 25 } },
            { type: 'scoutParty', weightedRange: { 0: 60, 1: 40 } },
            { type: 'merchantCaravan', weightedRange: { 0: 70, 1: 30 }, conditions: [{ attribute: 'populationDensity', value: populationDensity.average }, { attribute: 'populationDensity', value: populationDensity.high }] },
            { type: 'guardPatrol', weightedRange: { 0: 70, 1: 30 }, conditions: [{ attribute: 'populationDensity', value: populationDensity.average }, { attribute: 'populationDensity', value: populationDensity.high }] },
            { type: 'monsterHunters', weightedRange: { 0: 85, 1: 15 } },
            // Profession commoners
            { type: 'npcLumberjack', min: 0, max: 2, conditions: [{ attribute: 'populationDensity', value: populationDensity.average }, { attribute: 'populationDensity', value: populationDensity.high }] },
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
        categories: ['geography'],
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
            // Settlements
            { type: { village: 40, hamlet: 40, thorp: 20 }, weightedRange: { 0: 60, 1: 40 }, conditions: [{ attribute: 'populationDensity', value: populationDensity.low }] },
            { type: { townSmall: 15, village: 35, hamlet: 35, thorp: 15 }, min: 1, max: 2, conditions: [{ attribute: 'populationDensity', value: populationDensity.average }] },
            { type: { townLarge: 10, townSmall: 25, village: 35, hamlet: 20, thorp: 10 }, min: 1, max: 3, conditions: [{ attribute: 'populationDensity', value: populationDensity.high }] },
            // NPC wilderness groups
            { type: 'banditPatrol', min: 0, max: 1 },
            { type: 'banditCamp', weightedRange: { 0: 75, 1: 25 } },
            { type: 'scoutParty', weightedRange: { 0: 60, 1: 40 } },
            { type: 'guardPatrol', weightedRange: { 0: 80, 1: 20 }, conditions: [{ attribute: 'populationDensity', value: populationDensity.average }, { attribute: 'populationDensity', value: populationDensity.high }] },
            { type: 'monsterHunters', weightedRange: { 0: 85, 1: 15 } },
            // Profession commoners
            { type: 'npcLumberjack', min: 0, max: 2, conditions: [{ attribute: 'populationDensity', value: populationDensity.average }, { attribute: 'populationDensity', value: populationDensity.high }] },
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
                type: { townSmall: 30, village: 30, hamlet: 25, thorp: 15 },
                min: 0,
                max: 2,
                conditions: [{ attribute: 'populationDensity', value: populationDensity.low }]
            },
            {
                type: { townLarge: 10, townSmall: 25, village: 30, hamlet: 25, thorp: 10 },
                min: 1,
                max: 3,
                conditions: [{ attribute: 'populationDensity', value: populationDensity.average }]
            },
            {
                type: { citySmall: 10, townLarge: 20, townSmall: 25, village: 25, hamlet: 15, thorp: 5 },
                min: 2,
                max: 4,
                conditions: [{ attribute: 'populationDensity', value: populationDensity.high }]
            },
            // NPC wilderness groups — scaled by population density
            { type: 'banditPatrol', min: 0, max: 1 },
            { type: 'scoutParty', weightedRange: { 0: 70, 1: 30 }, conditions: [{ attribute: 'populationDensity', value: populationDensity.low }] },
            { type: 'merchantCaravan', weightedRange: { 0: 60, 1: 40 }, conditions: [{ attribute: 'populationDensity', value: populationDensity.average }, { attribute: 'populationDensity', value: populationDensity.high }] },
            { type: 'guardPatrol', weightedRange: { 0: 50, 1: 40, 2: 10 }, conditions: [{ attribute: 'populationDensity', value: populationDensity.average }, { attribute: 'populationDensity', value: populationDensity.high }] },
            { type: 'knightsErrant', weightedRange: { 0: 80, 1: 20 }, conditions: [{ attribute: 'populationDensity', value: populationDensity.average }, { attribute: 'populationDensity', value: populationDensity.high }] },
            { type: 'banditCamp', weightedRange: { 0: 85, 1: 15 } },
            // Farms and profession commoners
            { type: 'farm', min: 0, max: 2, conditions: [{ attribute: 'populationDensity', value: populationDensity.average }, { attribute: 'populationDensity', value: populationDensity.high }] },
            { type: 'npcShepherd', min: 0, max: 2, conditions: [{ attribute: 'populationDensity', value: populationDensity.average }, { attribute: 'populationDensity', value: populationDensity.high }] },
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
            // NPC wilderness groups
            { type: 'banditPatrol', min: 0, max: 1 },
            { type: 'banditCamp', weightedRange: { 0: 80, 1: 20 } },
            { type: 'scoutParty', weightedRange: { 0: 70, 1: 30 } },
            { type: 'guardPatrol', weightedRange: { 0: 70, 1: 30 }, conditions: [{ attribute: 'populationDensity', value: populationDensity.average }, { attribute: 'populationDensity', value: populationDensity.high }] },
            { type: 'monsterHunters', weightedRange: { 0: 85, 1: 15 } },
            // Profession commoners
            { type: 'npcShepherd', min: 0, max: 2, conditions: [{ attribute: 'populationDensity', value: populationDensity.average }, { attribute: 'populationDensity', value: populationDensity.high }] },
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
            // NPC wilderness groups — undead hunters are drawn to swamps
            { type: 'undeadHunters', weightedRange: { 0: 75, 1: 25 } },
            { type: 'banditCamp', weightedRange: { 0: 85, 1: 15 } },
            { type: 'scoutParty', weightedRange: { 0: 80, 1: 20 } },
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
            // NPC wilderness groups — sparse in deserts
            { type: 'merchantCaravan', weightedRange: { 0: 75, 1: 25 } },
            { type: 'banditCamp', weightedRange: { 0: 80, 1: 20 } },
            { type: 'scoutParty', weightedRange: { 0: 85, 1: 15 } },
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
            // NPC wilderness groups
            { type: 'merchantCaravan', weightedRange: { 0: 70, 1: 30 }, conditions: [{ attribute: 'populationDensity', value: populationDensity.average }, { attribute: 'populationDensity', value: populationDensity.high }] },
            { type: 'guardPatrol', weightedRange: { 0: 70, 1: 30 }, conditions: [{ attribute: 'populationDensity', value: populationDensity.average }, { attribute: 'populationDensity', value: populationDensity.high }] },
            { type: 'scoutParty', weightedRange: { 0: 60, 1: 40 } },
            { type: 'banditPatrol', min: 0, max: 1 },
            { type: 'monsterHunters', weightedRange: { 0: 80, 1: 20 } },
            { type: 'avatar', min: 0, max: 1 }
        ]
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
                type: { citySmall: 1, townLarge: 9, townSmall: 30, village: 25, hamlet: 20, thorp: 15 },
                min: 1,
                max: 1,
                conditions: [{ attribute: 'populationDensity', value: populationDensity.low }]
            },
            {
                type: { metropolis: 1, cityLarge: 4, citySmall: 10, townLarge: 15, townSmall: 20, village: 20, hamlet: 20, thorp: 10 },
                min: 1,
                max: 3,
                conditions: [{ attribute: 'populationDensity', value: populationDensity.average }]
            },
            {
                type: { metropolis: 5, cityLarge: 15, citySmall: 20, townLarge: 20, townSmall: 15, village: 10, hamlet: 9, thorp: 6 },
                min: 2,
                max: 4,
                conditions: [{ attribute: 'populationDensity', value: populationDensity.high }]
            },
            { type: 'dragonLairGold', min: 0, max: 1 },
            { type: 'dragonLairBronze', min: 0, max: 1 },
            // NPC wilderness groups
            { type: 'merchantCaravan', weightedRange: { 0: 50, 1: 40, 2: 10 }, conditions: [{ attribute: 'populationDensity', value: populationDensity.average }, { attribute: 'populationDensity', value: populationDensity.high }] },
            { type: 'guardPatrol', weightedRange: { 0: 50, 1: 40, 2: 10 }, conditions: [{ attribute: 'populationDensity', value: populationDensity.average }, { attribute: 'populationDensity', value: populationDensity.high }] },
            { type: 'scoutParty', weightedRange: { 0: 60, 1: 40 } },
            { type: 'banditPatrol', min: 0, max: 1 },
            // Coastal-specific
            { type: 'pirateShip', weightedRange: { 0: 85, 1: 15 } },
            { type: 'npcFisher', min: 0, max: 3, conditions: [{ attribute: 'populationDensity', value: populationDensity.average }, { attribute: 'populationDensity', value: populationDensity.high }] },
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
            { type: 'awakenedShrub', min: 0, max: 3 },
            { type: 'npcScout', min: 0, max: 1 },
        ]
    },
    forestGrove: {
        typeName: "Grove",
        children: [
            { type: 'awakenedTree', min: 0, max: 2 },
            { type: 'awakenedShrub', min: 0, max: 3 },
            { type: 'npcBandit', min: 0, max: 2 },
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
            { type: 'bearSolitary', min: 0, max: 1 },
            { type: 'npcBandit', min: 0, max: 2 },
            { type: 'npcBanditCaptain', min: 0, max: 1 },
            { type: 'npcMiner', min: 0, max: 2 },
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
                type: { bearDen: 30, spiderNest: 20, wolfDen: 15, batColony: 15, ratWarren: 10, shadowHaunt: 5, ogreGang: 2 },
                min: 0,
                max: 1
            },
            { type: 'iceGoblinWarband', weightedRange: { 0: 95, 1: 5 }, conditions: [{ attribute: 'temperature', value: 'Cold' }] },
            { type: 'fireGoblinWarband', weightedRange: { 0: 95, 1: 5 }, conditions: [{ attribute: 'temperature', value: 'Warm' }] },
            { type: 'goblinWarband', weightedRange: { 0: 95, 1: 5 }, conditions: [{ attribute: 'temperature', value: 'Temperate' }] },
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
    naiadSpring: {
        typeName: "Fey Spring",
        children: [
            { type: 'naiadSolitary', min: 1, max: 3 }
        ]
    },
    /*** Localities End ***/
};
