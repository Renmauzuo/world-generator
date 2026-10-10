import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import type { ObjectTypeTemplate, WorldNode } from '../types';
import { poiLabel, setObjectTypesRef } from '../mapModal';

// Feature: node-maps, Property 17: POI label follows the name-or-type rule
//
// Property 17: POI label follows the name-or-type rule.
// poiLabel returns the child's `name` verbatim when it is non-empty after trimming
// (so whitespace-only names like " " or "\t" are treated as empty), and otherwise
// falls back to the child type's `typeName` from objectTypesRef.
//
// Validates: Requirements 6.7, 11.1

// The single test type whose template carries a known typeName. poiLabel reads the
// fallback typeName from objectTypesRef, so we wire a stub giving this type a known
// display name to assert against.
const TEST_TYPE = 'testPoiType';
const TYPE_NAME = 'Known Type Name';

const stubObjectTypes: Record<string, ObjectTypeTemplate> = {
  [TEST_TYPE]: { typeName: TYPE_NAME },
};
setObjectTypesRef(stubObjectTypes);

/**
 * Names that are empty after trimming — poiLabel must fall back to typeName for these.
 * Covers the empty string, pure-space, tab, and mixed-whitespace edge cases, plus
 * `undefined` (a child with no name set at all).
 */
const emptyAfterTrimArb: fc.Arbitrary<string | undefined> = fc.oneof(
  fc.constant(''),
  fc.constant(' '),
  fc.constant('\t'),
  fc.constant('   '),
  fc.constant('\t \n  '),
  fc.constant(undefined),
  // Generate arbitrary strings composed solely of whitespace characters.
  fc
    .array(fc.constantFrom(' ', '\t', '\n', '\r', '\f', '\v'), { minLength: 1, maxLength: 8 })
    .map((chars) => chars.join('')),
);

/**
 * Names that are non-empty after trimming — poiLabel must return these verbatim.
 * The leading/trailing-whitespace padding ensures we assert the raw name is returned
 * unchanged (not the trimmed value).
 */
const nonEmptyAfterTrimArb: fc.Arbitrary<string> = fc
  .string({ minLength: 1, maxLength: 20 })
  .filter((s) => s.trim().length > 0);

describe('Property 17: POI label follows the name-or-type rule', () => {
  it('returns the name verbatim when non-empty after trim, else the type typeName', () => {
    fc.assert(
      fc.property(
        fc.oneof(nonEmptyAfterTrimArb, emptyAfterTrimArb),
        (name) => {
          const node: WorldNode = { type: TEST_TYPE };
          if (name !== undefined) {
            node.name = name;
          }

          const label = poiLabel(node);
          const hasName = typeof name === 'string' && name.trim().length > 0;

          if (hasName) {
            // Non-empty-after-trim name => returned verbatim (not trimmed).
            expect(label).toBe(name);
          } else {
            // Empty / whitespace-only / undefined name => fall back to typeName.
            expect(label).toBe(TYPE_NAME);
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});
