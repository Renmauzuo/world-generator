import type { WorldNode } from './types';
import { rand, randFromArray } from './helpers';

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

    const alignmentGood = alignment.includes("Good");
    const alignmentEvil = alignment.includes("Evil");
    const alignmentLawful = alignment.includes("Lawful");
    const alignmentChaotic = alignment.includes("Chaotic");

    //TODO: Add name schemes other than "The X of Y"
    let name = "The ";

    // Start with some generic location types
    let placeOptions = ["Realm", "Kingdom"];

    if (node.type === "plane") {
        placeOptions = placeOptions.concat("Plane");
    } else if (node.type === "demiPlane") {
        placeOptions = placeOptions.concat("Demiplane");
    }

    // Add some additional ones based on element
    if (element === "Water") {
        placeOptions = placeOptions.concat(["Sea", "Ocean", "Lake", "Islands", "Abyss", "Waters"]);
    } else if (element === "Air") {
        placeOptions = placeOptions.concat(["Clouds"]);
    } else {
        placeOptions = placeOptions.concat(["Land"]);
    }

    // Or alignment
    if (alignmentGood) {
        placeOptions = placeOptions.concat(["Heaven", "Paradise"]);
    } else if (alignmentEvil) {
        placeOptions = placeOptions.concat(["Hell"]);
    }

    name += randFromArray(placeOptions) + ' of ';

    // Start with some generic options just in case this plane is none/none
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
    //TODO: Maybe add a check to avoid names like "The Clouds of Clouds"
    return name;
}

export function materialPlaneNameGenerator(_node: WorldNode): string {
    return "The " + randFromArray(["Prime", "Lost", "Unknown", "Forgotten", "Major", "Minor", "Mortal"]) + " Material Plane";
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
