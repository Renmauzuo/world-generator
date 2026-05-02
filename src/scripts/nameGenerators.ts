import type { WorldNode } from './types';
import { rand, randFromArray } from './helpers';
import { generateTitle } from './titleGenerator';

// Sometimes an element's name will impact a sibling. This stores the queued name.
export let queuedName: string | null = null;

export function setQueuedName(name: string | null): void {
    queuedName = name;
}

export function planarClusterNameGenerator(): string {
    let name = "The ";
    name += randFromArray(['Outer', 'Inner', 'Forgotten', 'Distant', 'Esoteric', 'Unknown']) + ' ';
    name += randFromArray(['Planes', 'Realms', 'Cluster', 'Lands']);
    return name;
}

export function planarNameGenerator(node: WorldNode): string {
    const alignment: string = node.attributes?.alignment ?? '';
    const element: string = node.attributes?.element ?? '';

    // Pick a format: title only (40%), name only (20%), name + title (40%)
    const format = rand(1, 10);
    const properName = generatePlanarProperName();
    const title = generatePlanarTitle(node.type, alignment, element);

    if (format <= 4) {
        // Title only — "The Realm of Fire"
        return title;
    } else if (format <= 6) {
        // Name only — "Eryslai"
        return properName;
    } else {
        // Name + title — "Eryslai, the Kingdom of Wind"
        // Lowercase "the" when it follows a comma
        const lowerTitle = title.startsWith('The ') ? 'the ' + title.slice(4) : title;
        return properName + ', ' + lowerTitle;
    }
}

/**
 * Generates an otherworldly proper name for a plane, layer, or demiplane.
 * Uses syllable pools with a different phonetic palette than mortal names.
 */
function generatePlanarProperName(): string {
    const starts = ['Av', 'Cer', 'Dis', 'Ely', 'Geh', 'Hel', 'Khy', 'Lim', 'Mal', 'Nyr', 'Oth', 'Pan', 'Rav', 'Sty', 'Thal', 'Vor', 'Xan', 'Zel'];
    const mids = ['an', 'ar', 'el', 'en', 'er', 'ia', 'il', 'is', 'on', 'or', 'os', 'ul', 'yn', 'ath', 'oth'];
    const ends = ['us', 'ia', 'os', 'is', 'on', 'um', 'al', 'ar', 'ax', 'ys', 'ei', 'or', 'as', 'heim'];

    let name = randFromArray(starts);
    const midCount = rand(0, 1);
    for (let i = 0; i < midCount; i++) {
        name += randFromArray(mids);
    }
    name += randFromArray(ends);
    return name;
}

/**
 * Generates a descriptive title for a plane, e.g. "The Realm of Fire".
 * The place noun varies by node type (Plane, Demiplane, Layer, etc.)
 * and the domain word varies by element and alignment.
 */
function generatePlanarTitle(nodeType: string, alignment: string, element: string): string {
    const alignmentGood = alignment.includes("Good");
    const alignmentEvil = alignment.includes("Evil");
    const alignmentLawful = alignment.includes("Lawful");
    const alignmentChaotic = alignment.includes("Chaotic");

    let name = "The ";

    // Place nouns based on node type
    let placeOptions = ["Realm", "Kingdom"];

    if (nodeType === "plane") {
        placeOptions = placeOptions.concat("Plane");
    } else if (nodeType === "demiPlane") {
        placeOptions = placeOptions.concat("Demiplane");
    } else if (nodeType === "planarLayer") {
        placeOptions = placeOptions.concat(["Layer", "Stratum", "Tier", "Depth", "Expanse"]);
    }

    // Element-based place nouns
    if (element === "Water") {
        placeOptions = placeOptions.concat(["Sea", "Ocean", "Lake", "Islands", "Abyss", "Waters"]);
    } else if (element === "Air") {
        placeOptions = placeOptions.concat(["Clouds"]);
    } else {
        placeOptions = placeOptions.concat(["Land"]);
    }

    // Alignment-based place nouns
    if (alignmentGood) {
        placeOptions = placeOptions.concat(["Heaven", "Paradise"]);
    } else if (alignmentEvil) {
        placeOptions = placeOptions.concat(["Hell"]);
    }

    name += randFromArray(placeOptions) + ' of ';

    // Domain words
    let domainOptions = ["the Forgotten", "the Unknown"];
    if (element === "Fire") {
        domainOptions = domainOptions.concat(["Fire", "Ash", "Lava", "Embers", "Cinders"]);
    } else if (element === "Earth") {
        domainOptions = domainOptions.concat(["Earth", "Stone", "Rock"]);
    } else if (element === "Air") {
        domainOptions = domainOptions.concat(["Air", "Sky", "Clouds"]);
    } else if (element === "Water") {
        domainOptions = domainOptions.concat(["Water", "the Depths"]);
    } else if (element === "Positive Energy") {
        domainOptions = domainOptions.concat(["Life", "Growth"]);
    } else if (element === "Negative Energy") {
        domainOptions = domainOptions.concat(["Death", "Decay", "Undeath", "the Dead"]);
    }

    if (alignmentGood) {
        domainOptions = domainOptions.concat(["Hope", "Courage", "Love", "Angels"]);
        if (alignmentChaotic) {
            domainOptions = domainOptions.concat(["Eladrin"]);
        } else if (alignmentLawful) {
            domainOptions = domainOptions.concat(["Archons"]);
        } else {
            domainOptions = domainOptions.concat(["Guardinals"]);
        }
    } else if (alignmentEvil) {
        domainOptions = domainOptions.concat(["Hate", "War", "Torment"]);
        if (alignmentChaotic) {
            domainOptions = domainOptions.concat(["Demons"]);
        } else if (alignmentLawful) {
            domainOptions = domainOptions.concat(["Devils"]);
        } else {
            domainOptions = domainOptions.concat(["Fiends"]);
        }
    }

    if (alignmentLawful) {
        domainOptions = domainOptions.concat(["Order", "Law"]);
    } else if (alignmentChaotic) {
        domainOptions = domainOptions.concat(["Disorder", "Chaos"]);
    }

    name += randFromArray(domainOptions);
    return name;
}

export function materialPlaneNameGenerator(_node: WorldNode): string {
    return "The " + randFromArray(["Prime", "Lost", "Unknown", "Forgotten", "Major", "Minor", "Mortal"]) + " Material Plane";
}

export function forestNameGenerator(node: WorldNode): string {
    const temperature: string = node.attributes?.temperature ?? '';
    const prefixes = ['Green', 'Shadow', 'Whisper', 'Silver', 'Iron', 'Moss', 'Thorn', 'Amber', 'Dusk', 'Dawn'];
    const coldPrefixes = ['Frost', 'White', 'Ice', 'Winter', 'Snow', 'Pine'];
    const warmPrefixes = ['Sun', 'Gold', 'Ember', 'Crimson', 'Jade', 'Vine'];
    const suffixes = ['wood', 'grove', 'weald', 'thicket', 'hollow'];

    let pool = [...prefixes];
    if (temperature === 'Cold') pool = pool.concat(coldPrefixes);
    if (temperature === 'Warm') pool = pool.concat(warmPrefixes);

    return randFromArray(pool) + randFromArray(suffixes);
}

export function mountainNameGenerator(_node: WorldNode): string {
    const prefixes = ['Grey', 'Iron', 'Storm', 'Thunder', 'Cloud', 'Stone', 'Frost', 'Fire', 'Dragon', 'Eagle', 'Hammer', 'Anvil'];
    const suffixes = ['peak', 'horn', 'spire', 'crag', 'fang', 'crown', 'tooth'];
    return randFromArray(prefixes) + randFromArray(suffixes);
}

export function mountainRangeNameGenerator(_node: WorldNode): string {
    const prefixes = ['Grey', 'Iron', 'Storm', 'Thunder', 'Cloud', 'Stone', 'Frost', 'Dragon', 'World', 'Spine'];
    const suffixes = [' Mountains', ' Peaks', ' Range', ' Spine', ' Teeth', ' Wall'];
    return "The " + randFromArray(prefixes) + randFromArray(suffixes);
}

export function plainsNameGenerator(_node: WorldNode): string {
    const prefixes = ['Golden', 'Wind', 'Sun', 'Amber', 'Vast', 'Endless', 'Thunder', 'Silver', 'Tall'];
    const suffixes = [' Plains', ' Grasslands', ' Steppe', ' Prairie', ' Savanna', ' Fields'];
    return "The " + randFromArray(prefixes) + randFromArray(suffixes);
}

export function swampNameGenerator(_node: WorldNode): string {
    const prefixes = ['Black', 'Dead', 'Murk', 'Rot', 'Fog', 'Gloom', 'Dread', 'Mire', 'Sorrow'];
    const suffixes = ['mire', 'fen', 'marsh', 'bog', 'moor', 'swamp'];
    return randFromArray(prefixes) + randFromArray(suffixes);
}

export function desertNameGenerator(_node: WorldNode): string {
    const prefixes = ['Burning', 'Endless', 'Red', 'White', 'Glass', 'Salt', 'Sun', 'Bone', 'Dust'];
    const suffixes = [' Sands', ' Wastes', ' Desert', ' Expanse', ' Barrens', ' Dunes'];
    return "The " + randFromArray(prefixes) + randFromArray(suffixes);
}

export function caveNameGenerator(_node: WorldNode): string {
    const styles: Array<() => string> = [
        // "The X Caverns"
        () => "The " + randFromArray(['Deep', 'Dark', 'Crystal', 'Echo', 'Shadow', 'Howling', 'Dripping', 'Lost']) + ' ' + randFromArray(['Caverns', 'Caves', 'Depths', 'Tunnels', 'Warrens']),
        // "Xmouth Cave"
        () => randFromArray(['Black', 'Stone', 'Iron', 'Bone', 'Fang', 'Spider', 'Bear']) + "mouth Cave",
    ];
    return randFromArray(styles)();
}

export function lakeNameGenerator(_node: WorldNode): string {
    const prefixes = ['Silver', 'Crystal', 'Mirror', 'Shadow', 'Moon', 'Still', 'Deep', 'Blue', 'Clear'];
    const suffixes = [' Lake', ' Mere', ' Loch', ' Pool', ' Waters'];
    return randFromArray(prefixes) + randFromArray(suffixes);
}

export function riverNameGenerator(_node: WorldNode): string {
    const names = ['Silver', 'Winding', 'Rush', 'Stone', 'Iron', 'White', 'Dark', 'Swift', 'Amber', 'Frost'];
    const suffixes = ['water', 'run', 'flow', 'brook', 'stream', 'creek'];
    return "The " + randFromArray(names) + randFromArray(suffixes);
}

export function savannaNameGenerator(_node: WorldNode): string {
    const prefixes = ['Golden', 'Sun', 'Lion', 'Amber', 'Dry', 'Vast', 'Thorn', 'Acacia', 'Red'];
    const suffixes = [' Savanna', ' Veldt', ' Grasslands', ' Wilds', ' Expanse'];
    return "The " + randFromArray(prefixes) + randFromArray(suffixes);
}

export function forgottenBiomeNameGenerator(node: WorldNode): string {
    const adjectives = ['Forgotten', 'Lost', 'Hidden', 'Ancient', 'Primeval', 'Untouched', 'Timeless'];
    const adjective = randFromArray(adjectives);

    // Derive the place noun from the node type
    const placeNames: Record<string, string[]> = {
        forgottenIsland: ['Island', 'Isle', 'Atoll'],
        forgottenForest: ['Forest', 'Jungle', 'Wilds'],
        forgottenValley: ['Valley', 'Canyon', 'Gorge', 'Hollow'],
    };
    const places = placeNames[node.type] ?? ['Land'];
    return "The " + adjective + ' ' + randFromArray(places);
}

export function continentNameGenerator(_node: WorldNode): string {
    if (queuedName) {
        const name = queuedName;
        queuedName = null;
        return name;
    }

    let name = randFromArray(['Am', 'Eur', 'In', 'Af', 'Aus', 'An', 'Od', 'Fay', 'Kun', 'Al', 'Vel', 'Kal', 'Tor', 'Pan', 'Ess']);

    const midSyllableCount = rand(0, 2);
    const midSyllables = ['er', 'ic', 'ric', 'ral', 'ar', 'on', 'io', 'im', 'ton', 'd'];
    for (let i = 0; i < midSyllableCount; i++) {
        name += randFromArray(midSyllables);
    }

    name += randFromArray(['ca', 'ope', 'ia']);

    if (rand(1, 5) === 1) {
        const northSouth = rand(0, 1) === 1;
        queuedName = (northSouth ? 'South' : 'East') + ' ' + name;
        name = (northSouth ? 'North' : 'West') + ' ' + name;
    }

    return name;
}

/**
 * Generates a draconic-sounding name from syllable pools, optionally with a title.
 * Syllables are derived from the phonetic patterns of iconic fantasy dragon names.
 * Higher-CR dragons are more likely to have a title appended.
 * Titles are drawn from alignment pools (evil/good) and element pools (fire/cold/etc.)
 * based on the dragon's color.
 */
export function dragonNameGenerator(node: WorldNode): string {
    // Build a draconic name from syllable pools
    const starts = ['Ald', 'Anc', 'Ar', 'Az', 'Bal', 'Cyr', 'Dra', 'Fal', 'Gor', 'Ig', 'Kal', 'Kyr', 'Mal', 'Mor', 'Nid', 'Nym', 'Oth', 'Raz', 'Sar', 'Syl', 'Thar', 'Tor', 'Ur', 'Val', 'Vor', 'Xar', 'Zar', 'Zyr'];
    const mids = ['ag', 'ak', 'al', 'an', 'ar', 'ax', 'el', 'en', 'ig', 'il', 'in', 'ir', 'og', 'on', 'or', 'ul', 'un', 'ur', 'ath', 'eth', 'ith', 'oth'];
    const ends = ['ax', 'or', 'us', 'is', 'on', 'ur', 'ix', 'ox', 'ar', 'ir', 'ath', 'oth', 'uk', 'an', 'yn', 'as', 'os'];

    let name = randFromArray(starts);
    const midCount = rand(0, 1);
    for (let i = 0; i < midCount; i++) {
        name += randFromArray(mids);
    }
    name += randFromArray(ends);

    // Determine if this dragon gets a title based on CR
    const cr = node.attributes?.challengeRating ?? 1;
    const titleChance = cr < 5 ? 0 : cr < 12 ? 0.2 : cr < 18 ? 0.6 : 0.9;

    if (Math.random() < titleChance) {
        // Extract dragon color from the node type (e.g. 'dragonLairRed' → 'red')
        const colorMatch = node.type.match(/^dragonLair(\w+)$/);
        const dragonColor = colorMatch ? colorMatch[1].toLowerCase() : undefined;

        const title = generateTitle({
            alignment: node.attributes?.alignment,
            cr,
            creatureType: 'dragon',
            dragonColor
        });
        name += ', ' + title;
    }

    return name;
}

/**
 * Generates a name for extraplanar beings: angels, demons, and devils.
 * Shared syllable pools reflect the mythological connection between celestials and fiends.
 * Titles vary by alignment (celestial vs demonic vs infernal) and scale with CR.
 * A small portion are title-only — beings so ancient their names have been forgotten.
 */
export function extraplanarNameGenerator(node: WorldNode): string {
    // Shared syllable pools — biblical/Enochian-inspired
    const starts = ['Az', 'Bel', 'Cer', 'Dis', 'Eth', 'Gal', 'Har', 'Iz', 'Kal', 'Laz', 'Mal', 'Nab', 'Oph', 'Pur', 'Raz', 'Sam', 'Thar', 'Ur', 'Val', 'Xer', 'Zar', 'Zer'];
    const mids = ['ae', 'al', 'an', 'ar', 'el', 'en', 'ia', 'ie', 'il', 'in', 'ir', 'is', 'on', 'or', 'ul', 'us'];
    const ends = ['el', 'iel', 'ael', 'ius', 'oth', 'us', 'is', 'al', 'on', 'as', 'ax', 'ur', 'em', 'im'];

    const cr = node.attributes?.challengeRating ?? 1;
    const alignment: string = node.attributes?.alignment ?? '';

    // Infer creature type from alignment for title generation
    const isGood = alignment.includes('Good');
    const isEvil = alignment.includes('Evil');
    const creatureType = isGood ? 'celestial' : isEvil ? 'fiend' : undefined;

    const titleOptions = { alignment, cr, creatureType };

    // Title-only chance: higher for very high CR (ancient beings)
    const titleOnlyChance = cr >= 15 ? 0.15 : cr >= 10 ? 0.05 : 0;

    if (Math.random() < titleOnlyChance) {
        const title = generateTitle(titleOptions);
        // Capitalize if it doesn't already start with a capital
        return title.startsWith('of ') ? 'The One ' + title : 'The ' + title.replace(/^the /, '');
    }

    // Build the proper name
    let name = randFromArray(starts);
    const midCount = rand(0, 1);
    for (let i = 0; i < midCount; i++) {
        name += randFromArray(mids);
    }
    name += randFromArray(ends);

    // Title chance scales with CR
    const titleChance = cr < 3 ? 0.1 : cr < 8 ? 0.3 : cr < 14 ? 0.6 : 0.85;

    if (Math.random() < titleChance) {
        const title = generateTitle(titleOptions);
        // Titles starting with "of" use a space, others use ", the"
        if (title.startsWith('of ')) {
            name += ' ' + title;
        } else {
            name += ', ' + title;
        }
    }

    return name;
}

/**
 * Generates a name for fey creatures: dryads, naiads, and other nature spirits.
 * Names are nature-inspired and whimsical, reflecting the fey's connection to the natural world.
 */
export function feyNameGenerator(node: WorldNode): string {
    const starts = ['Ae', 'Bri', 'Cel', 'Dew', 'El', 'Fen', 'Gla', 'Hol', 'Ivy', 'Jas', 'Kel', 'Lil', 'Mab', 'Nym', 'Ob', 'Pix', 'Ros', 'Syl', 'Thi', 'Wil', 'Zel'];
    const mids = ['an', 'ar', 'el', 'en', 'ia', 'il', 'in', 'is', 'or', 'un', 'ow', 'ea'];
    const ends = ['a', 'e', 'ia', 'iel', 'is', 'wen', 'wyn', 'ine', 'ora', 'elle', 'ith', 'ose'];

    let name = randFromArray(starts);
    const midCount = rand(0, 1);
    for (let i = 0; i < midCount; i++) {
        name += randFromArray(mids);
    }
    name += randFromArray(ends);

    // Fey titles are rare and nature-themed
    const cr = node.attributes?.challengeRating ?? 1;
    const titleChance = cr < 3 ? 0.05 : cr < 8 ? 0.2 : 0.5;

    if (Math.random() < titleChance) {
        const title = generateTitle({ cr, creatureType: 'fey' });
        // Fey titles starting with "of" use a space, others use comma
        if (title.startsWith('of ')) {
            name += ' ' + title;
        } else {
            name += ', ' + title;
        }
    }

    return name;
}

/**
 * Generates a name for a deity. Has three paths:
 * 1. Exotic divine name — otherworldly syllables with divine titles (most common)
 * 2. Creature-derived name — uses the base creature's name generator (ascended mortal)
 * 3. Title-only — beings so ancient or powerful they are known only by epithet
 *
 * Titles scale with deity tier (demigod < lesser deity < greater deity) and
 * are flavored by alignment.
 */
export function deityNameGenerator(node: WorldNode): string {
    const cr = node.attributes?.challengeRating ?? 20;
    const alignment: string = node.attributes?.alignment ?? '';
    const element: string = node.attributes?.element ?? '';

    // Determine deity tier from node type for title selection
    const isGreater = node.type === 'greaterDeity';
    const isLesser = node.type === 'lesserDeity';
    const tier = isGreater ? 'greaterDeity' as const : isLesser ? 'lesserDeity' as const : 'demigod' as const;

    const domainName: string = node.attributes?.domain ?? '';
    const titleOptions = { alignment, element, cr, domain: domainName, tier };

    // Title-only chance: higher for greater deities
    const titleOnlyChance = isGreater ? 0.15 : isLesser ? 0.08 : 0.03;

    if (Math.random() < titleOnlyChance) {
        const title = generateTitle(titleOptions);
        return title.startsWith('of ') ? 'The One ' + title : 'The ' + title.replace(/^the /, '');
    }

    // Ascended mortal chance: use the base creature's name generator
    // More common for demigods (mortals who achieved divinity)
    const ascendedChance = isGreater ? 0.1 : isLesser ? 0.2 : 0.3;
    const baseCreature: string = node.attributes?.creature ?? '';

    if (Math.random() < ascendedChance && baseCreature) {
        const creatureName = generateCreatureDerivedName(node, baseCreature);
        if (creatureName) {
            // Ascended mortals always get a divine title
            return creatureName + ', ' + generateTitle(titleOptions);
        }
    }

    // Default: exotic divine name
    const name = generateDivineName();

    // Title chance: nearly guaranteed for greater deities
    const titleChance = isGreater ? 0.95 : isLesser ? 0.85 : 0.7;

    if (Math.random() < titleChance) {
        return name + ', ' + generateTitle(titleOptions);
    }

    return name;
}

/**
 * Generates an exotic divine proper name from syllable pools.
 * Phonetically distinct from mortal, planar, and extraplanar names —
 * draws from ancient/mythological phonemes.
 */
function generateDivineName(): string {
    const starts = [
        'Aeo', 'Ath', 'Bal', 'Cael', 'Dae', 'Eld', 'Gor', 'Hyr', 'Ith', 'Kael',
        'Lor', 'Myr', 'Nyx', 'Oph', 'Pyr', 'Rael', 'Sol', 'Thal', 'Ur', 'Vael',
        'Xal', 'Yth', 'Zael'
    ];
    const mids = [
        'ae', 'al', 'an', 'ar', 'el', 'en', 'ia', 'il', 'ir', 'on', 'or', 'ul',
        'ath', 'oth', 'yr', 'un'
    ];
    const ends = [
        'us', 'is', 'os', 'ax', 'or', 'on', 'al', 'iel', 'oth', 'yr', 'as',
        'ael', 'ius', 'eon', 'ath', 'em'
    ];

    let name = randFromArray(starts);
    const midCount = rand(0, 1);
    for (let i = 0; i < midCount; i++) {
        name += randFromArray(mids);
    }
    name += randFromArray(ends);
    return name;
}

/**
 * Attempts to generate a name using the base creature's naming conventions.
 * Returns null if the creature type doesn't have a recognizable name generator path.
 */
function generateCreatureDerivedName(node: WorldNode, baseCreature: string): string | null {
    // Dragon-based deities use draconic names
    if (baseCreature === 'dragon') {
        return dragonNameGenerator(node);
    }
    // Angel/demon/devil-based deities use extraplanar names
    if (['angel', 'balor', 'marilith', 'pitFiend', 'iceDevil', 'hornedDevil', 'erinyes',
         'boneDevil', 'glabrezu', 'nalfeshnee', 'hezrou', 'vrock'].includes(baseCreature)) {
        return extraplanarNameGenerator(node);
    }
    // Elemental-based deities get a planar-style name
    if (['fireElemental', 'waterElemental', 'airElemental', 'earthElemental'].includes(baseCreature)) {
        return generateDivineName();
    }
    // Fallback: use the divine name generator
    return null;
}

/**
 * Generates a name for an avatar — a deity's manifestation outside their home plane.
 * If the avatar has a linked deity, the name references them (e.g. "Avatar of Kaeloth").
 * Otherwise falls back to the deity name generator for a standalone divine name.
 */
export function avatarNameGenerator(node: WorldNode): string {
    const deityName: string = node.attributes?.deityName ?? '';

    if (deityName) {
        // Most avatars are simply "Avatar of [Deity Name]"
        // Occasionally they get their own name with a reference
        if (Math.random() < 0.3) {
            const ownName = generateDivineName();
            return ownName + ', Avatar of ' + deityName;
        }
        return 'Avatar of ' + deityName;
    }

    // No linked deity — generate a standalone divine name with a title
    return deityNameGenerator(node);
}
