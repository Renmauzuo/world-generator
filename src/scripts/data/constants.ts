import type { RaceData } from '../types';

export const populationDensity = {
    uninhabited: "Uninhabited",
    low: "Low",
    average: "Average",
    high: "High"
} as const;

export type PopulationDensity = typeof populationDensity[keyof typeof populationDensity];

export const book = {
    monsterManual: "the Monster Manual"
} as const;

export const temperatureList: string[] = ["Cold", "Temperate", "Warm"];

export const alignmentList: string[] = [
    "Lawful Good", "Neutral Good", "Chaotic Good",
    "Lawful Neutral", "True Neutral", "Chaotic Neutral",
    "Lawful Evil", "Neutral Evil", "Chaotic Evil"
];

export const elementList: string[] = [
    "None", "Fire", "Air", "Water", "Earth", "Positive Energy", "Negative Energy"
];

export const races: Record<string, RaceData> = {
    dragonborn: { str: 2, cha: 1, alignmentBias: {
        'Lawful Good': 15, 'Neutral Good': 10, 'Chaotic Good': 5,
        'Lawful Neutral': 10, 'True Neutral': 5, 'Chaotic Neutral': 5,
        'Lawful Evil': 5, 'Neutral Evil': 3, 'Chaotic Evil': 2
    }},
    dwarf: { con: 2, wis: 1, alignmentBias: {
        'Lawful Good': 20, 'Neutral Good': 10, 'Chaotic Good': 3,
        'Lawful Neutral': 15, 'True Neutral': 8, 'Chaotic Neutral': 2,
        'Lawful Evil': 5, 'Neutral Evil': 3, 'Chaotic Evil': 1
    }},
    elf: { dex: 2, int: 1, alignmentBias: {
        'Lawful Good': 5, 'Neutral Good': 10, 'Chaotic Good': 20,
        'Lawful Neutral': 3, 'True Neutral': 10, 'Chaotic Neutral': 15,
        'Lawful Evil': 1, 'Neutral Evil': 3, 'Chaotic Evil': 3
    }},
    gnome: { int: 2, con: 1, alignmentBias: {
        'Lawful Good': 10, 'Neutral Good': 20, 'Chaotic Good': 10,
        'Lawful Neutral': 5, 'True Neutral': 10, 'Chaotic Neutral': 5,
        'Lawful Evil': 1, 'Neutral Evil': 2, 'Chaotic Evil': 1
    }},
    halfElf: { cha: 2, dex: 1, con: 1, alignmentBias: {
        'Lawful Good': 5, 'Neutral Good': 10, 'Chaotic Good': 15,
        'Lawful Neutral': 5, 'True Neutral': 15, 'Chaotic Neutral': 10,
        'Lawful Evil': 2, 'Neutral Evil': 5, 'Chaotic Evil': 3
    }},
    halfOrc: { str: 2, con: 1, alignmentBias: {
        'Lawful Good': 2, 'Neutral Good': 5, 'Chaotic Good': 5,
        'Lawful Neutral': 5, 'True Neutral': 10, 'Chaotic Neutral': 15,
        'Lawful Evil': 5, 'Neutral Evil': 10, 'Chaotic Evil': 10
    }},
    halfling: { dex: 2, cha: 1, alignmentBias: {
        'Lawful Good': 15, 'Neutral Good': 20, 'Chaotic Good': 5,
        'Lawful Neutral': 10, 'True Neutral': 10, 'Chaotic Neutral': 3,
        'Lawful Evil': 1, 'Neutral Evil': 2, 'Chaotic Evil': 1
    }},
    human: { str: 1, dex: 1, con: 1, int: 1, wis: 1, cha: 1 },
    tiefling: { cha: 2, int: 1, alignmentBias: {
        'Lawful Good': 3, 'Neutral Good': 5, 'Chaotic Good': 10,
        'Lawful Neutral': 5, 'True Neutral': 10, 'Chaotic Neutral': 15,
        'Lawful Evil': 5, 'Neutral Evil': 8, 'Chaotic Evil': 8
    }}
};
