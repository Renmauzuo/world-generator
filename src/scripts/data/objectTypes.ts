import type { ObjectTypeTemplate } from '../types';
import { categoryAttributes } from '../attributeGenerators';
import { planarTypes, setObjectTypesRef as setPlanarRef } from './objectTypes/planarTypes';
import { geographyTypes } from './objectTypes/geographyTypes';
import { settlementObjTypes, setObjectTypesRef as setSettlementRef } from './objectTypes/settlementTypes';
import { creatureTypes } from './objectTypes/creatureTypes';

export const objectTypes: Record<string, ObjectTypeTemplate> = {
    ...planarTypes,
    ...geographyTypes,
    ...settlementObjTypes,
    ...creatureTypes
};

// Wire up forward references so partial files can access the merged objectTypes
setPlanarRef(objectTypes);
setSettlementRef(objectTypes);

// Mix in category attributes for all types that declare categories.
// Type-specific attributes take precedence — category attributes are only added if not already defined.
for (const type in objectTypes) {
    const typeTemplate = objectTypes[type];
    if (typeTemplate.categories) {
        if (!typeTemplate.attributes) {
            typeTemplate.attributes = {};
        }
        for (const category of typeTemplate.categories) {
            for (const attr in categoryAttributes[category]) {
                if (!(attr in typeTemplate.attributes)) {
                    typeTemplate.attributes[attr] = categoryAttributes[category][attr];
                }
            }
        }
    }
}
