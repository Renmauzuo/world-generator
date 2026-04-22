import type { WorldNode } from './types';
import { populationDensity, alignmentList, elementList, temperatureList, races } from './data/constants';
import { weightedRand, rand } from './helpers';

export function populationDensityValue(node: WorldNode): string {
    if (node.parent?.attributes?.populationDensity) {
        const inheritedDensityWeight: Record<string, number> = {};
        switch (node.parent.attributes.populationDensity) {
            case populationDensity.uninhabited:
                // Uninhabited areas can only have uninhabited children
                return populationDensity.uninhabited;
            case populationDensity.low:
                inheritedDensityWeight[populationDensity.uninhabited] = 25;
                inheritedDensityWeight[populationDensity.low] = 50;
                inheritedDensityWeight[populationDensity.average] = 25;
                break;
            case populationDensity.average:
                inheritedDensityWeight[populationDensity.low] = 25;
                inheritedDensityWeight[populationDensity.average] = 50;
                inheritedDensityWeight[populationDensity.high] = 25;
                break;
            case populationDensity.high:
                inheritedDensityWeight[populationDensity.average] = 25;
                inheritedDensityWeight[populationDensity.high] = 50;
                break;
        }
        return weightedRand(inheritedDensityWeight);
    }
    const defaultDensityWeight: Record<string, number> = {};
    defaultDensityWeight[populationDensity.uninhabited] = 5;
    defaultDensityWeight[populationDensity.low] = 20;
    defaultDensityWeight[populationDensity.average] = 50;
    defaultDensityWeight[populationDensity.high] = 25;
    return weightedRand(defaultDensityWeight);
}

export function racialDemographicsValue(node: WorldNode): Record<string, number> {
    // Inherit parent racial demographics
    if (node.parent?.attributes?.racialDemographics) {
        //TODO: Allow slight modification so not all regions have uniform demographics
        return Object.assign({}, node.parent.attributes.racialDemographics);
    }
    const newDemographics: Record<string, number> = {};
    for (const race in races) {
        newDemographics[race] = rand(0, 30);
    }
    return newDemographics;
}

/** Category attributes are mixed into objectTypes that declare a matching category. */
export const categoryAttributes: Record<string, Record<string, any>> = {
    geography: {
        populationDensity: populationDensityValue,
        racialDemographics: racialDemographicsValue
    },
    plane: {
        alignment: alignmentList,
        element: elementList
    },
    settlement: {
        racialDemographics: racialDemographicsValue
    }
};

/** Overrides the default editor type for specific attributes. */
export const attributeEditors: Record<string, any> = {
    populationDensity: [
        populationDensity.uninhabited,
        populationDensity.low,
        populationDensity.average,
        populationDensity.high
    ]
};

/** Human-readable labels for attribute keys. */
export const labels: Record<string, string> = {
    populationDensity: "Population Density",
    racialDemographics: "Racial Demographics",
    dominantRace: "Dominant Race"
};
