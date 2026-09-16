import type { ObjectTypeTemplate, WorldNode } from './types';
import { populationDensity, alignmentList, elementList, temperatureList, races } from './data/constants';
import { weightedRand, rand, collectAncestorTags } from './helpers';
import { getRegisteredNodes } from './nodeRegistry';
import { averageStats, races as toolkit5eRaces } from '@toolkit5e/base';
import { monsterList } from '@toolkit5e/monster-scaler';
import { generateNpcDescription } from './npcNameGenerators';
import { generateAdventureHook } from './adventureHookGenerators';

/**
 * Forward reference to the merged objectTypes map, wired up by objectTypes.ts after merge.
 * Lets setup functions here (e.g. npcSetup) read template metadata and ancestor tags
 * without importing objectTypes directly (which would create a circular dependency).
 */
let objectTypesRef: Record<string, ObjectTypeTemplate> = {};
export function setObjectTypesRef(ref: Record<string, ObjectTypeTemplate>): void {
    objectTypesRef = ref;
}

/** All valid Challenge Rating values, derived from the averageStats table, sorted numerically. */
const challengeRatingList: number[] = Object.keys(averageStats).map(Number).sort((a, b) => a - b);

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
    const newDemographics: Record<string, number> = {};

    if (node.parent?.attributes?.racialDemographics) {
        // Inherit from parent with slight variation (±10), but 0 stays 0
        const parentDemographics = node.parent.attributes.racialDemographics;
        for (const race in parentDemographics) {
            if (parentDemographics[race] === 0) {
                newDemographics[race] = 0;
            } else {
                newDemographics[race] = Math.max(0, parentDemographics[race] + rand(-10, 10));
            }
        }
    } else {
        // No parent — generate fresh random weights
        for (const race in races) {
            newDemographics[race] = rand(0, 30);
        }
    }

    // Guard against all races being 0 — give one random race a minimum presence
    const total = Object.values(newDemographics).reduce((sum, v) => sum + v, 0);
    if (total === 0) {
        const raceKeys = Object.keys(newDemographics);
        newDemographics[raceKeys[rand(0, raceKeys.length - 1)]] = rand(5, 15);
    }

    return newDemographics;
}

/** Category attributes are mixed into objectTypes that declare a matching category. */
export const categoryAttributes: Record<string, Record<string, any>> = {
    geography: {
        populationDensity: populationDensityValue,
        racialDemographics: racialDemographicsValue,
        temperature: temperatureList
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
    challengeRating: challengeRatingList,
    alignment: alignmentList,
    gender: ['Male', 'Female', 'Non-binary'],
    race: Object.keys(races),
    settlementType: ['Standard', 'Coastal', 'Underground'],
    description: 'textarea',
    adventureHook: 'textarea'
};

/** Human-readable labels for attribute keys. */
export const labels: Record<string, string> = {
    populationDensity: "Population Density",
    racialDemographics: "Racial Demographics",
    dominantRace: "Dominant Race",
    challengeRating: "Challenge Rating",
    alignment: "Alignment",
    domain: "Domain",
    creature: "Creature",
    variant: "Variant",
    deityName: "Deity",
    race: "Race",
    lineage: "Lineage",
    gender: "Gender",
    settlementType: "Settlement Type",
    worship: "Worships",
    species: "Species",
    adventureHook: "Adventure Hook",
    // Race names for demographics display
    dragonborn: "Dragonborn",
    dwarf: "Dwarf",
    elf: "Elf",
    gnome: "Gnome",
    goliath: "Goliath",
    halfElf: "Half-Elf",
    halfOrc: "Half-Orc",
    halfling: "Halfling",
    human: "Human",
    orc: "Orc",
    tiefling: "Tiefling"
};

/**
 * Selects a race for an NPC based on the nearest ancestor's racial demographics.
 * Walks up the parent chain to find racialDemographics, then does a weighted random pick.
 * Returns the race key string (e.g. 'human', 'dwarf').
 */
export function selectNpcRace(node: WorldNode): string {
    // Walk up the parent chain to find racial demographics
    let current: WorldNode | undefined = node.parent;
    let demographics: Record<string, number> | undefined;
    while (current) {
        if (current.attributes?.racialDemographics) {
            demographics = current.attributes.racialDemographics;
            break;
        }
        current = current.parent;
    }

    if (demographics) {
        // Filter out races with 0 weight
        const eligible: Record<string, number> = {};
        for (const race in demographics) {
            if (demographics[race] > 0) {
                eligible[race] = demographics[race];
            }
        }
        if (Object.keys(eligible).length > 0) {
            return weightedRand(eligible);
        }
    }

    // Fallback: pick from all races equally
    const allRaces = Object.keys(races);
    return allRaces[rand(0, allRaces.length - 1)];
}

/**
 * Deity domain definitions. Each domain has:
 * - `name`: display name shown in the info panel
 * - `alignments`: alignment keywords that allow this domain (empty = any)
 * - `excludeAlignments`: alignment keywords that disqualify this domain
 * - `elements`: element values that allow this domain (empty = any)
 * - `excludeElements`: element values that disqualify this domain
 * - `titles`: additional titles added to the name generator pool
 */
interface DeityDomain {
    name: string;
    alignments: string[];
    excludeAlignments: string[];
    elements: string[];
    excludeElements: string[];
    titles: string[];
}

export const deityDomains: Record<string, DeityDomain> = {
    war: {
        name: 'War',
        alignments: [],
        excludeAlignments: [],
        elements: [],
        excludeElements: [],
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
        titles: [
            'the Archmage', 'Lord of Spells', 'the Weavekeeper', 'the Spellborn',
            'Keeper of the Arcane', 'the Mystic Sovereign', 'the Runelord',
            'the Enchanter', 'the Thaumaturge', 'Voice of the Weave'
        ]
    },
};

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

/** Maps creature type strings to the planar elements they have affinity with. */
const creatureTypeElementAffinity: Record<string, string[]> = {
    celestial: ['Positive Energy'],
    fiend: ['Negative Energy'],
    undead: ['Negative Energy'],
};

/** Maps damage immunity strings to planar elements for inference. */
const immunityToElement: Record<string, string[]> = {
    fire: ['Fire'],
    cold: ['Water', 'Air'],
    lightning: ['Air'],
    acid: ['Water', 'Earth'],
    necrotic: ['Negative Energy'],
    radiant: ['Positive Energy'],
    poison: [],  // too common to be meaningful
};

/** Maps creature type strings to deity domain keys they have affinity with. */
const creatureTypeDomainAffinity: Record<string, string[]> = {
    beast: ['nature', 'beasts'],
    fey: ['nature', 'trickery'],
    undead: ['death', 'shadow'],
    elemental: ['tempest', 'forge'],
    celestial: ['life', 'light'],
    fiend: ['war', 'trickery', 'death'],
    dragon: ['arcana', 'war'],
    plant: ['nature'],
    monstrosity: ['beasts', 'war'],
};

/** Maps creature alignment strings to the planar alignment format for comparison. */
const alignmentToPlanar: Record<string, string> = {
    'lawful good': 'Lawful Good',
    'neutral good': 'Neutral Good',
    'chaotic good': 'Chaotic Good',
    'lawful evil': 'Lawful Evil',
    'neutral evil': 'Neutral Evil',
    'chaotic evil': 'Chaotic Evil',
    'chaotic neutral': 'Chaotic Neutral',
    'neutral': 'True Neutral',
    'unaligned': '',
    'any alignment': '',
};

/**
 * Finds the highest CR benchmark on a monster template that has actual stats
 * (not just a name/slug override). Checks for `hitDice` as the indicator.
 */
function getMaxRealCR(template: { stats: Record<number, any> }): number {
    let maxCR = 0;
    for (const crStr of Object.keys(template.stats)) {
        const cr = Number(crStr);
        const bench = template.stats[cr];
        if (bench && bench.hitDice !== undefined) {
            maxCR = Math.max(maxCR, cr);
        }
    }
    return maxCR;
}

/**
 * Scores a creature (with optional variant) for fitness as a deity base.
 * Returns a weight >= 0. Creatures scoring 0 are excluded from selection.
 *
 * Scoring factors:
 * - Max real CR (higher = better deity base)
 * - Creature type affinity with the plane's alignment
 * - Alignment compatibility between creature and plane
 * - Element inference from damage immunities
 * - Domain affinity between creature type and selected domain
 */
function scoreCreatureForDeity(
    template: any,
    variantData: any | undefined,
    alignment: string,
    element: string,
    domainKey: string
): number {
    let score = 0;

    // 1. Max real CR — check both base stats and variant stats
    let maxCR = getMaxRealCR(template);
    if (variantData?.stats) {
        for (const crStr of Object.keys(variantData.stats)) {
            const cr = Number(crStr);
            const bench = variantData.stats[cr];
            if (bench && bench.hitDice !== undefined) {
                maxCR = Math.max(maxCR, cr);
            }
        }
    }
    // Scale CR to a 0–30 range, but cap contribution at 20 to avoid overwhelming other factors
    score += Math.min(maxCR, 20);

    // Exclude very low CR creatures — they don't make convincing deity bases
    if (maxCR < 2) return 0;

    const creatureType: string = template.type ?? '';
    const creatureAlignment: string = template.alignment ?? '';
    const planarAlignment = alignmentToPlanar[creatureAlignment] ?? '';

    // 2. Creature type affinity (0–15)
    const isGood = alignment.includes('Good');
    const isEvil = alignment.includes('Evil');

    if (creatureType === 'celestial' && isGood) score += 15;
    else if (creatureType === 'fiend' && isEvil) score += 15;
    else if (creatureType === 'undead' && (isEvil || element === 'Negative Energy')) score += 12;
    else if (creatureType === 'dragon') score += 12;
    else if (creatureType === 'elemental') score += 10;
    else if (creatureType === 'beast' || creatureType === 'monstrosity') score += 8;
    else if (creatureType === 'fey') score += 8;
    else if (creatureType === 'plant') score += 5;
    // Penalize mismatches
    else if (creatureType === 'celestial' && isEvil) return 0;
    else if (creatureType === 'fiend' && isGood) return 0;
    else if (creatureType === 'undead' && isGood) return 0;

    // 3. Alignment compatibility (0–10)
    if (planarAlignment && planarAlignment === alignment) {
        score += 10;
    } else if (planarAlignment) {
        // Partial match — shares an axis
        const creatureGood = planarAlignment.includes('Good');
        const creatureEvil = planarAlignment.includes('Evil');
        const creatureLawful = planarAlignment.includes('Lawful');
        const creatureChaotic = planarAlignment.includes('Chaotic');

        if ((creatureGood && isGood) || (creatureEvil && isEvil) ||
            (creatureLawful && alignment.includes('Lawful')) ||
            (creatureChaotic && alignment.includes('Chaotic'))) {
            score += 5;
        }
        // Opposite alignment — strong penalty
        if ((creatureGood && isEvil) || (creatureEvil && isGood)) return 0;
    } else {
        // Unaligned/neutral — mildly compatible with anything
        score += 3;
    }

    // 4. Element inference from immunities (0–10)
    const immunities: string[] = [
        ...(template.lockedStats?.immunities ?? []),
        ...(variantData?.lockedStats?.immunities ?? [])
    ];
    if (element && element !== 'None') {
        for (const immunity of immunities) {
            const matchedElements = immunityToElement[immunity];
            if (matchedElements && matchedElements.includes(element)) {
                score += 10;
                break;
            }
        }
        // Also check element affinity by creature type
        const typeElements = creatureTypeElementAffinity[creatureType];
        if (typeElements && typeElements.includes(element)) {
            score += 5;
        }
    }

    // 5. Domain affinity (0–10)
    if (domainKey) {
        const affineDomains = creatureTypeDomainAffinity[creatureType];
        if (affineDomains && affineDomains.includes(domainKey)) {
            score += 10;
        }
    }

    return score;
}

/**
 * Dynamically selects a creature type for a deity based on alignment, element, and domain.
 * Iterates through the entire monsterList, scores each creature (and variant) for fitness,
 * then does a weighted random selection from all candidates scoring > 0.
 */
function selectDeityCreature(alignment: string, element: string, domainKey: string): { creature: string; variant?: string } {
    interface Candidate {
        creature: string;
        variant?: string;
        weight: number;
    }

    const candidates: Candidate[] = [];

    for (const [id, template] of Object.entries(monsterList) as [string, any][]) {
        // Score the base creature (no variant)
        const baseScore = scoreCreatureForDeity(template, undefined, alignment, element, domainKey);
        if (baseScore > 0) {
            candidates.push({ creature: id, weight: baseScore });
        }

        // Score each variant separately
        if (template.variants) {
            for (const [variantKey, variantData] of Object.entries(template.variants) as [string, any][]) {
                const variantScore = scoreCreatureForDeity(template, variantData, alignment, element, domainKey);
                if (variantScore > 0) {
                    candidates.push({ creature: id, variant: variantKey, weight: variantScore });
                }
            }
        }
    }

    if (candidates.length === 0) {
        return { creature: 'angel' };
    }

    // Weighted random selection
    const weights: Record<string, number> = {};
    for (let i = 0; i < candidates.length; i++) {
        weights[String(i)] = candidates[i].weight;
    }
    const selectedIndex = parseInt(weightedRand(weights), 10);
    const selected = candidates[selectedIndex];

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

/**
 * Selects an alignment for an NPC based on their worship and race.
 *
 * If the NPC worships a named deity, the alignment is derived from that deity's alignment.
 * If the NPC worships a domain, the alignment is picked from alignments compatible with that domain.
 * If the NPC worships an alignment dedication (e.g. "Lawful Good"), that alignment is used directly.
 * Otherwise, a random alignment is selected with optional racial bias.
 *
 * @param worship - The NPC's worship string (deity name, domain, or alignment dedication)
 * @param race - The NPC's race key
 * @param deities - Array of existing deity nodes from the registry
 * @returns An alignment string from alignmentList
 */
function selectNpcAlignment(worship: string, race: string, deities: WorldNode[]): string {
    // Check if worship matches a deity name — use that deity's alignment
    if (deities.length > 0) {
        const matchedDeity = deities.find(d => (d.name ?? d.type) === worship);
        if (matchedDeity?.attributes?.alignment) {
            return matchedDeity.attributes.alignment;
        }
    }

    // Check if worship matches an alignment string directly (e.g. "Lawful Good")
    if (alignmentList.includes(worship)) {
        return worship;
    }

    // Check if worship matches an alignment dedication phrase
    const dedicationToAlignment: Record<string, string[]> = {
        'Law and Order': ['Lawful Good', 'Lawful Neutral'],
        'the Balance': ['True Neutral', 'Neutral Good', 'Lawful Neutral', 'Chaotic Neutral'],
        'Freedom': ['Chaotic Good', 'Chaotic Neutral'],
        'the Greater Good': ['Lawful Good', 'Neutral Good', 'Chaotic Good'],
        'the Natural Order': ['True Neutral', 'Neutral Good']
    };
    if (dedicationToAlignment[worship]) {
        const options = dedicationToAlignment[worship];
        return options[rand(0, options.length - 1)];
    }

    // Check if worship matches a domain name — pick from compatible alignments
    const domainEntry = Object.entries(deityDomains).find(([_key, d]) => d.name === worship);
    if (domainEntry) {
        const [, domain] = domainEntry;
        const compatible = alignmentList.filter(a => {
            if (domain.alignments.length > 0 && !domain.alignments.some(ax => a.includes(ax))) return false;
            if (domain.excludeAlignments.length > 0 && domain.excludeAlignments.some(ax => a.includes(ax))) return false;
            return true;
        });
        if (compatible.length > 0) {
            return compatible[rand(0, compatible.length - 1)];
        }
    }

    // Fallback: random alignment with racial bias
    const raceData = races[race];
    if (raceData?.alignmentBias) {
        return weightedRand(raceData.alignmentBias);
    }

    // No bias (e.g. human) — equal probability
    return alignmentList[rand(0, alignmentList.length - 1)];
}

/**
 * Custom setup for NPC nodes. Selects a race from the nearest ancestor's racial
 * demographics, randomizes gender, and selects a worship target if not inherited.
 * Queries the node registry for deities internally.
 * @param node - The NPC node
 */
export function npcSetup(node: WorldNode): void {
    const deities = getRegisteredNodes('greaterDeity', 'lesserDeity', 'demigod');

    // Only select race if not already set (allows pre-set race for specific NPC types)
    if (!node.attributes!.race) {
        node.attributes!.race = selectNpcRace(node);
    }

    const genderRoll = rand(1, 20);
    node.attributes!.gender = genderRoll <= 9 ? 'Male' : genderRoll <= 18 ? 'Female' : 'Non-binary';
    node.attributes!.description = generateNpcDescription();

    // Only select lineage if not already set
    if (!node.attributes!.lineage) {
        node.attributes!.lineage = selectNpcLineage(node.attributes!.race);
    }

    // Inherit worship from parent (temple) if available, otherwise select own
    if (!node.attributes!.worship) {
        node.attributes!.worship = selectWorship(deities);
    }

    // Select alignment based on worship and race
    node.attributes!.alignment = selectNpcAlignment(node.attributes!.worship, node.attributes!.race, deities);

    // Generate an adventure hook. Runs last so it can read the resolved
    // alignment/worship and the ancestor chain for context-aware phrasing.
    node.attributes!.adventureHook = generateAdventureHook(node, objectTypesRef);
}

/**
 * Custom setup for dragonborn NPCs that serve a dragon. Sets lineage from the
 * inherited `dragonColor` attribute, then delegates to npcSetup for everything else.
 * Race should be pre-set to 'dragonborn' on the type's attributes.
 * @param node - The NPC node with `dragonColor` inherited from the dragon lair
 */
export function dragonbornNpcSetup(node: WorldNode): void {
    // Map dragon color to lineage name (capitalize first letter)
    const color: string = node.attributes?.dragonColor ?? '';
    if (color) {
        node.attributes!.lineage = color.charAt(0).toUpperCase() + color.slice(1);
    }
    npcSetup(node);
}

/**
 * Selects a random lineage for an NPC based on their race.
 * Looks up the race in the toolkit5e races data and picks equally among available lineages.
 * Returns the lineage name string, or empty string if the race has no lineages.
 */
function selectNpcLineage(raceKey: string): string {
    const raceEntry = toolkit5eRaces.find(r => r.name === raceKey);
    if (!raceEntry?.lineages?.length) return '';
    return raceEntry.lineages[rand(0, raceEntry.lineages.length - 1)].name;
}

/**
 * Selects a worship target for an NPC or temple. Checks the node registry for
 * existing deities and picks one, or falls back to a domain or alignment dedication.
 *
 * @param deities - Array of existing deity nodes from the registry
 * @returns A worship string — either a deity name, domain, or alignment
 */
export function selectWorship(deities: WorldNode[]): string {
    // 70% chance of a named deity if any exist, 30% chance of domain/alignment dedication
    if (deities.length > 0 && rand(1, 10) <= 7) {
        // Weight toward higher-tier deities
        const weights: Record<string, number> = {};
        for (let i = 0; i < deities.length; i++) {
            const tier = deities[i].type;
            weights[String(i)] = tier === 'greaterDeity' ? 10 : tier === 'lesserDeity' ? 5 : 2;
        }
        const selectedIndex = parseInt(weightedRand(weights), 10);
        const deity = deities[selectedIndex];
        return deity.name ?? deity.type;
    }

    // Fall back to a domain or alignment dedication
    if (rand(1, 2) === 1) {
        // Domain dedication — "the Light", "Nature", "War", etc.
        const domainKeys = Object.keys(deityDomains);
        const domainKey = domainKeys[rand(0, domainKeys.length - 1)];
        return deityDomains[domainKey].name;
    } else {
        // Alignment dedication — "Lawful Good", "the Balance", etc.
        const dedications = [
            'Lawful Good', 'Neutral Good', 'Chaotic Good',
            'Law and Order', 'the Balance', 'Freedom',
            'the Greater Good', 'the Natural Order'
        ];
        return dedications[rand(0, dedications.length - 1)];
    }
}

/**
 * Custom setup for temple nodes. Selects a worship target that all children
 * (acolytes, priests) will inherit.
 * @param node - The temple node
 * @param deities - Array of existing deity nodes from the registry
 */
export function templeSetup(node: WorldNode, deities: WorldNode[]): void {
    node.attributes!.worship = selectWorship(deities);
}

/** Settlement type values — determines what district types and features are available. */
export const settlementTypes = {
    standard: 'Standard',
    coastal: 'Coastal',
    underground: 'Underground',
} as const;

/** Tags that map to settlement types. First match wins. */
const tagToSettlementType: Record<string, string> = {
    water: settlementTypes.coastal,
    underground: settlementTypes.underground,
};

/**
 * Custom setup for settlement nodes. Determines the settlement type based on
 * the parent biome's tags (coastal, underground, etc.) and sets it as an attribute.
 * Falls back to 'Standard' if no matching tags are found.
 *
 * @param node - The settlement node
 * @param objectTypes - The objectTypes map (passed to avoid circular imports)
 */
export function settlementSetup(node: WorldNode, objectTypes: Record<string, any>): void {
    const tags = collectAncestorTags(node, objectTypes);
    for (const tag of tags) {
        if (tagToSettlementType[tag]) {
            node.attributes!.settlementType = tagToSettlementType[tag];
            return;
        }
    }
    node.attributes!.settlementType = settlementTypes.standard;
}

/**
 * Sets extra resistances on a creature based on the inherited temperature attribute.
 * Cold environments grant cold resistance, warm environments grant fire resistance.
 * Call this from customSetup on creature types that should adapt to their environment.
 * @param node - The creature node with temperature inherited from the parent
 */
export function environmentalResistanceSetup(node: WorldNode): void {
    const temp = node.attributes?.temperature;
    if (temp === 'Cold') {
        node.attributes!.extraResistances = 'cold';
    } else if (temp === 'Warm') {
        node.attributes!.extraResistances = 'fire';
    }
}

/**
 * Assigns a species to a beast group node. Species are persistent entities stored on
 * ancestor nodes (region, continent, or planet) so they can be reused by other groups
 * of the same creature type in the same area.
 *
 * Logic:
 * 1. Walk the parent chain looking for existing species of the same creature type
 * 2. If found in the region: 70% reuse, 30% generate new
 * 3. If found only at continent/planet level: 50% reuse, 50% generate new
 * 4. If none exist: generate new and store on an appropriate ancestor
 *
 * Species are stored as `speciesRegistry` on ancestor nodes — an array of
 * `{ name, creature }` objects. This persists through save/load automatically.
 *
 * @param node - The beast group node
 * @param objectTypes - The objectTypes map for looking up type templates
 */
export function speciesSetup(node: WorldNode, objectTypes: Record<string, any>): void {
    // 30% chance of no species — this is just a common, unremarkable population
    if (Math.random() < 0.3) return;

    // Determine the creature base type for this group
    const creatureType = getGroupCreatureType(node, objectTypes);
    if (!creatureType) return;

    // Look for existing species in the ancestor chain
    const existing = findExistingSpecies(node, creatureType, objectTypes);

    if (existing.regionSpecies.length > 0 && Math.random() < 0.7) {
        // Reuse a species from the same region
        const picked = existing.regionSpecies[Math.floor(Math.random() * existing.regionSpecies.length)];
        node.attributes!.species = picked.name;
        return;
    }

    if (existing.continentSpecies.length > 0 && Math.random() < 0.5) {
        // Reuse a species from the continent/planet
        const picked = existing.continentSpecies[Math.floor(Math.random() * existing.continentSpecies.length)];
        node.attributes!.species = picked.name;
        return;
    }

    // Generate a new species
    const context = getGeographicContext(node, objectTypes);
    const speciesName = generateSpeciesName(context);
    if (!speciesName) return;

    node.attributes!.species = speciesName;

    // Store the new species on an appropriate ancestor for future reuse
    registerSpeciesOnAncestor(node, creatureType, speciesName, objectTypes);
}

/** A species entry stored on an ancestor node's speciesRegistry. */
interface SpeciesEntry {
    name: string;
    creature: string;
}

/**
 * Determines the speciation key for a beast group node.
 * Uses the `speciationId` from the node's type template. All node types representing
 * the same animal concept share a speciationId (e.g. 'mammoth' for mammothHerd,
 * mammothBull, mammothCalf), so they share a species pool.
 * Returns null if the type has no speciationId (shouldn't happen for types with speciesSetup).
 */
function getGroupCreatureType(node: WorldNode, objectTypes: Record<string, any>): string | null {
    return objectTypes[node.type]?.speciationId ?? null;
}

/**
 * Walks the parent chain looking for existing species of the given creature type.
 * Returns species found at region level and continent level separately.
 */
function findExistingSpecies(node: WorldNode, creatureType: string, objectTypes: Record<string, any>): { regionSpecies: SpeciesEntry[], continentSpecies: SpeciesEntry[] } {
    const result = { regionSpecies: [] as SpeciesEntry[], continentSpecies: [] as SpeciesEntry[] };

    let current: WorldNode | undefined = node.parent;
    while (current) {
        const template = objectTypes[current.type];
        const typeTags: string[] | undefined = template?.tags;
        const registry: SpeciesEntry[] | undefined = current.attributes?.speciesRegistry;

        if (registry) {
            const matching = registry.filter(s => s.creature === creatureType);
            if (matching.length > 0) {
                if (typeTags?.includes('region')) {
                    result.regionSpecies.push(...matching);
                } else if (typeTags?.includes('continent')) {
                    result.continentSpecies.push(...matching);
                }
            }
        }

        current = current.parent;
    }

    return result;
}

/**
 * Stores a new species on an appropriate ancestor node.
 * Default scope is the nearest region; small chance of continent or planet scope.
 */
function registerSpeciesOnAncestor(node: WorldNode, creatureType: string, speciesName: string, objectTypes: Record<string, any>): void {
    // Decide scope: 75% region, 20% continent, 5% planet
    const scopeRoll = Math.random();
    const targetTag = scopeRoll < 0.75 ? 'region' : 'continent';

    let current: WorldNode | undefined = node.parent;
    let fallback: WorldNode | undefined;

    while (current) {
        const template = objectTypes[current.type];
        const typeTags: string[] | undefined = template?.tags;

        if (typeTags?.includes(targetTag)) {
            // Found the target scope — store here
            if (!current.attributes) current.attributes = {};
            if (!current.attributes.speciesRegistry) current.attributes.speciesRegistry = [];
            current.attributes.speciesRegistry.push({ name: speciesName, creature: creatureType });
            return;
        }

        // Track the highest-level ancestor with a continent tag as fallback
        if (typeTags?.includes('continent')) {
            fallback = current;
        }

        current = current.parent;
    }

    // If we didn't find the target scope, use the fallback (continent/planet)
    if (fallback) {
        if (!fallback.attributes) fallback.attributes = {};
        if (!fallback.attributes.speciesRegistry) fallback.attributes.speciesRegistry = [];
        fallback.attributes.speciesRegistry.push({ name: speciesName, creature: creatureType });
    }
}

/**
 * Generates a species name by examining the geographic context of the node.
 * Looks for named ancestors at different levels of the hierarchy and derives
 * a species modifier from them.
 */
function generateSpeciesName(context: GeographicContext): string | null {
    // Choose a naming strategy
    const roll = Math.random();

    if (roll < 0.45 && context.regionName) {
        // Geographic name derived from the nearest named region/biome
        return deriveGeographicAdjective(context.regionName);
    } else if (roll < 0.7 && context.continentName) {
        // Geographic name derived from the continent
        const adj = deriveGeographicAdjective(context.continentName);
        // Sometimes add the biome type for specificity: "Torcan Forest"
        if (Math.random() < 0.3 && context.biomeNoun) {
            return adj + ' ' + context.biomeNoun;
        }
        return adj;
    } else if (roll < 0.85) {
        // Descriptive name based on biome characteristics
        return generateDescriptiveSpecies(context);
    } else {
        // Compound: descriptive + geographic
        const descriptive = generateDescriptiveSpecies(context);
        if (context.regionName && Math.random() < 0.5) {
            return deriveGeographicAdjective(context.regionName) + ' ' + descriptive;
        }
        if (context.continentName) {
            return deriveGeographicAdjective(context.continentName) + ' ' + descriptive;
        }
        return descriptive;
    }
}

interface GeographicContext {
    continentName: string | null;
    regionName: string | null;
    biomeNoun: string | null;
    temperature: string | null;
    tags: Set<string>;
}

/**
 * Walks the parent chain and extracts geographic context for species naming.
 * Uses 'region' and 'continent' tags on type templates to identify hierarchy levels,
 * so new region/continent types are automatically picked up without maintaining a list.
 */
function getGeographicContext(node: WorldNode, objectTypes: Record<string, any>): GeographicContext {
    const context: GeographicContext = {
        continentName: null,
        regionName: null,
        biomeNoun: null,
        temperature: null,
        tags: new Set()
    };

    let current: WorldNode | undefined = node.parent;
    while (current) {
        const template = objectTypes[current.type];
        const typeTags: string[] | undefined = template?.tags;

        // Collect tags
        if (typeTags) {
            for (const tag of typeTags) {
                context.tags.add(tag);
            }
        }

        // Grab temperature from the nearest ancestor that has it
        if (!context.temperature && current.attributes?.temperature) {
            context.temperature = current.attributes.temperature;
        }

        // Find the nearest named region (types tagged 'region')
        if (!context.regionName && typeTags?.includes('region') && current.name) {
            context.regionName = current.name;
            // Derive a biome noun from the type's other tags
            context.biomeNoun = getBiomeNounFromTags(typeTags);
        }

        // Find the nearest named continent/planet (types tagged 'continent')
        if (!context.continentName && typeTags?.includes('continent') && current.name) {
            context.continentName = current.name;
        }

        current = current.parent;
    }

    return context;
}

/**
 * Derives a biome noun from a type's tags for compound species names.
 * Maps biome tags to human-readable nouns (e.g. 'forest' → 'Forest', 'water' → 'Coastal').
 */
function getBiomeNounFromTags(tags: string[]): string | null {
    // Check tags in priority order (more specific first)
    const tagToNoun: Record<string, string> = {
        forest: 'Forest',
        plains: 'Plains',
        mountain: 'Mountain',
        hills: 'Hill',
        swamp: 'Swamp',
        desert: 'Desert',
        water: 'Coastal',
        cold: 'Tundra',
        underground: 'Cave',
    };
    for (const tag of tags) {
        if (tag !== 'region' && tagToNoun[tag]) {
            return tagToNoun[tag];
        }
    }
    return null;
}

/**
 * Derives a geographic modifier from a place name for use in species names.
 * 
 * Two strategies:
 * 1. **Bare modifier** — names that are compound English words (Greenwood, Frostpeak,
 *    Shadowmire) or multi-word descriptive names (Silver Lake → Silver) work as-is.
 *    "Greenwood Snake" sounds natural because the name already functions adjectivally.
 * 2. **Suffixed demonym** — opaque proper nouns (Torca, Norrath, Athas) need a suffix
 *    to sound like adjectives: Torcan, Norrathian, Athasian.
 *
 * The heuristic: if the name ends in a recognizable English noun component (wood, peak,
 * vale, etc.), it's compound and works bare. Otherwise it gets suffixed.
 */
function deriveGeographicAdjective(placeName: string): string {
    // Strip "The " prefix
    let name = placeName.replace(/^The\s+/i, '');

    // For multi-word descriptive names (e.g. "The Golden Plains"), extract the modifier
    const words = name.split(' ');
    if (words.length > 1) {
        const lastWord = words[words.length - 1];
        const biomeWords = new Set(['Plains', 'Forest', 'Mountains', 'Lake', 'River', 'Sea', 'Desert', 'Swamp', 'Hills', 'Tundra', 'Coast', 'Savanna', 'Peaks', 'Range', 'Steppe', 'Grasslands', 'Sands', 'Wastes', 'Barrens', 'Dunes', 'Fields', 'Prairie']);
        if (biomeWords.has(lastWord)) {
            // "Golden Plains" → use "Golden" as-is (it's already an adjective)
            name = words.slice(0, -1).join(' ');
            // If what remains is already adjectival, return it
            if (name.match(/^[A-Z][a-z]+(ern|en|ous|ing|ed|al|ive)$/)) {
                return name;
            }
        } else {
            // "North Torca" → use "Torca"
            name = lastWord;
        }
    }

    // Check if the name is a compound English word that works as a bare modifier.
    // These end in recognizable noun components from the name generators.
    if (isCompoundName(name)) {
        return name;
    }

    // Already looks like an adjective (ends in common adjective suffixes)
    if (name.match(/(ern|en|ous|ing|ed|al|ive|an|ian)$/i)) {
        return name;
    }

    // Opaque proper noun — apply suffixing rules to create a demonym
    const lower = name.toLowerCase();
    const lastChar = lower[lower.length - 1];
    const vowels = 'aeiou';

    // Ends in a vowel: append "n" (Torca → Torcan)
    if (vowels.includes(lastChar)) {
        // 'e' ending: drop the e and add "ian" (Shadowgrove → Shadowgrovian)
        if (lastChar === 'e') {
            return name.slice(0, -1) + 'ian';
        }
        return name + 'n';
    }

    // Ends in 's': just add "ian" (Athas → Athasian)
    if (lastChar === 's') {
        return name + 'ian';
    }

    // Ends in a consonant: append "an" or "ian"
    // Short names (≤5 chars) get "ian", longer get "an"
    if (name.length <= 5) {
        return name + 'ian';
    }
    return name + 'an';
}

/**
 * Determines if a name is a compound English word that works as a bare geographic modifier.
 * Checks if the name ends in a recognizable noun component that the name generators use.
 * e.g. "Greenwood", "Frostpeak", "Shadowmire", "Ironholm" → true
 *      "Torca", "Norrath", "Eryslai" → false
 */
function isCompoundName(name: string): boolean {
    const lower = name.toLowerCase();
    // Common noun components used by the location name generators
    const compoundSuffixes = [
        // Forest generators
        'wood', 'grove', 'weald', 'thicket', 'hollow',
        // Mountain generators
        'peak', 'horn', 'spire', 'crag', 'fang', 'crown', 'tooth',
        // Swamp generators
        'mire', 'fen', 'marsh', 'bog', 'moor',
        // Water generators
        'water', 'run', 'flow', 'brook', 'stream', 'creek',
        // Settlement-style
        'holm', 'burg', 'ford', 'vale', 'dale', 'fell', 'field', 'gate',
        'haven', 'hold', 'keep', 'port', 'stead', 'ton', 'wick',
        // General geography
        'land', 'cliff', 'ridge', 'stone', 'rock', 'lake', 'mouth',
    ];
    return compoundSuffixes.some(suffix => lower.endsWith(suffix) && lower.length > suffix.length);
}

/**
 * Generates a purely descriptive species modifier based on biome characteristics.
 * These don't reference any specific place name.
 */
function generateDescriptiveSpecies(context: GeographicContext): string {
    const pools: string[][] = [];

    // Color-based descriptors
    pools.push(['Brown', 'Grey', 'Tawny', 'Pale', 'Dark', 'Dusky', 'Russet']);

    // Size-based descriptors
    pools.push(['Greater', 'Lesser', 'Giant', 'Common', 'Dwarf']);

    // Pattern-based descriptors
    pools.push(['Spotted', 'Striped', 'Banded', 'Mottled', 'Crested']);

    // Temperature-based
    if (context.temperature === 'Cold' || context.tags.has('cold')) {
        pools.push(['Snow', 'Frost', 'Ice', 'Winter', 'Arctic', 'White']);
    } else if (context.temperature === 'Warm') {
        pools.push(['Sun', 'Golden', 'Red', 'Flame', 'Dust']);
    }

    // Biome-based
    if (context.tags.has('forest')) {
        pools.push(['Forest', 'Woodland', 'Timber', 'Shade']);
    }
    if (context.tags.has('mountain')) {
        pools.push(['Mountain', 'Highland', 'Rock', 'Cliff']);
    }
    if (context.tags.has('water')) {
        pools.push(['River', 'Marsh', 'Reed', 'Shore']);
    }
    if (context.tags.has('plains')) {
        pools.push(['Plains', 'Steppe', 'Prairie', 'Grassland']);
    }
    if (context.tags.has('desert')) {
        pools.push(['Sand', 'Dune', 'Desert', 'Arid']);
    }
    if (context.tags.has('swamp')) {
        pools.push(['Swamp', 'Bog', 'Marsh', 'Mire']);
    }

    // Pick from a random pool
    const pool = pools[Math.floor(Math.random() * pools.length)];
    return pool[Math.floor(Math.random() * pool.length)];
}
