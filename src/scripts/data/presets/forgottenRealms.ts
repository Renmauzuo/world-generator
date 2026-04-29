import type { WorldNode } from '../../types';

export const forgottenRealms: WorldNode = {
    type: "multiverse",
    name: "The Forgotten Realms",
    children: [
        {
            type: "planarCluster",
            name: "The Outer Planes",
            children: [
                { type: "plane", name: "Mount Celestia", attributes: { alignment: "Lawful Good", element: "None" } },
                { type: "plane", name: "Bytopia", attributes: { alignment: "Neutral Good", element: "None" } },
                { type: "plane", name: "Elysium", attributes: { alignment: "Neutral Good", element: "None" } },
                { type: "plane", name: "The Beastlands", attributes: { alignment: "Chaotic Good", element: "None" } },
                { type: "plane", name: "Arborea", attributes: { alignment: "Chaotic Good", element: "None" } },
                { type: "plane", name: "Ysgard", attributes: { alignment: "Chaotic Neutral", element: "None" } },
                { type: "plane", name: "Limbo", attributes: { alignment: "Chaotic Neutral", element: "None" } },
                { type: "plane", name: "Pandemonium", attributes: { alignment: "Chaotic Evil", element: "None" } },
                { type: "plane", name: "The Abyss", attributes: { alignment: "Chaotic Evil", element: "None" } },
                { type: "plane", name: "Carceri", attributes: { alignment: "Neutral Evil", element: "None" } },
                { type: "plane", name: "Hades", attributes: { alignment: "Neutral Evil", element: "None" } },
                { type: "plane", name: "Gehenna", attributes: { alignment: "Neutral Evil", element: "None" } },
                { type: "plane", name: "The Nine Hells", attributes: { alignment: "Lawful Evil", element: "None" } },
                { type: "plane", name: "Acheron", attributes: { alignment: "Lawful Neutral", element: "None" } },
                { type: "plane", name: "Mechanus", attributes: { alignment: "Lawful Neutral", element: "None" } },
                { type: "plane", name: "Arcadia", attributes: { alignment: "Lawful Good", element: "None" } },
            ]
        },
        {
            type: "planarCluster",
            name: "The Inner Planes",
            children: [
                { type: "plane", name: "The Plane of Fire", attributes: { alignment: "True Neutral", element: "Fire" } },
                { type: "plane", name: "The Plane of Water", attributes: { alignment: "True Neutral", element: "Water" } },
                { type: "plane", name: "The Plane of Earth", attributes: { alignment: "True Neutral", element: "Earth" } },
                { type: "plane", name: "The Plane of Air", attributes: { alignment: "True Neutral", element: "Air" } },
                { type: "plane", name: "The Positive Energy Plane", attributes: { alignment: "True Neutral", element: "Positive Energy" } },
                { type: "plane", name: "The Negative Energy Plane", attributes: { alignment: "True Neutral", element: "Negative Energy" } },
            ]
        },
        {
            type: "planarCluster",
            name: "The Material Plane",
            children: [
                {
                    type: "materialPlane",
                    name: "The Prime Material",
                    children: [
                        {
                            type: "planet",
                            name: "Toril",
                            children: [
                                { type: "continent", name: "Faerûn", attributes: { temperature: "Mixed" } },
                                { type: "continent", name: "Kara-Tur", attributes: { temperature: "Mixed" } },
                                { type: "continent", name: "Maztica", attributes: { temperature: "Warm" } },
                                { type: "continent", name: "Zakhara", attributes: { temperature: "Warm" } },
                                { type: "ocean", name: "The Trackless Sea", attributes: { temperature: "Mixed" } },
                                { type: "ocean", name: "The Sea of Fallen Stars", attributes: { temperature: "Temperate" } },
                            ]
                        }
                    ]
                },
                { type: "demiPlane", name: "The Feywild", attributes: { alignment: "Chaotic Good", element: "None" } },
                { type: "demiPlane", name: "The Shadowfell", attributes: { alignment: "Neutral Evil", element: "Negative Energy" } },
            ]
        }
    ]
};
