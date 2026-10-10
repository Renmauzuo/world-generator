import { describe, it, expect, beforeAll } from 'vitest';
import fc from 'fast-check';
import type { ObjectTypeTemplate, WorldNode } from '../types';
import { DEFAULT_MINI_MAP_COLOR, miniMapColor, setObjectTypesRef } from '../mapModal';

// Feature: node-maps, Property 18: Mini-map color derives from tags with a default fallback
//
// Property 18: Mini-map color derives from tags with a default fallback.
// For any child node, miniMapColor(child) returns the color mapped from the child
// type's recognized terrain tags when one exists (specifically the color of the FIRST
// recognized tag in the type's `tags` iteration order), and the single default
// representative color (DEFAULT_MINI_MAP_COLOR) otherwise.
//
// Validates: Requirements 7.1, 7.4

/**
 * The recognized terrain tag vocabulary that miniMapColor maps to colors. This mirrors
 * the module's internal `tagColors` keys. Any tag NOT in this list is "unrecognized" and
 * must fall through to the default color.
 */
const RECOGNIZED_TAGS = [
  'water',
  'fire',
  'earth',
  'air',
  'forest',
  'mountain',
  'plains',
  'desert',
  'swamp',
  'hills',
  'cold',
  'underground',
  'undead',
  'evil',
  'good',
] as const;

/**
 * A pool of tags the generators never recognize. Kept disjoint from RECOGNIZED_TAGS so
 * mixed arrays can intersperse "noise" tags that must not contribute a color.
 */
const UNRECOGNIZED_TAGS = [
  'region',
  'continent',
  'settlement',
  'ocean',
  'locality',
  'bogus',
  'metadata',
] as const;

/**
 * Captured expected color per recognized tag, learned by calling miniMapColor on a type
 * whose ONLY tag is that recognized tag. This keeps the test in sync with the module's
 * color map without hardcoding the exact hex values — the module is the source of truth.
 */
const expectedColorForTag: Record<string, string> = {};

/**
 * Install a stub objectTypes map behind the module's forward reference. Each child node in
 * the test carries its tag array inline under its `type` key so the generator can resolve it.
 * We build the stub lazily by registering types as the arbitraries produce them (see
 * `nodeForTags`), but we must capture the single-tag colors up front via setObjectTypesRef.
 */
const stubTypes: Record<string, ObjectTypeTemplate> = {};
let nextTypeId = 0;

/**
 * Registers a fresh stub type with the given tags (or omitted tags when `tags` is undefined)
 * and returns a child WorldNode of that type. Each call gets a unique type key so stub entries
 * never collide across generated examples.
 */
function nodeForTags(tags: string[] | undefined): WorldNode {
  const typeKey = `stubType${nextTypeId++}`;
  stubTypes[typeKey] = { typeName: `Stub ${typeKey}`, ...(tags ? { tags } : {}) };
  return { type: typeKey };
}

beforeAll(() => {
  setObjectTypesRef(stubTypes);
  // Learn each recognized tag's expected color via a single-recognized-tag type.
  for (const tag of RECOGNIZED_TAGS) {
    const node = nodeForTags([tag]);
    expectedColorForTag[tag] = miniMapColor(node);
  }
});

describe('Property 18: Mini-map color derives from tags with a default fallback', () => {
  it('each recognized tag maps to a distinct, non-default color on a single-tag type', () => {
    // Sanity: the captured colors are real mappings, not the default fallback.
    for (const tag of RECOGNIZED_TAGS) {
      expect(expectedColorForTag[tag]).toBeDefined();
      expect(expectedColorForTag[tag]).not.toBe(DEFAULT_MINI_MAP_COLOR);
    }
  });

  it('returns the FIRST recognized tag color, else the default fallback', () => {
    fc.assert(
      fc.property(
        // A tags array that may contain recognized tags, unrecognized tags, or none.
        fc.array(
          fc.oneof(
            fc.constantFrom(...RECOGNIZED_TAGS),
            fc.constantFrom(...UNRECOGNIZED_TAGS),
          ),
          { minLength: 0, maxLength: 8 },
        ),
        // Occasionally omit the tags field entirely (template with no `tags`).
        fc.boolean(),
        (tags, omitTags) => {
          const node = nodeForTags(omitTags ? undefined : tags);
          const result = miniMapColor(node);

          // Expected = color of the first recognized tag in iteration order, if any.
          const firstRecognized = omitTags
            ? undefined
            : tags.find((t) => (RECOGNIZED_TAGS as readonly string[]).includes(t));

          if (firstRecognized) {
            expect(result).toBe(expectedColorForTag[firstRecognized]);
          } else {
            // No tags, no recognized tag, or omitted field => default fallback.
            expect(result).toBe(DEFAULT_MINI_MAP_COLOR);
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});
