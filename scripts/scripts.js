
$(function () {
    //TODO: Allow user to select a type of starting node if they only want to generate a single plane, world, continent, etc.
    //Start by creating a multiverse
    detailsForNode(generateNode('multiverse')).appendTo('#generation-container');
});

function generateNode(nodeType) {
    //Attributes and children will be generated on demand, so we need to remember if they've been generated or not
    var node = {
        type : nodeType,
        needsChildren : objectTypes[nodeType].children != undefined,
        needsAttributes : true
    };
    if (objectTypes[nodeType].name) {
        if (typeof(objectTypes[nodeType].name) === 'function') {
            node.name = objectTypes[nodeType].name();
        } else {
            node.name = randFromArray(objectTypes[nodeType].name)
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
                    detailsForNode(childNode).appendTo($(this));
                }
            }
        }
    }
}

//Generates an HTML details object for a given node
function detailsForNode(node) {
    $details = $('<details></details>');
    var summaryText = objectTypes[node.type].typeName;
    if (node.name) {
        summaryText+= ' ('+node.name+')';
    }
    $('<summary></summary>').html(summaryText).appendTo($details);
    $details.data('node', node);
    $details.on('toggle', onToggle);
    return $details;
}

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
        name: planarClusterNameGenerator
    },
    plane : {
        typeName : "Plane"
    }
};

function rand(min,max) {
    return Math.floor(Math.random() * (max-min) + min);
}

function randFromArray(array) {
    return array[rand(0, array.length-1)];
}

function planarClusterNameGenerator() {
    var name = "The ";
    name+= randFromArray(['Outer', 'Inner', 'Forgotten', 'Distant', 'Esoteric', 'Unknown']) + ' ';
    name+= randFromArray(['Planes', 'Realms', 'Cluster', 'Lands']);
    return name;
}