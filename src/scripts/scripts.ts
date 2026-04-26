import type { WorldNode } from './types';
import { objectTypes } from './data/objectTypes';
import { attributeEditors, labels } from './attributeGenerators';
import { rand, randFromArray, weightedRand, shouldInheritAttribute, capitalize } from './helpers';
import { queuedName, setQueuedName } from './nameGenerators';
import { scaleMonster } from '@toolkit5e/monster-scaler';
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

    // Start by creating a multiverse
    createRootNode('multiverse');

    $('body').on('click', 'details,p', function (e: JQuery.Event) {
        e.stopPropagation();
        const node = $(this).data('node');
        if (node) {
            showInfoForNode(node);
        }
    });

    $('body').on('click', '.button-generate-children', function (e: JQuery.Event) {
        e.stopPropagation();
        const $details = $(this).closest('details');
        const node = $details.data('node');
        if (node) {
            generateChildrenForNode(node);
            $details.attr('open', '');
        }
    });

    $('body').on('click', '.button-view-statblock', function (e: JQuery.Event) {
        e.stopPropagation();
        const template = objectTypes[selectedNode.type];
        if (!template.creature) return;
        const cr = String(selectedNode.attributes?.challengeRating ?? 1);
        try {
            const statblock = scaleMonster(template.creature, cr, {
                variant: template.variant
            });
            statblock.name = selectedNode.name || template.typeName;
            statblock.description = 'the ' + statblock.slug;
            const $body = $('#statblock-modal-body');
            $body.empty();
            renderStatblock(statblock, $body[0]);
            $('#statblock-modal').addClass('is-open');
        } catch (err) {
            console.warn('Could not render statblock for', template.creature, err);
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

    $('#info-panel').on('input', 'input,select', function () {
        const attribute: string = $(this).attr('id');
        // If its name changed then update the associated DOM element
        if (attribute === 'name') {
            const summaryText = objectTypes[selectedNode.type].typeName + ' (' + $(this)[0].value + ')';
            if (selectedNode.children) {
                selectedNode.domElement!.children('summary').html(summaryText);
            } else {
                selectedNode.domElement!.html(summaryText);
            }
            selectedNode.name = $(this)[0].value;
        } else {
            selectedNode.attributes![attribute] = $(this)[0].value;
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
            const $label = $('<label for="' + attribute + '">' + (labels[attribute] || capitalize(attribute)) + ': </label>');
            $label.appendTo($info);
            // If the template attribute is an array create a picklist
            let $input;
            const templateAttribute = attributeEditors[attribute] || template.attributes![attribute];
            if (Array.isArray(templateAttribute)) {
                $input = $('<select id=' + attribute + '></select>');
                for (const index in templateAttribute) {
                    const $option = $('<option></option>').html(templateAttribute[index]).appendTo($input);
                    // If this is the current value select it
                    if (templateAttribute[index] === node.attributes[attribute]) {
                        $option.attr('selected', 'selected');
                    }
                }
            // If it's not an array just check the type of the current value
            } else if (typeof node.attributes[attribute] === "string") {
                $input = $('<input type="text" id=' + attribute + '>').attr('value', node.attributes[attribute]);
            } else if (typeof node.attributes[attribute] === "number") {
                $input = $('<input type="number" id=' + attribute + '>').attr('value', node.attributes[attribute]);
            } else {
                $input = $('<p>TBD</p>');
            }
            $input.insertAfter($label);
            $('<br>').insertAfter($input);
        }
    }
    if (template.referenceBook) {
        let referenceText = "For more information please see ";
        if (template.referencePage) {
            referenceText += "page " + template.referencePage + " of ";
        }
        referenceText += template.referenceBook + '.';
        $('<p>' + referenceText + '</p>').appendTo($info);
    }

    // Build a link to the monster scaler for creatures, and a button to open the statblock modal
    if (template.creature) {
        let creatureLink = 'https://renmauzuo.github.io/monster-scaler/monsters.html?creature=' + template.creature;
        if (template.variant) {
            creatureLink += '&variant=' + template.variant;
        }
        if (node.attributes?.challengeRating) {
            creatureLink += '&target-cr=' + node.attributes.challengeRating;
        }
        creatureLink += '&name=' + template.typeName;
        $('<p><a href="' + creatureLink + '" target="_blank">View on monster scaler. (Opens in new window.)</a></p>').appendTo($info);
        $('<button class="button-view-statblock">View Statblock</button>').appendTo($info);
    }
}

/* Node Generation Begin */

function createRootNode(nodeType: string): void {
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
                    if (typeAttributes[attribute].min) {
                        node.attributes[attribute] = rand(typeAttributes[attribute].min, typeAttributes[attribute].max);
                    }
                }
            }
        }
    }
    if (typeTemplate.nameGenerator) {
        node.name = typeTemplate.nameGenerator(node);
    }
    return node;
}

// Generates children for a node based on its type template and appends them to its DOM element
function generateChildrenForNode(node: WorldNode): void {
    if (!node.children) {
        node.children = [];
    }
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
            }
            // Reset queued name so it doesn't impact cousins or more distant nodes
            setQueuedName(null);
        }
    }
    saved = false;
}

function addChildToNode(childType: string, node: WorldNode): void {
    const childNode = generateNode(childType, node);
    node.children!.push(childNode);
    domObjectForNode(childNode).appendTo(node.domElement!);
}

// Generates an HTML details element for a given node
function domObjectForNode(node: WorldNode): JQuery {
    let summaryText = objectTypes[node.type].typeName;
    if (node.name && node.name.length) {
        summaryText += ' (' + node.name + ')';
    }
    let $domElement;
    if (objectTypes[node.type].children) {
        $domElement = $('<details><summary>' + summaryText + ' <button class="button-generate-children">+ Generate Children</button></summary></details>');
    } else {
        $domElement = $('<p>' + summaryText + '</p>');
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
    $('#generation-container').empty();
    rootNode = JSON.parse(worldJSON);
    $('#generation-container').append(recursiveGenerateDOMElement(rootNode));
    showInfoForNode(rootNode);
}

function recursiveGenerateDOMElement(parentNode: WorldNode): JQuery {
    const $domElement = domObjectForNode(parentNode);
    if (parentNode.children) {
        for (const index in parentNode.children) {
            $domElement.append(recursiveGenerateDOMElement(parentNode.children[index]));
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
