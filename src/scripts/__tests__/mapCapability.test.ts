import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import type { ObjectTypeTemplate } from '../types';
import { isMapCapable, getEmptinessRatio, setObjectTypesRef } from '../mapGenerator';

// Feature: node-maps, Property 1: Map-capability resolves solely from template metadata
//
// Property 1: Map-capability resolves solely from template metadata.
// For any node type key, isMapCapable(type) returns true if and only if that
// type's ObjectTypeTemplate has mapCapable === true, and getEmptinessRatio(type)
// returns the template's emptinessRatio when declared and 0 otherwise.
//
// Validates: Requirements 1.1, 1.5, 1.6

/**
 * Generates a single ObjectTypeTemplate stub whose map-related metadata varies:
 *  - mapCapable may be true, false, or absent (undefined)
 *  - emptinessRatio may be a finite number or absent (undefined)
 * Only the fields relevant to Property 1 are varied; typeName is a fixed-shape
 * required field.
 */
const templateArb: fc.Arbitrary<ObjectTypeTemplate> = fc
  .record({
    mapCapable: fc.option(fc.boolean(), { nil: undefined }),
    emptinessRatio: fc.option(
      fc.double({ min: 0, max: 100, noNaN: true }),
      { nil: undefined }
    ),
  })
  .map(({ mapCapable, emptinessRatio }) => {
    const template: ObjectTypeTemplate = { typeName: 'stub' };
    if (mapCapable !== undefined) template.mapCapable = mapCapable;
    if (emptinessRatio !== undefined) template.emptinessRatio = emptinessRatio;
    return template;
  });

/** A record of distinct type keys mapped to stub templates. */
const objectTypesArb: fc.Arbitrary<Record<string, ObjectTypeTemplate>> =
  fc.dictionary(
    fc.string({ minLength: 1, maxLength: 12 }),
    templateArb,
    { minKeys: 1, maxKeys: 20 }
  );

describe('Property 1: Map-capability resolves solely from template metadata', () => {
  it('isMapCapable/getEmptinessRatio reflect only template metadata', () => {
    fc.assert(
      fc.property(objectTypesArb, (objectTypes) => {
        setObjectTypesRef(objectTypes);

        for (const [type, template] of Object.entries(objectTypes)) {
          // isMapCapable is true iff the template declares mapCapable === true.
          expect(isMapCapable(type)).toBe(template.mapCapable === true);

          // getEmptinessRatio is the declared ratio when present, else 0.
          const expectedRatio =
            template.emptinessRatio === undefined ? 0 : template.emptinessRatio;
          expect(getEmptinessRatio(type)).toBe(expectedRatio);
        }

        // A type key not present in the stub record is never map-capable and
        // resolves to the default emptiness ratio of 0.
        const unknownKey = '__definitely_absent_type_key__';
        if (!(unknownKey in objectTypes)) {
          expect(isMapCapable(unknownKey)).toBe(false);
          expect(getEmptinessRatio(unknownKey)).toBe(0);
        }
      }),
      { numRuns: 100 }
    );
  });
});
