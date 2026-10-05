import type { Source } from '@toolkit5e/base';
import { sources, resolveSourceId, sourceKeys } from '@toolkit5e/base';
import { resolveCreatureSource } from '@toolkit5e/monster-scaler';
import type { MonsterID } from '@toolkit5e/monster-scaler';
import { objectTypes } from './data/objectTypes';

/**
 * Content-source filtering for the world generator.
 *
 * Each node type resolves to a source id (see `sources` in `@toolkit5e/base`).
 * Users toggle sources on/off in the control panel; types whose resolved source
 * is disabled are skipped during child/creature generation.
 *
 * Content with no declared source is treated as the default source (SRD), so
 * only non-SRD content needs an explicit `source` tag — see steering notes.
 *
 * Each source carries a `filterPolicy` (from `@toolkit5e/base`) that governs how
 * it participates in filtering, independent of attribution:
 * - `'default'` — a user-toggleable checkbox, enabled by default.
 * - `'always'` — exempt from filtering; always generates, no checkbox.
 * - `'setting'` — opt-in only; a checkbox that starts disabled (e.g. campaign settings).
 */

const STORAGE_KEY = 'enabledSources';

/** The filter policy for a source, defaulting to `'default'` when unset. */
type FilterPolicy = NonNullable<Source['filterPolicy']>;
function policyOf(source: Source): FilterPolicy {
    return source.filterPolicy ?? 'default';
}

/** Resolves a source id to its record (falling back to the default source). */
function sourceById(sourceId: string): Source | undefined {
    return (sources as Record<string, Source>)[sourceId];
}

/**
 * Source ids the user can toggle on/off (policy `'default'` or `'setting'`).
 * `'always'` sources are excluded — they're never filtered, so there's nothing to toggle.
 */
export function getToggleableSources(): Source[] {
    return getAllSources().filter(s => policyOf(s) !== 'always');
}

/**
 * The set of source ids currently enabled for generation. Defaults to every
 * `'default'`-policy source (so `'setting'` sources like campaign content start
 * off). Persisted to localStorage so the user's choice survives reloads.
 */
let enabledSources: Set<string> = loadEnabledSources();

/** The ids enabled by default: every `'default'`-policy source. */
function defaultEnabledIds(): string[] {
    return getAllSources().filter(s => policyOf(s) === 'default').map(s => s.id);
}

/** Loads the enabled-source set from localStorage, defaulting to the `'default'`-policy sources. */
function loadEnabledSources(): Set<string> {
    const allIds = Object.keys(sources);
    try {
        const raw = localStorage[STORAGE_KEY];
        if (raw) {
            const parsed: string[] = JSON.parse(raw);
            // Only keep ids we still recognize. An empty saved set is valid (user turned
            // everything off), so only fall back to defaults when storage is absent/corrupt.
            const valid = parsed.filter(id => allIds.includes(id));
            return new Set(valid);
        }
    } catch (e) {
        // Ignore malformed storage and fall through to the default.
    }
    return new Set(defaultEnabledIds());
}

/** Persists the current enabled-source set to localStorage. */
function persistEnabledSources(): void {
    try {
        localStorage[STORAGE_KEY] = JSON.stringify([...enabledSources]);
    } catch (e) {
        // Silently ignore storage failures.
    }
}

/** Returns every known source record, in registry order. */
export function getAllSources(): Source[] {
    return Object.values(sources) as Source[];
}

/**
 * Returns true if the given source id is currently enabled for generation.
 * `'always'`-policy sources are always enabled regardless of the toggle set;
 * unknown sources fall back to the default source's state.
 */
export function isSourceEnabled(sourceId: string): boolean {
    const source = sourceById(sourceId);
    // Unknown source id — treat as source-agnostic common content (always on).
    if (!source) return true;
    if (policyOf(source) === 'always') return true;
    return enabledSources.has(sourceId);
}

/**
 * Enables or disables a source for generation and persists the change.
 * No-op for `'always'`-policy sources, which can't be filtered.
 * @param sourceId - The source id to toggle
 * @param enabled - Whether the source should be enabled
 */
export function setSourceEnabled(sourceId: string, enabled: boolean): void {
    const source = sourceById(sourceId);
    if (source && policyOf(source) === 'always') return;
    if (enabled) {
        enabledSources.add(sourceId);
    } else {
        enabledSources.delete(sourceId);
    }
    persistEnabledSources();
}

/**
 * Resolves the effective source id for a node type. For creature-backed types
 * the creature (and its variant) source takes precedence over the template's own
 * `source`; otherwise the template's `source` is used, falling back to the default.
 * @param nodeType - The node type key (into `objectTypes`)
 * @returns The resolved source id
 */
export function resolveTypeSource(nodeType: string): string {
    const template = objectTypes[nodeType];
    if (!template) return sourceKeys.common;
    // Creature-backed types resolve from the creature (and variant), which default to
    // SRD — a scaled/reflavored SRD monster is still SRD content.
    // Dynamic creatures resolve their creature at generation time from node attributes,
    // so there's no static creature to read here — fall back to the template source.
    if (template.creature && !template.dynamicCreature) {
        return resolveCreatureSource(template.creature as MonsterID, template.variant);
    }
    // Non-creature types (geography, settlements, districts, buildings) are structural
    // scaffolding, not ruleset content — default untagged ones to the source-agnostic
    // `common` source so they generate regardless of which ruleset the user selected.
    return resolveSourceId(template, sourceKeys.common);
}

/**
 * Returns true if a node type is allowed to generate under the current source
 * selection. Types whose resolved source is disabled are filtered out.
 * @param nodeType - The node type key (into `objectTypes`)
 */
export function isTypeSourceEnabled(nodeType: string): boolean {
    return isSourceEnabled(resolveTypeSource(nodeType));
}
