import { randFromArray } from './helpers';
import { deityDomains } from './attributeGenerators';

/**
 * Options for generating a title. All fields are optional — the more context
 * provided, the richer the title pool becomes.
 */
export interface TitleOptions {
    /** Alignment string (e.g. 'Lawful Good', 'Chaotic Evil'). */
    alignment?: string;
    /** Elemental affinity (e.g. 'Fire', 'Water', 'Negative Energy'). */
    element?: string;
    /** Challenge rating — controls which power tier of titles are available. */
    cr?: number;
    /** Creature type string (e.g. 'dragon', 'celestial', 'fiend', 'fey', 'beast'). */
    creatureType?: string;
    /** Domain display name (e.g. 'War', 'Nature'). Pulls titles from deityDomains. */
    domain?: string;
    /** Deity/avatar/creature tier — unlocks tier-specific titles. */
    tier?: 'greaterDeity' | 'lesserDeity' | 'demigod' | 'avatar' | 'creature';
    /** Dragon color key (e.g. 'red', 'gold', 'white'). Adds color-specific element titles. */
    dragonColor?: string;
}

/**
 * Builds a title pool from layered sources based on the provided options,
 * then returns a single randomly selected title.
 *
 * Pool layers:
 * 1. Generic — always available
 * 2. Power tier — CR-gated (humble → notable → epic → cosmic)
 * 3. Alignment axis — good/evil/lawful/chaotic + combined
 * 4. Element — fire/water/earth/air/positive/negative energy
 * 5. Creature type — dragon, fey, celestial, fiend, undead, etc.
 * 6. Domain — pulled from deityDomains data
 * 7. Deity tier — greater/lesser/demigod-specific titles
 *
 * @param options - Context for title selection
 * @returns A title string (without leading "the" — callers format as needed)
 */
export function generateTitle(options: TitleOptions = {}): string {
    const pool: string[] = [];
    const { alignment, element, cr, creatureType, domain, tier, dragonColor } = options;

    const isGood = alignment?.includes('Good') ?? false;
    const isEvil = alignment?.includes('Evil') ?? false;
    const isLawful = alignment?.includes('Lawful') ?? false;
    const isChaotic = alignment?.includes('Chaotic') ?? false;

    // ─── Layer 1: Generic titles (always available) ───
    pool.push(
        'the Ancient', 'the Undying', 'the Veiled', 'the Silent',
        'the Awakened', 'the Unbroken', 'the Shrouded', 'the Dreaming',
        'the Forgotten', 'the Nameless'
    );

    // ─── Layer 2: Power tier (CR-gated) ───
    if (cr !== undefined) {
        if (cr < 5) {
            pool.push(
                'the Humble', 'the Watchful', 'the Patient', 'the Quiet',
                'the Wandering', 'the Unseen', 'the Drifting', 'the Minor'
            );
        }
        if (cr >= 5) {
            pool.push(
                'the Mighty', 'the Feared', 'the Formidable', 'the Relentless',
                'the Resolute', 'the Stalwart', 'the Unyielding', 'the Bold'
            );
        }
        if (cr >= 12) {
            pool.push(
                'the Terrible', 'the Magnificent', 'the Dread', 'the Legendary',
                'the Indomitable', 'the Unconquered', 'the Eternal',
                'the Primordial', 'the Unfathomable'
            );
        }
        if (cr >= 20) {
            pool.push(
                'the Almighty', 'the Omniscient', 'the Infinite', 'the Absolute',
                'the Supreme', 'the All-Seeing', 'Shaper of Realms',
                'Creator of Worlds', 'the First and Last'
            );
        }
    }

    // ─── Layer 3: Alignment ───
    if (isGood) {
        pool.push(
            'the Radiant', 'the Merciful', 'the Benevolent', 'the Compassionate',
            'the Gracious', 'the Hopebringer', 'the Dawnbringer', 'the Lightbearer',
            'the Protector', 'the Noble', 'the Guardian', 'the Just',
            'Shield of the Faithful', 'the Peacemaker', 'the Nurturing'
        );
    }
    if (isEvil) {
        pool.push(
            'the Malevolent', 'the Blighted', 'the Withering', 'the Pestilent',
            'the Insidious', 'the Profane', 'the Nightbringer', 'the Forsaken',
            'the Devourer', 'the Ravenous', 'the Cruel', 'the Merciless',
            'the Pitiless', 'Bringer of Ruin', 'the Defiler'
        );
    }
    if (isLawful) {
        pool.push(
            'Keeper of Oaths', 'the Righteous', 'the Iron-Willed',
            'the Arbiter', 'the Ordered', 'Master of Laws', 'the Immutable'
        );
    }
    if (isChaotic) {
        pool.push(
            'the Untamed', 'the Mercurial', 'the Wild', 'Breaker of Chains',
            'the Unpredictable', 'the Tempestuous', 'the Unbound', 'the Ever-Changing'
        );
    }

    // Combined alignment titles
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

    // ─── Layer 4: Element ───
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

    // Dragon color-specific element titles
    if (dragonColor) {
        const dragonColorTitles: Record<string, string[]> = {
            red:    ['the Inferno', 'the Volcanic', 'the Ashen', 'the Emberlord', 'the Flamecrown', 'the Scorching'],
            gold:   ['the Inferno', 'the Sunfire', 'the Emberlord', 'the Flamecrown', 'the Resplendent', 'the Blazing'],
            black:  ['the Corrosive', 'the Venomous', 'the Caustic', 'the Mire Lord', 'the Festering', 'the Acidmaw'],
            copper: ['the Corrosive', 'the Caustic', 'the Acidmaw', 'the Trickster', 'the Riddler', 'the Cunning'],
            blue:   ['the Tempest', 'the Stormborn', 'the Thunderlord', 'the Lightning', 'the Stormbringer', 'the Voltaic'],
            bronze: ['the Tempest', 'the Stormborn', 'the Thunderlord', 'the Tidecaller', 'the Stormbringer', 'the Waveguard'],
            green:  ['the Toxic', 'the Venomous', 'the Miasma', 'the Blightbreath', 'the Noxious', 'the Whisperer'],
            white:  ['the Frozen', 'the Glacial', 'the Frostborn', 'the Rimeclaw', 'the Blizzard', 'the Wintermaw'],
            silver: ['the Frozen', 'the Glacial', 'the Frostborn', 'the Winterguard', 'the Icewind', 'the Shimmering'],
            brass:  ['the Scorching', 'the Sandstorm', 'the Dunestalker', 'the Sunbaked', 'the Windtalker', 'the Parched'],
        };
        const colorPool = dragonColorTitles[dragonColor];
        if (colorPool) pool.push(...colorPool);
    }

    // ─── Layer 5: Creature type ───
    switch (creatureType) {
        case 'dragon':
            pool.push(
                'the Wyrm', 'the Scaled Terror', 'the Winged Shadow',
                'the Hoardkeeper', 'Bane of Knights', 'the Dragonlord'
            );
            break;
        case 'celestial':
            pool.push(
                'the Hallowed', 'the Anointed', 'Herald of Dawn',
                'Sword of Justice', 'the Eternal Sentinel', 'Voice of the Divine'
            );
            break;
        case 'fiend':
            pool.push(
                'the Accursed', 'the Damned', 'the Infernal',
                'the Tormentor', 'the Corruptor', 'Lord of Perdition'
            );
            break;
        case 'undead':
            pool.push(
                'the Deathless', 'the Entombed', 'the Lichborn',
                'the Bone Sovereign', 'the Gravecaller', 'the Pale Rider'
            );
            break;
        case 'fey':
            pool.push(
                'of the Glade', 'of the Moonpool', 'Thornweaver', 'Dewdancer',
                'Mistwalker', 'of the Silver Brook', 'Songweaver', 'Dreamtender',
                'of the Old Wood', 'Starbloom', 'Willowsong',
                'of the Twilight Court', 'Leafwhisper'
            );
            break;
        case 'elemental':
            pool.push(
                'the Primordial', 'the Unbound', 'the Elemental Lord',
                'the Living Storm', 'the Primal Force'
            );
            break;
        case 'beast':
        case 'monstrosity':
            pool.push(
                'the Apex', 'the Primal', 'the Feral',
                'the Untamed', 'the Alpha', 'the Broodmother'
            );
            break;
        case 'giant':
            pool.push(
                'the Colossus', 'the Mountainborn', 'the Thunderstepper',
                'the Earthshaker', 'the Towering'
            );
            break;
        case 'plant':
            pool.push(
                'the Rootmother', 'the Evergreen', 'the Verdant',
                'the Overgrown', 'the Blossoming'
            );
            break;
        case 'humanoid':
            pool.push(
                'the Cunning', 'the Ruthless', 'the Warlord',
                'the Strategist', 'the Commander'
            );
            break;
    }

    // ─── Layer 6: Domain ───
    if (domain) {
        const domainEntry = Object.values(deityDomains).find(d => d.name === domain);
        if (domainEntry?.titles) {
            pool.push(...domainEntry.titles);
        }
    }

    // ─── Layer 7: Deity tier ───
    if (tier === 'greaterDeity') {
        pool.push(
            'the Almighty', 'the Omniscient', 'the Infinite', 'the Absolute',
            'Creator of Worlds', 'the First and Last', 'the Undying Flame',
            'the Supreme', 'the All-Seeing', 'Shaper of Realms'
        );
    } else if (tier === 'lesserDeity') {
        pool.push(
            'the Exalted', 'the Anointed', 'the Chosen', 'the Crowned',
            'the Sovereign', 'the Enthroned', 'the Hallowed'
        );
    } else if (tier === 'demigod') {
        pool.push(
            'the Risen', 'the Reborn', 'the Twice-Born', 'the Ascended',
            'the Blessed', 'the Touched', 'the Awakened One'
        );
    } else if (tier === 'avatar') {
        pool.push(
            'the Manifest', 'the Incarnate', 'the Emissary',
            'the Herald', 'the Vessel', 'the Chosen Form'
        );
    }

    return randFromArray(pool);
}
