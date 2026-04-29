import type { WorldNode } from './types';
import { populationDensity, alignmentList, elementList, temperatureList, races } from './data/constants';
import { weightedRand, rand, collectAncestorTags } from './helpers';
import { averageStats } from '@toolkit5e/base';
import { monsterList } from '@toolkit5e/monster-scaler';

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
    deityName: "Deity",
    // Race names for demographics display
    dragonborn: "Dragonborn",
    dwarf: "Dwarf",
    elf: "Elf",
    gnome: "Gnome",
    halfElf: "Half-Elf",
    halfOrc: "Half-Orc",
    halfling: "Halfling",
    human: "Human",
    tiefling: "Tiefling"
};

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
