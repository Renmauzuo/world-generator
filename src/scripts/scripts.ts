import type { WorldNode } from './types';
import { objectTypes } from './data/objectTypes';
import { presets } from './data/presets/index';
import { attributeEditors, labels, deityDomains } from './attributeGenerators';
import { rand, randFromArray, weightedRand, shouldInheritAttribute, capitalize } from './helpers';
import { queuedName, setQueuedName } from './nameGenerators';
import { registerNode, clearRegistry, registerTree, getRegisteredNodes } from './nodeRegistry';
import { scaleMonster, monsterList } from '@toolkit5e/monster-scaler';
import { stringForCR, toTitleCase, races as toolkit5eRaces } from '@toolkit5e/base';

// Type helper — toolkit5e RaceData has lineages, but the world generator's own RaceData shadows it.
// Use `any` for lineage lookups to avoid the name collision.
const getLineages = (race: any): { name: string }[] | undefined => race?.lineages;
import { renderStatblock } from '@toolkit5e/statblock';

let rootNode: WorldNode;
let selectedNode: WorldNode;
// Start out true because user doesn't need to be prompted to save an unedited random world
let saved = true;
let currentSaveName = '';
let worldList: string[];

/** Marks the world as having unsaved changes and auto-saves to localStorage for session persistence. */
let autoSaveTimeout: number | null = null;
function markUnsaved(): void {
    saved = false;
    // Debounce auto-save to avoid serializing on every keystroke
    if (autoSaveTimeout) clearTimeout(autoSaveTimeout);
    autoSaveTimeout = window.setTimeout(() => {
        try {
            localStorage['currentWorld'] = stringifyNodes(rootNode);
        } catch (e) {
            // Silently fail if serialization errors
        }
    }, 1000);
}

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

    // Load the last session's world if available, otherwise create a fresh multiverse
    if (localStorage['currentWorld']) {
        try {
            createWorldFromJSON(localStorage['currentWorld']);
        } catch (e) {
            createRootNode('multiverse');
        }
    } else {
        createRootNode('multiverse');
    }

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
            const scaleOptions: Record<string, any> = {
                variant: creatureVariant,
                legendary: creatureLegendary
            };
            // Resolve race and lineage for humanoid NPCs
            if (selectedNode.attributes?.race) {
                const raceIndex = toolkit5eRaces.findIndex(r => r.name === selectedNode.attributes!.race);
                if (raceIndex > 0) {
                    scaleOptions.race = raceIndex;
                    // Resolve lineage name to index
                    const lineageName = selectedNode.attributes.lineage;
                    if (lineageName && getLineages(toolkit5eRaces[raceIndex])) {
                        const lineageIndex = getLineages(toolkit5eRaces[raceIndex])!.findIndex(l => l.name === lineageName);
                        if (lineageIndex >= 0) scaleOptions.lineage = lineageIndex;
                    }
                }
            }
            const statblock = scaleMonster(creatureID, cr, scaleOptions);
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
            // Apply extra resistances from node attributes
            if (selectedNode.attributes?.extraResistances) {
                const extras = selectedNode.attributes.extraResistances.split(',').map((s: string) => s.trim()).filter(Boolean);
                if (extras.length) {
                    statblock.resistances = [...new Set([...(statblock.resistances || []), ...extras])];
                }
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

    // Add child button — generates a single node of the selected type and appends it
    $('#info-panel').on('click', '.button-add-child', function (e: JQuery.Event) {
        e.preventDefault();
        const childType = $(this).siblings('.add-child-select').val() as string;
        if (!childType || !objectTypes[childType]) return;

        if (!selectedNode.children) {
            selectedNode.children = [];
        }
        addChildToNode(childType, selectedNode);

        // Ensure the node has a children container and expand it
        const $nodeEl = selectedNode.domElement!;
        let $childrenContainer = $nodeEl.children('.node-children');
        if (!$childrenContainer.length) {
            // Add toggle and children container if this node didn't have children before
            if (!$nodeEl.children('.node-toggle').length) {
                $('<span class="node-toggle">▼</span>').prependTo($nodeEl);
            }
            $childrenContainer = $('<div class="node-children"></div>').appendTo($nodeEl);
        }
        $childrenContainer.show();
        $nodeEl.children('.node-toggle').html('▼');

        markUnsaved();
    });

    $('#info-panel').on('input change', 'input,select,textarea', function () {
        const attribute: string = $(this).attr('id');
        // Skip add-child selects — they don't represent node attributes
        if (!attribute || $(this).hasClass('add-child-select')) return;
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

        // Worship dropdown — handle custom option toggle
        if (attribute === 'worship') {
            const val = $(this)[0].value;
            if (val === '__custom__') {
                $('.worship-custom').show().focus();
                // Don't set the attribute to "__custom__" — wait for the text input
            } else {
                $('.worship-custom').hide();
                selectedNode.attributes!.worship = val;
            }
        }
        if (attribute === 'worship-custom') {
            selectedNode.attributes!.worship = $(this)[0].value;
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

        // When race changes, rebuild the lineage dropdown
        if (attribute === 'race' && selectedNode.attributes?.lineage !== undefined) {
            const newRaceKey = $(this)[0].value;
            const raceEntry = toolkit5eRaces.find(r => r.name === newRaceKey);
            const lineages = getLineages(raceEntry) ?? [];

            // Remove existing lineage label, select, and line break
            $('#info-panel label[for="lineage"]').next('select').next('br').remove();
            $('#info-panel label[for="lineage"]').next('select').remove();
            $('#info-panel label[for="lineage"]').remove();

            // Reset lineage on the node
            selectedNode.attributes!.lineage = '';

            if (lineages.length > 0) {
                const $raceBreak = $('#info-panel #race').next('br');
                const $lineageLabel = $('<label for="lineage">' + (labels['lineage'] || 'Lineage') + ': </label>');
                $lineageLabel.insertAfter($raceBreak);
                const $lineageSelect = $('<select id="lineage"></select>');
                $('<option value="">None</option>').appendTo($lineageSelect);
                for (const lineage of lineages) {
                    $('<option></option>').attr('value', lineage.name).html(lineage.name).appendTo($lineageSelect);
                }
                $lineageSelect.insertAfter($lineageLabel);
                $('<br>').insertAfter($lineageSelect);
            }
        }

        if (saved) {
            markUnsaved();
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
        currentSaveName = '';
        localStorage['currentWorld'] = stringifyNodes(rootNode);
    });

    $('#load-saved').on('input', function () {
        confirmSaved();
        currentSaveName = ($(this)[0] as HTMLInputElement).value;
        createWorldFromJSON(localStorage['world-' + currentSaveName]);
        localStorage['currentWorld'] = stringifyNodes(rootNode);
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

    $('#button-save').on('click', function () {
        saveWorld();
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

    $('#button-delete-selected').on('click', function () {
        // Can't delete the root node
        if (!selectedNode.parent) {
            alert("Cannot delete the root node.");
            return;
        }
        if (!confirm('Delete "' + (selectedNode.name || objectTypes[selectedNode.type].typeName) + '" and all its children?')) return;

        // Remove from parent's children array
        const parent = selectedNode.parent;
        const index = parent.children!.indexOf(selectedNode);
        if (index > -1) parent.children!.splice(index, 1);

        // Remove DOM element
        selectedNode.domElement!.remove();

        // Select the parent
        showInfoForNode(parent);
        markUnsaved();
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
            // Skip variant and lineage — they're rendered alongside their parent attribute
            if (attribute === 'variant' || attribute === 'lineage') continue;
            // Skip internal attributes that have no template definition or editor
            if (attribute === 'extraResistances' || attribute === 'dragonColor') continue;

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
            } else if (attribute === 'worship') {
                // Special worship dropdown with deities, domains, dedications, and custom option
                $input = $('<select id="worship" class="worship-select"></select>');
                const currentWorship = node.attributes[attribute] || '';

                // Gather options
                const deities = getRegisteredNodes('greaterDeity', 'lesserDeity', 'demigod');
                const domainNames = Object.values(deityDomains).map(d => d.name);
                const dedications = ['Lawful Good', 'Neutral Good', 'Chaotic Good', 'Law and Order', 'the Balance', 'Freedom', 'the Greater Good', 'the Natural Order'];

                // Check if current value matches any known option
                const allKnown = [
                    ...deities.map(d => d.name ?? d.type),
                    ...domainNames,
                    ...dedications
                ];
                const isCustom = currentWorship && !allKnown.includes(currentWorship);

                // Deities group
                if (deities.length > 0) {
                    const $deityGroup = $('<optgroup label="Deities"></optgroup>');
                    for (const deity of deities) {
                        const name = deity.name ?? deity.type;
                        const $opt = $('<option></option>').attr('value', name).html(name);
                        if (name === currentWorship) $opt.attr('selected', 'selected');
                        $opt.appendTo($deityGroup);
                    }
                    $deityGroup.appendTo($input);
                }

                // Domains group
                const $domainGroup = $('<optgroup label="Domains"></optgroup>');
                for (const domain of domainNames) {
                    const $opt = $('<option></option>').attr('value', domain).html(domain);
                    if (domain === currentWorship) $opt.attr('selected', 'selected');
                    $opt.appendTo($domainGroup);
                }
                $domainGroup.appendTo($input);

                // Dedications group
                const $dedGroup = $('<optgroup label="Dedications"></optgroup>');
                for (const ded of dedications) {
                    const $opt = $('<option></option>').attr('value', ded).html(ded);
                    if (ded === currentWorship) $opt.attr('selected', 'selected');
                    $opt.appendTo($dedGroup);
                }
                $dedGroup.appendTo($input);

                // Custom option
                const $customOpt = $('<option value="__custom__">Custom...</option>');
                if (isCustom) $customOpt.attr('selected', 'selected');
                $customOpt.appendTo($input);

                $input.insertAfter($label);

                // Custom text field (shown when "Custom..." is selected)
                const $customInput = $('<input type="text" id="worship-custom" class="worship-custom">').attr('value', isCustom ? currentWorship : '');
                if (!isCustom) $customInput.hide();
                $customInput.insertAfter($input);
                $('<br>').insertAfter($customInput);
                continue;
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

    // Lineage dropdown — shown after the race attribute when the race has lineages
    if (node.attributes?.lineage !== undefined && node.attributes?.race) {
        const raceEntry = toolkit5eRaces.find(r => r.name === node.attributes!.race);
        const raceLineages = raceEntry ? getLineages(raceEntry) : undefined;
        if (raceLineages?.length) {
            const $lineageLabel = $('<label for="lineage">' + (labels['lineage'] || 'Lineage') + ': </label>');
            $lineageLabel.appendTo($info);
            const $lineageSelect = $('<select id="lineage"></select>');
            $('<option value="">None</option>').appendTo($lineageSelect);
            for (const lineage of raceLineages) {
                const $option = $('<option></option>').attr('value', lineage.name).html(lineage.name);
                if (lineage.name === node.attributes.lineage) {
                    $option.attr('selected', 'selected');
                }
                $option.appendTo($lineageSelect);
            }
            $lineageSelect.insertAfter($lineageLabel);
            $('<br>').insertAfter($lineageSelect);
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
        // Pass race and lineage as indices for the monster scaler
        if (node.attributes?.race) {
            const raceIndex = toolkit5eRaces.findIndex(r => r.name === node.attributes!.race);
            if (raceIndex > 0) {
                creatureLink += '&race-select=' + raceIndex;
                const lineageName = node.attributes.lineage;
                if (lineageName && getLineages(toolkit5eRaces[raceIndex])) {
                    const lineageIndex = getLineages(toolkit5eRaces[raceIndex])!.findIndex(l => l.name === lineageName);
                    if (lineageIndex >= 0) creatureLink += '&lineage-select=' + lineageIndex;
                }
            }
        }
        // Pass extra resistances — triggers advanced options on the monster scaler
        if (node.attributes?.extraResistances) {
            creatureLink += '&advanced-options&extra-resists=' + encodeURIComponent(node.attributes.extraResistances);
        }
        $('<p><a href="' + creatureLink + '" target="_blank">View on monster scaler. (Opens in new window.)</a></p>').appendTo($info);
        $('<button class="button-view-statblock">View Statblock</button>').appendTo($info);
    }

    // ─── Add Child section ───
    const $addChildSection = $('<details class="add-child-section"></details>');
    $('<summary>Add Child</summary>').appendTo($addChildSection);

    // Valid children dropdown (from the node's type template)
    const templateChildren = objectTypes[node.type]?.children;
    if (templateChildren) {
        // Collect unique valid child types from the template
        const validTypes = new Set<string>();
        for (const child of templateChildren) {
            if (typeof child.type === 'string') {
                validTypes.add(child.type);
            } else {
                for (const t of Object.keys(child.type)) {
                    validTypes.add(t);
                }
            }
        }
        $('<label>Valid Types:</label>').appendTo($addChildSection);
        const $validRow = $('<div class="add-child-row"></div>');
        const $validSelect = $('<select class="add-child-select"></select>');
        const sortedValid = [...validTypes].sort((a, b) => (objectTypes[a]?.typeName || a).localeCompare(objectTypes[b]?.typeName || b));
        for (const t of sortedValid) {
            $('<option></option>').attr('value', t).html(objectTypes[t]?.typeName || capitalize(t)).appendTo($validSelect);
        }
        $validSelect.appendTo($validRow);
        $('<button class="button-add-child">Add</button>').appendTo($validRow);
        $validRow.appendTo($addChildSection);
    }

    // All types dropdown
    $('<label>All Types:</label>').appendTo($addChildSection);
    const $allRow = $('<div class="add-child-row"></div>');
    const $allSelect = $('<select class="add-child-select add-child-all"></select>');
    const allKeys = Object.keys(objectTypes).sort((a, b) => objectTypes[a].typeName.localeCompare(objectTypes[b].typeName));
    for (const t of allKeys) {
        $('<option></option>').attr('value', t).html(objectTypes[t].typeName).appendTo($allSelect);
    }
    $allSelect.appendTo($allRow);
    $('<button class="button-add-child">Add</button>').appendTo($allRow);
    $allRow.appendTo($addChildSection);

    $addChildSection.appendTo($info);
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
        const childTemplates = objectTypes[node.type]?.children;
        if (!childTemplates) break;
        for (const index in childTemplates) {
            const childTemplate = childTemplates[index];
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
    markUnsaved();
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
    const template = objectTypes[node.type];
    let labelText = template?.typeName ?? node.type;
    if (node.name && node.name.length) {
        labelText += ' (' + node.name + ')';
    }
    const hasChildren = !!template?.children;
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
        const shouldSave = confirm('You have unsaved changes. Save this world?');
        if (shouldSave) {
            saveWorld();
        }
    }
}

/** Saves the current world to localStorage. Prompts for a name if this is a new world. */
function saveWorld(): void {
    if (currentSaveName.length) {
        // Already has a save name — save over it
        localStorage['world-' + currentSaveName] = stringifyNodes(rootNode);
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

        currentSaveName = saveName;
        addWorldToList(saveName);
        localStorage['world-' + saveName] = stringifyNodes(rootNode);
    }
    saved = true;
}

/** Converts a node and all its children into a JSON string for save/export.
 *  Uses a replacer to skip non-serializable properties (domElement, parent)
 *  without mutating the live node tree. */
function stringifyNodes(node: WorldNode): string {
    return JSON.stringify(node, (key, value) => {
        if (key === 'domElement' || key === 'parent') return undefined;
        return value;
    });
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
    // Clean up stale "undefined" attribute keys from older saves
    if (parentNode.attributes && 'undefined' in parentNode.attributes) {
        delete parentNode.attributes['undefined'];
    }
    if (parentNode.children) {
        for (const index in parentNode.children) {
            parentNode.children[index].parent = parentNode;
            recursivePostParseProcess(parentNode.children[index]);
        }
    }
}
