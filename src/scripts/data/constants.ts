import type { RaceData } from '../types';

export const populationDensity = {
    uninhabited: "Uninhabited",
    low: "Low",
    average: "Average",
    high: "High"
} as const;

export type PopulationDensity = typeof populationDensity[keyof typeof populationDensity];

/**
 * How common magic is in a region of the Material Plane.
 *  - None:   no magic at all (fantasy races and monsters still exist, but nothing magical).
 *  - Low:    magic is so rare many doubt it exists; a handful of exceptional individuals.
 *  - Medium: Lord of the Rings style; people know of magic but rarely see it.
 *  - High:   classic sword & sorcery; magic and magical creatures are commonplace.
 */
export const magicLevel = {
    none: "None",
    low: "Low",
    medium: "Medium",
    high: "High"
} as const;

export type MagicLevel = typeof magicLevel[keyof typeof magicLevel];

export const magicLevelList: string[] = [
    magicLevel.none, magicLevel.low, magicLevel.medium, magicLevel.high
];

/**
 * How "magical" a node type is, for gating by magic level:
 *  - minor: magic-adjacent content that is merely uncommon in low-magic settings
 *           (clergy who cast spells, mythological beasts).
 *  - major: overtly magical content (wizards, undead, fiends, fey, dragons, avatars).
 */
export type MagicTier = 'minor' | 'major';

/** Chance (0-1) that a spawn of the given tier goes ahead at each magic level. */
export const magicSpawnChance: Record<string, Record<MagicTier, number>> = {
    [magicLevel.none]:   { minor: 0,   major: 0 },
    [magicLevel.low]:    { minor: 0.5, major: 0.15 },
    [magicLevel.medium]: { minor: 1,   major: 0.5 },
    [magicLevel.high]:   { minor: 1,   major: 1 }
};

/**
 * Creature types (from `@toolkit5e/base` `creatureTypes`) that are inherently magical.
 * Creature-backed node types of these types are inferred as 'major' (see magic.ts).
 */
export const magicalCreatureTypes: ReadonlySet<string> = new Set([
    'undead', 'fey', 'fiend', 'celestial', 'elemental', 'dragon', 'plant', 'construct', 'aberration'
]);

/**
 * Manual overrides for the magic tier of a node type. Most types do NOT need an entry:
 * magical creature types, legendary creatures, and containers of mostly-magical children are
 * inferred automatically (magic.ts). Add an entry here only for ambiguous types (e.g. human
 * casters, or groups whose children are a mix), or set `magic` directly on the template.
 * `false` forces a type to be treated as mundane, overriding inference.
 */
export const magicalTypes: Record<string, MagicTier | false> = {
    // Humanoid spellcasters and clergy
    npcAcolyte: 'minor',
    npcPriest: 'minor',
    npcMage: 'major',
    npcArcanist: 'major',
    npcCourtMage: 'major',
    shopMagic: 'major',
    // Mixed groups the child-based inference would miss
    undeadHunters: 'major'
};

/** Non-magical stand-ins used when a magical type fails its magic-level roll. */
export const mundaneVariants: Record<string, string> = {
    npcAcolyte: 'npcAcolyteMundane',
    npcPriest: 'npcPriestMundane',
    npcCourtMage: 'npcCourtAdvisor'
};

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
    elf: { dex: 2, alignmentBias: {
        'Lawful Good': 5, 'Neutral Good': 10, 'Chaotic Good': 20,
        'Lawful Neutral': 3, 'True Neutral': 10, 'Chaotic Neutral': 15,
        'Lawful Evil': 1, 'Neutral Evil': 3, 'Chaotic Evil': 3
    }},
    gnome: { int: 2, alignmentBias: {
        'Lawful Good': 10, 'Neutral Good': 20, 'Chaotic Good': 10,
        'Lawful Neutral': 5, 'True Neutral': 10, 'Chaotic Neutral': 5,
        'Lawful Evil': 1, 'Neutral Evil': 2, 'Chaotic Evil': 1
    }},
    goliath: { str: 2, con: 1, alignmentBias: {
        'Lawful Good': 5, 'Neutral Good': 10, 'Chaotic Good': 5,
        'Lawful Neutral': 10, 'True Neutral': 15, 'Chaotic Neutral': 10,
        'Lawful Evil': 5, 'Neutral Evil': 5, 'Chaotic Evil': 3
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
    orc: { str: 2, con: 1, alignmentBias: {
        'Lawful Good': 2, 'Neutral Good': 5, 'Chaotic Good': 8,
        'Lawful Neutral': 5, 'True Neutral': 10, 'Chaotic Neutral': 15,
        'Lawful Evil': 5, 'Neutral Evil': 10, 'Chaotic Evil': 8
    }},
    tiefling: { cha: 2, int: 1, alignmentBias: {
        'Lawful Good': 3, 'Neutral Good': 5, 'Chaotic Good': 10,
        'Lawful Neutral': 5, 'True Neutral': 10, 'Chaotic Neutral': 15,
        'Lawful Evil': 5, 'Neutral Evil': 8, 'Chaotic Evil': 8
    }}
};
