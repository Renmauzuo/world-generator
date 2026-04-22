import type { ObjectTypeTemplate } from '../types';
import { populationDensity, temperatureList, book } from './constants';
import { arrayWithMixed } from '../helpers';
import { categoryAttributes } from '../attributeGenerators';
import {
    planarClusterNameGenerator,
    planarNameGenerator,
    materialPlaneNameGenerator,
    continentNameGenerator
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
                requirement: "node.attributes.element !== 'Water'"
            },
            {
                type: "ocean",
                min: 1,
                max: 1,
                requirement: "node.attributes.element === 'Water'"
            },
            {
                type: "lavaLake",
                min: 0,
                max: 1,
                requirement: "node.attributes.element === 'Fire'"
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
                type: 'tropicalForest',
                min: 0,
                max: 5,
                requirement: "node.attributes.temperature === 'Warm' || node.attributes.temperature === 'Mixed'"
            },
            {
                type: 'deciduousForest',
                min: 0,
                max: 5,
                requirement: "node.attributes.temperature === 'Temperate' || node.attributes.temperature === 'Mixed'"
            },
            {
                type: 'coniferousForest',
                min: 0,
                max: 5,
                requirement: "node.attributes.temperature !== 'Warm'"
            },
            {
                type: 'tundra',
                min: 0,
                max: 5,
                requirement: "node.attributes.temperature === 'Cold' || node.attributes.temperature === 'Mixed'"
            },
            { type: 'coast', min: 1, max: 3 },
            { type: 'mountainRange', min: 0, max: 3 }
            //TODO: More geography, hills, plains, etc
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
                requirement: "node.attributes.temperature === 'Warm'"
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
            { type: "island", min: 5, max: 20 }
        ],
        attributes: {
            temperature: arrayWithMixed(temperatureList)
        },
        inheritAttributes: ["temperature"]
    },
    openOcean: {
        typeName: 'Open Ocean'
        //TODO: Open ocean children
    },
    abyssalTrench: {
        typeName: 'Abyssal Trench'
        //TODO: Abyssal Trench children
    },
    lavaLake: {
        typeName: "Lava Lake"
        //TODO: Lava lake children
    },
    sea: {
        typeName: 'Sea'
        //TODO: Sea children
    },
    tundra: {
        typeName: 'Tundra',
        //TODO: Mammoth herds
        children: [
            // A few solitary bulls wandering the tundra
            { type: 'mammothBull', min: 2, max: 5 },
            // Plus a few herds
            { type: 'mammothHerd', min: 1, max: 3 }
        ]
    },
    tropicalForest: {
        typeName: "Tropical Forest"
        //TODO: Forest children
    },
    deciduousForest: {
        typeName: "Deciduous Forest"
        //TODO: Forest children
    },
    coniferousForest: {
        typeName: 'Coniferous Forest'
        //TODO: Forest children
    },
    coast: {
        typeName: "Coast",
        categories: ['geography'],
        children: [
            { type: 'beach', min: 1, max: 3 },
            { type: 'coastalCliff', min: 0, max: 3 },
            {
                type: { coastalCitySmall: 1, coastalTownLarge: 9, coastalTownSmall: 30, coastalVillage: 25, coastalHamlet: 20, coastalThorp: 15 },
                min: 1,
                max: 1,
                prerequisites: [
                    { attribute: 'populationDensity', operator: '==', value: populationDensity.low }
                ]
            },
            {
                type: { coastalMetropolis: 1, coastalCityLarge: 4, coastalCitySmall: 10, coastalTownLarge: 15, coastalTownSmall: 20, coastalVillage: 20, coastalHamlet: 20, coastalThorp: 10 },
                min: 1,
                max: 3,
                prerequisites: [
                    { attribute: 'populationDensity', operator: '==', value: populationDensity.average }
                ]
            },
            {
                type: { coastalMetropolis: 5, coastalCityLarge: 15, coastalCitySmall: 20, coastalTownLarge: 20, coastalTownSmall: 15, coastalVillage: 10, coastalHamlet: 9, coastalThorp: 6 },
                min: 2,
                max: 4,
                prerequisites: [
                    { attribute: 'populationDensity', operator: '==', value: populationDensity.high }
                ]
            }
        ]
    },
    mountainRange: {
        typeName: "Mountain Range",
        children: [
            { type: 'mountain', min: 5, max: 20 }
        ]
    },
    /*** Regions End ***/

    /*** Localities Begin ***/
    // Small areas within a region such as settlements or significant geographic features
    island: {
        typeName: 'Island',
        children: [
            {
                type: 'reef',
                min: 0,
                max: 1,
                requirement: "node.attributes.temperature === 'Warm'",
                requiredSibling: 'lagoon'
            },
            { type: 'beach', min: 1, max: 2 }
            //TODO: Island villages
        ],
        attributes: {
            temperature: temperatureList
        },
        inheritAttributes: ["temperature"]
    },
    coastalCliff: {
        typeName: "Coastal Cliff"
        //TODO: Cliff children
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
        typeName: 'Reef'
        //TODO: Reef children
    },
    lagoon: {
        typeName: 'Lagoon'
        //TODO: Lagoon children
    },
    beach: {
        typeName: 'Beach'
        //TODO: Beach children
    },
    temple: {
        typeName: "Temple",
        children: [
            { type: 'npcAcolyte', min: 1, max: 20 }
        ]
    },
    mountain: {
        typeName: 'Mountain'
        //TODO: Mountain children
    },
    /*** Points of Interest End ***/

    /*** Groups Begin ***/
    // Groups of creatures
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
    // NPCs from Monster Manual Appendix
    npcAcolyte: {
        typeName: "Acolyte",
        referenceBook: book.monsterManual,
        referencePage: 342
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
        //TODO: Remove when no longer needed. This was just a generic placeholder for testing
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
