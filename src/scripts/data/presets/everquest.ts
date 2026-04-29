import type { WorldNode } from '../../types';

export const everquest: WorldNode = {
    type: "multiverse",
    name: "The EverQuest Universe",
    children: [
        {
            type: "planarCluster",
            name: "The Planes of Power",
            children: [
                { type: "plane", name: "The Plane of Fire", attributes: { alignment: "True Neutral", element: "Fire" } },
                { type: "plane", name: "The Plane of Water", attributes: { alignment: "True Neutral", element: "Water" } },
                { type: "plane", name: "The Plane of Earth", attributes: { alignment: "True Neutral", element: "Earth" } },
                { type: "plane", name: "The Plane of Air", attributes: { alignment: "True Neutral", element: "Air" } },
                { type: "plane", name: "The Plane of Valor", attributes: { alignment: "Lawful Good", element: "None" } },
                { type: "plane", name: "The Plane of Tranquility", attributes: { alignment: "Neutral Good", element: "None" } },
                { type: "plane", name: "The Plane of Growth", attributes: { alignment: "Neutral Good", element: "Positive Energy" } },
                { type: "plane", name: "The Plane of Justice", attributes: { alignment: "Lawful Neutral", element: "None" } },
                { type: "plane", name: "The Plane of Storms", attributes: { alignment: "Chaotic Neutral", element: "Air" } },
                { type: "plane", name: "The Plane of Torment", attributes: { alignment: "Neutral Evil", element: "None" } },
                { type: "plane", name: "The Plane of Hate", attributes: { alignment: "Chaotic Evil", element: "None" } },
                { type: "plane", name: "The Plane of Fear", attributes: { alignment: "Neutral Evil", element: "None" } },
                { type: "plane", name: "The Plane of Disease", attributes: { alignment: "Neutral Evil", element: "Negative Energy" } },
                { type: "plane", name: "The Plane of War", attributes: { alignment: "Chaotic Evil", element: "None" } },
                { type: "plane", name: "The Plane of Mischief", attributes: { alignment: "Chaotic Neutral", element: "None" } },
                { type: "plane", name: "The Plane of Innovation", attributes: { alignment: "Lawful Neutral", element: "Earth" } },
                { type: "plane", name: "The Plane of Nightmares", attributes: { alignment: "Chaotic Evil", element: "Negative Energy" } },
                { type: "plane", name: "The Plane of Time", attributes: { alignment: "True Neutral", element: "None" } },
            ]
        },
        {
            type: "planarCluster",
            name: "The Outer Planes",
            children: [
                { type: "plane", name: "The Plane of Underfoot", attributes: { alignment: "Lawful Neutral", element: "Earth" } },
                { type: "plane", name: "The Void", attributes: { alignment: "Neutral Evil", element: "Negative Energy" } },
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
                            name: "Norrath",
                            children: [
                                { type: "continent", name: "Antonica", attributes: { temperature: "Mixed" },
                                    children: [
                                        { type: "tundra", name: "Everfrost Peaks",
                                            children: [
                                                { type: "cave", name: "Permafrost Caverns",
                                                    children: [
                                                        { type: "goblinWarband", name: "Ice Goblin Tribe",
                                                            children: [
                                                                { type: "goblinChief", name: "Ice Goblin Chieftain", attributes: { challengeRating: 5 } },
                                                                { type: "goblinVeteran", attributes: { challengeRating: 2 } },
                                                                { type: "goblinVeteran", attributes: { challengeRating: 2 } },
                                                                { type: "goblinSolitary", attributes: { challengeRating: 0.5 } },
                                                                { type: "goblinSolitary", attributes: { challengeRating: 0.5 } },
                                                                { type: "goblinSolitary", attributes: { challengeRating: 0.25 } },
                                                                { type: "goblinRunt", attributes: { challengeRating: 0 } },
                                                                { type: "goblinRunt", attributes: { challengeRating: 0 } }
                                                            ]
                                                        },
                                                        { type: "frostGiantPatrol",
                                                            children: [
                                                                { type: "frostGiantSolitary", attributes: { challengeRating: 8 } },
                                                                { type: "frostGiantSolitary", attributes: { challengeRating: 8 } }
                                                            ]
                                                        },
                                                        { type: "dragonLairWhite", name: "Lady Vox", attributes: { challengeRating: 16, alignment: "Chaotic Evil" } }
                                                    ]
                                                }
                                            ]
                                        }
                                    ]
                                },
                                { type: "continent", name: "Odus", attributes: { temperature: "Warm" } },
                                { type: "continent", name: "Faydwer", attributes: { temperature: "Temperate" } },
                                { type: "continent", name: "Kunark", attributes: { temperature: "Warm" } },
                                { type: "continent", name: "Velious", attributes: { temperature: "Cold" } },
                                { type: "ocean", name: "The Ocean of Tears", attributes: { temperature: "Temperate" } },
                                { type: "ocean", name: "The Timorous Deep", attributes: { temperature: "Warm" } },
                            ]
                        },
                        {
                            type: "planet",
                            name: "Luclin",
                            children: [
                                { type: "continent", name: "The Light Side", attributes: { temperature: "Warm" } },
                                { type: "continent", name: "The Dark Side", attributes: { temperature: "Cold" } },
                            ]
                        }
                    ]
                }
            ]
        }
    ]
};
