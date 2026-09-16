import type { ObjectTypeTemplate, WorldNode } from './types';
import { rand, randFromArray, collectAncestorTags } from './helpers';
import { getRegisteredNodes } from './nodeRegistry';

/**
 * Adventure hook generator.
 *
 * Every NPC gets an `adventureHook` — a short piece of text pointing players toward
 * adventure. Hooks range from passive rumors ("heard something lurks in the woods")
 * to actionable requests ("wants someone to hunt down Grix the Cleaver").
 *
 * The generator mirrors the layered-pool approach used by `generateTitle`:
 * it inspects signals the NPC already carries (base creature, role/typeName, parent
 * building, alignment, worship, ancestor tags) to build a profile, then rolls
 * rumor-vs-actionable weighted by that profile and picks from the assembled pools.
 *
 * World-aware actionable hooks reference real nodes from the registry by NAME
 * (a snapshot baked into the string), so they survive the target being moved,
 * renamed, or deleted. If no candidate exists, they degrade to a vaguer phrasing
 * of the same theme.
 */

type HookTemplate = () => string;

// ---------------------------------------------------------------------------
// Generic rumor pool — always available, no world reference needed
// ---------------------------------------------------------------------------

const genericRumors: HookTemplate[] = [
    () => 'Claims to have heard ' + randFromArray(['strange noises', 'eerie lights', 'unexplained howling', 'ghostly music']) + ' coming from the wilds at night.',
    () => 'Swears that ' + randFromArray(['travelers', 'merchants', 'a whole caravan', 'a shepherd']) + ' went missing on the road and never came back.',
    () => 'Insists that something ' + randFromArray(['weird', 'unnatural', 'ancient', 'evil']) + ' has been stirring nearby of late.',
    () => 'Heard tell of a ' + randFromArray(['hidden ruin', 'forgotten shrine', 'sunken tomb', 'buried vault']) + ' somewhere out past the edge of the map.',
    () => 'Mentions rumors of ' + randFromArray(['buried treasure', 'a cursed relic', 'a lost heirloom', 'stolen gold']) + ' waiting for anyone brave enough to find it.',
    () => 'Whispers that the ' + randFromArray(['old', 'local', 'nearby']) + ' ' + randFromArray(['well', 'mill', 'bridge', 'crossroads']) + ' is haunted after dark.',
];

// ---------------------------------------------------------------------------
// Tag-flavored rumor pools — keyed by ancestor tags for local color
// ---------------------------------------------------------------------------

const tagRumors: Record<string, HookTemplate[]> = {
    forest: [
        () => 'Says the deep woods have grown ' + randFromArray(['darker', 'quieter', 'colder']) + ' lately, and hunters won\'t go in.',
        () => 'Talks of something large moving between the trees, snapping trunks like twigs.',
    ],
    water: [
        () => 'Claims fishing boats have been coming back empty — or not at all.',
        () => 'Heard something rose out of the water near the shore and dragged a man under.',
    ],
    mountain: [
        () => 'Says the high passes are blocked by more than snow this season.',
        () => 'Talks of a cave mouth up the slope that wasn\'t there last year.',
    ],
    desert: [
        () => 'Speaks of a caravan swallowed whole by a sandstorm that came from nowhere.',
        () => 'Claims ruins surface from the dunes when the wind blows just right.',
    ],
    swamp: [
        () => 'Warns that lights lure travelers off the safe paths into the mire.',
        () => 'Says the bog has been giving up bones — old ones, and fresh ones.',
    ],
    underground: [
        () => 'Mentions tunnels below that go deeper than anyone has dared to map.',
        () => 'Says the miners struck something that struck back.',
    ],
    undead: [
        () => 'Swears the dead don\'t stay buried around here anymore.',
        () => 'Talks of shapes seen walking the graveyard long after dusk.',
    ],
    cold: [
        () => 'Says the cold this year carries something worse than frostbite.',
    ],
    fire: [
        () => 'Speaks of the ground itself running hot and cracking open.',
    ],
};

// ---------------------------------------------------------------------------
// Self-contained actionable pool — a real ask, but no world reference needed
// ---------------------------------------------------------------------------

const selfContainedActionable: HookTemplate[] = [
    () => 'Will pay handsomely to recover a ' + randFromArray(['lost family amulet', 'stolen signet ring', 'missing heirloom sword', 'sentimental locket']) + ' taken by ' + randFromArray(['thieves', 'a rival', 'bandits']) + '.',
    () => 'Needs someone to escort ' + randFromArray(['a shipment', 'a relative', 'a wagon of goods', 'an important letter']) + ' safely to the next town.',
    () => 'Is looking for able hands to ' + randFromArray(['clear vermin from the cellar', 'guard the storehouse for a few nights', 'find a runaway apprentice', 'track down a debtor']) + '.',
    () => 'Offers coin to anyone who can find out what happened to a ' + randFromArray(['friend', 'business partner', 'sibling', 'hired hand']) + ' who never returned.',
];

// ---------------------------------------------------------------------------
// Combat actionable pool — for martial NPCs; no specific named target needed
// ---------------------------------------------------------------------------

const combatActionable: HookTemplate[] = [
    () => 'Is recruiting capable fighters to deal with ' + randFromArray(['raiders', 'a band of outlaws', 'a nest of beasts', 'monsters']) + ' harrying the outskirts.',
    () => 'Wants a bounty collected on ' + randFromArray(['a wanted criminal', 'a marauding creature', 'a pack of raiders']) + ' still at large.',
    () => 'Needs help defending ' + randFromArray(['the road', 'the border', 'a caravan route', 'an outlying farm']) + ' from repeated attacks.',
];

// ---------------------------------------------------------------------------
// Shady actionable pool — for criminal / evil-aligned NPCs
// ---------------------------------------------------------------------------

const shadyActionable: HookTemplate[] = [
    () => 'Quietly seeks someone willing to ' + randFromArray(['move goods without questions', 'lift something from a rival', 'lean on a debtor', 'make a problem disappear']) + ' — for the right price.',
    () => 'Hints at a job that pays well and asks no names, if you can keep your mouth shut.',
];

// ---------------------------------------------------------------------------
// Faith actionable pool — for NPCs with a worship attribute
// ---------------------------------------------------------------------------

const faithActionable: HookTemplate[] = [
    () => 'Seeks the faithful to recover a ' + randFromArray(['stolen relic', 'desecrated icon', 'lost scripture']) + ' and return it to the temple.',
    () => 'Speaks of a pilgrimage site fallen into ' + randFromArray(['ruin', 'darkness', 'the wrong hands']) + ' that must be reclaimed.',
];

// ---------------------------------------------------------------------------
// Profile building
// ---------------------------------------------------------------------------

/** Base creatures considered martial — these NPCs skew toward combat quests. */
const martialCreatures = new Set([
    'guard', 'veteran', 'knight', 'banditCaptain', 'thug', 'scout', 'bandit',
]);

/** Parent building/type keys that indicate a criminal context. */
const criminalParents = new Set(['thievesGuild', 'banditCamp', 'banditPatrol', 'pirateShip']);

/** Parent building/type keys that indicate a gossip-rich social context. */
const socialParents = new Set(['tavern', 'noblesCourt', 'shop', 'generalStore', 'market']);

interface HookProfile {
    /** 0–100 chance that this NPC offers an actionable hook rather than a passive rumor. */
    actionableChance: number;
    /** Actionable pools applicable to this NPC. */
    actionablePools: HookTemplate[][];
    /** Rumor pools applicable to this NPC (generic + tag-flavored). */
    rumorPools: HookTemplate[][];
    /** Ancestor tags, used for world-aware fallback phrasing. */
    tags: Set<string>;
}

function buildHookProfile(node: WorldNode, typeMap: Record<string, ObjectTypeTemplate>): HookProfile {
    const template = typeMap[node.type];
    const baseCreature: string = (template?.creature as string) ?? '';
    const parentType: string = node.parent?.type ?? '';
    const alignment: string = node.attributes?.alignment ?? '';
    const worship: string = node.attributes?.worship ?? '';

    const tags = collectAncestorTags(node, typeMap);

    let actionableChance = 15; // baseline — most NPCs are rumor-mongers
    const actionablePools: HookTemplate[][] = [selfContainedActionable];
    const rumorPools: HookTemplate[][] = [genericRumors];

    // Combat capability → more likely to hand out actionable (often combat) quests
    if (martialCreatures.has(baseCreature)) {
        actionableChance += 45;
        actionablePools.push(combatActionable);
    }

    // Leadership roles (captains, nobles, knights) are natural quest-givers
    if (baseCreature === 'banditCaptain' || baseCreature === 'noble' || baseCreature === 'knight') {
        actionableChance += 15;
    }

    // Social / gossip-rich context → small actionable bump plus odd-job flavor
    if (socialParents.has(parentType)) {
        actionableChance += 15;
    }

    // Criminal or evil context → shady jobs
    if (criminalParents.has(parentType) || alignment.includes('Evil')) {
        actionableChance += 10;
        actionablePools.push(shadyActionable);
    }

    // Worship → faith-flavored asks
    if (worship) {
        actionablePools.push(faithActionable);
    }

    // Tag-flavored rumors
    for (const tag of tags) {
        if (tagRumors[tag]) {
            rumorPools.push(tagRumors[tag]);
        }
    }

    // Clamp
    if (actionableChance > 85) actionableChance = 85;

    return { actionableChance, actionablePools, rumorPools, tags };
}

// ---------------------------------------------------------------------------
// World-aware actionable hooks — reference real registered nodes by name
// ---------------------------------------------------------------------------

/**
 * Attempts to build a world-aware actionable hook that references a real node
 * from the registry. Returns null if no suitable candidate exists (caller should
 * fall back to a self-contained hook or rumor).
 */
function tryWorldAwareHook(): string | null {
    const roll = rand(1, 3);

    if (roll === 1) {
        // Bandit captain bounty — reference a real, named bandit captain
        const captains = getRegisteredNodes('npcBanditCaptain').filter(n => n.name);
        if (captains.length > 0) {
            const target = randFromArray(captains);
            return 'Wants someone to hunt down ' + target.name + ', a bandit captain whose raids have grown bolder.';
        }
    } else if (roll === 2) {
        // Undead threat — reference a real crypt (named if it has one)
        const crypts = getRegisteredNodes('undeadCrypt');
        if (crypts.length > 0) {
            const target = randFromArray(crypts);
            const place = target.name ?? 'an ancient crypt nearby';
            return 'Begs for help against the restless dead spilling out of ' + place + '.';
        }
    } else {
        // Fiendish threat — reference a real demonic fortress (named if it has one)
        const fortresses = getRegisteredNodes('demonicFortress');
        if (fortresses.length > 0) {
            const target = randFromArray(fortresses);
            const place = target.name ?? 'a demonic fortress';
            return 'Speaks in terror of the fiends massing at ' + place + ', and pleads for champions to stop them.';
        }
    }

    return null;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Generates an adventure hook for an NPC node. Always returns a hook.
 * @param node - The NPC node (attributes already populated)
 * @param typeMap - The objectTypes map, for template/tag lookups
 */
export function generateAdventureHook(node: WorldNode, typeMap: Record<string, ObjectTypeTemplate>): string {
    const profile = buildHookProfile(node, typeMap);

    const wantsActionable = rand(1, 100) <= profile.actionableChance;

    if (wantsActionable) {
        // Prefer a world-aware hook when one is available (~50% of the time),
        // so actionable NPCs sometimes point at real threats and sometimes at
        // self-contained tasks.
        if (rand(1, 2) === 1) {
            const worldAware = tryWorldAwareHook();
            if (worldAware) return worldAware;
        }
        const pool = randFromArray(profile.actionablePools);
        return randFromArray(pool)();
    }

    const pool = randFromArray(profile.rumorPools);
    return randFromArray(pool)();
}
