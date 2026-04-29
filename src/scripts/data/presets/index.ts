import type { WorldNode } from '../../types';
import { forgottenRealms } from './forgottenRealms';
import { everquest } from './everquest';

export interface Preset {
    name: string;
    data: WorldNode;
}

export const presets: Preset[] = [
    { name: "Forgotten Realms", data: forgottenRealms },
    { name: "EverQuest", data: everquest },
];
