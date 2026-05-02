import type { WorldNode } from '../../types';

export interface Preset {
    name: string;
    data: WorldNode;
}

// Preset data files are kept for reference but not shipped.
// To re-enable, import them and add entries to this array.
export const presets: Preset[] = [];
