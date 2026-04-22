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
    dragonborn: { str: 2, cha: 1 },
    dwarf: { str: 2 },
    elf: { dex: 2 },
    gnome: { int: 2 },
    //TODO: Allow 2 random (or class based) ability score increases
    halfElf: { con: 1, dex: 1, cha: 2 },
    human: { str: 1, dex: 1, con: 1, int: 1, wis: 1, cha: 1 }
};
