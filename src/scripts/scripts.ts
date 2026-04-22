import type { WorldNode } from './types';
import { objectTypes } from './data/objectTypes';
import { attributeEditors, labels } from './attributeGenerators';
import { rand, randFromArray, weightedRand, shouldInheritAttribute, capitalize, operators } from './helpers';
import { queuedName, setQueuedName } from './nameGenerators';

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
    // createRootNode('multiverse');
    createRootNode('tundra');

    $('body').on('click', 'details,p', function (e: Event) {
        e.stopPropagation();
        const node = $(this).data('node');
        if (node) {
            showInfoForNode(node);
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
        $('#info-panel').empty();
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

    // Build a link to the monster scaler for creatures
    if (template.creature) {
        let creatureLink = 'https://renmauzuo.github.io/monster-scaler/monsters.html?creature=' + template.creature;
        if (template.variant) {
            creatureLink += '&variant=' + template.variant;
        }
        if (node.attributes?.challengeRating) {
            creatureLink += '&target-cr=' + node.attributes.challengeRating;
        }
        creatureLink += '&name=' + template.typeName;
        $('<p><a href="' + creatureLink + '" target="_blank">View statblock. (Opens in new window.)</a></p>').appendTo($info);
    }
}

/* Node Generation Begin */

function createRootNode(nodeType: string): void {
    rootNode = generateNode(nodeType);
    domObjectForNode(rootNode).appendTo('#generation-container');
}

function generateNode(nodeType: string, parent?: WorldNode): WorldNode {
    // Children will be generated on demand, so we need to remember if they've been generated or not
    const typeTemplate = objectTypes[nodeType];
    const node: WorldNode = {
        type: nodeType,
        needsChildren: typeTemplate.children != undefined
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

// Delegation doesn't seem to work with the toggle event so each details object gets its event added individually
function onToggle(this: HTMLElement): void {
    const node: WorldNode = $(this).data('node');
    // If node is being opened see if children are needed
    if ($(this).attr('open')) {
        if (node.needsChildren) {
            saved = false;
            node.needsChildren = false;
            node.children = [];
            for (const index in objectTypes[node.type].children) {
                const childTemplate = objectTypes[node.type].children![index];
                let valid = true;
                //TODO: Remove this once old requirements are updated to the new way
                if (childTemplate.requirement) {
                    valid = eval(childTemplate.requirement);
                }
                if (childTemplate.prerequisites) {
                    for (let i = 0; i < childTemplate.prerequisites.length; i++) {
                        const prereq = childTemplate.prerequisites[i];
                        valid = valid && operators[prereq.operator](node.attributes![prereq.attribute], prereq.value);
                    }
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
                            // If it's an object treat it as a weighted array
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
        }
    }
}

function addChildToNode(childType: string, node: WorldNode): void {
    const childNode = generateNode(childType, node);
    node.children!.push(childNode);
    domObjectForNode(childNode).appendTo(node.domElement!);
}

// Generates an HTML details object for a given node
function domObjectForNode(node: WorldNode): JQuery {
    let summaryText = objectTypes[node.type].typeName;
    if (node.name && node.name.length) {
        summaryText += ' (' + node.name + ')';
    }
    // If it has children then create a details group
    let $domElement;
    if (objectTypes[node.type].children) {
        $domElement = $('<details><summary>' + summaryText + '</summary></details>');
        $domElement.on('toggle', onToggle);
    } else {
        // If it has no children then a simple p tag will do
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
