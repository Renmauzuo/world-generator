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
});

function showInfoForNode(node) {
    selectedNode = node;
    $info = $('#info-panel');
    $info.empty();
    $('<h2>'+objectTypes[node.type].typeName+'</h2>').appendTo($info);
    $('<label for="name">Name: </label>').appendTo($info);
    $inputName = $('<input type="text" id="name">');
    if(node.name) {
        $inputName.attr('value', node.name);
    }
    $inputName.appendTo($info);
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
    if (typeTemplate.name) {
        node.name = typeTemplate.name();
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
            if (typeTemplate.inheritAttributes && typeTemplate.inheritAttributes.includes(attribute) && parent && parent.attributes[attribute]) {
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
                    var numChildren = rand(childTemplate.min,childTemplate.max);
                    for (var i = 0; i<numChildren; i++) {
                        var childNode = generateNode(childTemplate.type, node);
                        node.children.push(childNode);
                        domObjectForNode(childNode).appendTo($(this));
                    }
                }
            }
        }
    }
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
    $('#generation-container, #info-panel').empty();
    rootNode = JSON.parse(worldJSON);
    $('#generation-container').append(recursiveGenerateDOMElement(rootNode));
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
        name: planarClusterNameGenerator,
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
        name: planarNameGenerator,
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
        name: planarNameGenerator,
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
    planarLayer : {
        typeName: "Planar Layer",
        attributes: planarAttributes,
        inheritAttributes: ["alignment","element"]
    },
    materialPlane: {
        typeName: "Material Plane",
        name: materialPlaneNameGenerator,
        children: [
            {
                type: "planet",
                min: 1,
                max: 10 
            }
        ]
    },
    planet : {
        typeName: "Planet"
    },
    ocean : {
        typeName: "Ocean"
    },
    lavaLake : {
        typeName: "Lava Lake"
    },
    land : {
        typeName: "Land"
    }
};

var labels = {
    alignment: "Alignment",
    element: "Element",
    name: "Name"
};

/* Data End */

/* Child Validity Checks Begin */

/* Child Validity Checks End */

/* Helpers Begin */

function rand(min,max) {
    return Math.floor(Math.random() * (max-min+1) + min);
}

function randFromArray(array) {
    return array[rand(0, array.length-1)];
}

/* Helpers End */

/* Name Generators Begin */

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

/* Name Generators End */