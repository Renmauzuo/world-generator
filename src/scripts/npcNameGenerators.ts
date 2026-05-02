import type { WorldNode } from './types';
import { rand, randFromArray } from './helpers';

interface NameParts {
    first: string;
    last?: string;
}

/**
 * Master NPC name generator. Reads race and gender from the node's attributes,
 * then delegates to the appropriate racial name generator.
 * Gender: 1 = male, 2 = female. If not set, randomizes.
 */
export function npcNameGenerator(node: WorldNode): string {
    const race: string = node.attributes?.race ?? 'human';
    const gender: string = node.attributes?.gender ?? '';

    // Non-binary NPCs draw from either name pool randomly
    const isFemale = gender === 'Female' || (gender === 'Non-binary' && rand(1, 2) === 2);
    const generator = racialGenerators[race] ?? racialGenerators.human;
    const parts = generator(isFemale);

    return parts.last ? parts.first + ' ' + parts.last : parts.first;
}

/** Registry of racial name generators keyed by race string. */
const racialGenerators: Record<string, (isFemale: boolean) => NameParts> = {
    human: generateHumanName,
    dwarf: generateDwarfName,
    elf: generateElfName,
    halfling: generateHalflingName,
    gnome: generateGnomeName,
    'half-elf': generateHalfElfName,
    'half-orc': generateHalfOrcName,
    dragonborn: generateDragonbornName,
    tiefling: generateTieflingName,
};

// ---------------------------------------------------------------------------
// Human names — generic fantasy, loosely European-inspired
// ---------------------------------------------------------------------------

const humanMaleFirsts = [
    'Aldric', 'Bran', 'Cedric', 'Dorian', 'Edmund', 'Gareth', 'Hadrian', 'Ivan',
    'Jasper', 'Kael', 'Leander', 'Marcus', 'Nolan', 'Osric', 'Percival', 'Roland',
    'Stefan', 'Theron', 'Ulric', 'Victor', 'Willem', 'Alaric', 'Corwin', 'Darius',
    'Emeric', 'Florian', 'Godric', 'Henrik', 'Isidore', 'Kellan',
];

const humanFemaleFirsts = [
    'Adeline', 'Brenna', 'Celeste', 'Diana', 'Elena', 'Freya', 'Gwendolyn', 'Helena',
    'Isolde', 'Juliana', 'Katarina', 'Lydia', 'Mirabel', 'Natalia', 'Ophelia', 'Petra',
    'Rosalind', 'Seraphina', 'Thalia', 'Ursula', 'Vivienne', 'Astrid', 'Cordelia',
    'Elara', 'Fiora', 'Giselle', 'Ingrid', 'Jessamine', 'Lenora',
];

const humanLastNames = [
    'Ashford', 'Blackwood', 'Crestfall', 'Dunmore', 'Everhart', 'Fairwind', 'Greystone',
    'Hawthorne', 'Ironwood', 'Kingsley', 'Lockwood', 'Mercer', 'Northgate', 'Oakenshield',
    'Pemberton', 'Ravencroft', 'Stormwind', 'Thornwall', 'Underhill', 'Whitmore',
    'Alderton', 'Brightwater', 'Coldwell', 'Duskwalker', 'Flamekeeper',
];

function generateHumanName(isFemale: boolean): NameParts {
    const first = randFromArray(isFemale ? humanFemaleFirsts : humanMaleFirsts);
    const last = randFromArray(humanLastNames);
    return { first, last };
}

// ---------------------------------------------------------------------------
// Dwarf names — Norse/Germanic-inspired, clan names
// ---------------------------------------------------------------------------

const dwarfMaleFirsts = [
    'Balin', 'Dain', 'Durin', 'Farin', 'Gimli', 'Gundren', 'Harbek', 'Kildrak',
    'Morgran', 'Orsik', 'Rurik', 'Thorin', 'Tordek', 'Travok', 'Vondal', 'Adrik',
    'Bruenor', 'Darrak', 'Eberk', 'Flint', 'Gardain', 'Helm', 'Nundro', 'Rangrim',
];

const dwarfFemaleFirsts = [
    'Amber', 'Bardryn', 'Dagnal', 'Diesa', 'Eldeth', 'Gunnloda', 'Helja', 'Kathra',
    'Kristryd', 'Liftrasa', 'Mardred', 'Riswynn', 'Sannl', 'Torbera', 'Vistra',
    'Ilde', 'Audhild', 'Artin', 'Hlin', 'Torgga',
];

const dwarfClanNames = [
    'Battlehammer', 'Brawnanvil', 'Dankil', 'Fireforge', 'Frostbeard', 'Gorunn',
    'Holderhek', 'Ironfist', 'Loderr', 'Lutgehr', 'Rumnaheim', 'Strakeln',
    'Torunn', 'Ungart', 'Balderk', 'Stoneshield', 'Deepdelver', 'Hammergrim',
];

function generateDwarfName(isFemale: boolean): NameParts {
    const first = randFromArray(isFemale ? dwarfFemaleFirsts : dwarfMaleFirsts);
    const last = randFromArray(dwarfClanNames);
    return { first, last };
}

// ---------------------------------------------------------------------------
// Elf names — melodic, flowing syllables
// ---------------------------------------------------------------------------

const elfMaleFirsts = [
    'Adran', 'Aelar', 'Aramil', 'Berrian', 'Carric', 'Enialis', 'Erdan', 'Galinndan',
    'Hadarai', 'Heian', 'Immeral', 'Ivellios', 'Laucian', 'Mindartis', 'Paelias',
    'Quarion', 'Riardon', 'Soveliss', 'Thamior', 'Varis', 'Arannis', 'Caelynn',
];

const elfFemaleFirsts = [
    'Adrie', 'Althaea', 'Anastrianna', 'Andraste', 'Antinua', 'Bethrynna', 'Birel',
    'Caelynn', 'Drusilia', 'Enna', 'Felosial', 'Ielenia', 'Jelenneth', 'Keyleth',
    'Leshanna', 'Lia', 'Meriele', 'Mialee', 'Naivara', 'Quelenna', 'Sariel',
    'Shanairra', 'Shava', 'Silaqui', 'Theirastra', 'Valanthe', 'Xanaphia',
];

const elfFamilyNames = [
    'Amakiir', 'Amastacia', 'Galanodel', 'Holimion', 'Ilphelkiir', 'Liadon',
    'Meliamne', 'Nailo', 'Siannodel', 'Xiloscient', 'Alenuath', 'Brightmoon',
    'Eveningfall', 'Starweaver', 'Moonwhisper', 'Silverfrond', 'Nightbreeze',
];

function generateElfName(isFemale: boolean): NameParts {
    const first = randFromArray(isFemale ? elfFemaleFirsts : elfMaleFirsts);
    const last = randFromArray(elfFamilyNames);
    return { first, last };
}

// ---------------------------------------------------------------------------
// Halfling names — warm, homey, English countryside feel
// ---------------------------------------------------------------------------

const halflingMaleFirsts = [
    'Alton', 'Ander', 'Cade', 'Corrin', 'Eldon', 'Errich', 'Finnan', 'Garret',
    'Lindal', 'Lyle', 'Merric', 'Milo', 'Osborn', 'Perrin', 'Reed', 'Roscoe',
    'Wellby', 'Wendel', 'Beau', 'Pip',
];

const halflingFemaleFirsts = [
    'Andry', 'Bree', 'Callie', 'Cora', 'Euphemia', 'Jillian', 'Kithri', 'Lavinia',
    'Lidda', 'Merla', 'Nedda', 'Paela', 'Portia', 'Seraphina', 'Shaena', 'Trym',
    'Vani', 'Verna', 'Wella', 'Rosie',
];

const halflingFamilyNames = [
    'Brushgather', 'Goodbarrel', 'Greenbottle', 'Highhill', 'Hilltopple', 'Leagallow',
    'Tealeaf', 'Thorngage', 'Tosscobble', 'Underbough', 'Appleblossom', 'Copperkettle',
    'Heathertoe', 'Bramblewood', 'Sweetwater', 'Honeydew', 'Thistledown',
];

function generateHalflingName(isFemale: boolean): NameParts {
    const first = randFromArray(isFemale ? halflingFemaleFirsts : halflingMaleFirsts);
    const last = randFromArray(halflingFamilyNames);
    return { first, last };
}

// ---------------------------------------------------------------------------
// Gnome names — whimsical, inventive, often long
// ---------------------------------------------------------------------------

const gnomeMaleFirsts = [
    'Alston', 'Alvyn', 'Boddynock', 'Brocc', 'Burgell', 'Dimble', 'Eldon', 'Erky',
    'Fonkin', 'Frug', 'Gerbo', 'Gimble', 'Glim', 'Jebeddo', 'Kellen', 'Namfoodle',
    'Orryn', 'Roondar', 'Seebo', 'Sindri', 'Warryn', 'Wrenn', 'Zook',
];

const gnomeFemaleFirsts = [
    'Bimpnottin', 'Breena', 'Caramip', 'Carlin', 'Donella', 'Duvamil', 'Ella',
    'Ellyjobell', 'Ellywick', 'Lilli', 'Loopmottin', 'Lorilla', 'Mardnab', 'Nissa',
    'Nyx', 'Oda', 'Orla', 'Roywyn', 'Shamil', 'Tana', 'Waywocket', 'Zanna',
];

const gnomeClanNames = [
    'Beren', 'Daergel', 'Folkor', 'Garrick', 'Nackle', 'Murnig', 'Ningel',
    'Raulnor', 'Scheppen', 'Timbers', 'Turen', 'Fizzlebang', 'Sparklegear',
    'Cogsworth', 'Tinkertop', 'Wobblecog', 'Brassbolts',
];

function generateGnomeName(isFemale: boolean): NameParts {
    const first = randFromArray(isFemale ? gnomeFemaleFirsts : gnomeMaleFirsts);
    const last = randFromArray(gnomeClanNames);
    return { first, last };
}

// ---------------------------------------------------------------------------
// Half-Elf names — draws from both human and elven pools
// ---------------------------------------------------------------------------

function generateHalfElfName(isFemale: boolean): NameParts {
    // 50/50 chance of human-style or elf-style first name
    const useElven = rand(1, 2) === 1;
    const first = useElven
        ? randFromArray(isFemale ? elfFemaleFirsts : elfMaleFirsts)
        : randFromArray(isFemale ? humanFemaleFirsts : humanMaleFirsts);
    // Family name from either pool
    const last = rand(1, 2) === 1 ? randFromArray(elfFamilyNames) : randFromArray(humanLastNames);
    return { first, last };
}

// ---------------------------------------------------------------------------
// Half-Orc names — harsh, guttural; optional clan name
// ---------------------------------------------------------------------------

const halfOrcMaleFirsts = [
    'Dench', 'Feng', 'Gell', 'Henk', 'Holg', 'Imsh', 'Keth', 'Krusk', 'Mhurren',
    'Ront', 'Shump', 'Thokk', 'Grak', 'Drog', 'Brug', 'Morg', 'Tusk', 'Varg',
    'Zug', 'Grumbar', 'Urzul', 'Brakk',
];

const halfOrcFemaleFirsts = [
    'Baggi', 'Emen', 'Engong', 'Kansif', 'Myev', 'Neega', 'Ovak', 'Ownka',
    'Shautha', 'Sutha', 'Vola', 'Volen', 'Yevelda', 'Grisha', 'Bruta', 'Durga',
    'Ekk', 'Murga', 'Zugga',
];

const halfOrcClanNames = [
    'Bloodfist', 'Bonecrusher', 'Doomhammer', 'Gorefang', 'Ironjaw', 'Skullsplitter',
    'Thundermaw', 'Warbringer', 'Ashclaw', 'Blacktusk', 'Grimtooth', 'Stonefist',
];

function generateHalfOrcName(isFemale: boolean): NameParts {
    const first = randFromArray(isFemale ? halfOrcFemaleFirsts : halfOrcMaleFirsts);
    // Half-orcs sometimes use a clan name, sometimes not
    const last = rand(1, 3) <= 2 ? randFromArray(halfOrcClanNames) : undefined;
    return { first, last };
}

// ---------------------------------------------------------------------------
// Dragonborn names — draconic syllables, clan names
// ---------------------------------------------------------------------------

const dragonbornMaleFirsts = [
    'Arjhan', 'Balasar', 'Bharash', 'Donaar', 'Ghesh', 'Heskan', 'Kriv', 'Medrash',
    'Mehen', 'Nadarr', 'Pandjed', 'Patrin', 'Rhogar', 'Shamash', 'Shedinn',
    'Tarhun', 'Torinn', 'Vrak', 'Daar', 'Kalir',
];

const dragonbornFemaleFirsts = [
    'Akra', 'Biri', 'Daar', 'Farideh', 'Harann', 'Havilar', 'Jheri', 'Kava',
    'Korinn', 'Mishann', 'Nala', 'Perra', 'Raiann', 'Sora', 'Surina', 'Thava',
    'Uadjit', 'Vezera',
];

const dragonbornClanNames = [
    'Clethtinthiallor', 'Daardendrian', 'Delmirev', 'Drachedandion', 'Fenkenkabradon',
    'Kepeshkmolik', 'Kerrhylon', 'Kimbatuul', 'Linxakasendalor', 'Myastan',
    'Nemmonis', 'Norixius', 'Ophinshtalajiir', 'Prexijandilin', 'Shestendeliath',
    'Turnuroth', 'Verthisathurgiesh', 'Yarjerit',
];

function generateDragonbornName(isFemale: boolean): NameParts {
    const first = randFromArray(isFemale ? dragonbornFemaleFirsts : dragonbornMaleFirsts);
    const last = randFromArray(dragonbornClanNames);
    return { first, last };
}

// ---------------------------------------------------------------------------
// Tiefling names — infernal-sounding or virtue names
// ---------------------------------------------------------------------------

const tieflingMaleFirsts = [
    'Akmenos', 'Amnon', 'Barakas', 'Damakos', 'Ekemon', 'Iados', 'Kairon',
    'Leucis', 'Melech', 'Mordai', 'Morthos', 'Pelaios', 'Skamos', 'Therai',
    'Zariel', 'Aethos', 'Crixus', 'Malvos',
];

const tieflingFemaleFirsts = [
    'Akta', 'Anakis', 'Bryseis', 'Criella', 'Damaia', 'Ea', 'Kallista', 'Lerissa',
    'Makaria', 'Nemeia', 'Orianna', 'Phelaia', 'Rieta', 'Velua', 'Zhera',
    'Nephysa', 'Sekhira', 'Lilura',
];

// Tieflings sometimes take virtue names instead of family names
const tieflingVirtueNames = [
    'Art', 'Carrion', 'Chant', 'Creed', 'Despair', 'Excellence', 'Fear', 'Glory',
    'Hope', 'Ideal', 'Music', 'Nowhere', 'Open', 'Poetry', 'Quest', 'Random',
    'Reverence', 'Sorrow', 'Torment', 'Weary',
];

const tieflingFamilyNames = [
    'Ashmantle', 'Cinderheart', 'Darkmore', 'Emberveil', 'Grimshaw', 'Hellstrand',
    'Infernalis', 'Nighthollow', 'Shadowmend', 'Thornblood',
];

function generateTieflingName(isFemale: boolean): NameParts {
    const first = randFromArray(isFemale ? tieflingFemaleFirsts : tieflingMaleFirsts);
    // Tieflings use either a virtue name or a family name
    const last = rand(1, 3) === 1
        ? randFromArray(tieflingVirtueNames)
        : randFromArray(tieflingFamilyNames);
    return { first, last };
}


// ---------------------------------------------------------------------------
// NPC description generator — random flavor blurbs
// ---------------------------------------------------------------------------

const physicalTemplates = [
    () => 'Has a ' + randFromArray(['scar', 'birthmark', 'tattoo', 'mole', 'wart']) + ' ' + randFromArray(['above', 'below', 'near', 'across']) + ' their ' + randFromArray(['left eye', 'right eye', 'nose', 'mouth', 'chin', 'cheek', 'forehead']),
    () => randFromArray(['Unusually tall', 'Unusually short', 'Heavyset', 'Thin and wiry', 'Broad-shouldered', 'Lean and athletic']),
    () => 'Has ' + randFromArray(['long', 'short', 'wild', 'braided', 'thinning', 'no']) + ' ' + randFromArray(['black', 'brown', 'red', 'blonde', 'grey', 'white', 'silver']) + ' hair',
    () => 'Missing ' + randFromArray(['a finger', 'an ear', 'a few teeth', 'the tip of their nose', 'an eye']),
    () => randFromArray(['Covered in freckles', 'Has a prominent limp', 'Walks with a cane', 'Has heterochromatic eyes', 'Has an unusually deep voice', 'Has a high-pitched voice']),
    () => 'Has ' + randFromArray(['piercing', 'kind', 'tired', 'wild', 'cold', 'warm']) + ' ' + randFromArray(['blue', 'green', 'brown', 'grey', 'hazel', 'amber', 'dark']) + ' eyes',
];

const mannerismTemplates = [
    () => randFromArray(['Speaks with a stutter', 'Speaks very slowly', 'Speaks very quickly', 'Whispers constantly', 'Has a booming laugh', 'Never makes eye contact', 'Stares intensely']),
    () => 'Always ' + randFromArray(['humming', 'whistling', 'fidgeting', 'tapping their fingers', 'looking over their shoulder', 'chewing on something', 'muttering prayers']),
    () => randFromArray(['Overly polite', 'Blunt to the point of rudeness', 'Nervously cheerful', 'Perpetually suspicious', 'Easily distracted', 'Unnervingly calm']),
    () => 'Has a habit of ' + randFromArray(['quoting scripture', 'telling bad jokes', 'giving unsolicited advice', 'collecting small stones', 'naming their belongings', 'talking to themselves']),
];

const possessionTemplates = [
    () => 'Always carrying a ' + randFromArray(['small', 'large', 'battered', 'ornate', 'well-worn', 'polished']) + ' ' + randFromArray(['dagger', 'lantern', 'book', 'holy symbol', 'pouch of herbs', 'walking stick', 'pocket watch', 'locket', 'flask', 'journal']),
    () => 'Wears a ' + randFromArray(['distinctive', 'tattered', 'colorful', 'plain', 'oversized', 'finely made']) + ' ' + randFromArray(['hat', 'cloak', 'scarf', 'ring', 'amulet', 'pair of gloves', 'pair of boots', 'belt']),
    () => 'Accompanied by a ' + randFromArray(['small dog', 'cat', 'raven', 'songbird', 'lizard', 'rat']) + ' that ' + randFromArray(['sits on their shoulder', 'follows at their heels', 'hides in their pack', 'seems unusually intelligent']),
];

const allTemplates = [...physicalTemplates, ...mannerismTemplates, ...possessionTemplates];

/**
 * Generates a short flavor description for an NPC.
 * Picks 1–2 random traits from physical, mannerism, and possession pools.
 */
export function generateNpcDescription(): string {
    // Always at least one trait, 40% chance of a second
    const first = randFromArray(allTemplates)();
    if (Math.random() < 0.4) {
        // Pick a second from a different pool to avoid repetition
        let second: string;
        do {
            second = randFromArray(allTemplates)();
        } while (second === first);
        return first + '. ' + second + '.';
    }
    return first + '.';
}
