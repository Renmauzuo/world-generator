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
    //createRootNode('multiverse');
    createRootNode('planet');

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
    $('#info-panel h2').html(objectTypes[node.type].typeName)
    $info = $('#info-panel #fields');
    $info.empty();
    $('#name').attr('value', node.name || '');
    if (node.attributes) {
        for (var attribute in node.attributes) {
            $label = $('<label for="'+attribute+'">'+labels[attribute]+": </label>");
            $label.appendTo($info);
            //If the template attribute is an array create a picklist
            var $input;
            var templateAttribute = objectTypes[node.type].attributes[attribute];
            if (Array.isArray(templateAttribute)) {
                $input = $('<select id='+attribute+'></select>');
                for (var index in templateAttribute) {
                    $option = $('<option></option>').html(templateAttribute[index]).appendTo($input);
                    //If this is the current value select it
                    if (templateAttribute[index] === node.attributes[attribute]) {
                        $option.attr('selected',true);
                    }
                }
            //If it's not an array just check the type of the current value
            } else if (typeof(node.attributes[attribute]) === "string") {
                $input = $('<input type="text" id='+attribute+'>').attr('value',node.attributes[attribute]);
            }
            $input.insertAfter($label);
            $('<br>').insertAfter($input);

        }
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
        node.name = typeTemplate.nameGenerator(node,parent);
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
                if (childTemplate.requirement) {
                    valid = eval(childTemplate.requirement);
                }
                if (valid) {
                    var numChildren;
                    if (childTemplate.weightedRange) {
                        numChildren = weightedRand(childTemplate.weightedRange)
                    } else {
                        numChildren = rand(childTemplate.min,childTemplate.max);
                    }
                    for (var i = 0; i<numChildren; i++) {
                        addChildToNode(childTemplate.type,node);
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
//Since they reference their DOM objects the native JSON stringify can't be used without cloning and pruning the node tree first
function stringifyNodes(rootNode) {
    var rootCopy = {};
    Object.assign(rootCopy, rootNode);
    recursivePruneChildren(rootCopy);
    return JSON.stringify(rootCopy);
}

function recursivePruneChildren(rootNode) {
    delete rootNode.domElement;
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

/* Save/Load End */

/* Data begin */

//Common arrays that will be used by multiple objects
//TODO: Think about making each item a variable since they'll be referenced and compared a lot
var temperatureList = ["Mixed", "Cold", "Temperate", "Warm"];
var temperatureListNoMixed = ["Cold", "Temperate", "Warm"];
var alignmentList =  ["Lawful Good", "Neutral Good", "Chaotic Good", "Lawful Neutral", "True Neutral", "Chaotic Neutral", "Lawful Evil", "Neutral Evil", "Chaotic Evil"];
var elementList = ["None", "Fire", "Air", "Water", "Earth", "Positive Energy", "Negative Energy"];

var planarAttributes = {
    alignment: alignmentList,
    element: elementList
};

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
        ],
        attributes: planarAttributes
    },
    demiPlane : {
        typeName: "Demiplane",
        nameGenerator: planarNameGenerator,
        attributes: planarAttributes,
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
        ]
    },
    planarLayer: {
        typeName: "Planar Layer",
        attributes: planarAttributes,
        inheritAttributes: ["alignment","element"]
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
        ]
    },
    planet: {
        typeName: "Planet",
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
        ]
    },
    ocean : {
        typeName: "Ocean",
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
            temperature: temperatureList
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
            temperature: temperatureList
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
        ],
        attributes: {
            temperature: temperatureListNoMixed
        },
        inheritAttributes: ["temperature"]
    },
    reef: {
        typeName: 'Reef'
    },
    lagoon: {
        typeName: 'Lagoon'
    },
    openOcean: {
        typeName: 'Open Ocean'
    },
    abyssalTrench: {
        typeName: 'Abyssal Trench'
    },
    beach: {
        typeName: 'Beach'
    },
    lavaLake : {
        typeName: "Lava Lake"
    },
    continent: {
        typeName: "Continent",
        nameGenerator: continentNameGenerator,
        attributes: {
            temperature: temperatureList
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
        ]
    },
    sea: {
        typeName: 'Sea'
    },
    tundra: {
        typeName: 'Tundra'
    },
    tropicalForest: {
        typeName: "Tropical Forest"
    },
    deciduousForest: {
        typeName: "Deciduous Forest"
    },  
    coniferousForest: {
        typeName: 'Coniferous Forest'
    },
    coast: {
        typeName: "Coast"
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
    },
    land : {
        typeName: "Land"
    }
};

var labels = {
    alignment: "Alignment",
    element: "Element",
    temperature: "Temperature"    
};

/* Data End */

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


function continentNameGenerator(node, parent) {
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