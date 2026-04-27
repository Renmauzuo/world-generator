import type { WorldNode } from './types';
import { populationDensity, alignmentList, elementList, temperatureList, races } from './data/constants';
import { weightedRand, rand, collectAncestorTags } from './helpers';
import { averageStats } from '@toolkit5e/base';

/** All valid Challenge Rating values, derived from the averageStats table. */
const challengeRatingList: number[] = Object.keys(averageStats).map(Number);

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
    ],
    challengeRating: challengeRatingList
};

/** Human-readable labels for attribute keys. */
export const labels: Record<string, string> = {
    populationDensity: "Population Density",
    racialDemographics: "Racial Demographics",
    dominantRace: "Dominant Race",
    challengeRating: "Challenge Rating",
    domain: "Domain",
    creature: "Creature",
    variant: "Variant",
    deityName: "Deity"
};

/**
 * Deity domain definitions. Each domain has:
 * - `name`: display name shown in the info panel
 * - `alignments`: alignment keywords that allow this domain (empty = any)
 * - `excludeAlignments`: alignment keywords that disqualify this domain
 * - `elements`: element values that allow this domain (empty = any)
 * - `excludeElements`: element values that disqualify this domain
 * - `creatureOverrides`: additional creature options added to the pool when this domain is active
 * - `creatureBoosts`: creature IDs whose weight is multiplied when this domain is active
 * - `titles`: additional titles added to the name generator pool
 */
interface DeityDomain {
    name: string;
    alignments: string[];
    excludeAlignments: string[];
    elements: string[];
    excludeElements: string[];
    creatureOverrides: DeityCreatureOption[];
    creatureBoosts: string[];
    titles: string[];
}

export const deityDomains: Record<string, DeityDomain> = {
    war: {
        name: 'War',
        alignments: [],
        excludeAlignments: [],
        elements: [],
        excludeElements: [],
        creatureOverrides: [],
        creatureBoosts: ['balor', 'marilith', 'pitFiend', 'hornedDevil', 'erinyes', 'trex'],
        titles: [
            'the Conqueror', 'Lord of Battles', 'the Warlord', 'the Bloodforged',
            'the Iron General', 'the Undefeated', 'Champion of the Eternal War',
            'the Battlemaster', 'Scourge of Armies', 'the Warborn'
        ]
    },
    nature: {
        name: 'Nature',
        alignments: [],
        excludeAlignments: [],
        elements: [],
        excludeElements: ['Negative Energy'],
        creatureOverrides: [
            { creature: 'dryad', weight: 10, alignments: [], elements: [] },
            { creature: 'bear', weight: 8, alignments: [], elements: [] },
            { creature: 'elephant', weight: 6, alignments: [], elements: [] },
            { creature: 'trex', weight: 5, alignments: [], elements: [] },
            { creature: 'wolf', weight: 5, alignments: [], elements: [] },
            { creature: 'saberToothedTiger', weight: 5, alignments: [], elements: [] },
        ],
        creatureBoosts: ['bear', 'elephant', 'trex', 'dryad'],
        titles: [
            'the Verdant', 'Keeper of the Wild', 'the Greenlord', 'the Rootmother',
            'Lord of Beasts', 'the Untamed', 'Voice of the Forest',
            'the Evergreen', 'the Primal', 'Shepherd of the Wild'
        ]
    },
    knowledge: {
        name: 'Knowledge',
        alignments: [],
        excludeAlignments: [],
        elements: [],
        excludeElements: [],
        creatureOverrides: [],
        creatureBoosts: ['angel', 'dragon'],
        titles: [
            'the All-Knowing', 'Keeper of Secrets', 'the Loremaster', 'the Sage',
            'Lord of Scrolls', 'the Archivist', 'the Whisperer of Truths',
            'the Illuminated', 'Eye of the World', 'the Chronicler'
        ]
    },
    death: {
        name: 'Death',
        alignments: ['Evil', 'Neutral'],
        excludeAlignments: [],
        elements: [],
        excludeElements: ['Positive Energy'],
        creatureOverrides: [
            { creature: 'wraith', weight: 12, alignments: [], elements: [] },
            { creature: 'wight', weight: 8, alignments: [], elements: [] },
            { creature: 'skeleton', weight: 5, alignments: [], elements: [] },
        ],
        creatureBoosts: ['wraith', 'wight', 'boneDevil'],
        titles: [
            'the Deathbringer', 'Lord of the Dead', 'the Gravecaller', 'the Pale Rider',
            'Keeper of the Underworld', 'the Soulreaver', 'the Entombed King',
            'the Lichborn', 'Herald of the End', 'the Bone Sovereign'
        ]
    },
    life: {
        name: 'Life',
        alignments: ['Good'],
        excludeAlignments: [],
        elements: [],
        excludeElements: ['Negative Energy'],
        creatureOverrides: [],
        creatureBoosts: ['angel'],
        titles: [
            'the Lifegiver', 'the Healer', 'the Everbloom', 'Lord of Renewal',
            'the Restorer', 'Keeper of the Living', 'the Vital Flame',
            'the Nurturing', 'the Mender', 'Wellspring of Life'
        ]
    },
    tempest: {
        name: 'Tempest',
        alignments: [],
        excludeAlignments: [],
        elements: [],
        excludeElements: ['Earth'],
        creatureOverrides: [],
        creatureBoosts: ['airElemental', 'waterElemental', 'kraken'],
        titles: [
            'the Stormcaller', 'Lord of Thunder', 'the Tempest', 'the Hurricaneborn',
            'Rider of the Gale', 'the Thunderking', 'Voice of the Storm',
            'the Squallbringer', 'the Wrathful Sky', 'the Maelstrom'
        ]
    },
    forge: {
        name: 'Forge',
        alignments: [],
        excludeAlignments: [],
        elements: [],
        excludeElements: ['Water', 'Air'],
        creatureOverrides: [],
        creatureBoosts: ['fireElemental', 'earthElemental'],
        titles: [
            'the Forgemaster', 'Lord of the Anvil', 'the Hammerborn', 'the Smelter',
            'Keeper of the Eternal Forge', 'the Ironwright', 'the Craftlord',
            'the Tempered', 'the Runesmith', 'the Maker'
        ]
    },
    trickery: {
        name: 'Trickery',
        alignments: ['Chaotic', 'Evil'],
        excludeAlignments: ['Lawful Good'],
        elements: [],
        excludeElements: [],
        creatureOverrides: [
            { creature: 'dryad', weight: 6, alignments: [], elements: [] },
        ],
        creatureBoosts: ['glabrezu', 'imp', 'dryad'],
        titles: [
            'the Deceiver', 'Lord of Lies', 'the Trickster', 'the Masked',
            'the Shapeshifter', 'Keeper of Illusions', 'the Silver-Tongued',
            'the Unseen Hand', 'the Riddler', 'the Whisperer'
        ]
    },
    light: {
        name: 'Light',
        alignments: ['Good'],
        excludeAlignments: [],
        elements: [],
        excludeElements: ['Negative Energy'],
        creatureOverrides: [],
        creatureBoosts: ['angel', 'fireElemental'],
        titles: [
            'the Radiant', 'Lord of Dawn', 'the Sunforged', 'the Lightbringer',
            'Keeper of the Sacred Flame', 'the Luminous', 'the Dawnstar',
            'the Incandescent', 'the Blazing Herald', 'the Beacon'
        ]
    },
    shadow: {
        name: 'Shadow',
        alignments: ['Evil', 'Neutral'],
        excludeAlignments: [],
        elements: [],
        excludeElements: ['Positive Energy'],
        creatureOverrides: [
            { creature: 'shadow', weight: 10, alignments: [], elements: [] },
        ],
        creatureBoosts: ['wraith', 'shadow'],
        titles: [
            'the Shadowlord', 'Lord of Darkness', 'the Umbral', 'the Nightweaver',
            'Keeper of Shadows', 'the Eclipsed', 'the Voidborn',
            'the Penumbral', 'the Duskbringer', 'the Shrouded One'
        ]
    },
    sea: {
        name: 'Sea',
        alignments: [],
        excludeAlignments: [],
        elements: [],
        excludeElements: ['Fire', 'Earth'],
        creatureOverrides: [
            { creature: 'kraken', weight: 12, alignments: [], elements: [] },
            { creature: 'killerWhale', weight: 6, alignments: [], elements: [] },
            { creature: 'shark', weight: 5, alignments: [], elements: [] },
            { creature: 'cephalopod', weight: 5, alignments: [], elements: [] },
        ],
        creatureBoosts: ['kraken', 'waterElemental'],
        titles: [
            'Lord of the Deep', 'the Tidecaller', 'the Drowned God', 'the Wavecrown',
            'Keeper of the Abyss', 'the Leviathan', 'the Depthborn',
            'the Coral Sovereign', 'the Riptide', 'Voice of the Ocean'
        ]
    },
    beasts: {
        name: 'Beasts',
        alignments: [],
        excludeAlignments: [],
        elements: [],
        excludeElements: ['Negative Energy'],
        creatureOverrides: [
            { creature: 'bear', weight: 10, alignments: [], elements: [] },
            { creature: 'wolf', weight: 8, alignments: [], elements: [] },
            { creature: 'saberToothedTiger', weight: 8, alignments: [], elements: [] },
            { creature: 'elephant', weight: 7, alignments: [], elements: [] },
            { creature: 'trex', weight: 6, alignments: [], elements: [] },
            { creature: 'killerWhale', weight: 5, alignments: [], elements: [] },
        ],
        creatureBoosts: ['bear', 'wolf', 'saberToothedTiger', 'elephant', 'trex'],
        titles: [
            'the Beastlord', 'Lord of the Hunt', 'the Packmaster', 'the Feral',
            'Keeper of Claws', 'the Alpha', 'the Primal Sovereign',
            'the Untamed King', 'Voice of the Wild', 'the Apex'
        ]
    },
    arcana: {
        name: 'Arcana',
        alignments: [],
        excludeAlignments: [],
        elements: [],
        excludeElements: [],
        creatureOverrides: [],
        creatureBoosts: ['angel', 'dragon'],
        titles: [
            'the Archmage', 'Lord of Spells', 'the Weavekeeper', 'the Spellborn',
            'Keeper of the Arcane', 'the Mystic Sovereign', 'the Runelord',
            'the Enchanter', 'the Thaumaturge', 'Voice of the Weave'
        ]
    },
};

/**
 * Selects a valid deity domain based on the node's alignment and element.
 * Filters the domain list by compatibility, then picks one at random.
 */
/**
 * Selects a valid deity domain key based on alignment and element.
 * Filters the domain list by compatibility, then picks one at random.
 */
function selectDeityDomain(alignment: string, element: string): string {
    const eligible = Object.entries(deityDomains).filter(([_key, domain]) => {
        if (domain.alignments.length > 0) {
            if (!domain.alignments.some(a => alignment.includes(a))) return false;
        }
        if (domain.excludeAlignments.length > 0) {
            if (domain.excludeAlignments.some(a => alignment.includes(a))) return false;
        }
        if (domain.elements.length > 0) {
            if (!domain.elements.some(e => e === element)) return false;
        }
        if (domain.excludeElements.length > 0) {
            if (domain.excludeElements.some(e => e === element)) return false;
        }
        return true;
    });

    if (eligible.length === 0) return 'knowledge';
    return eligible[rand(0, eligible.length - 1)][0];
}

/**
 * Deity creature pool definitions. Each entry maps a MonsterID to optional variant and
 * a weight (higher = more likely to be selected). Pools are filtered by alignment and element.
 */
interface DeityCreatureOption {
    creature: string;
    variant?: string;
    weight: number;
    alignments: string[];
    elements: string[];
}

const deityCreaturePool: DeityCreatureOption[] = [
    // Angels — good-aligned planes
    { creature: 'angel', weight: 10, alignments: ['Good'], elements: [] },

    // Demons — chaotic evil
    { creature: 'balor', weight: 10, alignments: ['Chaotic Evil'], elements: [] },
    { creature: 'marilith', weight: 6, alignments: ['Chaotic Evil'], elements: [] },
    { creature: 'glabrezu', weight: 4, alignments: ['Chaotic Evil'], elements: [] },
    { creature: 'nalfeshnee', weight: 4, alignments: ['Chaotic Evil'], elements: [] },

    // Devils — lawful evil
    { creature: 'pitFiend', weight: 10, alignments: ['Lawful Evil'], elements: [] },
    { creature: 'iceDevil', weight: 6, alignments: ['Lawful Evil'], elements: [] },
    { creature: 'hornedDevil', weight: 5, alignments: ['Lawful Evil'], elements: [] },
    { creature: 'erinyes', weight: 5, alignments: ['Lawful Evil'], elements: [] },
    { creature: 'boneDevil', weight: 4, alignments: ['Lawful Evil'], elements: [] },

    // Generic evil (neutral evil gets a mix)
    { creature: 'balor', weight: 5, alignments: ['Neutral Evil'], elements: [] },
    { creature: 'pitFiend', weight: 5, alignments: ['Neutral Evil'], elements: [] },

    // Metallic dragons — good-aligned
    { creature: 'dragon', variant: 'gold', weight: 8, alignments: ['Good'], elements: ['Fire'] },
    { creature: 'dragon', variant: 'silver', weight: 8, alignments: ['Good'], elements: ['Air', 'Water'] },
    { creature: 'dragon', variant: 'bronze', weight: 6, alignments: ['Good'], elements: ['Water'] },
    { creature: 'dragon', variant: 'copper', weight: 6, alignments: ['Good'], elements: ['Earth'] },
    { creature: 'dragon', variant: 'brass', weight: 5, alignments: ['Good'], elements: ['Fire'] },
    { creature: 'dragon', variant: 'gold', weight: 5, alignments: ['Good'], elements: ['None', 'Positive Energy'] },
    { creature: 'dragon', variant: 'silver', weight: 5, alignments: ['Good'], elements: ['None', 'Positive Energy'] },

    // Chromatic dragons — evil-aligned
    { creature: 'dragon', variant: 'red', weight: 8, alignments: ['Evil'], elements: ['Fire'] },
    { creature: 'dragon', variant: 'blue', weight: 8, alignments: ['Evil'], elements: ['Air'] },
    { creature: 'dragon', variant: 'black', weight: 7, alignments: ['Evil'], elements: ['Water'] },
    { creature: 'dragon', variant: 'green', weight: 6, alignments: ['Evil'], elements: ['Earth'] },
    { creature: 'dragon', variant: 'white', weight: 5, alignments: ['Evil'], elements: ['Air', 'Water'] },
    { creature: 'dragon', variant: 'red', weight: 5, alignments: ['Evil'], elements: ['None', 'Negative Energy'] },
    { creature: 'dragon', variant: 'black', weight: 4, alignments: ['Evil'], elements: ['None', 'Negative Energy'] },

    // Elementals — match their element
    { creature: 'fireElemental', weight: 8, alignments: [], elements: ['Fire'] },
    { creature: 'waterElemental', weight: 8, alignments: [], elements: ['Water'] },
    { creature: 'airElemental', weight: 8, alignments: [], elements: ['Air'] },
    { creature: 'earthElemental', weight: 8, alignments: [], elements: ['Earth'] },

    // Undead — negative energy or evil
    { creature: 'wraith', weight: 6, alignments: ['Evil'], elements: ['Negative Energy'] },
    { creature: 'wight', weight: 4, alignments: ['Evil'], elements: ['Negative Energy'] },

    // Kraken — water planes
    { creature: 'kraken', weight: 6, alignments: [], elements: ['Water'] },

    // T-Rex / large beasts — neutral planes, positive energy (primal deities)
    { creature: 'trex', weight: 4, alignments: [], elements: ['Positive Energy'] },
    { creature: 'bear', weight: 3, alignments: [], elements: ['Positive Energy'] },
    { creature: 'elephant', weight: 3, alignments: [], elements: ['Positive Energy'] },

    // Fallback options for neutral/non-elemental planes
    { creature: 'angel', weight: 3, alignments: [], elements: ['None', 'Positive Energy'] },
    { creature: 'dragon', variant: 'gold', weight: 2, alignments: [], elements: ['None'] },
    { creature: 'dragon', variant: 'red', weight: 2, alignments: [], elements: ['None'] },
    { creature: 'kraken', weight: 2, alignments: [], elements: ['None'] },
];

/**
 * Selects a creature type based on alignment, element, and domain.
 * Merges the base pool with domain overrides, applies domain boosts,
 * filters by compatibility, then does a weighted random selection.
 */
function selectDeityCreature(alignment: string, element: string, domainKey: string): { creature: string; variant?: string } {
    const domain = deityDomains[domainKey];

    let pool = [...deityCreaturePool];
    if (domain?.creatureOverrides) {
        pool = pool.concat(domain.creatureOverrides);
    }

    const eligible = pool.filter(option => {
        const alignmentMatch = option.alignments.length === 0 ||
            option.alignments.some(a => alignment.includes(a));
        const elementMatch = option.elements.length === 0 ||
            option.elements.some(e => e === element);
        return alignmentMatch && elementMatch;
    });

    if (eligible.length === 0) {
        return { creature: 'angel' };
    }

    const boostSet = new Set(domain?.creatureBoosts ?? []);
    const weights: Record<string, number> = {};
    for (let i = 0; i < eligible.length; i++) {
        let w = eligible[i].weight;
        if (boostSet.has(eligible[i].creature)) {
            w *= 2;
        }
        weights[String(i)] = w;
    }
    const selectedIndex = parseInt(weightedRand(weights), 10);
    const selected = eligible[selectedIndex];

    return { creature: selected.creature, variant: selected.variant };
}

/**
 * Custom setup for deity nodes. Called after basic attributes (alignment, element,
 * challengeRating) are resolved. Selects domain and creature, then sets all
 * derived attributes on the node.
 * @param node - The deity node with alignment and element already populated
 * @param legendary - The legendary tier for this deity (3 or 5)
 */
export function deitySetup(node: WorldNode, legendary: 3 | 5): void {
    const alignment: string = node.attributes?.alignment ?? '';
    const element: string = node.attributes?.element ?? '';

    // Select domain (key form for internal lookups)
    const domainKey = selectDeityDomain(alignment, element);

    // Select creature based on alignment, element, and domain
    const result = selectDeityCreature(alignment, element, domainKey);

    // Set all derived attributes
    node.attributes!.domain = domainKey;
    node.attributes!.creature = result.creature;
    node.attributes!.variant = result.variant ?? '';
    node.attributes!.legendary = legendary;

    // Swap domain key to display name — domain is only used for display from here on
    const domainData = deityDomains[domainKey];
    if (domainData) {
        node.attributes!.domain = domainData.name;
    }
}

/**
 * Custom setup for avatar nodes. An avatar is a deity's manifestation outside their
 * home plane — same base creature but lower CR and legendary 3.
 *
 * If deities are provided, picks one weighted by tier and location relevance (tags
 * from the avatar's ancestor chain are matched against deity domains). If no deities
 * are available, falls back to alignment/element-based selection like a standalone deity.
 *
 * @param node - The avatar node with alignment and element already populated
 * @param deities - Array of existing deity nodes from the registry
 * @param locationTags - Tags collected from the avatar's ancestor chain
 */
export function avatarSetup(node: WorldNode, deities: WorldNode[], locationTags: Set<string>): void {
    const alignment: string = node.attributes?.alignment ?? '';
    const element: string = node.attributes?.element ?? '';

    if (deities.length > 0) {
        // Weight selection: base weight by tier, boosted if deity's domain matches location tags
        const weights: Record<string, number> = {};
        for (let i = 0; i < deities.length; i++) {
            const tier = deities[i].type;
            let w = tier === 'greaterDeity' ? 10 : tier === 'lesserDeity' ? 5 : 2;

            // Boost deities whose domain matches the avatar's location
            const deityDomain = deities[i].attributes?.domain ?? '';
            if (domainMatchesTags(deityDomain, locationTags)) {
                w *= 3;
            }

            weights[String(i)] = w;
        }
        const selectedIndex = parseInt(weightedRand(weights), 10);
        const deity = deities[selectedIndex];

        // Copy the deity's creature configuration
        node.attributes!.creature = deity.attributes?.creature ?? 'angel';
        node.attributes!.variant = deity.attributes?.variant ?? '';
        node.attributes!.domain = deity.attributes?.domain ?? '';
        node.attributes!.deityName = deity.name ?? deity.type;
    } else {
        // No deities exist yet — pick a domain that matches the location, then select creature
        const domainKey = selectDomainByTags(alignment, element, locationTags);
        const result = selectDeityCreature(alignment, element, domainKey);

        node.attributes!.creature = result.creature;
        node.attributes!.variant = result.variant ?? '';

        const domainData = deityDomains[domainKey];
        node.attributes!.domain = domainData ? domainData.name : domainKey;
        node.attributes!.deityName = '';
    }

    node.attributes!.legendary = 3;
}

/** Maps location tags to deity domain display names for matching. */
const tagToDomains: Record<string, string[]> = {
    water: ['Sea', 'Tempest'],
    fire: ['Forge', 'Light'],
    earth: ['Forge', 'Nature'],
    air: ['Tempest'],
    forest: ['Nature', 'Beasts'],
    mountain: ['Forge', 'War'],
    plains: ['Beasts', 'War'],
    desert: ['Light', 'War'],
    swamp: ['Death', 'Shadow', 'Nature'],
    cold: ['War', 'Nature'],
    underground: ['Shadow', 'Death', 'Forge'],
    undead: ['Death', 'Shadow'],
    evil: ['War', 'Death', 'Trickery', 'Shadow'],
    good: ['Life', 'Light', 'Knowledge'],
    hills: ['Nature', 'Beasts'],
};

/** Checks if a deity's domain (display name) matches any of the location tags. */
function domainMatchesTags(domainName: string, tags: Set<string>): boolean {
    for (const tag of tags) {
        const matchingDomains = tagToDomains[tag];
        if (matchingDomains && matchingDomains.includes(domainName)) {
            return true;
        }
    }
    return false;
}

/**
 * Selects a deity domain that matches the location tags when possible.
 * Falls back to the standard alignment/element-based selection if no tag match is found.
 */
function selectDomainByTags(alignment: string, element: string, tags: Set<string>): string {
    // Collect all domains that match any location tag
    const tagMatchedDomains = new Set<string>();
    for (const tag of tags) {
        const domains = tagToDomains[tag];
        if (domains) {
            for (const d of domains) {
                tagMatchedDomains.add(d);
            }
        }
    }

    if (tagMatchedDomains.size > 0) {
        // Filter to domains that are also valid for this alignment/element
        const eligible = Object.entries(deityDomains).filter(([_key, domain]) => {
            if (!tagMatchedDomains.has(domain.name)) return false;
            if (domain.alignments.length > 0 && !domain.alignments.some(a => alignment.includes(a))) return false;
            if (domain.excludeAlignments.length > 0 && domain.excludeAlignments.some(a => alignment.includes(a))) return false;
            if (domain.elements.length > 0 && !domain.elements.some(e => e === element)) return false;
            if (domain.excludeElements.length > 0 && domain.excludeElements.some(e => e === element)) return false;
            return true;
        });

        if (eligible.length > 0) {
            return eligible[rand(0, eligible.length - 1)][0];
        }
    }

    // Fallback to standard selection
    return selectDeityDomain(alignment, element);
}
