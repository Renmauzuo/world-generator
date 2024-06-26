var rootNode;
var selectedNode;
//Start out true because user doesn't need to be prompted to save an unedited random world
var saved = true;
var currentSaveName = '';
var worldList;

$(function () {

    //Rather than storing all worlds under one object they are each their own local Storage entry and we save a list of them
    //This mitigates unnecessary JSON parsing and stringifying by letting us do one world at a time instead of all of them
    if (!localStorage['worldList']) {
        localStorage['worldList'] = '[]';
        worldList = [];
    } else {
        worldList = JSON.parse(localStorage['worldList']);
    }
    updateLoadList();

    //Start by creating a multiverse
    createRootNode('multiverse');

    $('body').on('click', 'details,p', function (e) {
        e.stopPropagation();
        showInfoForNode($(this).data('node'));
    });

    $('#info-panel').on('input', 'input,select', function () {
        var attribute = $(this).attr('id');
        //If its name changed then update the associated DOM element
        if (attribute === 'name') {
            var summaryText = objectTypes[selectedNode.type].typeName+' ('+$(this)[0].value+')';
            if (selectedNode.children) {
                selectedNode.domElement.children('summary').html(summaryText);
            } else {
                selectedNode.domElement.html(summaryText);
            }
            selectedNode.name = $(this)[0].value;
        } else {
            selectedNode.attributes[attribute] = $(this)[0].value;
        }
        if (saved) {
            saved = false;
        }
    });

    $('#button-generate-new').on('click', function () {
        confirmSaved();
        $('#generation-container').empty();
        createRootNode($('#starting-node')[0].value);
        $('#info-panel').empty();
        saved = true;
    });

    $('#load-saved').on('input', function () {
        confirmSaved();
        createWorldFromJSON(localStorage['world-'+$(this)[0].value]);
    });

    $('#button-import-root').on('click', function () {
        confirmSaved();
        var data = prompt("Please input the JSON for the objects to import:");
		if (data && data != "") {
            createWorldFromJSON(data);
        }
    });

    $('#button-export-root').on('click', function () {
        navigator.clipboard.writeText(stringifyNodes(rootNode)).then(function () {
            alert("Exported to clipboard!");
        });
    });

    $('#button-import-selected').on('click', function () {
        var data = prompt("Please input the JSON for the child to import:");
		if (data && data != "") {
            //createWorldFromJSON(data);
            var newChild = JSON.parse(data);
            //This might happen if the user pastes a child onto a type that normally doesn't have children
            if(!selectedNode.children) {
                selectedNode.children = [];
            }
            selectedNode.children.push(newChild);
            selectedNode.domElement.append(recursiveGenerateDOMElement(newChild));
        }
    });

    $('#button-export-selected').on('click', function () {
        navigator.clipboard.writeText(stringifyNodes(selectedNode)).then(function () {
            alert("Exported to clipboard!");
        });
    });

    showInfoForNode(rootNode);
});

function showInfoForNode(node) {
    selectedNode = node;
    var template = objectTypes[node.type];
    $('#info-panel h2').html(objectTypes[node.type].typeName)
    let $info = $('#info-panel #fields');
    $info.empty();
    $('#name').attr('value', node.name || '');
    if (node.attributes) {
        for (var attribute in node.attributes) {
            let $label = $('<label for="'+attribute+'">'+(labels[attribute]||capitalize(attribute))+": </label>");
            $label.appendTo($info);
            //If the template attribute is an array create a picklist
            let $input;
            var templateAttribute = attributeEditors[attribute] || template.attributes[attribute];
            if (Array.isArray(templateAttribute)) {
                $input = $('<select id='+attribute+'></select>');
                for (var index in templateAttribute) {
                    let $option = $('<option></option>').html(templateAttribute[index]).appendTo($input);
                    //If this is the current value select it
                    if (templateAttribute[index] === node.attributes[attribute]) {
                        $option.attr('selected',true);
                    }
                }
            //If it's not an array just check the type of the current value
            } else if (typeof(node.attributes[attribute]) === "string") {
                $input = $('<input type="text" id='+attribute+'>').attr('value',node.attributes[attribute]);
            } else {
                $input = $('<p>TBD</p>');
            }
            $input.insertAfter($label);
            $('<br>').insertAfter($input);

        }
    }
    if (template.referenceBook) {
        var referenceText = "For more information please see ";
        if (template.referencePage) {
            referenceText+= "page "+template.referencePage+" of ";
        }
        referenceText+=template.referenceBook+'.';
        $('<p>'+referenceText+'</p>').appendTo($info);
    }
}

/* Node Generation Begin */

function createRootNode(nodeType) {
    rootNode = generateNode(nodeType);
    domObjectForNode(rootNode).appendTo('#generation-container');
}

function generateNode(nodeType, parent) {
    //Children will be generated on demand, so we need to remember if they've been generated or not
    var typeTemplate = objectTypes[nodeType];
    var node = {
        type : nodeType,
        needsChildren : typeTemplate.children != undefined
    };
    if(parent) {
        node.parent = parent;
    }
    if (typeTemplate.attributes) {
        node.attributes = {};
        var typeAttributes = typeTemplate.attributes
        for (var attribute in typeAttributes) {
            /* 
             * If this is an inherit attribute then the value is the same as the parent's value
             * For example, an evil plane will only have evil layers and demiplanes
             * This is only enforced at generation, users can enter whatever values they want
             */
            if (shouldInheritAttribute(parent, typeTemplate, attribute)) {
                node.attributes[attribute] = parent.attributes[attribute];
            } else {
                //If it's not an inherited attribute generate a fresh value
                if (Array.isArray(typeAttributes[attribute])) {
                    node.attributes[attribute] = randFromArray(typeAttributes[attribute]);
                } else if (typeof(typeAttributes[attribute]) === 'function') {
                    node.attributes[attribute] = typeAttributes[attribute](node);   
                }
            }
        }
    }
    if (typeTemplate.nameGenerator) {
        node.name = typeTemplate.nameGenerator(node);
    }
    return node;
}

//Delegation doesn't seem to work with the toggle event so each details object gets it's event added individually
function onToggle() {
    var node = $(this).data('node');
    //If node is being opened see if children are needed
    if ($(this).attr('open')) {
        if(node.needsChildren) {
            saved = false;
            node.needsChildren = false;
            node.children = [];
            for (var index in objectTypes[node.type].children) {
                var childTemplate = objectTypes[node.type].children[index];
                var valid = true;
                //TODO: Remove this once old requirements are updated to the new way
                if (childTemplate.requirement) {
                    valid = eval(childTemplate.requirement);
                }
                if (childTemplate.prerequisites) {
                    for (var i = 0; i < childTemplate.prerequisites.length; i++) {
                        var prereq = childTemplate.prerequisites[i];
                        valid = valid && operators[prereq.operator](node.attributes[prereq.attribute],prereq.value);
                    }
                }
                if (valid) {
                    var numChildren;
                    if (childTemplate.weightedRange) {
                        numChildren = weightedRand(childTemplate.weightedRange)
                    } else {
                        numChildren = rand(childTemplate.min,childTemplate.max);
                    }
                    for (var i = 0; i<numChildren; i++) {
                        var childType;
                        if (typeof(childTemplate.type) === "object") {
                            //If it's an object treat it as a weighted array
                            childType = weightedRand(childTemplate.type);
                        } else {
                            childType = childTemplate.type;    
                        }
                        addChildToNode(childType,node);
                        if(childTemplate.requiredSibling) {
                            addChildToNode(childTemplate.requiredSibling, node);
                        }
                    }
                    //Reset queued name so it doesn't impact cousins or more distant nodes
                    queuedName = null;
                }
            }
        }
    }
}

function addChildToNode(childType, node) {
    var childNode = generateNode(childType, node);
    node.children.push(childNode);
    domObjectForNode(childNode).appendTo(node.domElement);
}

//Generates an HTML details object for a given node
function domObjectForNode(node) {
    var summaryText = objectTypes[node.type].typeName;
    if (node.name && node.name.length) {
        summaryText+= ' ('+node.name+')';
    }
    //If it has children then create a details group
    var $domElement;
    if (objectTypes[node.type].children) {
        $domElement = $('<details><summary>'+summaryText+'</summary></details>');        
        $domElement.on('toggle', onToggle);
    } else {
        //If it has no children then a simple p tag will do
        $domElement = $('<p>'+summaryText+'</p>');
    }
    $domElement.data('node', node);
    node.domElement = $domElement;
    return $domElement;
}

/* Node Generation End */

/* Save/Load Begin */

function confirmSaved() {
    if(!saved) {
        //If there are unsaved changes ask user if they want to save
        var shouldSave = confirm('You have unsaved changes. Save this world?');
        if (shouldSave) {
            //If this was loaded from a previous save just save over it, if not then prompt user for a new name
            if (currentSaveName.length) {

            } else {
                var promptMessage = "Please enter a name for this world.";
                var saveName;
                
                var valid;
                do {
                    saveName = prompt(promptMessage);
                    if (saveName.length == 0) {
                        promptMessage = "Name must not be empty. Please enter a name.";
                        valid = false;
                    } else if (worldList.includes(saveName)) {
                        promptMessage = "Please enter a unique name";
                        valid = confirm('This name already exists. Save over it?'); 
                    } else {
                        valid = true;
                    }
                } while (!valid)

                addWorldToList(saveName);
                localStorage['world-'+saveName] = stringifyNodes(rootNode);
            }
        }
    }
}

//Converts a node and all its children into a string for save/export
//Since they reference their DOM objects and parents the native JSON stringify can't be used without cloning and pruning the node tree first
function stringifyNodes(rootNode) {
    var rootCopy = {};
    Object.assign(rootCopy, rootNode);
    recursivePruneChildren(rootCopy);
    return JSON.stringify(rootCopy);
}

function recursivePruneChildren(rootNode) {
    delete rootNode.domElement;
    delete rootNode.parent;
    if (rootNode.children) {
        for (var index in rootNode.children) {
            recursivePruneChildren(rootNode.children[index]);
        }
    }
}

function addWorldToList(worldName) {
    if (!worldList.includes(worldName)) {
        worldList.push(worldName);
    }
    localStorage['worldList'] = JSON.stringify(worldList);
    updateLoadList();
}

//Updates the select for choosing a saved world
function updateLoadList () {
    if (worldList.length) {
        $('#load-saved').empty();
        $('<option>Select World</option>').appendTo('#load-saved');
        for (var i = 0; i < worldList.length; i++) {
            $('<option value="'+worldList[i]+'">'+worldList[i]+'</option>').appendTo('#load-saved');
        }
        $('#load-saved, #load-label').show();

    } else {
        $('#load-saved, #load-label').hide();
    }
}

//Parses JSON string, but also creates associated DOM objects and populates the generation container
//Called when loading or importing
function createWorldFromJSON(worldJSON) {
    $('#generation-container').empty();
    rootNode = JSON.parse(worldJSON);
    $('#generation-container').append(recursiveGenerateDOMElement(rootNode));
    showInfoForNode(rootNode);
}

function recursiveGenerateDOMElement(parentNode) {
    var $domElement = domObjectForNode(parentNode);
    if (parentNode.children) {
        for (var index in parentNode.children) {
            $domElement.append(recursiveGenerateDOMElement(parentNode.children[index]))
        }
    } 
    return $domElement;
}

//Pardon the alliteration, but this recursively goes through the list and does some adjustments after parsing from JSON
//For example, establishing bidirectional links between objects that have to be severed before JSON stringifying 
function recursivePostParseProcess(parentNode) {
    if (parentNode.children) {
        for (var index in parentNode.children) {
            parentNode.children[index].parent = parentNode;
            recursivePostParseProcess(parentNode.children[index]);
        }
    }
}

/* Save/Load End */

/* Data begin */

//Common arrays that will be used by multiple objects
//TODO: Think about making each item a variable since they'll be referenced and compared a lot
const populationDensity = {
    uninhabited: "Uninhabited",
    low: "Low",
    average: "Average",
    high: "High"
};

const book = {
    monsterManual: "the Monster Manual"
};

const temperatureList = ["Cold", "Temperate", "Warm"];
const alignmentList =  ["Lawful Good", "Neutral Good", "Chaotic Good", "Lawful Neutral", "True Neutral", "Chaotic Neutral", "Lawful Evil", "Neutral Evil", "Chaotic Evil"];
const elementList = ["None", "Fire", "Air", "Water", "Earth", "Positive Energy", "Negative Energy"];

const categoryAttributes = {
    geography : {
        populationDensity: populationDensityValue,
        racialDemographics: racialDemographicsValue
    },
    plane: {
        alignment: alignmentList,
        element: elementList
    },
    settlement: {
        racialDemographics: racialDemographicsValue
    }
};

var races = {
    dragonborn: {
        str:2,
        cha: 1
    },
    dwarf: {
        str: 2
    },
    elf: {
        dex:2
    },
    gnome: {
        int:2
    },
    //TODO: Allow 2 random (or class based) ability score increases
    halfElf: {
        con: 1,
        dex: 1,
        cha: 2
    },
    human : {
        str: 1,
        dex: 1,
        con: 1,
        int: 1,
        wis: 1,
        cha: 1
    }
}

var objectTypes = {
    multiverse : {
        typeName : "Multiverse",
        children: [
            {
                type: "planarCluster",
                min: 1,
                max: 3
            }
        ]
    },
    planarCluster : {
        typeName: "Planar Cluster",
        nameGenerator: planarClusterNameGenerator,
        children: [
            {
                type: "materialPlane",
                min: 0,
                max: 2
            },
            {
                type: "plane",
                min: 4,
                max: 10
            },
            {
                type: "demiPlane",
                min: 0,
                max: 10
            }
        ]
    },
    plane : {
        typeName : "Plane",
        categories: ['plane'],
        nameGenerator: planarNameGenerator,
        children: [
            {
                type: "planarLayer",
                min: 1,
                max: 10
            },
            {
                type: "demiPlane",
                min: 0,
                max: 10
            }
        ]
    },
    demiPlane : {
        typeName: "Demiplane",
        categories: ['plane'],
        nameGenerator: planarNameGenerator,
        inheritAttributes: ["alignment","element"],
        children: [
            {
                type: "land",
                min: 1,
                max: 1,
                requirement: "node.attributes.element !== 'Water'"
            },
            {
                type: "ocean",
                min: 1,
                max: 1,
                requirement: "node.attributes.element === 'Water'"
            },
            {
                type: "lavaLake",
                min: 0,
                max: 1,
                requirement: "node.attributes.element === 'Fire'"
            }
            //TODO: More demiplane geography
        ]
    },
    planarLayer: {
        typeName: "Planar Layer",
        categories: ['plane'],
        inheritAttributes: ["alignment","element"]
        //TODO: Planar layer geography
    },
    materialPlane: {
        typeName: "Material Plane",
        nameGenerator: materialPlaneNameGenerator,
        children: [
            {
                type: "planet",
                min: 1,
                max: 10 
            }
            //TODO: Moons, maybe? Or other celestial bodies
        ]
    },
    planet: {
        typeName: "Planet",
        categories: ["geography"],
        children: [
            {
                type: "ocean",
                min: 1,
                max: 4
            },
            //1-7 continents but weighted toward the middle
            {
                type: "continent",
                weightedRange: {1:1,2:2,3:3,4:3,5:2,6:1,7:1}
            }
        ],
    },
    ocean : {
        typeName: "Ocean",
        categories: ["geography"],
        children: [
            {
                type: 'archipelago',
                min: 0,
                max: 3
            },
            {
                type: 'island',
                min: 0,
                max: 5
            },
            {
                type: 'openOcean',
                min: 1,
                max: 3
            },
            {
                type: 'abyssalTrench',
                min: 0,
                max: 3
            },
            {
                type: 'reef',
                min: 0,
                max: 5,
                requirement: "node.attributes.temperature === 'Warm'",
            }
        ],
        attributes: {
            temperature: arrayWithMixed(temperatureList)
        }
    },
    archipelago: {
        typeName: "Archipelago",
        children: [
            {
                type: "island",
                min: 5,
                max: 20
            }
        ],
        attributes: {
            temperature:  arrayWithMixed(temperatureList)
        },
        inheritAttributes: ["temperature"]
    },
    island: {
        typeName: 'Island',
        children: [
            {
                type: 'reef',
                min: 0,
                max: 1,
                requirement: "node.attributes.temperature === 'Warm'",
                requiredSibling: 'lagoon'
            },
            {
                type: 'beach',
                min: 1,
                max: 2
            }
            //TODO: Island villages
        ],
        attributes: {
            temperature: temperatureList
        },
        inheritAttributes: ["temperature"]
    },
    reef: {
        typeName: 'Reef'
        //TODO: Reef children
    },
    lagoon: {
        typeName: 'Lagoon'
        //TODO: Lagoon children
    },
    openOcean: {
        typeName: 'Open Ocean'
        //TODO: Open ocean children
    },
    abyssalTrench: {
        typeName: 'Abyssal Trench'
        //TODO: Abyssal Trench children
    },
    beach: {
        typeName: 'Beach'
        //TODO: Beach children
    },
    lavaLake : {
        typeName: "Lava Lake"
        //TODO: Lava lake children
    },
    continent: {
        typeName: "Continent",
        categories: ["geography"],
        nameGenerator: continentNameGenerator,
        attributes: {
            temperature: temperatureList,
        },
        children: [
            {
                type: 'sea',
                min: 0,
                max: 2
            },
            {
                type: 'tropicalForest',
                min: 0,
                max: 5,
                requirement: "node.attributes.temperature === 'Warm' || node.attributes.temperature === 'Mixed'"
            },
            {
                type: 'deciduousForest',
                min: 0,
                max: 5,
                requirement: "node.attributes.temperature === 'Temperate' || node.attributes.temperature === 'Mixed'"
            },
            {
                type: 'coniferousForest',
                min: 0,
                max: 5,
                requirement: "node.attributes.temperature !== 'Warm'"
            },
            {
                type: 'tundra',
                min: 0,
                max: 5,
                requirement: "node.attributes.temperature === 'Cold' || node.attributes.temperature === 'Mixed'"
            },
            {
                type: 'coast',
                min: 1,
                max: 3
            },
            {
                type: 'mountainRange',
                min: 0,
                max: 3
            }
            //TODO: More geography, hills, plains, etc
        ]
    },
    sea: {
        typeName: 'Sea'
        //TODO: Sea children
    },
    tundra: {
        typeName: 'Tundra'
        //TODO Tundra children
    },
    tropicalForest: {
        typeName: "Tropical Forest"
        //TODO: Forest children
    },
    deciduousForest: {
        typeName: "Deciduous Forest"
        //TODO: Forest children
    },  
    coniferousForest: {
        typeName: 'Coniferous Forest'
        //TODO: Forest children
    },
    coast: {
        typeName: "Coast",
        categories: ['geography'],
        children: [
            {
                type: 'beach',
                min: 1,
                max: 3    
            },
            {
                type: 'coastalCliff',
                min: 0,
                max: 3
            },
            {
                type: {coastalCitySmall: 1, coastalTownLarge: 9, coastalTownSmall: 30, coastalVillage: 25, coastalHamlet: 20, coastalThorp: 15},
                min: 1,
                max: 1,
                prerequisites: [
                    {
                        attribute: 'populationDensity',
                        operator: '==',
                        value: populationDensity.low
                    }
                ]
            },
            {
                type: {coastalMetropolis: 1, coastalCityLarge: 4, coastalCitySmall: 10, coastalTownLarge: 15, coastalTownSmall: 20, coastalVillage: 20, coastalHamlet: 20, coastalThorp: 10},
                min: 1,
                max: 3,
                prerequisites: [
                    {
                        attribute: 'populationDensity',
                        operator: '==',
                        value: populationDensity.average
                    }
                ]
            },
            {
                type: {coastalMetropolis: 5, coastalCityLarge: 15, coastalCitySmall: 20, coastalTownLarge: 20, coastalTownSmall: 15, coastalVillage: 10, coastalHamlet: 9, coastalThorp: 6},
                min: 2,
                max: 4,
                prerequisites: [
                    {
                        attribute: 'populationDensity',
                        operator: '==',
                        value: populationDensity.high
                    }
                ]
            }
        ]
    },
    coastalCliff: {
        typeName: "Coastal Cliff"
        //TODO; Cliff children
    },
    //TODO: Coastal settlement children
    coastalMetropolis: {
        typeName: "Coastal Metropolis",
        categories: ['settlement'],
        children: [
            {
                type: 'districtTemple',
                min: 1,
                max: 2
            }
        ]
    },
    coastalCityLarge: {
        typeName: "Large Coastal City",
        categories: ['settlement'],
        children: [
            {
                type: 'districtTemple',
                weightedRange: {1:75, 2:25}
            }
        ]
    },
    coastalCitySmall: {
        typeName: "Small Coastal City",
        categories: ['settlement'],
        children: [
            {
                type: 'districtTemple',
                min: 1,
                max: 1
            }
        ]
    },
    coastalTownLarge: {
        typeName: "Large Coastal Town",
        categories: ['settlement'],
        children: [
            {
                type: 'temple',
                min: 1,
                max: 2
            }
        ]
    },
    coastalTownSmall: {
        typeName: "Small Coastal Town",
        categories: ['settlement'],
        children: [
            {
                type: 'temple',
                min: 0,
                max: 1
            }
        ]
    },
    coastalVillage: {
        typeName: "Coastal Village",
        categories: ['settlement'],
        children: [
            {
                type: 'temple',
                min: 0,
                max: 1
            }
        ]
    },
    coastalHamlet: {
        typeName: "Coastal Hamlet",
        categories: ['settlement']
    },
    coastalThorp: {
        typeName: "Coastal Thorp",
        categories: ['settlement']
    },
    districtTemple: {
        typeName: "Temple District",
        children: [
            {
                type: 'temple',
                min: 2,
                max: 3
            }
        ]
    },
    temple: {
        typeName: "Temple",
        children: [
            {
                type: 'npcAcolyte',
                min: 5,
                max: 20
            }
        ]
    },
    mountainRange: {
        typeName: "Mountain Range",
        children: [
            {
                type: 'mountain',
                min: 5,
                max: 20
            }
        ]
    },
    mountain: {
        typeName: 'Mountain'
        //TODO: Mountain children
    },
    land : {
        //TODO: Remove when no longer needed. This was just a generic placeholder for testing
        typeName: "Land"
    },
    //NPCs from Monster Manual Appendix
    npcAcolyte: {
        typeName: "Acolyte",
        referenceBook: book.monsterManual,
        referencePage: 342
    }
};

//Add category attributes
for (var type in objectTypes) {
    var typeTemplate = objectTypes[type];
    if (typeTemplate.categories) {
        if (!typeTemplate.attributes) {
            typeTemplate.attributes = {};
        }
        for (var index in typeTemplate.categories) {
            Object.assign(typeTemplate.attributes, categoryAttributes[typeTemplate.categories[index]]);
        }
    }
}

//By default the editor for an attribute (input, select, etc) will be set based on the attribute's value
//In some cases this won't work, however, such as when an attribute is generated by a function or we want the user to be able to pick from a wider range of non-default options 
var attributeEditors = {
    populationDensity: [populationDensity.uninhabited, populationDensity.low, populationDensity.average, populationDensity.high]
};

var labels = {
    populationDensity: "Population Density",
    racialDemographics: "Racial Demographics",
    dominantRace: "Dominant Race"
};

/* Data End */

/* Attribute Value Generators */

/*
 * Some attributes have fairly complex rules for generation that require a function to set them
 */

function populationDensityValue(node) {
    if (node.parent && node.parent.attributes && node.parent.attributes.populationDensity) {
        var inheritedDensityWeight = {};
        switch(node.parent.attributes.populationDensity) {
            case populationDensity.uninhabited:
                //Uninhabited areas can only have uninhabited children
                return populationDensity.uninhabited;
            case populationDensity.low:
                inheritedDensityWeight[populationDensity.uninhabited] = 25;
                inheritedDensityWeight[populationDensity.low] = 50;
                inheritedDensityWeight[populationDensity.average] = 25;
                break;
            case populationDensity.average:
                inheritedDensityWeight[populationDensity.low] = 25;
                inheritedDensityWeight[populationDensity.average] = 50;
                inheritedDensityWeight[populationDensity.high] = 25;
                break;
            case populationDensity.high:
                inheritedDensityWeight[populationDensity.average] = 25;
                inheritedDensityWeight[populationDensity.high] = 50;
                break;             
        }
        return weightedRand(inheritedDensityWeight);
    }
    var defaultDensityWeight = {};
    defaultDensityWeight[populationDensity.uninhabited] = 5;
    defaultDensityWeight[populationDensity.low] = 20;
    defaultDensityWeight[populationDensity.average] = 50;
    defaultDensityWeight[populationDensity.high] = 25;
    return weightedRand(defaultDensityWeight);
}

function racialDemographicsValue(node) {
    //Inherit parent racial demographics
    if (node.parent && node.parent.attributes && node.parent.attributes.racialDemographics) {
        //Copy parent value
        //TODO: Allow slight modification so not all regions have uniform demographics
        return Object.assign({},node.parent.attributes.racialDemographics);
    }
    var newDemographics = {};
    for (var race in races) {
        newDemographics[race] = rand(0,30);
    }
    return newDemographics;
}

/* End Attribute Value Generators */

/* Helpers Begin */

function rand(min,max) {
    return Math.floor(Math.random() * (max-min+1) + min);
}

function randFromArray(array) {
    return array[rand(0, array.length-1)];
}

function weightedRand(weights) {
    var weightTotal = 0;
    var i, sum=0, r=Math.random();
    for (i in weights) {
        weightTotal+=weights[i];
    }
    for (i in weights) {
      sum += weights[i]/weightTotal;
      if (r <= sum) return i;
    }
}

function shouldInheritAttribute(parent, template, attribute) {
    //Check if this is an inherited attribute for this type
    if (!template.inheritAttributes || !template.inheritAttributes.includes(attribute)) {
        return false;
    }

    //Make sure there is a parent with this attribute
    if (!parent || !parent.attributes || !parent.attributes[attribute]) {
        return false;
    }

    //If parent has a "mixed" value let child choose for itself
    if (parent.attributes[attribute] == "Mixed") {
        return false;
    }

    return true;
}

function capitalize(string) {
    return string.substring(0,1).toUpperCase() + string.substring(1);
}

function spacesFromCamelCase(string) {
    return string.replace(/([A-Z])/g, ' $1');
}

//Simply prefixes "mixed" to an array of possible values
//This is mostly done for heritable values and allows children of a node to have mixed values rather than all inheriting from the parent
function arrayWithMixed(array) {
    return ["Mixed"].concat(array);
}

var operators = {
    "==" : function(a,b) {
        return a==b;
    },
    "!=" : function(a,b) {
        return a!=b;
    }
}

/* Helpers End */

/* Name Generators Begin */

//Sometimes an element's name will impact a sibling. This stores queued names.
var queuedName;

function planarClusterNameGenerator() {
    var name = "The ";
    name+= randFromArray(['Outer', 'Inner', 'Forgotten', 'Distant', 'Esoteric', 'Unknown']) + ' ';
    name+= randFromArray(['Planes', 'Realms', 'Cluster', 'Lands']);
    return name;
}

function planarNameGenerator(node) {
    var alignmentGood = node.attributes.alignment.includes("Good");
    var alignmentEvil = node.attributes.alignment.includes("Evil");
    var alignmentLawful = node.attributes.alignment.includes("Lawful");
    var alignmentChaotic = node.attributes.alignment.includes("Chaotic");
    //TODO: Add name schemes other than "The X of Y"
    var name = "The ";
    
    //Start with some generic location types
    var placeOptions = ["Realm", "Kingdom"];

    if (node.type === "plane") {
        placeOptions = placeOptions.concat("Plane");
    } else if (node.type === "demiPlane") {
        placeOptions = placeOptions.concat("Demiplane");
    }

    //Add some additional ones based on element
    if (node.attributes.element === "Water") {
        placeOptions = placeOptions.concat(["Sea", "Ocean", "Lake", "Islands", "Abyss", "Waters"]);
    } else if (node.attributes.element === "Air") {
        placeOptions = placeOptions.concat(["Clouds"]);
    } else {
        placeOptions = placeOptions.concat(["Land"]);
    }

    //Or alignment
    if (alignmentGood) {
        placeOptions = placeOptions.concat(["Heaven", "Paradise"]);
    } else if (alignmentEvil) {
        placeOptions = placeOptions.concat(["Hell"]);
    }
    
    name+= randFromArray(placeOptions) + ' of ';
    
    //Start with some generic options just in case this plane is none/none
    var domainOptions = ["the Forgotten", "the Unknown"];
    if (node.attributes.element === "Fire") {
        domainOptions = domainOptions.concat(["Fire", "Ash", "Lava", "Embers", "Cinders"]);
    } else if (node.attributes.element === "Earth") {
        domainOptions = domainOptions.concat(["Earth", "Stone", "Rock"]);
    } else if (node.attributes.element === "Air") {
        domainOptions = domainOptions.concat(["Air", "Sky", "Clouds"]);
    } else if (node.attributes.element === "Water") {
        domainOptions = domainOptions.concat(["Water", "the Depths"]);
    } else if (node.attributes.element === "Positive Energy") {
        domainOptions = domainOptions.concat(["Life", "Growth"]);
    } else if (node.attributes.element === "Negative Energy") {
        domainOptions = domainOptions.concat(["Death", "Decay", "Undeath", "the Dead"]);
    }

    if (alignmentGood) {
        domainOptions = domainOptions.concat(["Hope", "Courage", "Love", "Angels"]);
        if (alignmentChaotic) {
            domainOptions = domainOptions.concat("Eladrin");
        } else if(alignmentLawful) {
            domainOptions = domainOptions.concat("Archons");
        } else {
            domainOptions = domainOptions.concat("Guardinals");
        }
    } else if (alignmentEvil) {
        domainOptions = domainOptions.concat(["Hate", "War", "Torment"]);
        if (alignmentChaotic) {
            domainOptions = domainOptions.concat("Demons");
        } else if(alignmentLawful) {
            domainOptions = domainOptions.concat("Devils");
        } else {
            domainOptions = domainOptions.concat("Fiends");
        }
    }

    if (alignmentLawful) {
        domainOptions = domainOptions.concat(["Order", "Law"]);
    } else if (alignmentChaotic) {
        domainOptions = domainOptions.concat(["Disorder", "Chaos"]);
    }
    name+= randFromArray(domainOptions);
    //TODO: Maybe add a check to avoid names like "The Clouds of Clouds"
    //On the other hand, those could be funny. "Tainted Elven Gloves of Tainting" were a popular CoN drop.
    return name;
}

function materialPlaneNameGenerator(node) {
    return "The " + randFromArray(["Prime", "Lost", "Unknown", "Forgotten", "Major", "Minor", "Mortal"]) + " Material Plane";
}


function continentNameGenerator(node) {
    var name;
    if (queuedName) {
        name = queuedName;
        queuedName = null;
        return name;
    }

    name = randFromArray(['Am', 'Eur', 'In', 'Af', 'Aus', 'An', 'Od', 'Fay', 'Kun', 'Al', 'Vel', 'Kal', 'Tor', 'Pan', 'Ess']);

    var midSyllableCount = rand(0,2);

    var midSyllables= ['er', 'ic', 'ric', 'ral', 'ar', 'on', 'io', 'im', 'ton', 'd'];
    for (var i = 0; i < midSyllableCount; i++) {
        name+=randFromArray(midSyllables);
    }

    name+= randFromArray(['ca', 'ope', 'ia']);

    if (rand(1,5) === 1) {
        var northSouth = rand(0,1) === 1;
        queuedName = (northSouth ? 'South' : 'East') + ' ' + name;
        name = (northSouth ? 'North' : 'West') + ' ' + name;
    }

    return name;
}

/* Name Generators End */