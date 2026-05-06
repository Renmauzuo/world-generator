import type { ObjectTypeTemplate } from '../../types';
import { settlementSetup, settlementTypes, templeSetup, npcSetup } from '../../attributeGenerators';
import { getRegisteredNodes } from '../../nodeRegistry';
import {
    knighthoodOrderNameGenerator,
    tavernNameGenerator,
    shopNameGenerator
} from '../../nameGenerators';
import { npcNameGenerator } from '../../npcNameGenerators';

// Forward reference — will be populated by the main objectTypes module after merge
let objectTypesRef: Record<string, ObjectTypeTemplate> = {};
export function setObjectTypesRef(ref: Record<string, ObjectTypeTemplate>) {
    objectTypesRef = ref;
}

export const settlementObjTypes: Record<string, ObjectTypeTemplate> = {
    // ─── Unified Settlement Tiers ───
    // Settlement type (coastal, underground, standard) is set by settlementSetup based on parent biome tags.
    // Children use conditions on settlementType to spawn biome-appropriate features.
    metropolis: {
        typeName: "Metropolis",
        categories: ['settlement'],
        customSetup: (node) => settlementSetup(node, objectTypesRef),
        attributes: { settlementType: settlementTypes.standard },
        children: [
            { type: 'districtTemple', min: 1, max: 3 },
            { type: 'districtMercantile', min: 1, max: 3 },
            { type: 'districtResidential', min: 2, max: 4 },
            { type: 'districtWealthy', min: 1, max: 2 },
            { type: 'districtMilitary', min: 1, max: 2 },
            { type: 'districtUndercity', weightedRange: { 0: 30, 1: 70 } },
        ]
    },
    cityLarge: {
        typeName: "Large City",
        categories: ['settlement'],
        customSetup: (node) => settlementSetup(node, objectTypesRef),
        attributes: { settlementType: settlementTypes.standard },
        children: [
            { type: 'districtTemple', weightedRange: { 1: 75, 2: 25 } },
            { type: 'districtMercantile', min: 1, max: 2 },
            { type: 'districtResidential', min: 1, max: 3 },
            { type: 'districtWealthy', min: 1, max: 1 },
            { type: 'districtMilitary', min: 1, max: 1 },
            { type: 'districtUndercity', weightedRange: { 0: 50, 1: 50 } },
        ]
    },
    citySmall: {
        typeName: "Small City",
        categories: ['settlement'],
        customSetup: (node) => settlementSetup(node, objectTypesRef),
        attributes: { settlementType: settlementTypes.standard },
        children: [
            { type: 'districtTemple', min: 1, max: 1 },
            { type: 'districtMercantile', min: 1, max: 1 },
            { type: 'districtResidential', min: 1, max: 2 },
            { type: 'districtWealthy', weightedRange: { 0: 40, 1: 60 } },
            { type: 'districtMilitary', weightedRange: { 0: 30, 1: 70 } },
            { type: 'districtUndercity', weightedRange: { 0: 70, 1: 30 } },
        ]
    },
    townLarge: {
        typeName: "Large Town",
        categories: ['settlement'],
        customSetup: (node) => settlementSetup(node, objectTypesRef),
        attributes: { settlementType: settlementTypes.standard },
        children: [
            { type: 'temple', min: 1, max: 2 },
            { type: 'knighthoodOrder', min: 0, max: 1 },
            { type: 'shopBlacksmith', min: 1, max: 2 },
            { type: 'shopGeneralGoods', min: 1, max: 2 },
            { type: 'shopTavern', min: 1, max: 2 },
            { type: 'shopApothecary', min: 0, max: 1 },
            { type: 'shopStables', min: 0, max: 1 },
            { type: 'shopMagic', min: 0, max: 1 },
            { type: { houseSmall: 30, houseMedium: 45, houseLarge: 25 }, min: 4, max: 8 },
            { type: 'mansionSmall', weightedRange: { 0: 60, 1: 35, 2: 5 } },
            { type: 'farm', min: 1, max: 3 },
        ]
    },
    townSmall: {
        typeName: "Small Town",
        categories: ['settlement'],
        customSetup: (node) => settlementSetup(node, objectTypesRef),
        attributes: { settlementType: settlementTypes.standard },
        children: [
            { type: 'temple', min: 0, max: 1 },
            { type: 'shopBlacksmith', min: 0, max: 1 },
            { type: 'shopGeneralGoods', min: 1, max: 1 },
            { type: 'shopTavern', min: 1, max: 1 },
            { type: 'shopStables', min: 0, max: 1 },
            { type: { houseSmall: 40, houseMedium: 45, houseLarge: 15 }, min: 3, max: 6 },
            { type: 'mansionSmall', weightedRange: { 0: 85, 1: 15 } },
            { type: 'farm', min: 1, max: 2 },
        ]
    },
    village: {
        typeName: "Village",
        categories: ['settlement'],
        customSetup: (node) => settlementSetup(node, objectTypesRef),
        attributes: { settlementType: settlementTypes.standard },
        children: [
            { type: 'shopGeneralGoods', min: 0, max: 1 },
            { type: 'shopTavern', min: 0, max: 1 },
            { type: { houseSmall: 60, houseMedium: 35, houseLarge: 5 }, min: 2, max: 5 },
            { type: 'mansionSmall', weightedRange: { 0: 95, 1: 5 } },
            { type: 'farm', min: 1, max: 3 },
        ]
    },
    hamlet: {
        typeName: "Hamlet",
        categories: ['settlement'],
        customSetup: (node) => settlementSetup(node, objectTypesRef),
        attributes: { settlementType: settlementTypes.standard },
        children: [
            { type: { houseSmall: 80, houseMedium: 20 }, min: 1, max: 3 },
            { type: 'farm', min: 1, max: 2 },
        ]
    },
    thorp: {
        typeName: "Thorp",
        categories: ['settlement'],
        customSetup: (node) => settlementSetup(node, objectTypesRef),
        attributes: { settlementType: settlementTypes.standard },
        children: [
            { type: 'houseSmall', min: 1, max: 3 },
            { type: 'farm', weightedRange: { 0: 30, 1: 70 } },
        ]
    },
    districtTemple: {
        typeName: "Temple District",
        children: [
            { type: 'temple', min: 2, max: 3 },
            { type: 'knighthoodOrder', min: 0, max: 2 }
        ]
    },
    districtMercantile: {
        typeName: "Mercantile District",
        children: [
            { type: 'shopBlacksmith', min: 1, max: 3 },
            { type: 'shopGeneralGoods', min: 1, max: 3 },
            { type: 'shopTavern', min: 1, max: 3 },
            { type: 'shopApothecary', min: 0, max: 2 },
            { type: 'shopJeweler', min: 0, max: 2 },
            { type: 'shopTailor', min: 0, max: 2 },
            { type: 'shopStables', min: 0, max: 2 },
            { type: 'shopMagic', min: 0, max: 1 },
        ]
    },
    districtResidential: {
        typeName: "Residential District",
        children: [
            { type: { houseSmall: 40, houseMedium: 40, houseLarge: 20 }, min: 4, max: 10 },
        ]
    },
    districtWealthy: {
        typeName: "Wealthy District",
        children: [
            { type: { mansionSmall: 60, mansionLarge: 40 }, min: 2, max: 5 },
            { type: 'noblesCourt', weightedRange: { 0: 40, 1: 60 } },
        ]
    },
    districtMilitary: {
        typeName: "Military District",
        children: [
            { type: 'barracks', min: 1, max: 3 },
            { type: 'guardTower', min: 1, max: 2 },
        ]
    },
    districtUndercity: {
        typeName: "Undercity",
        children: [
            { type: 'thievesGuild', weightedRange: { 0: 30, 1: 70 } },
            { type: 'ratWarren', min: 1, max: 3 },
            { type: 'shadowHaunt', weightedRange: { 0: 70, 1: 30 } },
        ]
    },
    // ─── Housing Types ───
    houseSmall: {
        typeName: "Small House",
        children: [
            { type: 'npcResident', min: 2, max: 4 },
        ]
    },
    houseMedium: {
        typeName: "Medium House",
        children: [
            { type: 'housingUnit', min: 2, max: 2 },
        ]
    },
    houseLarge: {
        typeName: "Large House",
        children: [
            { type: 'housingUnit', min: 3, max: 4 },
        ]
    },
    housingUnit: {
        typeName: "Unit",
        children: [
            { type: 'npcResident', min: 1, max: 3 },
        ]
    },
    mansionSmall: {
        typeName: "Small Mansion",
        children: [
            { type: 'npcNobleResident', min: 1, max: 2 },
            { type: 'npcServant', min: 1, max: 2 },
        ]
    },
    mansionLarge: {
        typeName: "Large Mansion",
        children: [
            { type: 'npcNobleResident', min: 2, max: 4 },
            { type: 'npcButler', min: 1, max: 1 },
            { type: 'npcCook', min: 1, max: 1 },
            { type: { npcHousekeeper: 40, npcValet: 30, npcServant: 30 }, min: 1, max: 3 },
            { type: 'npcHouseGuard', min: 1, max: 2 },
        ]
    },
    // ─── Farms ───
    farm: {
        typeName: "Farm",
        children: [
            { type: 'npcFarmer', min: 1, max: 2 },
            { type: { farmCrops: 50, farmOrchard: 25, farmVegetableGarden: 25 }, min: 1, max: 2 },
            { type: { farmPigs: 30, farmCattle: 30, farmChickens: 25, farmHorses: 15 }, min: 1, max: 2 },
        ]
    },
    farmCrops: {
        typeName: "Wheat Field",
    },
    farmOrchard: {
        typeName: "Orchard",
    },
    farmVegetableGarden: {
        typeName: "Vegetable Garden",
    },
    farmPigs: {
        typeName: "Pig Pen",
        children: [
            { type: 'pig', min: 2, max: 6 },
        ]
    },
    farmCattle: {
        typeName: "Cattle Pasture",
        children: [
            { type: 'cow', min: 2, max: 6 },
        ]
    },
    farmChickens: {
        typeName: "Chicken Coop",
    },
    farmHorses: {
        typeName: "Horse Paddock",
        children: [
            { type: 'horseMare', min: 1, max: 3 },
            { type: 'horseFoal', min: 0, max: 2 },
        ]
    },
    // ─── Military & Civic Buildings ───
    barracks: {
        typeName: "Barracks",
        children: [
            { type: 'npcGuard', min: 3, max: 8 },
            { type: 'npcVeteran', min: 1, max: 2 },
            { type: 'npcWatchCaptain', min: 1, max: 1 },
        ]
    },
    guardTower: {
        typeName: "Guard Tower",
        children: [
            { type: 'npcGateGuard', min: 2, max: 4 },
        ]
    },
    noblesCourt: {
        typeName: "Noble's Court",
        children: [
            { type: 'npcNobleResident', min: 1, max: 2 },
            { type: 'npcCourtier', min: 2, max: 4 },
            { type: 'npcCourtMage', weightedRange: { 0: 40, 1: 60 } },
            { type: 'npcHerald', min: 1, max: 1 },
            { type: 'npcHouseGuard', min: 1, max: 3 },
        ]
    },
    // ─── Criminal Buildings ───
    thievesGuild: {
        typeName: "Thieves' Guild",
        children: [
            { type: 'npcGuildmaster', min: 1, max: 1 },
            { type: 'npcPickpocket', min: 2, max: 5 },
            { type: 'npcEnforcer', min: 1, max: 3 },
            { type: 'npcFence', min: 0, max: 1 },
        ]
    },
    temple: {
        typeName: "Temple",
        nameGenerator: (node) => 'Temple of ' + (node.attributes?.worship || 'the Divine'),
        attributes: { worship: '' },
        customSetup: (node) => templeSetup(node, getRegisteredNodes('greaterDeity', 'lesserDeity', 'demigod')),
        children: [
            { type: 'npcAcolyte', min: 1, max: 20 },
            { type: 'npcPriest', min: 0, max: 2 },
            { type: 'npcPilgrim', min: 0, max: 4 },
        ]
    },
    knighthoodOrder: {
        typeName: "Knighthood Order",
        nameGenerator: knighthoodOrderNameGenerator,
        attributes: { worship: '' },
        customSetup: (node) => templeSetup(node, getRegisteredNodes('greaterDeity', 'lesserDeity', 'demigod')),
        children: [
            { type: 'npcKnightGrandmaster', min: 1, max: 1 },
            { type: 'npcKnightMember', min: 1, max: 3 },
            { type: 'npcSquire', min: 2, max: 6 }
        ]
    },
    // ─── Shop Types ───
    shopBlacksmith: {
        typeName: "Blacksmith",
        nameGenerator: shopNameGenerator,
        children: [
            { type: 'npcBlacksmith', min: 1, max: 1 },
            { type: 'npcCustomerGuard', min: 0, max: 2 },
            { type: 'npcCustomer', min: 0, max: 2 },
        ]
    },
    shopGeneralGoods: {
        typeName: "General Store",
        nameGenerator: shopNameGenerator,
        children: [
            { type: 'npcShopkeeper', min: 1, max: 1 },
            { type: 'npcCustomer', min: 0, max: 3 },
        ]
    },
    shopMagic: {
        typeName: "Magic Shop",
        nameGenerator: shopNameGenerator,
        children: [
            { type: 'npcArcanist', min: 1, max: 1 },
            { type: 'npcCustomerNoble', min: 0, max: 1 },
            { type: 'npcCustomer', min: 0, max: 2 },
        ]
    },
    shopTavern: {
        typeName: "Tavern",
        nameGenerator: tavernNameGenerator,
        children: [
            { type: 'npcTavernkeeper', min: 1, max: 1 },
            { type: 'npcBarmaid', min: 0, max: 2 },
            { type: 'npcBard', weightedRange: { 0: 50, 1: 50 } },
            { type: 'npcCustomer', min: 0, max: 4 },
            { type: 'npcCustomerThug', min: 0, max: 2 },
            { type: 'npcCustomerScout', min: 0, max: 1 },
            { type: 'npcCustomerGuard', min: 0, max: 2 },
        ]
    },
    shopApothecary: {
        typeName: "Apothecary",
        nameGenerator: shopNameGenerator,
        children: [
            { type: 'npcShopkeeper', min: 1, max: 1 },
            { type: 'npcCustomer', min: 0, max: 2 },
        ]
    },
    shopJeweler: {
        typeName: "Jeweler",
        nameGenerator: shopNameGenerator,
        children: [
            { type: 'npcShopkeeper', min: 1, max: 1 },
            { type: 'npcCustomerNoble', min: 0, max: 2 },
            { type: 'npcCustomer', min: 0, max: 1 },
        ]
    },
    shopTailor: {
        typeName: "Tailor",
        nameGenerator: shopNameGenerator,
        children: [
            { type: 'npcShopkeeper', min: 1, max: 1 },
            { type: 'npcCustomerNoble', min: 0, max: 1 },
            { type: 'npcCustomer', min: 0, max: 2 },
        ]
    },
    shopStables: {
        typeName: "Stables",
        nameGenerator: shopNameGenerator,
        children: [
            { type: 'npcStablehand', min: 1, max: 1 },
            { type: 'npcCustomerScout', min: 0, max: 1 },
            { type: 'npcCustomerGuard', min: 0, max: 1 },
        ]
    },
    // ─── Role-specific NPC wrappers (thin types reusing base creature templates) ───
    npcShopkeeper: {
        typeName: "Shopkeeper",
        nameGenerator: npcNameGenerator,
        creature: "commoner",
        customSetup: npcSetup,
        attributes: { challengeRating: [0], alignment: '', lineage: '' }
    },
    npcBlacksmith: {
        typeName: "Blacksmith",
        nameGenerator: npcNameGenerator,
        creature: "commoner",
        customSetup: npcSetup,
        attributes: { challengeRating: [0], alignment: '', lineage: '' }
    },
    npcTavernkeeper: {
        typeName: "Tavernkeeper",
        nameGenerator: npcNameGenerator,
        creature: "commoner",
        customSetup: npcSetup,
        attributes: { challengeRating: [0], alignment: '', lineage: '' }
    },
    npcStablehand: {
        typeName: "Stablehand",
        nameGenerator: npcNameGenerator,
        creature: "commoner",
        customSetup: npcSetup,
        attributes: { challengeRating: [0], alignment: '', lineage: '' }
    },
    npcArcanist: {
        typeName: "Arcanist",
        nameGenerator: npcNameGenerator,
        creature: "mage",
        customSetup: npcSetup,
        attributes: { challengeRating: { min: 4, max: 8 }, alignment: '', lineage: '' }
    },
    npcCustomer: {
        typeName: "Customer",
        nameGenerator: npcNameGenerator,
        creature: "commoner",
        customSetup: npcSetup,
        attributes: { challengeRating: [0], alignment: '', lineage: '' }
    },
    npcCustomerNoble: {
        typeName: "Noble Customer",
        nameGenerator: npcNameGenerator,
        creature: "noble",
        customSetup: npcSetup,
        attributes: { challengeRating: [.125, .25, .5, 1], alignment: '', lineage: '' }
    },
    npcCustomerGuard: {
        typeName: "Off-duty Guard",
        nameGenerator: npcNameGenerator,
        creature: "guard",
        customSetup: npcSetup,
        attributes: { challengeRating: [.125, .25, .5, 1], alignment: '', lineage: '' }
    },
    npcCustomerThug: {
        typeName: "Shady Patron",
        nameGenerator: npcNameGenerator,
        creature: "thug",
        customSetup: npcSetup,
        attributes: { challengeRating: [.5, 1, 2], alignment: '', lineage: '' }
    },
    npcCustomerScout: {
        typeName: "Traveler",
        nameGenerator: npcNameGenerator,
        creature: "scout",
        customSetup: npcSetup,
        attributes: { challengeRating: [.5, 1, 2], alignment: '', lineage: '' }
    },
    // ─── Residential NPC wrappers ───
    npcResident: {
        typeName: "Resident",
        nameGenerator: npcNameGenerator,
        creature: "commoner",
        customSetup: npcSetup,
        attributes: { challengeRating: [0], alignment: '', lineage: '' }
    },
    npcNobleResident: {
        typeName: "Noble Resident",
        nameGenerator: npcNameGenerator,
        creature: "noble",
        customSetup: npcSetup,
        attributes: { challengeRating: [.125, .25, .5, 1], alignment: '', lineage: '' }
    },
    npcServant: {
        typeName: "Servant",
        nameGenerator: npcNameGenerator,
        creature: "commoner",
        customSetup: npcSetup,
        attributes: { challengeRating: [0], alignment: '', lineage: '' }
    },
    npcButler: {
        typeName: "Butler",
        nameGenerator: npcNameGenerator,
        creature: "commoner",
        customSetup: npcSetup,
        attributes: { challengeRating: [0], alignment: '', lineage: '' }
    },
    npcCook: {
        typeName: "Cook",
        nameGenerator: npcNameGenerator,
        creature: "commoner",
        customSetup: npcSetup,
        attributes: { challengeRating: [0], alignment: '', lineage: '' }
    },
    npcHousekeeper: {
        typeName: "Housekeeper",
        nameGenerator: npcNameGenerator,
        creature: "commoner",
        customSetup: npcSetup,
        attributes: { challengeRating: [0], alignment: '', lineage: '' }
    },
    npcValet: {
        typeName: "Valet",
        nameGenerator: npcNameGenerator,
        creature: "commoner",
        customSetup: npcSetup,
        attributes: { challengeRating: [0], alignment: '', lineage: '' }
    },
    npcHouseGuard: {
        typeName: "House Guard",
        nameGenerator: npcNameGenerator,
        creature: "guard",
        customSetup: npcSetup,
        attributes: { challengeRating: [.125, .25, .5, 1], alignment: '', lineage: '' }
    },
    // ─── Military & Civic NPC wrappers ───
    npcWatchCaptain: {
        typeName: "Watch Captain",
        nameGenerator: npcNameGenerator,
        creature: "veteran",
        customSetup: npcSetup,
        attributes: { challengeRating: { min: 3, max: 5 }, alignment: '', lineage: '' }
    },
    npcGateGuard: {
        typeName: "Gate Guard",
        nameGenerator: npcNameGenerator,
        creature: "guard",
        customSetup: npcSetup,
        attributes: { challengeRating: [.125, .25, .5, 1], alignment: '', lineage: '' }
    },
    npcCourtier: {
        typeName: "Courtier",
        nameGenerator: npcNameGenerator,
        creature: "noble",
        customSetup: npcSetup,
        attributes: { challengeRating: [.125, .25, .5, 1], alignment: '', lineage: '' }
    },
    npcCourtMage: {
        typeName: "Court Mage",
        nameGenerator: npcNameGenerator,
        creature: "mage",
        customSetup: npcSetup,
        attributes: { challengeRating: { min: 4, max: 8 }, alignment: '', lineage: '' }
    },
    npcHerald: {
        typeName: "Herald",
        nameGenerator: npcNameGenerator,
        creature: "commoner",
        customSetup: npcSetup,
        attributes: { challengeRating: [0], alignment: '', lineage: '' }
    },
    // ─── Criminal NPC wrappers ───
    npcGuildmaster: {
        typeName: "Guildmaster",
        nameGenerator: npcNameGenerator,
        creature: "banditCaptain",
        customSetup: npcSetup,
        attributes: { challengeRating: { min: 2, max: 4 }, alignment: '', lineage: '' }
    },
    npcPickpocket: {
        typeName: "Pickpocket",
        nameGenerator: npcNameGenerator,
        creature: "bandit",
        customSetup: npcSetup,
        attributes: { challengeRating: [.125, .25, .5], alignment: '', lineage: '' }
    },
    npcEnforcer: {
        typeName: "Enforcer",
        nameGenerator: npcNameGenerator,
        creature: "thug",
        customSetup: npcSetup,
        attributes: { challengeRating: [.5, 1, 2], alignment: '', lineage: '' }
    },
    npcFence: {
        typeName: "Fence",
        nameGenerator: npcNameGenerator,
        creature: "commoner",
        customSetup: npcSetup,
        attributes: { challengeRating: [0], alignment: '', lineage: '' }
    },
    // ─── Tavern NPC wrappers ───
    npcBarmaid: {
        typeName: "Barmaid",
        nameGenerator: npcNameGenerator,
        creature: "commoner",
        customSetup: npcSetup,
        attributes: { challengeRating: [0], alignment: '', lineage: '' }
    },
    npcBard: {
        typeName: "Bard",
        nameGenerator: npcNameGenerator,
        creature: "commoner",
        customSetup: npcSetup,
        attributes: { challengeRating: [0], alignment: '', lineage: '' }
    },
    // ─── Temple NPC wrappers ───
    npcPilgrim: {
        typeName: "Pilgrim",
        nameGenerator: npcNameGenerator,
        creature: "commoner",
        customSetup: npcSetup,
        attributes: { challengeRating: [0], alignment: '', lineage: '' }
    },

    land: {
        typeName: "Land"
    }
};
