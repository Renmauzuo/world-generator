import { monsterList } from '@toolkit5e/monster-scaler';
import type { ObjectTypeTemplate } from './types';
import { magicalTypes, mundaneVariants, magicalCreatureTypes } from './data/constants';
import type { MagicTier } from './data/constants';

/**
 * Determines which node types are magical, so the magic-level gate in child generation knows
 * what to suppress. Mostly inferred; a manual setting always wins.
 *
 * Resolution order for a type:
 *  1. Manual: `magic` on the template, then the `magicalTypes` override table.
 *     `false` explicitly marks a type as mundane (blocks inference).
 *  2. Creature-backed: a magical creature type (undead, fey, fiend, ...) or a dynamic creature
 *     (deities/avatars) is 'major'; a legendary creature of any other type is 'minor'.
 *     The variant's creature type takes precedence over the base creature's.
 *  3. Container: a type whose children are mostly magical (more than half of its child entries)
 *     takes the weakest tier among them. Child types that have a mundane variant count as
 *     mundane here, since they can be swapped out (so a temple isn't magical just because
 *     its priests are). Types with `categories` (regions, settlements, planes) are never
 *     inferred this way — they are the places magic level is a property of.
 *
 * Mutates the templates in place (sets `magic` / `mundaneVariant`).
 */
export function applyMagicTiers(typeMap: Record<string, ObjectTypeTemplate>): void {
    // Mundane variants first: container inference below depends on them.
    for (const type in typeMap) {
        if (!typeMap[type].mundaneVariant && mundaneVariants[type]) {
            typeMap[type].mundaneVariant = mundaneVariants[type];
        }
    }

    const cache = new Map<string, MagicTier | undefined>();
    const visiting = new Set<string>();

    const rank = (tier: MagicTier | undefined): number => tier === 'major' ? 2 : tier === 'minor' ? 1 : 0;

    const resolve = (type: string): MagicTier | undefined => {
        if (cache.has(type)) return cache.get(type);
        const template = typeMap[type];
        if (!template || visiting.has(type)) return undefined;
        visiting.add(type);

        let tier: MagicTier | undefined;
        const manual = template.magic !== undefined ? template.magic : magicalTypes[type];
        if (manual !== undefined) {
            tier = manual === false ? undefined : manual;
        } else {
            tier = creatureTier(template) ?? containerTier(template);
        }

        visiting.delete(type);
        cache.set(type, tier);
        return tier;
    };

    const creatureTier = (template: ObjectTypeTemplate): MagicTier | undefined => {
        if (template.dynamicCreature) return 'major';
        if (!template.creature) return undefined;
        const entry = (monsterList as Record<string, any>)[template.creature];
        const variant = template.variant ? entry?.variants?.[template.variant] : undefined;
        const creatureType: string | undefined = variant?.type ?? entry?.type;
        if (creatureType && magicalCreatureTypes.has(creatureType)) return 'major';
        if (template.legendary) return 'minor';
        return undefined;
    };

    const containerTier = (template: ObjectTypeTemplate): MagicTier | undefined => {
        if (template.categories?.length || !template.children?.length) return undefined;
        let magicalEntries = 0;
        let weakest = 2;
        let guaranteedMagical = false;
        let guaranteedWeakest = 2;
        for (const child of template.children) {
            const types = typeof child.type === 'string' ? [child.type] : Object.keys(child.type);
            // A child that can be swapped for a mundane variant doesn't make its parent magical
            const tiers = types.map(t => (typeMap[t]?.mundaneVariant ? undefined : resolve(t)));
            const magicalTypesInEntry = tiers.filter(t => t !== undefined);
            if (magicalTypesInEntry.length > types.length / 2) {
                const entryRank = Math.min(...magicalTypesInEntry.map(rank));
                magicalEntries++;
                weakest = Math.min(weakest, entryRank);
                // A guaranteed magical child (e.g. a dragon lair's dragon) defines the container
                if ((child.min ?? 0) >= 1) {
                    guaranteedMagical = true;
                    guaranteedWeakest = Math.min(guaranteedWeakest, entryRank);
                }
            }
        }
        if (guaranteedMagical) return guaranteedWeakest === 2 ? 'major' : 'minor';
        if (magicalEntries <= template.children.length / 2) return undefined;
        return weakest === 2 ? 'major' : 'minor';
    };

    for (const type in typeMap) {
        const tier = resolve(type);
        if (tier) typeMap[type].magic = tier;
        else if (typeMap[type].magic === false) delete typeMap[type].magic;
    }
}
