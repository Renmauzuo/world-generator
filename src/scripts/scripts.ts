import type { WorldNode } from './types';
import { objectTypes } from './data/objectTypes';
import { presets } from './data/presets/index';
import { attributeEditors, labels } from './attributeGenerators';
import { rand, randFromArray, weightedRand, shouldInheritAttribute, capitalize } from './helpers';
import { queuedName, setQueuedName } from './nameGenerators';
import { registerNode, clearRegistry, registerTree } from './nodeRegistry';
import { scaleMonster, monsterList } from '@toolkit5e/monster-scaler';
import { stringForCR, toTitleCase } from '@toolkit5e/base';
import { renderStatblock } from '@toolkit5e/statblock';

let rootNode: WorldNode;
let selectedNode: WorldNode;
// Start out true because user doesn't need to be prompted to save an unedited random world
let saved = true;
let currentSaveName = '';
let worldList: string[];

$(function () {
    // Rather than storing all worlds under one object they are each their own localStorage entry
    // and we save a list of them. This mitigates unnecessary JSON parsing/stringifying by letting
    // us do one world at a time instead of all of them.
    if (!localStorage['worldList']) {
        localStorage['worldList'] = '[]';
        worldList = [];
    } else {
        worldList = JSON.parse(localStorage['worldList']);
    }
    updateLoadList();

    // Populate the preset dropdown (hidden when no presets are available)
    const $preset = $('#load-preset');
    $preset.empty();
    if (presets.length > 0) {
        $('<option value="">Select Preset</option>').appendTo($preset);
        for (let i = 0; i < presets.length; i++) {
            $('<option></option>').attr('value', String(i)).html(presets[i].name).appendTo($preset);
        }
        $('#load-preset, #preset-label').show();
    } else {
        $('#load-preset, #preset-label').hide();
    }

    // Start by creating a multiverse
    createRootNode('districtTemple');

    // Clicking a node label selects it (shows info in the right panel)
    $('body').on('click', '.node-label', function (e: JQuery.Event) {
        e.stopPropagation();
        const node = $(this).closest('.node').data('node');
        if (node) {
            showInfoForNode(node);
        }
    });

    // Clicking the toggle arrow expands/collapses children
    $('body').on('click', '.node-toggle', function (e: JQuery.Event) {
        e.stopPropagation();
        const $node = $(this).closest('.node');
        const $children = $node.children('.node-children');
        $children.toggle();
        $(this).html($children.is(':visible') ? '▼' : '▶');
    });

    $('body').on('click', '.button-generate-children', function (e: JQuery.Event) {
        e.stopPropagation();
        const $node = $(this).closest('.node');
        const node = $node.data('node');
        if (node) {
            generateChildrenForNode(node);
            // Expand the children after generating
            const $children = $node.children('.node-children');
            $children.show();
            $node.children('.node-toggle').html('▼');
        }
    });

    $('body').on('click', '.button-view-statblock', function (e: JQuery.Event) {
        e.stopPropagation();
        const template = objectTypes[selectedNode.type];
        // Dynamic creatures store creature/variant/legendary on the node's attributes
        const creatureID = template.dynamicCreature ? selectedNode.attributes?.creature : template.creature;
        const creatureVariant = template.dynamicCreature ? selectedNode.attributes?.variant : template.variant;
        const creatureLegendary = template.dynamicCreature ? selectedNode.attributes?.legendary : template.legendary;
        if (!creatureID) return;
        const cr = String(selectedNode.attributes?.challengeRating ?? 1);
        try {
            const statblock = scaleMonster(creatureID, cr, {
                variant: creatureVariant,
                legendary: creatureLegendary
            });
            statblock.name = selectedNode.name || template.typeName;
            // Named nodes are unique creatures — traits should reference them by name
            if (selectedNode.name) {
                statblock.unique = true;
                statblock.description = selectedNode.name;
            } else {
                statblock.description = 'the ' + statblock.slug;
            }
            // Apply gender for pronoun rendering
            const genderStr = selectedNode.attributes?.gender;
            if (genderStr) {
                statblock.gender = genderStr === 'Male' ? 1 : genderStr === 'Female' ? 2 : 3;
            }
            // Apply alignment
            if (selectedNode.attributes?.alignment) {
                statblock.alignment = selectedNode.attributes.alignment;
            }
            const $body = $('#statblock-modal-body');
            $body.empty();
            renderStatblock(statblock, $body[0]);
            $('#statblock-modal').addClass('is-open');
        } catch (err) {
            console.warn('Could not render statblock for', creatureID, err);
        }
    });

    $('#statblock-modal-close').on('click', function () {
        $('#statblock-modal').removeClass('is-open');
    });

    // Close modal when clicking the backdrop (outside the statblock content)
    $('#statblock-modal').on('click', function (e: JQuery.ClickEvent) {
        if (e.target === this) {
            $(this).removeClass('is-open');
        }
    });

    $('#info-panel').on('input change', 'input,select,textarea', function () {
        const attribute: string = $(this).attr('id');
        // If its name changed then update the associated DOM element
        if (attribute === 'name') {
            const labelText = objectTypes[selectedNode.type].typeName + ' (' + $(this)[0].value + ')';
            selectedNode.domElement!.children('.node-label').html(labelText);
            selectedNode.name = $(this)[0].value;
        } else {
            // Check if this is a racial demographics sub-input
            const raceKey = $(this).data('race');
            if (raceKey) {
                const value = parseInt($(this)[0].value, 10) || 0;
                selectedNode.attributes!.racialDemographics[raceKey] = Math.max(0, value);
            } else {
                // Parse numeric attribute values back to numbers (select elements return strings)
                const rawValue = $(this)[0].value;
                selectedNode.attributes![attribute] = isNaN(Number(rawValue)) ? rawValue : Number(rawValue);
            }
        }

        // When creature changes on a dynamic creature node, rebuild the variant dropdown
        if (attribute === 'creature' && objectTypes[selectedNode.type].dynamicCreature) {
            const newCreatureID = $(this)[0].value;
            const creatureEntry = monsterList[newCreatureID as keyof typeof monsterList];
            const variants = creatureEntry?.variants ? Object.keys(creatureEntry.variants) : [];

            // Remove existing variant label, select, and line break
            $('#info-panel .variant-label').next('select').next('br').remove();
            $('#info-panel .variant-label').next('select').remove();
            $('#info-panel .variant-label').remove();

            // Reset variant on the node
            selectedNode.attributes!.variant = '';

            if (variants.length > 0) {
                // Insert variant dropdown after the creature select's line break
                const $creatureBreak = $('#info-panel #creature').next('br');
                const $variantLabel = $('<label for="variant" class="variant-label">' + (labels['variant'] || 'Variant') + ': </label>');
                $variantLabel.insertAfter($creatureBreak);
                const $variantSelect = $('<select id="variant"></select>');
                $('<option value="">None</option>').appendTo($variantSelect);
                for (const v of variants) {
                    const variantName = creatureEntry.variants![v as keyof typeof creatureEntry.variants].name;
                    $('<option></option>').attr('value', v).html(variantName).appendTo($variantSelect);
                }
                $variantSelect.insertAfter($variantLabel);
                $('<br>').insertAfter($variantSelect);
            }
        }

        if (saved) {
            saved = false;
        }
    });

    $('#button-generate-new').on('click', function () {
        confirmSaved();
        $('#generation-container').empty();
        createRootNode(($('#starting-node')[0] as HTMLInputElement).value);
        $('#info-panel h2').empty();
        $('#info-panel #fields').empty();
        $('#name').attr('value', '');
        saved = true;
    });

    $('#load-saved').on('input', function () {
        confirmSaved();
        createWorldFromJSON(localStorage['world-' + ($(this)[0] as HTMLInputElement).value]);
    });

    $('#load-preset').on('change', function () {
        const index = ($(this)[0] as HTMLSelectElement).value;
        if (!index) return;
        confirmSaved();
        createWorldFromJSON(JSON.stringify(presets[parseInt(index, 10)].data));
        saved = true;
    });

    $('#button-import-root').on('click', function () {
        confirmSaved();
        const data = prompt("Please input the JSON for the objects to import:");
        if (data && data !== "") {
            createWorldFromJSON(data);
        }
    });

    $('#button-export-root').on('click', function () {
        navigator.clipboard.writeText(stringifyNodes(rootNode)).then(function () {
            alert("Exported to clipboard!");
        });
    });

    $('#button-import-selected').on('click', function () {
        const data = prompt("Please input the JSON for the child to import:");
        if (data && data !== "") {
            const newChild: WorldNode = JSON.parse(data);
            // This might happen if the user pastes a child onto a type that normally doesn't have children
            if (!selectedNode.children) {
                selectedNode.children = [];
            }
            selectedNode.children.push(newChild);
            selectedNode.domElement!.append(recursiveGenerateDOMElement(newChild));
        }
    });

    $('#button-export-selected').on('click', function () {
        navigator.clipboard.writeText(stringifyNodes(selectedNode)).then(function () {
            alert("Exported to clipboard!");
        });
    });

    showInfoForNode(rootNode);
});

function showInfoForNode(node: WorldNode): void {
    selectedNode = node;
    const template = objectTypes[node.type];
    $('#info-panel h2').html(objectTypes[node.type].typeName);
    const $info = $('#info-panel #fields');
    $info.empty();
    $('#name').attr('value', node.name || '');
    if (node.attributes) {
        for (const attribute in node.attributes) {
            // Skip variant — it's rendered alongside creature
            if (attribute === 'variant') continue;

            const $label = $('<label for="' + attribute + '">' + (labels[attribute] || capitalize(attribute)) + ': </label>');
            $label.appendTo($info);
            // If the template attribute is an array create a picklist
            let $input;
            const templateAttribute = attributeEditors[attribute] || template.attributes?.[attribute];

            if (attribute === 'creature' && template.dynamicCreature) {
                // Creature dropdown — list all monsterList keys with friendly display names
                const creatureKeys = Object.keys(monsterList).sort();
                $input = $('<select id="creature"></select>');
                for (const key of creatureKeys) {
                    const entry = monsterList[key as keyof typeof monsterList];
                    const displayName = entry.name || toTitleCase(key);
                    const $option = $('<option></option>').attr('value', key).html(displayName);
                    if (key === node.attributes[attribute]) {
                        $option.attr('selected', 'selected');
                    }
                    $option.appendTo($input);
                }
                $input.insertAfter($label);
                $('<br>').insertAfter($input);

                // Variant dropdown — built from the selected creature's variants
                const selectedCreature = node.attributes.creature;
                const creatureEntry = monsterList[selectedCreature as keyof typeof monsterList];
                const variants = creatureEntry?.variants ? Object.keys(creatureEntry.variants) : [];

                if (variants.length > 0) {
                    const $variantLabel = $('<label for="variant" class="variant-label">' + (labels['variant'] || 'Variant') + ': </label>');
                    $variantLabel.appendTo($info);
                    const $variantSelect = $('<select id="variant"></select>');
                    $('<option value="">None</option>').appendTo($variantSelect);
                    for (const v of variants) {
                        const variantName = creatureEntry.variants![v as keyof typeof creatureEntry.variants].name;
                        const $option = $('<option></option>').attr('value', v).html(variantName);
                        if (v === node.attributes.variant) {
                            $option.attr('selected', 'selected');
                        }
                        $option.appendTo($variantSelect);
                    }
                    $variantSelect.insertAfter($variantLabel);
                    $('<br>').insertAfter($variantSelect);
                }
                continue;
            }

            if (Array.isArray(templateAttribute)) {
                $input = $('<select id=' + attribute + '></select>');
                for (const index in templateAttribute) {
                    const value = templateAttribute[index];
                    const displayText = attribute === 'challengeRating' ? stringForCR(value) : (labels[value] || value);
                    const $option = $('<option></option>').attr('value', value).html(displayText).appendTo($input);
                    // If this is the current value select it (use == for numeric/string coercion)
                    if (value == node.attributes[attribute]) {
                        $option.attr('selected', 'selected');
                    }
                }
            // If it's not an array just check the type of the current value
            } else if (templateAttribute === 'textarea') {
                $input = $('<textarea id=' + attribute + ' rows="3"></textarea>').val(node.attributes[attribute]);
            } else if (typeof node.attributes[attribute] === "string") {
                $input = $('<input type="text" id=' + attribute + '>').attr('value', node.attributes[attribute]);
            } else if (typeof node.attributes[attribute] === "number") {
                $input = $('<input type="number" id=' + attribute + '>').attr('value', node.attributes[attribute]);
            } else if (attribute === 'racialDemographics' && typeof node.attributes[attribute] === 'object') {
                // Render racial demographics as a collapsible group of number inputs
                const demographics = node.attributes[attribute] as Record<string, number>;
                const $details = $('<details class="demographics-group"></details>');
                $('<summary>Racial Demographics</summary>').appendTo($details);
                for (const race in demographics) {
                    const raceLabel = labels[race] || capitalize(race);
                    const $raceRow = $('<div class="demographics-row"></div>');
                    $('<label for="demo-' + race + '">' + raceLabel + ': </label>').appendTo($raceRow);
                    $('<input type="number" id="demo-' + race + '" min="0" data-race="' + race + '">').attr('value', demographics[race]).appendTo($raceRow);
                    $raceRow.appendTo($details);
                }
                $details.insertAfter($label);
                $label.remove(); // Remove the generic label since the details summary replaces it
                $('<br>').insertAfter($details);
                continue;
            } else {
                $input = $('<p>TBD</p>');
            }
            $input.insertAfter($label);
            $('<br>').insertAfter($input);
        }
    }

    // Build a link to the monster scaler for creatures, and a button to open the statblock modal.
    // Dynamic creatures store creature/variant/legendary on the node's attributes instead of the template.
    const creatureID = template.dynamicCreature ? node.attributes?.creature : template.creature;
    const creatureVariant = template.dynamicCreature ? node.attributes?.variant : template.variant;
    const creatureLegendary = template.dynamicCreature ? node.attributes?.legendary : template.legendary;
    if (creatureID) {
        let creatureLink = 'https://renmauzuo.github.io/monster-scaler/monsters.html?creature=' + creatureID;
        if (creatureVariant) {
            creatureLink += '&variant=' + creatureVariant;
        }
        if (node.attributes?.challengeRating) {
            creatureLink += '&target-cr=' + node.attributes.challengeRating;
        }
        if (creatureLegendary) {
            creatureLink += '&legendary=' + creatureLegendary;
        }
        creatureLink += '&name=' + encodeURIComponent(node.name || template.typeName);
        // Named nodes are unique — pass the unique-npc flag so the monster scaler uses the name in traits
        if (node.name) {
            creatureLink += '&unique-npc';
        }
        // Pass gender as numeric value for the monster scaler
        const genderStr = node.attributes?.gender;
        if (genderStr) {
            const genderNum = genderStr === 'Male' ? 1 : genderStr === 'Female' ? 2 : 3;
            creatureLink += '&gender=' + genderNum;
        }
        // Pass alignment
        if (node.attributes?.alignment) {
            creatureLink += '&alignment=' + encodeURIComponent(node.attributes.alignment);
        }
        $('<p><a href="' + creatureLink + '" target="_blank">View on monster scaler. (Opens in new window.)</a></p>').appendTo($info);
        $('<button class="button-view-statblock">View Statblock</button>').appendTo($info);
    }
}

/* Node Generation Begin */

function createRootNode(nodeType: string): void {
    clearRegistry();
    rootNode = generateNode(nodeType);
    domObjectForNode(rootNode).appendTo('#generation-container');
}

function generateNode(nodeType: string, parent?: WorldNode): WorldNode {
    const typeTemplate = objectTypes[nodeType];
    const node: WorldNode = {
        type: nodeType
    };
    if (parent) {
        node.parent = parent;
    }
    if (typeTemplate.attributes) {
        node.attributes = {};
        const typeAttributes = typeTemplate.attributes;
        for (const attribute in typeAttributes) {
            /*
             * If this is an inherit attribute then the value is the same as the parent's value.
             * For example, an evil plane will only have evil layers and demiplanes.
             * This is only enforced at generation; users can enter whatever values they want.
             */
            if (shouldInheritAttribute(parent, typeTemplate, attribute)) {
                node.attributes[attribute] = parent!.attributes![attribute];
            } else {
                // If it's not an inherited attribute generate a fresh value
                if (Array.isArray(typeAttributes[attribute])) {
                    node.attributes[attribute] = randFromArray(typeAttributes[attribute]);
                } else if (typeof typeAttributes[attribute] === 'function') {
                    node.attributes[attribute] = typeAttributes[attribute](node);
                } else if (typeof typeAttributes[attribute] === 'object') {
                    // If the attribute has a min and a max we randomly select from the range
                    if (typeAttributes[attribute].min !== undefined) {
                        node.attributes[attribute] = rand(typeAttributes[attribute].min, typeAttributes[attribute].max);
                    }
                } else {
                    // Primitive values (string, number, boolean) are used as-is
                    node.attributes[attribute] = typeAttributes[attribute];
                }
            }
        }
    }
    if (typeTemplate.customSetup) {
        if (!node.attributes) node.attributes = {};
        typeTemplate.customSetup(node);
    }
    if (typeTemplate.nameGenerator) {
        node.name = typeTemplate.nameGenerator(node);
    }
    if (typeTemplate.registered) {
        registerNode(node);
    }
    return node;
}

// Generates children for a node based on its type template and appends them to its DOM element
function generateChildrenForNode(node: WorldNode): void {
    if (!node.children) {
        node.children = [];
    }
    const maxAttempts = 3;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        let childrenAdded = 0;
        for (const index in objectTypes[node.type].children) {
            const childTemplate = objectTypes[node.type].children![index];
            // A child is valid if it has no conditions, or if any condition passes (OR logic)
            let valid = true;
            if (childTemplate.conditions && childTemplate.conditions.length > 0) {
                valid = childTemplate.conditions.some(condition => {
                    const nodeValue = node.attributes?.[condition.attribute];
                    const shouldMatch = condition.match ?? true;
                    return shouldMatch ? nodeValue === condition.value : nodeValue !== condition.value;
                });
            }
            if (valid) {
                let numChildren: number;
                if (childTemplate.weightedRange) {
                    numChildren = parseInt(weightedRand(childTemplate.weightedRange), 10);
                } else {
                    numChildren = rand(childTemplate.min!, childTemplate.max!);
                }
                for (let i = 0; i < numChildren; i++) {
                    let childType: string;
                    if (typeof childTemplate.type === "object") {
                        childType = weightedRand(childTemplate.type as Record<string, number>);
                    } else {
                        childType = childTemplate.type;
                    }
                    addChildToNode(childType, node);
                    if (childTemplate.requiredSibling) {
                        addChildToNode(childTemplate.requiredSibling, node);
                    }
                    childrenAdded++;
                }
                // Reset queued name so it doesn't impact cousins or more distant nodes
                setQueuedName(null);
            }
        }
        // If at least one child was generated, we're done. Otherwise retry.
        if (childrenAdded > 0) break;
    }
    saved = false;
}

function addChildToNode(childType: string, node: WorldNode): void {
    const childNode = generateNode(childType, node);
    node.children!.push(childNode);
    const $childrenContainer = node.domElement!.children('.node-children');
    if ($childrenContainer.length) {
        domObjectForNode(childNode).appendTo($childrenContainer);
    } else {
        domObjectForNode(childNode).appendTo(node.domElement!);
    }
}

// Generates a DOM element for a given node in the world tree
function domObjectForNode(node: WorldNode): JQuery {
    let labelText = objectTypes[node.type].typeName;
    if (node.name && node.name.length) {
        labelText += ' (' + node.name + ')';
    }
    const hasChildren = !!objectTypes[node.type].children;
    const $domElement = $('<div class="node"></div>');

    if (hasChildren) {
        $('<span class="node-toggle">▶</span>').appendTo($domElement);
    }

    $('<span class="node-label"></span>').html(labelText).appendTo($domElement);

    if (hasChildren) {
        $('<button class="button-generate-children">+ Generate Children</button>').appendTo($domElement);
        $('<div class="node-children"></div>').appendTo($domElement);
    }

    $domElement.data('node', node);
    node.domElement = $domElement;
    return $domElement;
}

/* Node Generation End */

/* Save/Load Begin */

function confirmSaved(): void {
    if (!saved) {
        // If there are unsaved changes ask user if they want to save
        const shouldSave = confirm('You have unsaved changes. Save this world?');
        if (shouldSave) {
            // If this was loaded from a previous save just save over it, if not then prompt user for a new name
            if (currentSaveName.length) {
                // Already has a save name — save over it
            } else {
                let promptMessage = "Please enter a name for this world.";
                let saveName: string;
                let valid: boolean;
                do {
                    saveName = prompt(promptMessage) ?? '';
                    if (saveName.length === 0) {
                        promptMessage = "Name must not be empty. Please enter a name.";
                        valid = false;
                    } else if (worldList.includes(saveName)) {
                        promptMessage = "Please enter a unique name";
                        valid = confirm('This name already exists. Save over it?');
                    } else {
                        valid = true;
                    }
                } while (!valid);

                addWorldToList(saveName);
                localStorage['world-' + saveName] = stringifyNodes(rootNode);
            }
        }
    }
}

/** Converts a node and all its children into a string for save/export.
 *  Since nodes reference their DOM objects and parents, native JSON.stringify can't be used
 *  without cloning and pruning the node tree first. */
function stringifyNodes(node: WorldNode): string {
    const rootCopy: Partial<WorldNode> = {};
    Object.assign(rootCopy, node);
    recursivePruneChildren(rootCopy as WorldNode);
    return JSON.stringify(rootCopy);
}

function recursivePruneChildren(node: WorldNode): void {
    delete node.domElement;
    delete node.parent;
    if (node.children) {
        for (const index in node.children) {
            recursivePruneChildren(node.children[index]);
        }
    }
}

function addWorldToList(worldName: string): void {
    if (!worldList.includes(worldName)) {
        worldList.push(worldName);
    }
    localStorage['worldList'] = JSON.stringify(worldList);
    updateLoadList();
}

// Updates the select for choosing a saved world
function updateLoadList(): void {
    if (worldList.length) {
        $('#load-saved').empty();
        $('<option>Select World</option>').appendTo('#load-saved');
        for (let i = 0; i < worldList.length; i++) {
            $('<option value="' + worldList[i] + '">' + worldList[i] + '</option>').appendTo('#load-saved');
        }
        $('#load-saved, #load-label').show();
    } else {
        $('#load-saved, #load-label').hide();
    }
}

/** Parses a JSON string and also creates associated DOM objects and populates the generation container.
 *  Called when loading or importing. */
function createWorldFromJSON(worldJSON: string): void {
    clearRegistry();
    $('#generation-container').empty();
    rootNode = JSON.parse(worldJSON);
    recursivePostParseProcess(rootNode);
    // Build the set of registered types and re-register all matching nodes
    const registeredTypes = new Set<string>();
    for (const type in objectTypes) {
        if (objectTypes[type].registered) registeredTypes.add(type);
    }
    registerTree(rootNode, registeredTypes);
    $('#generation-container').append(recursiveGenerateDOMElement(rootNode));
    showInfoForNode(rootNode);
}

function recursiveGenerateDOMElement(parentNode: WorldNode): JQuery {
    const $domElement = domObjectForNode(parentNode);
    if (parentNode.children) {
        const $childrenContainer = $domElement.children('.node-children');
        for (const index in parentNode.children) {
            $childrenContainer.append(recursiveGenerateDOMElement(parentNode.children[index]));
        }
    }
    return $domElement;
}

/** Recursively goes through the list and does some adjustments after parsing from JSON.
 *  For example, establishing bidirectional links between objects that had to be severed before JSON stringifying. */
function recursivePostParseProcess(parentNode: WorldNode): void {
    if (parentNode.children) {
        for (const index in parentNode.children) {
            parentNode.children[index].parent = parentNode;
            recursivePostParseProcess(parentNode.children[index]);
        }
    }
}
