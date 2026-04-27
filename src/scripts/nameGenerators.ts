import type { WorldNode } from './types';
import { rand, randFromArray, weightedRand } from './helpers';
import { deityDomains } from './attributeGenerators';

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
        const alignment: string = node.attributes?.alignment ?? '';
        const isEvil = alignment.includes('Evil');

        // Alignment-based titles
        const evilTitles = [
            'the Devourer', 'the Destroyer', 'the Terrible', 'the Cruel', 'the Merciless',
            'the Ravenous', 'the Tyrant', 'the Scourge', 'the Dread', 'the Ruinous',
            'the Blighted', 'the Wrathful', 'the Undying', 'the Pitiless', 'the Forsaken',
            'Bane of Kings', 'the Desolator', 'the Nightbringer'
        ];
        const goodTitles = [
            'the Protector', 'the Wise', 'the Noble', 'the Guardian', 'the Benevolent',
            'the Radiant', 'the Just', 'the Merciful', 'the Eternal', 'the Vigilant',
            'the Shining', 'the Steadfast', 'the Peacekeeper', 'the Sage', 'the Gracious',
            'Shield of the Realm', 'the Dawnbringer', 'the Stormcaller'
        ];

        // Element-based titles keyed by dragon color
        const elementTitles: Record<string, string[]> = {
            dragonLairRed:    ['the Inferno', 'the Volcanic', 'the Ashen', 'the Emberlord', 'the Flamecrown', 'the Scorching'],
            dragonLairGold:   ['the Inferno', 'the Sunfire', 'the Emberlord', 'the Flamecrown', 'the Resplendent', 'the Blazing'],
            dragonLairBlack:  ['the Corrosive', 'the Venomous', 'the Caustic', 'the Mire Lord', 'the Festering', 'the Acidmaw'],
            dragonLairCopper: ['the Corrosive', 'the Caustic', 'the Acidmaw', 'the Trickster', 'the Riddler', 'the Cunning'],
            dragonLairBlue:   ['the Tempest', 'the Stormborn', 'the Thunderlord', 'the Lightning', 'the Stormbringer', 'the Voltaic'],
            dragonLairBronze: ['the Tempest', 'the Stormborn', 'the Thunderlord', 'the Tidecaller', 'the Stormbringer', 'the Waveguard'],
            dragonLairGreen:  ['the Toxic', 'the Venomous', 'the Miasma', 'the Blightbreath', 'the Noxious', 'the Whisperer'],
            dragonLairWhite:  ['the Frozen', 'the Glacial', 'the Frostborn', 'the Rimeclaw', 'the Blizzard', 'the Wintermaw'],
            dragonLairSilver: ['the Frozen', 'the Glacial', 'the Frostborn', 'the Winterguard', 'the Icewind', 'the Shimmering'],
            dragonLairBrass:  ['the Scorching', 'the Sandstorm', 'the Dunestalker', 'the Sunbaked', 'the Windtalker', 'the Parched'],
        };

        // Combine alignment and element pools, then pick one
        const alignmentPool = isEvil ? evilTitles : goodTitles;
        const elementPool = elementTitles[node.type] ?? [];
        const combinedPool = [...alignmentPool, ...elementPool];

        name += ', ' + randFromArray(combinedPool);
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

    // Title-only chance: higher for very high CR (ancient beings)
    const titleOnlyChance = cr >= 15 ? 0.15 : cr >= 10 ? 0.05 : 0;

    if (Math.random() < titleOnlyChance) {
        return 'The ' + randFromArray(getTitlePool(node, cr));
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
        name += ', the ' + randFromArray(getTitlePool(node, cr));
    }

    return name;
}

/** Returns the appropriate title pool based on creature alignment and CR. */
function getTitlePool(node: WorldNode, cr: number): string[] {
    const alignment: string = node.attributes?.alignment ?? '';
    const isGood = alignment.includes('Good');
    const isEvil = alignment.includes('Evil');
    const isLawful = alignment.includes('Lawful');
    const isChaotic = alignment.includes('Chaotic');

    // Celestial (good-aligned)
    if (isGood) {
        if (cr < 5) return ['Gentle', 'Humble', 'Quiet', 'Watchful', 'Patient', 'Faithful'];
        if (cr < 12) return ['Radiant', 'Merciful', 'Resolute', 'Shining', 'Valiant', 'Blessed', 'Hallowed', 'Anointed'];
        return ['Watchful Guardian', 'Shield of the Faithful', 'Light of Heaven', 'Voice of the Divine', 'Eternal Sentinel', 'Herald of Dawn', 'Sword of Justice'];
    }

    // Demonic (chaotic evil)
    if (isChaotic && isEvil) {
        if (cr < 5) return ['Wretched', 'Crawling', 'Pitiful', 'Sniveling', 'Craven', 'Lurking'];
        if (cr < 12) return ['Ravenous', 'Bloodthirsty', 'Savage', 'Vile', 'Corruptor', 'Defiler', 'Flayer', 'Tormentor'];
        return ['Devourer of Worlds', 'Bringer of Ruin', 'Lord of Carnage', 'Scourge of the Abyss', 'Undying Horror', 'Worldbreaker', 'Abyssal Tyrant'];
    }

    // Infernal (lawful evil) or other evil
    if (isEvil) {
        if (cr < 5) return ['Lowly', 'Obedient', 'Dutiful', 'Cringing', 'Servile', 'Minor'];
        if (cr < 12) return ['Cunning', 'Ruthless', 'Calculating', 'Merciless', 'Deceiver', 'Tempter', 'Schemer', 'Enforcer'];
        return ['Lord of the Ninth', 'Archfiend', 'Master of Chains', 'Prince of Lies', 'Duke of Perdition', 'Infernal Sovereign', 'Keeper of Contracts'];
    }

    // Neutral or other — generic titles
    if (cr < 5) return ['Wandering', 'Silent', 'Unseen', 'Drifting'];
    if (cr < 12) return ['Enigmatic', 'Inscrutable', 'Formidable', 'Relentless'];
    return ['Ancient One', 'Eternal', 'Unfathomable', 'Primordial'];
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
        const titles = [
            'of the Glade', 'of the Moonpool', 'Thornweaver', 'Dewdancer', 'Mistwalker',
            'of the Silver Brook', 'Songweaver', 'Dreamtender', 'of the Old Wood',
            'Starbloom', 'Willowsong', 'of the Twilight Court', 'Leafwhisper'
        ];
        name += ' ' + randFromArray(titles);
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
    const isGood = alignment.includes('Good');
    const isEvil = alignment.includes('Evil');
    const isLawful = alignment.includes('Lawful');
    const isChaotic = alignment.includes('Chaotic');

    // Determine deity tier from node type for title selection
    const isGreater = node.type === 'greaterDeity';
    const isLesser = node.type === 'lesserDeity';

    const domainName: string = node.attributes?.domain ?? '';
    const titlePool = buildDeityTitlePool(isGood, isEvil, isLawful, isChaotic, isGreater, isLesser, element, domainName);

    // Title-only chance: higher for greater deities
    const titleOnlyChance = isGreater ? 0.15 : isLesser ? 0.08 : 0.03;

    if (Math.random() < titleOnlyChance) {
        return 'The ' + randFromArray(titlePool);
    }

    // Ascended mortal chance: use the base creature's name generator
    // More common for demigods (mortals who achieved divinity)
    const ascendedChance = isGreater ? 0.1 : isLesser ? 0.2 : 0.3;
    const baseCreature: string = node.attributes?.creature ?? '';

    if (Math.random() < ascendedChance && baseCreature) {
        const creatureName = generateCreatureDerivedName(node, baseCreature);
        if (creatureName) {
            // Ascended mortals always get a divine title
            return creatureName + ', ' + randFromArray(titlePool);
        }
    }

    // Default: exotic divine name
    const name = generateDivineName();

    // Title chance: nearly guaranteed for greater deities
    const titleChance = isGreater ? 0.95 : isLesser ? 0.85 : 0.7;

    if (Math.random() < titleChance) {
        return name + ', ' + randFromArray(titlePool);
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
 * Builds a deity title pool by starting with universal titles and conditionally
 * adding more based on tier, alignment axis, element, and domain. The result is a single
 * combined array from which one title is randomly selected.
 */
function buildDeityTitlePool(
    isGood: boolean, isEvil: boolean, isLawful: boolean, isChaotic: boolean,
    isGreater: boolean, isLesser: boolean, element: string, domain: string
): string[] {
    // Universal titles — always available regardless of alignment or element
    const pool = [
        'the Ancient', 'the Undying', 'the Ascendant', 'the Dreaming',
        'the Veiled', 'the Silent', 'the Awakened', 'the Unbroken',
        'the Forgotten', 'the Nameless', 'the Shrouded'
    ];

    // --- Tier titles ---
    if (isGreater) {
        pool.push(
            'the Almighty', 'the Omniscient', 'the Infinite', 'the Absolute',
            'Creator of Worlds', 'the First and Last', 'the Undying Flame',
            'the Supreme', 'the All-Seeing', 'Shaper of Realms'
        );
    } else if (isLesser) {
        pool.push(
            'the Exalted', 'the Anointed', 'the Chosen', 'the Crowned',
            'the Sovereign', 'the Enthroned', 'the Hallowed'
        );
    } else {
        // Demigod
        pool.push(
            'the Risen', 'the Reborn', 'the Twice-Born', 'the Ascended',
            'the Blessed', 'the Touched', 'the Awakened One'
        );
    }

    // --- Good / Evil axis ---
    if (isGood) {
        pool.push(
            'the Radiant', 'the Merciful', 'the Benevolent', 'the Compassionate',
            'the Lifegiver', 'the Healer', 'the Hopebringer', 'the Gracious',
            'Shield of the Faithful', 'the Peacemaker', 'the Nurturing',
            'the Dawnbringer', 'the Lightbearer', 'the Serene'
        );
    }
    if (isEvil) {
        pool.push(
            'the Malevolent', 'the Blighted', 'the Withering', 'the Pestilent',
            'the Insidious', 'the Profane', 'the Nightbringer', 'the Forsaken',
            'Lord of Decay', 'the Corrosive', 'the Devourer', 'the Ravenous',
            'Bringer of Ruin', 'the Defiler'
        );
    }

    // --- Lawful / Chaotic axis ---
    if (isLawful) {
        pool.push(
            'the Just', 'Keeper of Oaths', 'the Righteous', 'the Iron-Willed',
            'the Arbiter', 'the Unyielding', 'the Ordered',
            'Master of Laws', 'the Immutable'
        );
    }
    if (isChaotic) {
        pool.push(
            'the Untamed', 'the Mercurial', 'the Wild', 'Breaker of Chains',
            'the Unpredictable', 'the Tempestuous', 'the Free',
            'the Unbound', 'the Ever-Changing'
        );
    }

    // --- Combined alignment titles (more specific) ---
    if (isGood && isLawful) {
        pool.push(
            'Lord of Light', 'the Redeemer', 'the Hallowed Sovereign',
            'the Paladin Eternal', 'the Shining Judge'
        );
    }
    if (isGood && isChaotic) {
        pool.push(
            'the Liberator', 'the Windborne', 'the Joyous',
            'the Wandering Light', 'the Free Spirit', 'the Stormblessed'
        );
    }
    if (isEvil && isLawful) {
        pool.push(
            'the Tyrant', 'Lord of Chains', 'the Iron Sovereign',
            'Master of Contracts', 'the Subjugator', 'the Dread Sovereign',
            'Keeper of Souls', 'the Dark Arbiter'
        );
    }
    if (isEvil && isChaotic) {
        pool.push(
            'the Destroyer', 'the Ruinous', 'Lord of Carnage',
            'the Worldbreaker', 'the Corruptor', 'the Insatiable',
            'the Abyssal Lord', 'the Mad God'
        );
    }

    // --- Element titles ---
    switch (element) {
        case 'Fire':
            pool.push(
                'the Blazing', 'the Emberlord', 'the Ashen', 'Lord of Cinders',
                'the Scorching', 'the Flamecrown', 'the Inferno',
                'the Molten', 'Keeper of the Eternal Flame', 'the Volcanic'
            );
            break;
        case 'Water':
            pool.push(
                'the Tidecaller', 'Lord of the Deep', 'the Drowned',
                'the Abyssal', 'the Wavecrown', 'the Unfathomed',
                'the Tempest', 'Keeper of the Depths', 'the Maelstrom', 'the Torrential'
            );
            break;
        case 'Air':
            pool.push(
                'the Stormborn', 'Lord of Winds', 'the Thunderlord',
                'the Cloudwalker', 'the Galeforce', 'the Skyborn',
                'the Zephyr', 'Keeper of Storms', 'the Breathless', 'the Howling'
            );
            break;
        case 'Earth':
            pool.push(
                'the Stonelord', 'the Unyielding Mountain', 'the Crystalborn',
                'Lord of the Deep Earth', 'the Ironbound', 'the Quaking',
                'the Petrified', 'Keeper of the Roots', 'the Monolith', 'the Earthshaker'
            );
            break;
        case 'Positive Energy':
            pool.push(
                'the Resplendent', 'Lord of Radiance', 'the Lifespring',
                'the Luminous', 'the Everbloom', 'the Sunforged',
                'Keeper of Souls', 'the Incandescent', 'the Vital', 'the Dawning'
            );
            break;
        case 'Negative Energy':
            pool.push(
                'the Deathless', 'Lord of the Void', 'the Entombed',
                'the Hollow', 'the Soulreaper', 'the Withered',
                'Keeper of the Dead', 'the Necrotic', 'the Hungering Void', 'the Pale'
            );
            break;
    }

    // --- Domain titles ---
    const domainEntry = Object.values(deityDomains).find(d => d.name === domain);
    if (domainEntry?.titles) {
        pool.push(...domainEntry.titles);
    }

    return pool;
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
