import type { ObjectTypeTemplate } from '../../types';
import { temperatureList } from '../constants';
import { npcSetup } from '../../attributeGenerators';
import {
    dragonNameGenerator,
    extraplanarNameGenerator,
    feyNameGenerator
} from '../../nameGenerators';
import { npcNameGenerator } from '../../npcNameGenerators';

export const creatureTypes: Record<string, ObjectTypeTemplate> = {
    /*** Points of Interest Begin ***/
    // Points of interest found within a locality
    reef: {
        typeName: 'Reef',
        tags: ['water'],
        children: [
            { type: 'sharkPack', min: 0, max: 1 },
            { type: 'octopusDen', min: 0, max: 2 }
        ]
    },
    lagoon: {
        typeName: 'Lagoon',
        tags: ['water'],
        children: [
            { type: 'crocodileSolitary', min: 0, max: 2 }
        ]
    },
    beach: {
        typeName: 'Beach',
        tags: ['water'],
        children: [
            { type: 'crocodileSolitary', min: 0, max: 1, conditions: [{ attribute: 'temperature', value: 'Cold', match: false }] }
        ],
        attributes: {
            temperature: temperatureList
        },
        inheritAttributes: ["temperature"]
    },
    /*** Points of Interest End ***/

    /*** Groups Begin ***/
    // Groups of creatures
    wolfPack: {
        typeName: "Wolf Pack",
        children: [
            { type: 'wolfAlpha', min: 1, max: 1 },
            { type: 'wolf', min: 2, max: 6 },
            { type: 'wolfPup', min: 0, max: 3 }
        ]
    },
    wolfDen: {
        typeName: "Wolf Den",
        children: [
            { type: 'wolfAlpha', min: 1, max: 1 },
            { type: 'wolf', min: 1, max: 4 },
            { type: 'wolfPup', min: 1, max: 4 }
        ]
    },
    bearDen: {
        typeName: "Bear Den",
        children: [
            { type: 'bearAdult', min: 1, max: 1 },
            { type: 'bearCub', min: 0, max: 3 }
        ]
    },
    boarSounder: {
        typeName: "Boar Sounder",
        children: [
            { type: 'boarAdult', min: 2, max: 5 },
            { type: 'boarPiglet', min: 0, max: 4 }
        ]
    },
    horseHerd: {
        typeName: "Horse Herd",
        children: [
            { type: 'horseStallion', min: 1, max: 1 },
            { type: 'horseMare', min: 2, max: 6 },
            { type: 'horseFoal', min: 0, max: 3 }
        ]
    },
    sharkPack: {
        typeName: "Shark Pack",
        children: [
            { type: 'sharkAdult', min: 2, max: 5 }
        ]
    },
    squidShoal: {
        typeName: "Squid Shoal",
        children: [
            { type: 'squidAdult', min: 2, max: 6 }
        ]
    },
    worgPack: {
        typeName: "Worg Pack",
        children: [
            { type: 'worgAdult', min: 2, max: 5 }
        ]
    },
    whalePod: {
        typeName: "Whale Pod",
        children: [
            { type: 'whaleAdult', min: 2, max: 6 }
        ]
    },
    spiderNest: {
        typeName: "Spider Nest",
        children: [
            { type: 'giantSpiderAdult', min: 2, max: 6 }
        ]
    },
    eagleNest: {
        typeName: "Eagle Nest",
        children: [
            { type: 'eagleAdult', min: 1, max: 2 },
            { type: 'eaglet', min: 0, max: 3 }
        ]
    },
    apeTroop: {
        typeName: "Ape Troop",
        children: [
            { type: 'apeAdult', min: 2, max: 6 },
            { type: 'apeJuvenile', min: 0, max: 3 }
        ]
    },
    dryadGrove: {
        typeName: "Dryad Grove",
        children: [
            { type: 'dryadSolitary', min: 1, max: 3 },
            { type: 'awakenedTree', min: 0, max: 2 },
            { type: 'awakenedShrub', min: 0, max: 4 }
        ]
    },
    awakenedTreeCopse: {
        typeName: "Awakened Copse",
        children: [
            { type: 'awakenedTree', min: 1, max: 4 },
            { type: 'awakenedShrub', min: 1, max: 6 }
        ]
    },
    crocodileDen: {
        typeName: "Crocodile Den",
        children: [
            { type: 'crocodileAdult', min: 1, max: 4 }
        ]
    },
    shadowHaunt: {
        typeName: "Shadow Haunt",
        children: [
            { type: 'shadowCreature', min: 2, max: 6 }
        ]
    },
    skeletonCrypt: {
        typeName: "Skeleton Crypt",
        children: [
            { type: 'skeletonSolitary', min: 3, max: 8 }
        ]
    },
    zombieHorde: {
        typeName: "Zombie Horde",
        children: [
            { type: 'zombieSolitary', min: 2, max: 6 }
        ]
    },
    ghoulPack: {
        typeName: "Ghoul Pack",
        children: [
            { type: 'ghoulSolitary', min: 2, max: 4 }
        ]
    },
    demonHorde: {
        typeName: "Demon Horde",
        children: [
            { type: 'dretchSolitary', min: 3, max: 8 },
            { type: 'quasitSolitary', min: 0, max: 2 },
            { type: 'vrockSolitary', min: 0, max: 1 }
        ]
    },
    demonWarband: {
        typeName: "Demon Warband",
        children: [
            { type: 'vrockSolitary', min: 1, max: 3 },
            { type: 'hezrouSolitary', min: 0, max: 2 },
            { type: 'glabrezuSolitary', min: 0, max: 1 },
            { type: 'nalfeshneeSolitary', min: 0, max: 1 }
        ]
    },
    devilPatrol: {
        typeName: "Devil Patrol",
        children: [
            { type: 'lemureSolitary', min: 2, max: 5 },
            { type: 'impSolitary', min: 0, max: 2 },
            { type: 'beardedDevilSolitary', min: 0, max: 1 }
        ]
    },
    devilLegion: {
        typeName: "Devil Legion",
        children: [
            { type: 'beardedDevilSolitary', min: 1, max: 3 },
            { type: 'barbedDevilSolitary', min: 0, max: 2 },
            { type: 'chainDevilSolitary', min: 0, max: 1 },
            { type: 'boneDevilSolitary', min: 0, max: 1 },
            { type: 'hornedDevilSolitary', min: 0, max: 1 }
        ]
    },
    goblinWarband: {
        typeName: "Goblin Warband",
        children: [
            { type: 'goblinChief', min: 0, max: 1 },
            { type: 'goblinVeteran', min: 0, max: 2 },
            { type: 'goblinSolitary', min: 2, max: 6 },
            { type: 'goblinRunt', min: 0, max: 4 },
            { type: 'worgAdult', min: 0, max: 2 }
        ]
    },
    frostGiantPatrol: {
        typeName: "Frost Giant Patrol",
        children: [
            { type: 'frostGiantSolitary', min: 1, max: 3 }
        ]
    },
    ogreGang: {
        typeName: "Ogre Gang",
        children: [
            { type: 'ogreSolitary', min: 1, max: 3 }
        ]
    },
    camelCaravan: {
        typeName: "Camel Caravan",
        children: [
            { type: 'camelSolitary', min: 3, max: 8 }
        ]
    },
    scorpionNest: {
        typeName: "Scorpion Nest",
        children: [
            { type: 'giantScorpionAdult', min: 1, max: 3 }
        ]
    },
    giantSpiderLair: {
        typeName: "Giant Spider Lair",
        children: [
            { type: 'giantSpiderAdult', min: 1, max: 4 }
        ]
    },
    // Reskinned creature groups
    lionPride: {
        typeName: "Lion Pride",
        children: [
            { type: 'lionMale', min: 1, max: 2 },
            { type: 'lionFemale', min: 2, max: 6 },
            { type: 'lionCub', min: 0, max: 4 }
        ]
    },
    tigerSolitary: {
        // Tigers are solitary — just a single creature node that spawns in forests
        typeName: "Tiger",
        creature: "saberToothedTiger",
        attributes: { challengeRating: { min: 1, max: 3 } }
    },
    pantherSolitary: {
        typeName: "Panther",
        creature: "saberToothedTiger",
        attributes: { challengeRating: [.25, .5, 1] }
    },
    hyenaPack: {
        typeName: "Hyena Pack",
        children: [
            { type: 'hyenaAdult', min: 3, max: 8 }
        ]
    },
    jackalPack: {
        typeName: "Jackal Pack",
        children: [
            { type: 'jackalAdult', min: 2, max: 6 }
        ]
    },
    zebraHerd: {
        typeName: "Zebra Herd",
        children: [
            { type: 'zebraStallion', min: 1, max: 1 },
            { type: 'zebraMare', min: 3, max: 8 },
            { type: 'zebraFoal', min: 0, max: 3 }
        ]
    },
    gorillaTroop: {
        typeName: "Gorilla Troop",
        children: [
            { type: 'gorillaSilverback', min: 1, max: 1 },
            { type: 'gorillaAdult', min: 2, max: 5 },
            { type: 'gorillaJuvenile', min: 0, max: 3 }
        ]
    },
    warthogSounder: {
        typeName: "Warthog Sounder",
        children: [
            { type: 'warthogAdult', min: 2, max: 5 },
            { type: 'warthogPiglet', min: 0, max: 4 }
        ]
    },
    monkeyTroop: {
        typeName: "Monkey Troop",
        children: [
            { type: 'monkeyAdult', min: 4, max: 12 }
        ]
    },
    baboonTroop: {
        typeName: "Baboon Troop",
        children: [
            { type: 'baboonAdult', min: 4, max: 10 }
        ]
    },
    vultureFlock: {
        typeName: "Vulture Flock",
        children: [
            { type: 'vultureAdult', min: 2, max: 6 }
        ]
    },
    badgerSett: {
        typeName: "Badger Sett",
        children: [
            { type: 'badgerAdult', min: 1, max: 3 }
        ]
    },
    batColony: {
        typeName: "Bat Colony",
        children: [
            { type: 'batSwarm', min: 3, max: 12 }
        ]
    },
    alligatorDen: {
        typeName: "Alligator Den",
        children: [
            { type: 'alligatorAdult', min: 1, max: 4 }
        ]
    },
    constrictorSnakeNest: {
        typeName: "Snake Nest",
        children: [
            { type: 'constrictorSnakeAdult', min: 1, max: 4 }
        ]
    },
    poisonousSnakeNest: {
        typeName: "Viper Nest",
        children: [
            { type: 'poisonousSnakeAdult', min: 1, max: 4 }
        ]
    },
    giantToadDen: {
        typeName: "Toad Den",
        children: [
            { type: 'giantToadAdult', min: 1, max: 3 }
        ]
    },
    giantWaspNest: {
        typeName: "Wasp Nest",
        children: [
            { type: 'giantWaspAdult', min: 2, max: 6 }
        ]
    },
    // Dinosaur groups
    triceratopsHerd: {
        typeName: "Triceratops Herd",
        children: [
            { type: 'triceratopsAdult', min: 2, max: 5 },
            { type: 'triceratopsJuvenile', min: 0, max: 3 }
        ]
    },
    pterosaurFlock: {
        typeName: "Pterosaur Flock",
        children: [
            { type: 'pterosaurAdult', min: 2, max: 6 }
        ]
    },
    elephantHerd: {
        typeName: "Elephant Herd",
        children: [
            { type: 'elephantMatriarch', min: 1, max: 1 },
            { type: 'elephantCow', min: 1, max: 4 },
            { type: 'elephantJuvenile', min: 1, max: 4 },
            { type: 'elephantCalf', min: 0, max: 2 }
        ]
    },
    elkHerd: {
        typeName: "Elk Herd",
        children: [
            { type: 'elkBull', min: 1, max: 2 },
            { type: 'elkCow', min: 2, max: 6 },
            { type: 'elkCalf', min: 0, max: 3 }
        ]
    },
    goatHerd: {
        typeName: "Mountain Goat Herd",
        children: [
            { type: 'goatAdult', min: 3, max: 8 }
        ]
    },
    mammothHerd: {
        typeName: "Mammoth Herd",
        children: [
            { type: 'mammothMatriarch', min: 1, max: 1 },
            { type: 'mammothCow', min: 1, max: 4 },
            { type: 'mammothJuvenile', min: 1, max: 4 },
            { type: 'mammothCalf', min: 0, max: 2 }
        ]
    },
    octopusDen: {
        typeName: "Octopus Den",
        children: [
            { type: 'octopusAdult', min: 1, max: 3 }
        ]
    },
    owlNest: {
        typeName: "Owl Nest",
        children: [
            { type: 'owlAdult', min: 1, max: 2 },
            { type: 'owlet', min: 0, max: 3 }
        ]
    },
    rhinoCrash: {
        typeName: "Rhinoceros Crash",
        children: [
            { type: 'rhinoAdult', min: 1, max: 4 }
        ]
    },
    ratWarren: {
        typeName: "Rat Warren",
        children: [
            { type: 'ratAdult', min: 3, max: 10 }
        ]
    },
    // ─── NPC Wilderness Groups ───
    merchantCaravan: {
        typeName: "Merchant Caravan",
        children: [
            { type: 'npcMerchant', min: 1, max: 2 },
            { type: 'npcCaravanGuard', min: 1, max: 3 },
            { type: 'npcScout', min: 0, max: 1 },
        ]
    },
    guardPatrol: {
        typeName: "Guard Patrol",
        children: [
            { type: 'npcGuard', min: 2, max: 4 },
            { type: 'npcVeteran', min: 0, max: 1 },
        ]
    },
    knightsErrant: {
        typeName: "Knights Errant",
        children: [
            { type: 'npcKnight', min: 1, max: 2 },
        ]
    },
    undeadHunters: {
        typeName: "Undead Hunters",
        children: [
            { type: 'npcKnight', min: 1, max: 2 },
            { type: 'npcPriest', min: 0, max: 1 },
        ]
    },
    monsterHunters: {
        typeName: "Monster Hunters",
        children: [
            { type: 'npcVeteran', min: 1, max: 2 },
            { type: 'npcScout', min: 0, max: 1 },
            { type: 'npcMage', min: 0, max: 1 },
        ]
    },
    scoutParty: {
        typeName: "Scout Party",
        children: [
            { type: 'npcScout', min: 1, max: 3 },
        ]
    },
    banditCamp: {
        typeName: "Bandit Camp",
        children: [
            { type: 'npcBanditCaptain', min: 1, max: 1 },
            { type: 'npcBandit', min: 2, max: 6 },
            { type: 'npcThug', min: 0, max: 2 },
        ]
    },
    banditPatrol: {
        typeName: "Bandit Patrol",
        children: [
            { type: 'npcBandit', min: 2, max: 4 },
        ]
    },
    /*** Groups End ***/

    /*** Creatures Begin ***/
    // Individual creatures

    // NPCs
    npcAcolyte: {
        typeName: "Acolyte",
        nameGenerator: npcNameGenerator,
        creature: "priest",
        variant: "healer",
        inheritAttributes: ["worship"],
        customSetup: npcSetup,
        attributes: { challengeRating: [.25, .5, 1], worship: '', alignment: '', lineage: '' }
    },
    npcPriest: {
        typeName: "Priest",
        nameGenerator: npcNameGenerator,
        creature: "priest",
        variant: "healer",
        inheritAttributes: ["worship"],
        customSetup: npcSetup,
        attributes: { challengeRating: { min: 2, max: 5 }, worship: '', alignment: '', lineage: '' }
    },
    npcGuard: {
        typeName: "Guard",
        nameGenerator: npcNameGenerator,
        creature: "guard",
        customSetup: npcSetup,
        attributes: { challengeRating: [.125, .25, .5, 1], alignment: '', lineage: '' }
    },
    npcVeteran: {
        typeName: "Veteran",
        nameGenerator: npcNameGenerator,
        creature: "veteran",
        customSetup: npcSetup,
        attributes: { challengeRating: { min: 2, max: 5 }, alignment: '', lineage: '' }
    },
    npcKnight: {
        typeName: "Knight",
        nameGenerator: npcNameGenerator,
        creature: "knight",
        customSetup: npcSetup,
        attributes: { challengeRating: { min: 3, max: 6 }, alignment: '', lineage: '' }
    },
    npcKnightGrandmaster: {
        typeName: "Grandmaster",
        nameGenerator: npcNameGenerator,
        creature: "knight",
        inheritAttributes: ["worship"],
        customSetup: npcSetup,
        attributes: { challengeRating: { min: 5, max: 8 }, worship: '', alignment: '', lineage: '' }
    },
    npcKnightMember: {
        typeName: "Knight",
        nameGenerator: npcNameGenerator,
        creature: "knight",
        inheritAttributes: ["worship"],
        customSetup: npcSetup,
        attributes: { challengeRating: { min: 3, max: 5 }, worship: '', alignment: '', lineage: '' }
    },
    npcSquire: {
        typeName: "Squire",
        nameGenerator: npcNameGenerator,
        creature: "guard",
        inheritAttributes: ["worship"],
        customSetup: npcSetup,
        attributes: { challengeRating: [.5, 1, 2], worship: '', alignment: '', lineage: '' }
    },
    npcNoble: {
        typeName: "Noble",
        nameGenerator: npcNameGenerator,
        creature: "noble",
        customSetup: npcSetup,
        attributes: { challengeRating: [.125, .25, .5, 1], alignment: '', lineage: '' }
    },
    npcCommoner: {
        typeName: "Commoner",
        nameGenerator: npcNameGenerator,
        creature: "commoner",
        customSetup: npcSetup,
        attributes: { challengeRating: [0], alignment: '', lineage: '' }
    },
    npcScout: {
        typeName: "Scout",
        nameGenerator: npcNameGenerator,
        creature: "scout",
        customSetup: npcSetup,
        attributes: { challengeRating: [.5, 1, 2], alignment: '', lineage: '' }
    },
    npcMage: {
        typeName: "Mage",
        nameGenerator: npcNameGenerator,
        creature: "mage",
        customSetup: npcSetup,
        attributes: { challengeRating: { min: 4, max: 8 }, alignment: '', lineage: '' }
    },
    npcBandit: {
        typeName: "Bandit",
        nameGenerator: npcNameGenerator,
        creature: "bandit",
        customSetup: npcSetup,
        attributes: { challengeRating: [.125, .25, .5], alignment: '', lineage: '' }
    },
    npcBanditCaptain: {
        typeName: "Bandit Captain",
        nameGenerator: npcNameGenerator,
        creature: "banditCaptain",
        customSetup: npcSetup,
        attributes: { challengeRating: { min: 2, max: 4 }, alignment: '', lineage: '' }
    },
    npcThug: {
        typeName: "Thug",
        nameGenerator: npcNameGenerator,
        creature: "thug",
        customSetup: npcSetup,
        attributes: { challengeRating: [.5, 1, 2], alignment: '', lineage: '' }
    },
    npcMerchant: {
        typeName: "Merchant",
        nameGenerator: npcNameGenerator,
        creature: "commoner",
        customSetup: npcSetup,
        attributes: { challengeRating: [0], alignment: '', lineage: '' }
    },
    npcCaravanGuard: {
        typeName: "Caravan Guard",
        nameGenerator: npcNameGenerator,
        creature: "guard",
        customSetup: npcSetup,
        attributes: { challengeRating: [.125, .25, .5, 1], alignment: '', lineage: '' }
    },

    // Wolves
    wolfAlpha: {
        typeName: "Alpha Wolf",
        creature: "wolf",
        variant: "wolf",
        attributes: { challengeRating: { min: 1, max: 3 } }
    },
    wolf: {
        typeName: "Wolf",
        creature: "wolf",
        variant: "wolf",
        attributes: { challengeRating: [.25, .5, 1] }
    },
    wolfPup: {
        typeName: "Wolf Pup",
        creature: "wolf",
        variant: "wolf",
        attributes: { challengeRating: [0] }
    },

    // Bears
    bearSolitary: {
        typeName: "Bear",
        creature: "bear",
        attributes: { challengeRating: [.5, 1, 2] }
    },
    bearAdult: {
        typeName: "Bear",
        creature: "bear",
        attributes: { challengeRating: [.5, 1, 2] }
    },
    bearCub: {
        typeName: "Bear Cub",
        creature: "bear",
        attributes: { challengeRating: [0] }
    },

    // Boars
    boarAdult: {
        typeName: "Boar",
        creature: "boar",
        attributes: { challengeRating: [.25, .5, 1, 2] }
    },
    boarPiglet: {
        typeName: "Piglet",
        creature: "boar",
        attributes: { challengeRating: [0] }
    },

    // Horses
    horseStallion: {
        typeName: "Stallion",
        creature: "horse",
        variant: "riding",
        attributes: { challengeRating: [.5, 1, 2] }
    },
    horseMare: {
        typeName: "Mare",
        creature: "horse",
        variant: "riding",
        attributes: { challengeRating: [.25, .5, 1] }
    },
    horseFoal: {
        typeName: "Foal",
        creature: "horse",
        variant: "riding",
        attributes: { challengeRating: [0] }
    },

    // Sharks
    sharkAdult: {
        typeName: "Shark",
        creature: "shark",
        variant: "frenzy",
        attributes: { challengeRating: [.5, 1, 2, 3, 4, 5] }
    },

    // Whales
    whaleAdult: {
        typeName: "Whale",
        creature: "killerWhale",
        attributes: { challengeRating: { min: 3, max: 6 } }
    },

    // Eagles
    eagleAdult: {
        typeName: "Eagle",
        creature: "eagle",
        attributes: { challengeRating: [.125, .25, .5, 1] }
    },
    eaglet: {
        typeName: "Eaglet",
        creature: "eagle",
        attributes: { challengeRating: [0] }
    },

    // Apes
    apeAdult: {
        typeName: "Ape",
        creature: "ape",
        attributes: { challengeRating: [.5, 1, 2, 3, 4, 5, 6, 7] }
    },
    apeJuvenile: {
        typeName: "Young Ape",
        creature: "ape",
        attributes: { challengeRating: [.25, .5] }
    },

    // Giant Spiders
    giantSpiderAdult: {
        typeName: "Giant Spider",
        creature: "giantSpider",
        attributes: { challengeRating: { min: 1, max: 3 } }
    },

    // Crocodiles
    crocodileAdult: {
        typeName: "Crocodile",
        creature: "crocodile",
        attributes: { challengeRating: [.5, 1, 2, 3, 4, 5] }
    },
    crocodileSolitary: {
        typeName: "Crocodile",
        creature: "crocodile",
        attributes: { challengeRating: [.5, 1, 2] }
    },

    // Fey
    dryadSolitary: {
        typeName: "Dryad",
        nameGenerator: feyNameGenerator,
        creature: "dryad",
        attributes: { challengeRating: { min: 1, max: 3 }, alignment: 'Neutral' }
    },
    naiadSolitary: {
        typeName: "Naiad",
        nameGenerator: feyNameGenerator,
        creature: "naiad",
        attributes: { challengeRating: { min: 2, max: 4 }, alignment: 'Neutral' }
    },

    // Plants
    awakenedTree: {
        typeName: "Awakened Tree",
        creature: "awakenedPlant",
        variant: "tree",
        attributes: { challengeRating: { min: 2, max: 4 } }
    },
    awakenedShrub: {
        typeName: "Awakened Shrub",
        creature: "awakenedPlant",
        variant: "shrub",
        attributes: { challengeRating: [0, .125, .25, .5, 1] }
    },

    // Undead
    shadowCreature: {
        typeName: "Shadow",
        creature: "shadow",
        attributes: { challengeRating: [.5, 1, 2, 3], alignment: 'Chaotic Evil' }
    },

    // Skeletons
    skeletonSolitary: {
        typeName: "Skeleton",
        creature: "skeleton",
        attributes: { challengeRating: [.25, .5, 1], alignment: 'Lawful Evil' }
    },

    // Zombies
    zombieSolitary: {
        typeName: "Zombie",
        creature: "zombie",
        attributes: { challengeRating: [.25, .5, 1], alignment: 'Neutral Evil' }
    },

    // Ghouls
    ghoulSolitary: {
        typeName: "Ghoul",
        creature: "ghoul",
        attributes: { challengeRating: { min: 1, max: 3 }, alignment: 'Chaotic Evil' }
    },

    // Specters
    specterSolitary: {
        typeName: "Specter",
        creature: "wraith",
        attributes: { challengeRating: { min: 1, max: 2 }, alignment: 'Neutral Evil' }
    },

    // Wights
    wightSolitary: {
        typeName: "Wight",
        creature: "wight",
        attributes: { challengeRating: { min: 3, max: 5 }, alignment: 'Neutral Evil' }
    },

    // Crypt Lord (legendary wight)
    cryptLord: {
        typeName: "Crypt Lord",
        creature: "wight",
        legendary: 3,
        attributes: { challengeRating: { min: 6, max: 10 }, alignment: 'Neutral Evil' }
    },

    // Wraiths
    wraithSolitary: {
        typeName: "Wraith",
        creature: "wraith",
        attributes: { challengeRating: { min: 5, max: 8 }, alignment: 'Neutral Evil' }
    },

    // Dread Wraith (legendary wraith)
    dreadWraith: {
        typeName: "Dread Wraith",
        creature: "wraith",
        legendary: 3,
        attributes: { challengeRating: { min: 8, max: 12 }, alignment: 'Neutral Evil' }
    },

    // Elementals
    fireElementalSolitary: {
        typeName: "Fire Elemental",
        creature: "fireElemental",
        attributes: { challengeRating: { min: 5, max: 8 } }
    },
    waterElementalSolitary: {
        typeName: "Water Elemental",
        creature: "waterElemental",
        attributes: { challengeRating: { min: 5, max: 8 } }
    },
    airElementalSolitary: {
        typeName: "Air Elemental",
        creature: "airElemental",
        attributes: { challengeRating: { min: 5, max: 8 } }
    },
    earthElementalSolitary: {
        typeName: "Earth Elemental",
        creature: "earthElemental",
        attributes: { challengeRating: { min: 5, max: 8 } }
    },

    // Giants
    frostGiantSolitary: {
        typeName: "Frost Giant",
        creature: "giant",
        attributes: { challengeRating: { min: 8, max: 12 } }
    },
    ogreSolitary: {
        typeName: "Ogre",
        creature: "ogre",
        attributes: { challengeRating: { min: 2, max: 5 } }
    },

    // Goblins
    goblinRunt: {
        typeName: "Goblin Runt",
        creature: "goblin",
        variant: "goblin",
        attributes: { challengeRating: [0, .125] }
    },
    goblinSolitary: {
        typeName: "Goblin",
        creature: "goblin",
        variant: "goblin",
        attributes: { challengeRating: [.25, .5, 1] }
    },
    goblinVeteran: {
        typeName: "Goblin Veteran",
        creature: "goblin",
        variant: "goblin",
        attributes: { challengeRating: { min: 2, max: 4 } }
    },
    goblinChief: {
        typeName: "Goblin Chief",
        creature: "goblin",
        variant: "goblin",
        attributes: { challengeRating: { min: 4, max: 6 } }
    },

    // Demons
    dretchSolitary: {
        typeName: "Dretch",
        nameGenerator: extraplanarNameGenerator,
        creature: "dretch",
        attributes: { challengeRating: [.25, .5, 1, 2], alignment: 'Chaotic Evil' }
    },
    quasitSolitary: {
        typeName: "Quasit",
        nameGenerator: extraplanarNameGenerator,
        creature: "quasit",
        attributes: { challengeRating: { min: 1, max: 3 }, alignment: 'Chaotic Evil' }
    },

    // Higher-CR Demons
    vrockSolitary: {
        typeName: "Vrock",
        nameGenerator: extraplanarNameGenerator,
        creature: "vrock",
        attributes: { challengeRating: { min: 6, max: 8 }, alignment: 'Chaotic Evil' }
    },
    hezrouSolitary: {
        typeName: "Hezrou",
        nameGenerator: extraplanarNameGenerator,
        creature: "hezrou",
        attributes: { challengeRating: { min: 8, max: 10 }, alignment: 'Chaotic Evil' }
    },
    glabrezuSolitary: {
        typeName: "Glabrezu",
        nameGenerator: extraplanarNameGenerator,
        creature: "glabrezu",
        attributes: { challengeRating: { min: 9, max: 12 }, alignment: 'Chaotic Evil' }
    },
    nalfeshneeSolitary: {
        typeName: "Nalfeshnee",
        nameGenerator: extraplanarNameGenerator,
        creature: "nalfeshnee",
        attributes: { challengeRating: { min: 13, max: 15 }, alignment: 'Chaotic Evil' }
    },
    marilithSolitary: {
        typeName: "Marilith",
        nameGenerator: extraplanarNameGenerator,
        creature: "marilith",
        legendary: 3,
        attributes: { challengeRating: { min: 14, max: 18 }, alignment: 'Chaotic Evil' }
    },
    balorSolitary: {
        typeName: "Balor",
        nameGenerator: extraplanarNameGenerator,
        creature: "balor",
        legendary: 3,
        attributes: { challengeRating: { min: 17, max: 22 }, alignment: 'Chaotic Evil' }
    },

    // Devils
    impSolitary: {
        typeName: "Imp",
        nameGenerator: extraplanarNameGenerator,
        creature: "imp",
        attributes: { challengeRating: { min: 1, max: 3 }, alignment: 'Lawful Evil' }
    },

    // Higher-CR Devils
    lemureSolitary: {
        typeName: "Lemure",
        nameGenerator: extraplanarNameGenerator,
        creature: "lemure",
        attributes: { challengeRating: [0, .125, .25, .5, 1], alignment: 'Lawful Evil' }
    },
    beardedDevilSolitary: {
        typeName: "Bearded Devil",
        nameGenerator: extraplanarNameGenerator,
        creature: "beardedDevil",
        attributes: { challengeRating: { min: 3, max: 5 }, alignment: 'Lawful Evil' }
    },
    barbedDevilSolitary: {
        typeName: "Barbed Devil",
        nameGenerator: extraplanarNameGenerator,
        creature: "barbedDevil",
        attributes: { challengeRating: { min: 5, max: 7 }, alignment: 'Lawful Evil' }
    },
    chainDevilSolitary: {
        typeName: "Chain Devil",
        nameGenerator: extraplanarNameGenerator,
        creature: "chainDevil",
        attributes: { challengeRating: { min: 8, max: 10 }, alignment: 'Lawful Evil' }
    },
    boneDevilSolitary: {
        typeName: "Bone Devil",
        nameGenerator: extraplanarNameGenerator,
        creature: "boneDevil",
        attributes: { challengeRating: { min: 9, max: 11 }, alignment: 'Lawful Evil' }
    },
    hornedDevilSolitary: {
        typeName: "Horned Devil",
        nameGenerator: extraplanarNameGenerator,
        creature: "hornedDevil",
        attributes: { challengeRating: { min: 11, max: 13 }, alignment: 'Lawful Evil' }
    },
    erinyesSolitary: {
        typeName: "Erinyes",
        nameGenerator: extraplanarNameGenerator,
        creature: "erinyes",
        attributes: { challengeRating: { min: 12, max: 14 }, alignment: 'Lawful Evil' }
    },
    iceDevilSolitary: {
        typeName: "Ice Devil",
        nameGenerator: extraplanarNameGenerator,
        creature: "iceDevil",
        attributes: { challengeRating: { min: 14, max: 16 }, alignment: 'Lawful Evil' }
    },
    pitFiendSolitary: {
        typeName: "Pit Fiend",
        nameGenerator: extraplanarNameGenerator,
        creature: "pitFiend",
        legendary: 3,
        attributes: { challengeRating: { min: 18, max: 22 }, alignment: 'Lawful Evil' }
    },

    // Angels
    angelSolitary: {
        typeName: "Angel",
        nameGenerator: extraplanarNameGenerator,
        creature: "angel",
        attributes: { challengeRating: { min: 10, max: 16 }, alignment: 'Lawful Good' }
    },
    solarAngel: {
        typeName: "Solar",
        nameGenerator: extraplanarNameGenerator,
        creature: "angel",
        legendary: 3,
        attributes: { challengeRating: { min: 18, max: 24 }, alignment: 'Lawful Good' }
    },

    // Camels
    camelSolitary: {
        typeName: "Camel",
        creature: "camel",
        attributes: { challengeRating: [.125, .25, .5] }
    },

    // Mastiffs
    mastiffAdult: {
        typeName: "Mastiff",
        creature: "mastiff",
        attributes: { challengeRating: [.125, .25, .5] }
    },

    // Big Cats (reskinned saber-toothed tiger)
    lionMale: {
        typeName: "Male Lion",
        creature: "saberToothedTiger",
        attributes: { challengeRating: { min: 2, max: 4 } }
    },
    lionFemale: {
        typeName: "Lioness",
        creature: "saberToothedTiger",
        attributes: { challengeRating: { min: 1, max: 2 } }
    },
    lionCub: {
        typeName: "Lion Cub",
        creature: "saberToothedTiger",
        attributes: { challengeRating: [.25, .5] }
    },

    // Hyenas (reskinned wolf — pack hunters with bite attacks)
    hyenaAdult: {
        typeName: "Hyena",
        creature: "wolf",
        variant: "wolf",
        attributes: { challengeRating: [.25, .5, 1] }
    },

    // Jackals (reskinned wolf at low CR)
    jackalAdult: {
        typeName: "Jackal",
        creature: "wolf",
        variant: "wolf",
        attributes: { challengeRating: [0, .125, .25] }
    },

    // Zebras (reskinned riding horse)
    zebraStallion: {
        typeName: "Zebra Stallion",
        creature: "horse",
        variant: "riding",
        attributes: { challengeRating: [.5, 1] }
    },
    zebraMare: {
        typeName: "Zebra Mare",
        creature: "horse",
        variant: "riding",
        attributes: { challengeRating: [.25, .5] }
    },
    zebraFoal: {
        typeName: "Zebra Foal",
        creature: "horse",
        variant: "riding",
        attributes: { challengeRating: [0] }
    },

    // Gorillas (reskinned ape at higher CR)
    gorillaSilverback: {
        typeName: "Silverback Gorilla",
        creature: "ape",
        attributes: { challengeRating: { min: 5, max: 7 } }
    },
    gorillaAdult: {
        typeName: "Gorilla",
        creature: "ape",
        attributes: { challengeRating: { min: 2, max: 4 } }
    },
    gorillaJuvenile: {
        typeName: "Young Gorilla",
        creature: "ape",
        attributes: { challengeRating: [.5, 1] }
    },

    // Warthogs (reskinned boar — warm climate)
    warthogAdult: {
        typeName: "Warthog",
        creature: "boar",
        attributes: { challengeRating: [.25, .5, 1, 2] }
    },
    warthogPiglet: {
        typeName: "Warthog Piglet",
        creature: "boar",
        attributes: { challengeRating: [0] }
    },

    // Monkeys (reskinned baboon — tropical forest)
    monkeyAdult: {
        typeName: "Monkey",
        creature: "baboon",
        attributes: { challengeRating: [0] }
    },

    // Baboons
    baboonAdult: {
        typeName: "Baboon",
        creature: "baboon",
        attributes: { challengeRating: [0, .125, .25] }
    },

    // Vultures
    vultureAdult: {
        typeName: "Vulture",
        creature: "vulture",
        attributes: { challengeRating: [0, .125, .25, .5, 1] }
    },

    // Hawks
    hawkAdult: {
        typeName: "Hawk",
        creature: "hawk",
        variant: "hawk",
        attributes: { challengeRating: [0, .125] }
    },

    // Badgers
    badgerAdult: {
        typeName: "Badger",
        creature: "badger",
        attributes: { challengeRating: [0, .125, .25] }
    },

    // Wolverines (reskinned badger at higher CR — cold forests)
    wolverineSolitary: {
        typeName: "Wolverine",
        creature: "badger",
        attributes: { challengeRating: [.25, .5, 1] }
    },

    // Weasels
    weaselAdult: {
        typeName: "Weasel",
        creature: "weasel",
        attributes: { challengeRating: [0, .125] }
    },

    // Worgs
    worgAdult: {
        typeName: "Worg",
        creature: "wolf",
        variant: "worg",
        attributes: { challengeRating: [.5, 1, 2] }
    },

    // Bats
    batSwarm: {
        typeName: "Bat",
        creature: "bat",
        attributes: { challengeRating: [0, .125, .25] }
    },

    // Alligators (reskinned crocodile — swamp)
    alligatorAdult: {
        typeName: "Alligator",
        creature: "crocodile",
        attributes: { challengeRating: [.5, 1, 2, 3] }
    },

    // Constrictor Snakes
    constrictorSnakeAdult: {
        typeName: "Constrictor Snake",
        creature: "constrictorSnake",
        attributes: { challengeRating: [.25, .5, 1, 2] }
    },

    // Dinosaurs (found in Forgotten biomes)
    trexSolitary: {
        typeName: "Tyrannosaurus Rex",
        creature: "trex",
        attributes: { challengeRating: { min: 6, max: 10 } }
    },
    triceratopsAdult: {
        typeName: "Triceratops",
        creature: "elephant",
        variant: "triceratops",
        attributes: { challengeRating: { min: 4, max: 7 } }
    },
    triceratopsJuvenile: {
        typeName: "Young Triceratops",
        creature: "elephant",
        variant: "triceratops",
        attributes: { challengeRating: { min: 1, max: 3 } }
    },
    pterosaurAdult: {
        typeName: "Pterosaur",
        creature: "quetzalcoatlus",
        attributes: { challengeRating: { min: 2, max: 5 } }
    },

    // Elk
    elkBull: {
        typeName: "Elk Bull",
        creature: "elk",
        attributes: { challengeRating: { min: 1, max: 2 } }
    },
    elkCow: {
        typeName: "Elk Cow",
        creature: "elk",
        attributes: { challengeRating: [.25, .5, 1] }
    },
    elkCalf: {
        typeName: "Elk Calf",
        creature: "elk",
        attributes: { challengeRating: [0] }
    },

    // Goats (mountain goats)
    goatAdult: {
        typeName: "Mountain Goat",
        creature: "goat",
        attributes: { challengeRating: [0, .125, .25, .5] }
    },

    // Owls
    owlAdult: {
        typeName: "Owl",
        creature: "owl",
        attributes: { challengeRating: [.125, .25] }
    },
    owlet: {
        typeName: "Owlet",
        creature: "owl",
        attributes: { challengeRating: [0] }
    },

    // Plesiosaurus (aquatic dinosaur — forgotten biomes)
    plesiosaurusAdult: {
        typeName: "Plesiosaurus",
        creature: "plesiosaurus",
        attributes: { challengeRating: { min: 2, max: 5 } }
    },

    // Poisonous Snakes
    poisonousSnakeAdult: {
        typeName: "Poisonous Snake",
        creature: "poisonousSnake",
        attributes: { challengeRating: [.125, .25] }
    },

    // Octopuses
    octopusAdult: {
        typeName: "Octopus",
        creature: "cephalopod",
        variant: "octopus",
        attributes: { challengeRating: [0, .125, .25, .5, 1] }
    },

    // Squids (reskinned octopus — faster, open-water variant)
    squidAdult: {
        typeName: "Squid",
        creature: "cephalopod",
        variant: "squid",
        attributes: { challengeRating: [0, .125, .25, .5, 1] }
    },

    // Kraken (legendary deep-water encounter)
    krakenLair: {
        typeName: "Kraken",
        creature: "kraken",
        legendary: 3,
        attributes: { challengeRating: { min: 20, max: 25 }, alignment: 'Chaotic Evil' }
    },

    // Legendary creatures — rare, high-CR mythological beasts
    dreadWolf: {
        typeName: "Dread Wolf",
        creature: "wolf",
        variant: "wolf",
        legendary: 3,
        attributes: { challengeRating: { min: 8, max: 12 } }
    },
    direBoar: {
        typeName: "Dire Boar",
        creature: "boar",
        legendary: 3,
        attributes: { challengeRating: { min: 6, max: 10 } }
    },
    thunderbird: {
        typeName: "Thunderbird",
        creature: "eagle",
        legendary: 3,
        attributes: { challengeRating: { min: 6, max: 10 } }
    },
    broodmother: {
        typeName: "Broodmother",
        creature: "giantSpider",
        legendary: 3,
        attributes: { challengeRating: { min: 6, max: 10 } }
    },
    megalodon: {
        typeName: "Megalodon",
        creature: "shark",
        variant: "frenzy",
        legendary: 3,
        attributes: { challengeRating: { min: 8, max: 12 } }
    },

    // Dragons — rare lair encounters, adults and ancients are legendary
    dragonLairRed: {
        typeName: "Red Dragon",
        nameGenerator: dragonNameGenerator,
        creature: "dragon",
        variant: "red",
        legendary: 3,
        attributes: { challengeRating: { min: 10, max: 24 }, alignment: 'Chaotic Evil' }
    },
    dragonLairBlack: {
        typeName: "Black Dragon",
        nameGenerator: dragonNameGenerator,
        creature: "dragon",
        variant: "black",
        legendary: 3,
        attributes: { challengeRating: { min: 7, max: 21 }, alignment: 'Chaotic Evil' }
    },
    dragonLairBlue: {
        typeName: "Blue Dragon",
        nameGenerator: dragonNameGenerator,
        creature: "dragon",
        variant: "blue",
        legendary: 3,
        attributes: { challengeRating: { min: 9, max: 23 }, alignment: 'Chaotic Evil' }
    },
    dragonLairGreen: {
        typeName: "Green Dragon",
        nameGenerator: dragonNameGenerator,
        creature: "dragon",
        variant: "green",
        legendary: 3,
        attributes: { challengeRating: { min: 8, max: 22 }, alignment: 'Chaotic Evil' }
    },
    dragonLairWhite: {
        typeName: "White Dragon",
        nameGenerator: dragonNameGenerator,
        creature: "dragon",
        variant: "white",
        legendary: 3,
        attributes: { challengeRating: { min: 6, max: 20 }, alignment: 'Chaotic Evil' }
    },
    dragonLairGold: {
        typeName: "Gold Dragon",
        nameGenerator: dragonNameGenerator,
        creature: "dragon",
        variant: "gold",
        legendary: 3,
        attributes: { challengeRating: { min: 10, max: 24 }, alignment: 'Lawful Good' }
    },
    dragonLairSilver: {
        typeName: "Silver Dragon",
        nameGenerator: dragonNameGenerator,
        creature: "dragon",
        variant: "silver",
        legendary: 3,
        attributes: { challengeRating: { min: 9, max: 23 }, alignment: 'Lawful Good' }
    },
    dragonLairBronze: {
        typeName: "Bronze Dragon",
        nameGenerator: dragonNameGenerator,
        creature: "dragon",
        variant: "bronze",
        legendary: 3,
        attributes: { challengeRating: { min: 8, max: 22 }, alignment: 'Lawful Good' }
    },
    dragonLairBrass: {
        typeName: "Brass Dragon",
        nameGenerator: dragonNameGenerator,
        creature: "dragon",
        variant: "brass",
        legendary: 3,
        attributes: { challengeRating: { min: 6, max: 20 }, alignment: 'Lawful Good' }
    },
    dragonLairCopper: {
        typeName: "Copper Dragon",
        nameGenerator: dragonNameGenerator,
        creature: "dragon",
        variant: "copper",
        legendary: 3,
        attributes: { challengeRating: { min: 7, max: 21 }, alignment: 'Lawful Good' }
    },

    // Rhinoceros
    rhinoAdult: {
        typeName: "Rhinoceros",
        creature: "rhinoceros",
        attributes: { challengeRating: { min: 2, max: 5 } }
    },

    // Rats
    ratAdult: {
        typeName: "Rat",
        creature: "rat",
        attributes: { challengeRating: [0, .125] }
    },

    // Giant Scorpions
    giantScorpionAdult: {
        typeName: "Giant Scorpion",
        creature: "giantScorpion",
        attributes: { challengeRating: { min: 3, max: 5 } }
    },

    // Giant Toads
    giantToadAdult: {
        typeName: "Giant Toad",
        creature: "giantToad",
        attributes: { challengeRating: { min: 1, max: 3 } }
    },

    // Giant Wasps
    giantWaspAdult: {
        typeName: "Giant Wasp",
        creature: "giantWasp",
        attributes: { challengeRating: [.5, 1, 2] }
    },

    // Elephants & Mammoths
    elephantBull: {
        typeName: "Elephant Bull",
        creature: "elephant",
        variant: "elephant",
        attributes: { challengeRating: { min: 6, max: 8 } }
    },
    elephantMatriarch: {
        typeName: "Elephant Matriarch",
        creature: "elephant",
        variant: "elephant",
        attributes: { challengeRating: { min: 5, max: 7 } }
    },
    elephantCow: {
        typeName: "Elephant Cow",
        creature: "elephant",
        variant: "elephant",
        attributes: { challengeRating: { min: 3, max: 5 } }
    },
    elephantJuvenile: {
        typeName: "Juvenile Elephant",
        creature: "elephant",
        variant: "elephant",
        attributes: { challengeRating: { min: 1, max: 3 } }
    },
    elephantCalf: {
        typeName: "Elephant Calf",
        creature: "elephant",
        variant: "elephant",
        attributes: { challengeRating: [.5] }
    },
    mammothBull: {
        typeName: "Mammoth Bull",
        creature: "elephant",
        variant: "elephant",
        attributes: { challengeRating: { min: 8, max: 10 } }
    },
    mammothMatriarch: {
        typeName: "Mammoth Matriarch",
        creature: "elephant",
        variant: "elephant",
        attributes: { challengeRating: { min: 7, max: 9 } }
    },
    mammothCow: {
        typeName: "Mammoth Cow",
        creature: "elephant",
        variant: "elephant",
        attributes: { challengeRating: { min: 6, max: 8 } }
    },
    mammothJuvenile: {
        typeName: "Juvenile Mammoth",
        creature: "elephant",
        variant: "elephant",
        attributes: { challengeRating: { min: 2, max: 6 } }
    },
    mammothCalf: {
        typeName: "Mammoth Calf",
        creature: "elephant",
        variant: "elephant",
        attributes: { challengeRating: { min: 1, max: 1 } }
    },
    /*** Creatures End ***/
};
