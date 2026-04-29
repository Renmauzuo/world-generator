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
    dwarf: { con: 2, wis: 1 },
    elf: { dex: 2, int: 1 },
    gnome: { int: 2, con: 1 },
    halfElf: { cha: 2, dex: 1, con: 1 },
    halfOrc: { str: 2, con: 1 },
    halfling: { dex: 2, cha: 1 },
    human: { str: 1, dex: 1, con: 1, int: 1, wis: 1, cha: 1 },
    tiefling: { cha: 2, int: 1 }
};
