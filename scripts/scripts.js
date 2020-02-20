var rootNode;
var selectedNode;

$(function () {
    //TODO: Allow user to select a type of starting node if they only want to generate a single plane, world, continent, etc.
    //Start by creating a multiverse
    rootNode = generateNode('multiverse');
    domObjectForNode(rootNode).appendTo('#generation-container');

    $('body').on('click', 'details,p', function (e) {
        e.stopPropagation();
        showInfoForNode($(this).data('node'));
    });

    $('#info-panel').on('input', 'input,select', function () {
        var attribute = $(this).attr('id');
        selectedNode.attributes[attribute] = $(this)[0].value;
        //If its name changed then update the associated DOM element
        if (attribute === 'name') {
            var summaryText = objectTypes[selectedNode.type].typeName+' ('+$(this)[0].value+')';
            if (selectedNode.children) {
                selectedNode.domElement.children('summary').html(summaryText);
            } else {
                selectedNode.domElement.html(summaryText);
            }
        }
    });
});

function showInfoForNode(node) {
    selectedNode = node;
    $info = $('#info-panel')
    $info.empty();
    $('<h2>'+objectTypes[node.type].typeName+'</h2>').appendTo($info);
    if (node.attributes) {
        for (var attribute in node.attributes) {
            $('<label for="'+attribute+'">'+labels[attribute]+": </label>").appendTo($info);
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
            $input.appendTo($info);
            $('<br>').appendTo($info);

        }
    }
}

/* Node Generation Begin */

function generateNode(nodeType) {
    //Attributes and children will be generated on demand, so we need to remember if they've been generated or not
    var node = {
        type : nodeType,
        needsChildren : objectTypes[nodeType].children != undefined
    };
    if (objectTypes[nodeType].attributes) {
        node.attributes = {};
        var typeAttributes = objectTypes[nodeType].attributes
        for (var attribute in typeAttributes) {
            if (Array.isArray(typeAttributes[attribute])) {
                node.attributes[attribute] = randFromArray(typeAttributes[attribute]);
            } else if (typeof(typeAttributes[attribute]) === 'function') {
                node.attributes[attribute] = typeAttributes[attribute]();   
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
            node.needsChildren = false;
            node.children = [];
            for (var childType in objectTypes[node.type].children) {
                var range = objectTypes[node.type].children[childType];
                var numChildren = rand(range[0],range[1]);
                for (var i = 0; i<numChildren; i++) {
                    var childNode = generateNode(childType);
                    node.children.push(childNode);
                    domObjectForNode(childNode).appendTo($(this));
                }
            }
        }
    }
}

//Generates an HTML details object for a given node
function domObjectForNode(node) {
    //If it has children then create a details group
    var summaryText = objectTypes[node.type].typeName;
    if (node.attributes && node.attributes.name) {
        summaryText+= ' ('+node.attributes.name+')';
    }
    var $domElement;
    if (objectTypes[node.type].children) {
        $domElement = $('<details></details>');
        
        $('<summary></summary>').html(summaryText).appendTo($domElement);
        $domElement.on('toggle', onToggle);
    } else {
        //If it has no children then a simple p tag will do
        $domElement = $('<p></p>').html(summaryText);
    }
    $domElement.data('node', node);
    node.domElement = $domElement;
    return $domElement;
}

/* Node Generation End */

/* Data begin */

//Common arrays that will be used by multiple objects
var alignmentList =  ["Lawful Good", "Neutral Good", "Chaotic Good", "Lawful Neutral", "True Neutral", "Chaotic Neutral", "Lawful Evil", "Neutral Evil", "Chaotic Evil"];

var objectTypes = {
    multiverse : {
        typeName : "Multiverse",
        children: {
            planarCluster: [1, 3]
        }
    },
    planarCluster : {
        typeName: "Planar Cluster",
        children: {
            plane: [4, 20]
        },
        attributes: {
            name: planarClusterNameGenerator
        }
    },
    plane : {
        typeName : "Plane",
        children: {
            planarLayer: [1, 10]
        },
        attributes: {
            alignment: alignmentList,
            element: ["None", "Fire", "Air", "Water", "Earth", "Positive Energy", "Negative Energy"]
        }
    },
    planarLayer : {
        typeName: "Planar Layer"
    }
};

var labels = {
    alignment: "Alignment",
    element: "Element",
    name: "Name"
};

/* Data End */

/* Helpers Begin */

function rand(min,max) {
    return Math.floor(Math.random() * (max-min) + min);
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

function planarNameGenerator() {

}

/* Name Generators End */