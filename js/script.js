"use strict";

///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////
/*****************

DIGITAL INTERACTIVE MANUSCRIPT ENGINE (DIME)
Author: Chip Limeburner

The Digital Interactive Manuscript Engine (DIME) is a platform designed to streamline the process of creating interactive digital versions
of interactive books. Using simple drag-and-drop interfaces, DIME allows users to integrate their diagrams as a single integrated HTML file.

******************/
///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////
/******************

FUNCTIONS FOUND IN THIS DOCUMENT:

preload()
setup()
draw()

mousePressed() - tracks mouse position based on certain prerequisites
mouseReleased() - stops tracking the mouse on release
clearTracking() - stops tracking all parameters
detectClick(incomingX, incomingY, incomingLayer) - determines if a click happened in an opaque part of a given image layer
getGrabbedObject() - identify the layer that has been clicked on
checkMoveAction() - check for events to move the layer
checkScaleAction() - check for events to scale the layer
checkRotOriginAction() - check for events to move the rotational origin
checkTransPathAction() - check fro events to move the points defining the axis of translation
updateDrag() - moves the canvas at each frame based on how much the mouse has moved
updateActiveLayer() - updates active layer properties based on moving and scaling actions
updateLiveParameters() - updates values for layers that dictate their transform while under manipulation in live mode
drawLayerImages() - iterates through the layers, drawing their images
drawTransformPoints() - draws the corner and edge points for scaling actions
drawRotationalOrigin() - draws the origin around which the layer will rotate if it's a rotational layer
drawTranslationPath() - draws the points and line that define the path of translation if it's a translation layer
createNewLayer() - initializes new layers
tabSelector(tab) - makes tab the active layer and updates the toolbar to reflect as such
moveLayerUp(clickedButton) - swaps the position of tab with the layer above it
moveLayerDown(clickedButton) - swaps the position of tab with the layer below it
deleteLayer(clickedButton) - deletes layers when you click their "x" button
updateName(event) - updates the active layer's name
updateImage() - updates the active layer's image when one is uploaded
updateType() - updates the active layer's type
updateFollow() - updates the respective parent and child relationships when one layer is parented to another
updateXOrigin(event) - updates layer X origin when you set it from the toolbar
updateYOrigin(event) - updates layer Y origin when you set it from the toolbar
updateHeight(event) - updates layer height when you set it from the toolbar
updateWidth(event) - updates layer width when you set it from the toolbar
updateRotXOrigin(event) - updates layer rotational X origin when you set it from the toolbar
updateRotYOrigin(event) - updates layer rotational Y origin when you set it from the toolbar
updateSlideStartX(event) - updates layer translation starting X origin when you set it from the toolbar
updateSlideStartY(event) - updates layer translation starting Y origin when you set it from the toolbar
updateSlideEndX(event) - updates layer translation ending X origin when you set it from the toolbar
updateSlideEndY(event) - updates layer translation ending Y origin  when you set it from the toolbar
setActiveLayer(tab) - makes the arrangements to set tab as the active layer
setToolbarProperties() - updates the toolbar to display the active layer's properties
updateToolbarTransform() - updates the toolbar sidebar when a transformation is carried out
updateRotationalTransform() - updates the sidebar values for the rotational origin
updateTranslationTransform() - updates the sidebar values for the points that define the path of translation
swapToolMode(element, mode) - swap to the appropriate tool mode when element is clicked
displayLayerList() - draws the HTML elements based on the layers[] array
exportDiagram() - compiles and downloads an HTML file of the interactive diagram
zoomIn() - increments the scale of the canvas
zoomHundred() - zooms the canvas to a scale of 1
zoomOut() - decrements the scale of the canvas

******************/
///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

let version = "0.9.1"; //version number

let canvasWidth; //canvas width
let canvasHeight; //canvas height

let cnv; //variable to hold the canvas
let cnvX; //the canvas' X position
let cnvY; // the canvas' Y position

let layers = []; //an array of our layer objects
let activeLayer = 0; //the current active layer object
let layerCounter = 1; //a variable used for initializing and tracking total number of layers

//variables for tracking what physical proprties should be tracked at a given moment
let dragTracking = false;
let moveTracking = false;
let leftScaleTracking = false;
let rightScaleTracking = false;
let topScaleTracking = false;
let bottomScaleTracking = false;
let rotOriginTracking = false;
let transStartTracking = false;
let transEndTracking = false;

//variables for manipulating mouse position data
let scaledMouseX = 0;
let scaledMouseY = 0;
let mouseOffsetX;
let mouseOffsetY;
let dragOffsetX;
let dragOffsetY;

let interfaceToolMode = "edit"; //variable to track which tool mode is active

//variables for live mode manipulation tracking
let grabbedLayer = undefined;
let initialAngle = undefined;
let deltaAngle = undefined;
let initialDisplacement = undefined;
let deltaDisplacement = undefined;

//variables to help with exporting the diagram
let newHTMLDocument;
let exportURL;

let scaleExp = 0; //exponent by which to scale the canvas element
let scaleFactor = 1; //factor by which to scale the canvas
let transformPointSize = 10; //size for the transform points in edit mode


function preload() {

}


function setup() {
  //prompt user for desired canvas dimensions
  canvasWidth = parseInt(prompt("Please input the desired width of your diagram in px:"));
  canvasHeight = parseInt(prompt("Please input the desired height of your diagram in px:"));

  cnv = createCanvas(canvasWidth, canvasHeight); //create the canvas
  cnv.parent(`viewport-pane`); //position canvas in the HTML framework
  cnv.background(`rgba(0, 0, 0, 0)`); //set canvas background

  //center the canvas
  cnvX = ((windowWidth - width) - 300)/2;
  cnvY = (windowHeight - height)/2;
  cnv.position(cnvX, cnvY);

  angleMode(DEGREES); //set angle mode to degrees because I just don't like radians
}


function draw() {
  //update the canvas position
  cnv.position(cnvX, cnvY);

  background(0); //set background to black

  $("#heads-up-mode").html(`Tool mode: ${interfaceToolMode}`); //update the heads-up tool mode indicator

  //display the canvas at the appropriate scale
  scaleFactor = Math.pow(0.9, scaleExp);
  scaledMouseX = mouseX/scaleFactor;
  scaledMouseY = mouseY/scaleFactor;
  transformPointSize = 10/scaleFactor;
  $("#defaultCanvas0").css("transform", `scale(${scaleFactor})`);

  //update graphics in edit mode while some parameter is being tracked
  if(moveTracking || topScaleTracking || bottomScaleTracking || leftScaleTracking || rightScaleTracking || rotOriginTracking || transStartTracking || transEndTracking) {
    updateActiveLayer(); //updates transform information based on mouse movements if mouse is clicked
    updateToolbarTransform(); //update the toolbar to reflect the actual transform of the layer
  }

  //updates in drag mode (moving the canvas)
  if(dragTracking) {
    updateDrag();
  }

  drawLayerImages(); //draws the layer image

  if(interfaceToolMode == "edit") {
    drawTransformPoints(); //draws the transform points bounding the image
    drawRotationalOrigin(); //draws the rotational origin if it's a rotational layer
    drawTranslationPath(); //draws points defining the translation path if it's a translation layer
    $(".toolbar-active").attr("disabled", false); //activate toolbar when in edit mode
  } else {
    $(".toolbar-active").attr("disabled", true); //deactivate toolbar in other modes
  }

  if (grabbedLayer) { //when you've grabbed a layer in live mode
    updateLiveParameters(); //update it's manipulation transform
  }
}


// mousePressed()
// tracks mouse position based on certain prerequisites
function mousePressed() {

  if (event.path[0].id == "defaultCanvas0") { //prevent conflict with interface elements overlapping the canvas
    /////////////////////////////////////////////
    ///////////// EDIT MODE HANDLING ////////////
    /////////////////////////////////////////////
    if (interfaceToolMode == "edit") {
      //register mouse position at beginning of action
      mouseOffsetX = scaledMouseX;
      mouseOffsetY = scaledMouseY;

      //check various manipulation actions
      checkMoveAction();
      checkScaleAction();
      if(activeLayer.type == `rotational`) {
        checkRotOriginAction();
      }
      if(activeLayer.type == `translational`) {
        checkTransPathAction();
      }
    }

    /////////////////////////////////////////////
    ///////////// DRAG MODE HANDLING ////////////
    /////////////////////////////////////////////
    else if (interfaceToolMode == "drag") {
      //register mouse position at beginning of action
      dragOffsetX = winMouseX;
      dragOffsetY = winMouseY;
      dragTracking = true;
    }

    /////////////////////////////////////////////
    ///////////// LIVE MODE HANDLING ////////////
    /////////////////////////////////////////////
    else if (interfaceToolMode == "live") {
      getGrabbedObject(); //figure out which layer has been clicked on
      if (grabbedLayer && grabbedLayer.type == "rotational") {
        //rotate the grabbed object
        mouseOffsetX = scaledMouseX - (grabbedLayer.xOrigin + grabbedLayer.pivotXOffset);
        mouseOffsetY = scaledMouseY - (grabbedLayer.yOrigin + grabbedLayer.pivotYOffset);
        initialAngle = grabbedLayer.angle;
        deltaAngle = createVector(mouseOffsetX, mouseOffsetY).heading();
      } else if (grabbedLayer && grabbedLayer.type == "translational") {
        //move the grabed object
        mouseOffsetX = scaledMouseX;
        mouseOffsetY = scaledMouseY;
        initialDisplacement = grabbedLayer.displacement;
      }
    }

  }

}


// mouseReleased()
// stops tracking the mouse on release
function mouseReleased() {
  clearTracking();
}


//  clearTracking()
//  stops tracking all parameters
function clearTracking() {
  dragTracking = false;
  moveTracking = false;
  leftScaleTracking = false;
  rightScaleTracking = false;
  topScaleTracking = false;
  bottomScaleTracking = false;
  rotOriginTracking = false;
  transStartTracking = false;
  transEndTracking = false;
  grabbedLayer = undefined;
  initialAngle = undefined;
}


// detectClick(incomingX, incomingY, incomingLayer)
// determines if a click happened in an opaque part of a given image layer
function detectClick(incomingX, incomingY, incomingLayer) {
  let bufferImage = incomingLayer.img; //put the incoming layer's image into a buffer
  bufferImage.resize(incomingLayer.width, incomingLayer.height); //resize the image to its size as displayed

  //calculate the adjusted X and Y based on image scaling
  let transAdjustedX = incomingX - incomingLayer.xOrigin + (incomingLayer.width/2);
  let transAdjustedY = incomingY - incomingLayer.yOrigin + (incomingLayer.height/2);

  // account for shift in the layer's rotation
  let bufferVector = createVector(transAdjustedX - (incomingLayer.width/2 + incomingLayer.pivotXOffset), transAdjustedY - (incomingLayer.height/2 + incomingLayer.pivotYOffset));
  bufferVector.rotate(-incomingLayer.angle);

  // account for shift in the layer's translation
  let bufferLayerVector = createVector(incomingLayer.slideEndX - incomingLayer.slideStartX, incomingLayer.slideEndY - incomingLayer.slideStartY);
  bufferLayerVector.normalize();
  bufferLayerVector.mult(incomingLayer.displacement);

  //calculate the "final" coordinate for detection
  let outgoingX = bufferVector.x + (incomingLayer.width/2 + incomingLayer.pivotXOffset) - bufferLayerVector.x;
  let outgoingY = bufferVector.y + (incomingLayer.height/2 + incomingLayer.pivotYOffset) - bufferLayerVector.y;

  //check to see if the final coordinate is transparent or not
  if(incomingLayer.img.get(outgoingX, outgoingY)[3] == 255) {
    return true;
  } else {
    return false;
  }
}


// getGrabbedObject()
// identify the layer that has been clicked on
function getGrabbedObject() {
  for (let i = 0; i < layers.length; i++) { //cycle through the layers
    if (layers[i].img && detectClick(event.offsetX, event.offsetY, layers[i])) {
      grabbedLayer = layers[i]; //take the first one you hit
      break;
    }
  }
}


// checkMoveAction()
// check for events to move the layer
function checkMoveAction() {
  if (scaledMouseX > activeLayer.xOrigin - activeLayer.width/2
   && scaledMouseX < activeLayer.xOrigin + activeLayer.width/2
   && scaledMouseY > activeLayer.yOrigin - activeLayer.height/2
   && scaledMouseY < activeLayer.yOrigin + activeLayer.height/2) {
     moveTracking = true;
  }
}


// checkScaleAction()
// check for events to scale the layer
function checkScaleAction() {
  if (scaledMouseX > activeLayer.xOrigin - (activeLayer.width/2) - 5/scaleFactor
   && scaledMouseX < activeLayer.xOrigin - (activeLayer.width/2) + 5/scaleFactor) {
      leftScaleTracking = true;
      moveTracking = false;
  }
  if (scaledMouseX > activeLayer.xOrigin + (activeLayer.width/2) - 5/scaleFactor
   && scaledMouseX < activeLayer.xOrigin + (activeLayer.width/2) + 5/scaleFactor) {
      rightScaleTracking = true;
      moveTracking = false;
  }
  if (scaledMouseY > activeLayer.yOrigin - (activeLayer.height/2) - 5/scaleFactor
   && scaledMouseY < activeLayer.yOrigin - (activeLayer.height/2) + 5/scaleFactor) {
     topScaleTracking = true;
     moveTracking = false;
  }
  if (scaledMouseY > activeLayer.yOrigin + (activeLayer.height/2) - 5/scaleFactor
   && scaledMouseY < activeLayer.yOrigin + (activeLayer.height/2) + 5/scaleFactor) {
     bottomScaleTracking = true;
     moveTracking = false;
  }
}


// checkRotOriginAction()
// check for events to move the rotational origin
function checkRotOriginAction() {
  if (scaledMouseX > activeLayer.xOrigin + activeLayer.pivotXOffset - 5/scaleFactor
   && scaledMouseX < activeLayer.xOrigin + activeLayer.pivotXOffset + 5/scaleFactor
   && scaledMouseY > activeLayer.yOrigin + activeLayer.pivotYOffset - 5/scaleFactor
   && scaledMouseY < activeLayer.yOrigin + activeLayer.pivotYOffset + 5/scaleFactor) {
      rotOriginTracking = true;
      moveTracking = false;
  }
}


// checkTransPathAction()
// check for events to move the points defining the axis of translation
function checkTransPathAction() {
  if (scaledMouseX > activeLayer.xOrigin + activeLayer.slideStartX - 5/scaleFactor
   && scaledMouseX < activeLayer.xOrigin + activeLayer.slideStartX + 5/scaleFactor
   && scaledMouseY > activeLayer.yOrigin + activeLayer.slideStartY - 5/scaleFactor
   && scaledMouseY < activeLayer.yOrigin + activeLayer.slideStartY + 5/scaleFactor) {
     transStartTracking = true;
     moveTracking = false;
  } else if (scaledMouseX > activeLayer.xOrigin + activeLayer.slideEndX - 5/scaleFactor
   && scaledMouseX < activeLayer.xOrigin + activeLayer.slideEndX + 5/scaleFactor
   && scaledMouseY > activeLayer.yOrigin + activeLayer.slideEndY - 5/scaleFactor
   && scaledMouseY < activeLayer.yOrigin + activeLayer.slideEndY + 5/scaleFactor) {
     transEndTracking = true;
     moveTracking = false;
  }
}


// updateDrag()
// moves the canvas at each frame based on how much the mouse has moved
function updateDrag() {
  cnvX -= (dragOffsetX - winMouseX);
  cnvY -= (dragOffsetY - winMouseY);
  dragOffsetX = winMouseX;
  dragOffsetY = winMouseY;
}


// updateActiveLayer()
// updates active layer properties based on moving and scaling actions
function updateActiveLayer() {
  //update active layer transform info depending on what action is currently being tracked
  if (moveTracking) {
    activeLayer.xOrigin += scaledMouseX - mouseOffsetX;
    activeLayer.yOrigin += scaledMouseY - mouseOffsetY;
  }
  if (topScaleTracking) {
    activeLayer.yOrigin += (scaledMouseY - mouseOffsetY)/2;
    activeLayer.height -= scaledMouseY - mouseOffsetY;
    if (activeLayer.dimensionsLocked == true) {
      activeLayer.width = activeLayer.height * activeLayer.dimenseionsRatio;
    } else {
      activeLayer.dimenseionsRatio = width/height;
    }
  }
  if (bottomScaleTracking) {
    console.log(mouseX - mouseOffsetX);
    activeLayer.yOrigin += (scaledMouseY - mouseOffsetY)/2;
    activeLayer.height += scaledMouseY - mouseOffsetY;
    if (activeLayer.dimensionsLocked == true) {
      activeLayer.width = activeLayer.height * activeLayer.dimenseionsRatio;
    } else {
      activeLayer.dimenseionsRatio = width/height;
    }
  }
  if (leftScaleTracking) {
    activeLayer.xOrigin += (scaledMouseX - mouseOffsetX)/2;
    activeLayer.width -= scaledMouseX - mouseOffsetX;
    if (activeLayer.dimensionsLocked == true) {
      activeLayer.height = activeLayer.width/activeLayer.dimenseionsRatio;
    } else {
      activeLayer.dimenseionsRatio = width/height;
    }
  }
  if (rightScaleTracking) {
    activeLayer.xOrigin += (scaledMouseX - mouseOffsetX)/2;
    activeLayer.width += scaledMouseX - mouseOffsetX;
    if (activeLayer.dimensionsLocked == true) {
      activeLayer.height = activeLayer.width/activeLayer.dimenseionsRatio;
    } else {
      activeLayer.dimenseionsRatio = width/height;
    }
  }
  if (rotOriginTracking) {
    activeLayer.pivotXOffset += scaledMouseX - mouseOffsetX;
    activeLayer.pivotYOffset += scaledMouseY - mouseOffsetY;
  }
  if (transStartTracking) {
    activeLayer.slideStartX += scaledMouseX - mouseOffsetX;
    activeLayer.slideStartY += scaledMouseY - mouseOffsetY;
  }
  if (transEndTracking) {
    activeLayer.slideEndX += scaledMouseX - mouseOffsetX;
    activeLayer.slideEndY += scaledMouseY - mouseOffsetY;
  }
  mouseOffsetX = scaledMouseX;
  mouseOffsetY = scaledMouseY;
}


// updateLiveParameters()
// updates values for layers that dictate their transform while under manipulation in live mode
function updateLiveParameters() {

  //if the grabbed layer is a rotating layer
  if(grabbedLayer.type == "rotational") {
    mouseOffsetX = scaledMouseX - (grabbedLayer.xOrigin + grabbedLayer.pivotXOffset);
    mouseOffsetY = scaledMouseY - (grabbedLayer.yOrigin + grabbedLayer.pivotYOffset);
    grabbedLayer.angle = (initialAngle - deltaAngle) + createVector(mouseOffsetX, mouseOffsetY).heading();
  }

  //if the grabbed layer is a sliding layer
  if(grabbedLayer.type == "translational") {
    //create a vector representing the change in mouse position
    let bufferVector = createVector(mouseOffsetX - scaledMouseX, mouseOffsetY - scaledMouseY);
    //create a vector representing the layer's axis of translation
    let axisVector = createVector(grabbedLayer.slideEndX - grabbedLayer.slideStartX, grabbedLayer.slideEndY - grabbedLayer.slideStartY);
    bufferVector.rotate(-axisVector.heading());
    if (initialDisplacement - bufferVector.x >= 0 && initialDisplacement - bufferVector.x <= dist(grabbedLayer.slideStartX, grabbedLayer.slideStartY, grabbedLayer.slideEndX, grabbedLayer.slideEndY)) {
      grabbedLayer.displacement = initialDisplacement - bufferVector.x;
    } else if (initialDisplacement - bufferVector.x < 0) {
      grabbedLayer.displacement = 0;
    } else if (initialDisplacement - bufferVector.x >= dist(grabbedLayer.slideStartX, grabbedLayer.slideStartY, grabbedLayer.slideEndX, grabbedLayer.slideEndY)) {
      grabbedLayer.displacement = dist(grabbedLayer.slideStartX, grabbedLayer.slideStartY, grabbedLayer.slideEndX, grabbedLayer.slideEndY);
    }
  }

}


// drawLayerImages()
// iterates through the layers, drawing their images
function drawLayerImages() {
  //draw the layers
  imageMode(CENTER);
  for (let i = layers.length - 1; i > -1; i--) {
    if(layers[i].img) {
      push();

      //rotational handling
      translate(layers[i].xOrigin + layers[i].pivotXOffset, layers[i].yOrigin + layers[i].pivotYOffset);
      rotate(layers[i].angle);
      translate(-layers[i].pivotXOffset,-layers[i].pivotYOffset);

      //displacement handling
      let bufferLayerVector = createVector(layers[i].slideEndX - layers[i].slideStartX, layers[i].slideEndY - layers[i].slideStartY);
      bufferLayerVector.normalize();
      bufferLayerVector.mult(layers[i].displacement);
      translate(bufferLayerVector);

      //draw the image
      image(layers[i].img, 0, 0, layers[i].width, layers[i].height);
      pop();
    }
  }
}


// drawTransformPoints()
// draws the corner and edge points for scaling actions
function drawTransformPoints() {
  //draw tranform points for active layer
  if(activeLayer.img) {
    push();
    fill(255);
    ellipse(activeLayer.xOrigin - activeLayer.width/2, activeLayer.yOrigin - activeLayer.height/2, transformPointSize); //upper left corner
    ellipse(activeLayer.xOrigin, activeLayer.yOrigin - activeLayer.height/2, transformPointSize); //upper middle
    ellipse(activeLayer.xOrigin + activeLayer.width/2, activeLayer.yOrigin - activeLayer.height/2, transformPointSize); //upper right corner
    ellipse(activeLayer.xOrigin - activeLayer.width/2, activeLayer.yOrigin, transformPointSize); //middle left side
    ellipse(activeLayer.xOrigin + activeLayer.width/2, activeLayer.yOrigin, transformPointSize); //middle right side
    ellipse(activeLayer.xOrigin - activeLayer.width/2, activeLayer.yOrigin + activeLayer.height/2, transformPointSize); //lower left corner
    ellipse(activeLayer.xOrigin, activeLayer.yOrigin + activeLayer.height/2, transformPointSize); //lower middle
    ellipse(activeLayer.xOrigin + activeLayer.width/2, activeLayer.yOrigin + activeLayer.height/2, transformPointSize); //lower right corner
    pop();
  }
}


// drawRotationalOrigin()
// draws the origin around which the layer will rotate if it's a rotational layer
function drawRotationalOrigin() {
  if(activeLayer.type == "rotational") {
    push();
    fill(255);
    stroke(0);
    strokeWeight(scaleFactor);
    ellipse(activeLayer.xOrigin + activeLayer.pivotXOffset, activeLayer.yOrigin + activeLayer.pivotYOffset, transformPointSize); //center dot
    stroke(255);
    strokeWeight(2/scaleFactor);
    noFill();
    ellipse(activeLayer.xOrigin + activeLayer.pivotXOffset, activeLayer.yOrigin + activeLayer.pivotYOffset, 2*transformPointSize); //ring around dot for greater visibility
    pop();
  }
}


// drawTranslationPath()
// draws the points and line that define the path of translation if it's a translation layer
function drawTranslationPath() {
  if(activeLayer.type == "translational") {
    push();
    stroke(255);
    strokeWeight(5/scaleFactor);
    line(activeLayer.xOrigin + activeLayer.slideStartX, activeLayer.yOrigin + activeLayer.slideStartY, activeLayer.xOrigin + activeLayer.slideEndX, activeLayer.yOrigin + activeLayer.slideEndY);
    stroke(0);
    strokeWeight(scaleFactor);
    fill(255);
    ellipse(activeLayer.xOrigin + activeLayer.slideStartX, activeLayer.yOrigin + activeLayer.slideStartY, transformPointSize); //center dot
    stroke(255);
    strokeWeight(2/scaleFactor);
    noFill();
    ellipse(activeLayer.xOrigin + activeLayer.slideStartX, activeLayer.yOrigin + activeLayer.slideStartY, 2*transformPointSize); //ring around dot for greater visibility
    stroke(0);
    strokeWeight(scaleFactor);
    fill(255);
    ellipse(activeLayer.xOrigin + activeLayer.slideEndX, activeLayer.yOrigin + activeLayer.slideEndY, transformPointSize); //center dot
    stroke(255);
    strokeWeight(2/scaleFactor);
    noFill();
    ellipse(activeLayer.xOrigin + activeLayer.slideEndX, activeLayer.yOrigin + activeLayer.slideEndY, 2*transformPointSize);
    pop();
  }
}


// createNewLayer()
// initializes new layers
function createNewLayer() {
  if(interfaceToolMode == "edit") {
    for(let i = 0; i < layers.length; i++) {
      layers[i].layersIndex++;
    }
    layers.unshift(new Layer(layerCounter)); //create the new layer object and add it to the layers array
    if(layerCounter == 1) { //if this is the first layer, make it the active layer by default
      activeLayer = layers[0];
      //layerTab.id += "current-layer-tab";
    }

    layerCounter++; //increment layerCounter to track the total number of layers

    displayLayerList();
    setToolbarProperties();
  }
}


// tabSelector(tab)
// makes tab the active layer and updates the toolbar to reflect as such
function tabSelector(tab) {
  setActiveLayer(tab); //assigns tab as the active layer
  setToolbarProperties(); //updates toolbar to display properties for the active layer
}


// moveLayerUp(tab)
// swaps the position of tab with the layer above it
function moveLayerUp(clickedButton) {
  tabSelector(clickedButton.parentNode.parentNode); //make the moving layer the active one
  if(layers[activeLayer.layersIndex-2]) {
    let layerA = layers[activeLayer.layersIndex-1]; //the active tab
    let layerB = layers[activeLayer.layersIndex-2]; //the tab it's replacing
    let buffer = layerB; //get the adjacent element above
    layers[layerA.layersIndex-2] = layerA; //move layerA up in the array
    layers[layerA.layersIndex-1] = buffer; //move layerB to where layerA used to be
    //swap layer index values
    layerA.layersIndex--;
    layerB.layersIndex++;
    displayLayerList();
  }
}


// moveLayerDown(tab)
// swaps the position of tab with the layer below it
function moveLayerDown(clickedButton) {
  tabSelector(clickedButton.parentNode.parentNode); //make the moving layer the active one
  if(layers[activeLayer.layersIndex]) {
    let layerA = layers[activeLayer.layersIndex-1]; //the active tab
    let layerB = layers[activeLayer.layersIndex]; //the tab it's replacing
    let buffer = layerB; //get the adjacent element below
    layers[layerA.layersIndex] = layerA; //move layerA down in the array
    layers[layerA.layersIndex-1] = buffer; //move layerB to where layerA used to be
    //swap layer index values
    layerA.layersIndex++;
    layerB.layersIndex--;
    displayLayerList();
  }
}


// deleteLayer(clickedButton)
// deletes layers when you click their "x" button
function deleteLayer(clickedButton) {
  if(layers.length > 1) { //if there's more than one layer
    let layerBuffer = clickedButton.parentNode.parentNode;
    let bufferIndex = 0;
    for (let i = 0; i < document.getElementById("layers-container").children.length; i++) { //cycle through all the layers to find the right one
      if (document.getElementById("layers-container").children[i] === layerBuffer) {
        //notify the parent if there is one
        if (layers[i].parent != "none") {
          for (let j = 0; j < layers.length; j++) {
            if (layers[j].name == layers[i].parent) {
              layers[j].children.splice(layers[j].children.indexOf(layers[i].name),1);
            }
          }
        }
        //notify any children if there is one
        if (layers[i].children.length > 0) {
          for (let j = 0; j < layers[i].children.length; j++) {
            for (let k = 0; k < layers.length; k++) {
              if (layers[i].children[j] == layers[k].name) {
                layers[k].parent = "none";
              }
            }
          }
        }

        layers.splice(i,1); //excise the layer to be removed
        for(let j = 1; j <= layers.length; j++) { //update the indecies of all the other layer objects
          layers[j-1].layersIndex = j;
        }
        bufferIndex = i; //save the index of the removed layer for updating the active layer object
        break
      }
    }


    if(layers[bufferIndex]) {
      activeLayer = layers[bufferIndex]; //update the active layer object
    } else {
      activeLayer = layers[layers.length - 1]; //if there is no layers[bufferIndex], just default to the bottom-most layer
    }
    displayLayerList(); //update the visible layer list
    setToolbarProperties(); //update the toolbar
  }
}


// updateName(event)
// updates the active layer's name
function updateName(event) {
  if(event.key == "Enter") {
    if (interfaceToolMode == "edit") {
      let checkDoubleUp = false; //initialize a temporary variable to check if the name is used already
      let newNameBuffer = $(`#layerName`).val(); //store the input value
      //check to see if the name is taken already
      for (let i = 0; i < layers.length; i++) {
        if (layers[i].name == newNameBuffer) {
          checkDoubleUp = true;
        }
      }
      if (checkDoubleUp == false) { //if the name hasn't been used already
        //notify the parent if there is one
        if (activeLayer.parent != "none") {
          for (let i = 0; i < layers.length; i++) {
            if (layers[i].name == activeLayer.parent) {
              layers[i].children[layers[i].children.indexOf(activeLayer.name)] = newNameBuffer;
            }
          }
        }
        //notify any children if there is one
        if (activeLayer.children.length > 0) {
          for (let i = 0; i < activeLayer.children.length; i++) {
            for (let j = 0; j < layers.length; j++) {
              if (activeLayer.children[i] == layers[j].name) {
                layers[j].parent = newNameBuffer;
              }
            }
          }
        }
        activeLayer.name = newNameBuffer; //update the layer's name
        $(`.layer-nametag:eq(${activeLayer.layersIndex-1})`).html(activeLayer.name); //update the layer's name in the layer list sidebar
      } else {
        setToolbarProperties();
      }
    } else {
      setToolbarProperties();
    }
  }
}


// updateImage
// updates the active layer's image when one is uploaded
function updateImage() {
  if (interfaceToolMode == "edit") {
    activeLayer.imgURL = URL.createObjectURL(document.getElementById("layerImage").files[0]);
    activeLayer.img = loadImage(activeLayer.imgURL); //load the uploaded image data
    activeLayer.img.loadPixels();
    //assign appropriate initial sizes, given our canvas
    let wxhRatio = activeLayer.img.width/activeLayer.img.height;
    if (activeLayer.img.width/width >= activeLayer.img.height/height) {
      activeLayer.width = width;
      activeLayer.height = activeLayer.width/wxhRatio;
    } else if (activeLayer.img.width/width < activeLayer.img.height/height) {
      activeLayer.height = height;
      activeLayer.width = activeLayer.height * wxhRatio;
    }
  }
  setToolbarProperties();
}


// updateType()
// updates the active layer's type
function updateType() {
  if (interfaceToolMode == "edit") {
    activeLayer.type = $(`#layerType`).val();
  }
  setToolbarProperties();
}


// updateFollow()
// updates the respective parent and child relationships when one layer is parented to another
function updateFollow() {
  if (interfaceToolMode == "edit") {
    //remove child from previous parent's child list
    for (let i = 0; i < layers.length; i++) {
      if (activeLayer.parent == layers[i].name) {
        layers[i].children.splice(layers[i].children.indexOf(activeLayer.name),1);
      }
    }
    //update child's parent
    activeLayer.parent = $(`#layerFollow`).val();
    //add child to new parent's child list
    for (let i = 0; i < layers.length; i++) {
      if (activeLayer.parent == layers[i].name) {
        layers[i].children.push(activeLayer.name);
      }
    }
  }
  setToolbarProperties();
}


// updateXOrigin(event)
// updates layer X origin when you set it from the toolbar
function updateXOrigin(event) {
  if (event.key == `Enter`) {
    if (interfaceToolMode == "edit") {
      //update the variable
      let buffer = activeLayer.xOrigin - $(`#layerX`).val();
      activeLayer.xOrigin -= buffer;
    } else {
      setToolbarProperties(); //update the toolbar display
    }
  }
}


// updateYOrigin(event)
// updates layer Y origin when you set it from the toolbar
function updateYOrigin(event) {
  if (event.key == `Enter`) {
    if (interfaceToolMode == "edit") {
      //update the variable
      let buffer = activeLayer.yOrigin - $(`#layerY`).val();
      activeLayer.yOrigin -= buffer;
    } else {
      setToolbarProperties(); //update the toolbar display
    }
  }
}


// updateHeight(event)
// updates layer height when you set it from the toolbar
function updateHeight(event) {
  if (event.key == `Enter`) {
    if (interfaceToolMode == "edit") {
      //update the variable
      let buffer = activeLayer.height - $(`#layerHeight`).val();
      activeLayer.height -= buffer;
      //update the other dimension if aspect ratio is locked
      if (activeLayer.dimensionsLocked == true) {
        activeLayer.width = activeLayer.height * activeLayer.dimenseionsRatio;
      } else {
        this.dimenseionsRatio = width/height;
      }
      updateToolbarTransform();
    } else {
      setToolbarProperties(); //update the toolbar display
    }
  }
}


// updateWidth(event)
// updates layer width when you set it from the toolbar
function updateWidth(event) {
  if (event.key == `Enter`) {
    if (interfaceToolMode == "edit") {
      //update the variable
      let buffer = activeLayer.width - $(`#layerWidth`).val();
      activeLayer.width -= buffer;
      //update the other dimension if the aspect ratio is locked
      if (activeLayer.dimensionsLocked == true) {
        activeLayer.height = activeLayer.width/activeLayer.dimenseionsRatio;
      } else {
        this.dimenseionsRatio = width/height;
      }
      updateToolbarTransform();
    } else {
      setToolbarProperties(); //update the toolbar display
    }
  }
}


// updateRotXOrigin(event)
// updates layer rotational X origin when you set it from the toolbar
function updateRotXOrigin(event) {
  if (event.key == `Enter`) {
    if (interfaceToolMode == "edit") {
      //update the variable
      let buffer = activeLayer.pivotXOffset + (activeLayer.xOrigin - $("#layerRotX").val());
      activeLayer.pivotXOffset -= buffer;
    } else {
      setToolbarProperties(); //update the toolbar display
    }
  }
}


// updateRotYOrigin(event)
// updates layer rotational Y origin when you set it from the toolbar
function updateRotYOrigin(event) {
  if (event.key == `Enter`) {
    if (interfaceToolMode == "edit") {
      //update the variable
      let buffer = activeLayer.pivotYOffset + (activeLayer.yOrigin - $("#layerRotY").val());
      activeLayer.pivotYOffset -= buffer;
    } else {
      setToolbarProperties(); //update the toolbar display
    }
  }
}


// updateSlideStartX(event)
// updates layer translation starting X origin when you set it from the toolbar
function updateSlideStartX(event) {
  if (event.key == `Enter`) {
    if (interfaceToolMode == "edit") {
      //update the variable
      let buffer = activeLayer.slideStartX + (activeLayer.xOrigin - $("#layerTransStartX").val());
      activeLayer.slideStartX -= buffer;
    } else {
      setToolbarProperties(); //update the toolbar display
    }
  }
}


// updateSlideStartY(event)
// updates layer translation starting Y origin when you set it from the toolbar
function updateSlideStartY(event) {
  if (event.key == `Enter`) {
    if (interfaceToolMode == "edit") {
      //update the variable
      let buffer = activeLayer.slideStartY + (activeLayer.yOrigin - $("#layerTransStartY").val());
      activeLayer.slideStartY -= buffer;
    } else {
      setToolbarProperties(); //update the toolbar display
    }
  }
}


// updateSlideEndX(event)
// updates layer translation ending X origin when you set it from the toolbar
function updateSlideEndX(event) {
  if (event.key == `Enter`) {
    if (interfaceToolMode == "edit") {
      //update the variable
      let buffer = activeLayer.slideEndX + (activeLayer.xOrigin - $("#layerTransEndX").val());
      activeLayer.slideEndX -= buffer;
    } else {
      setToolbarProperties(); //update the toolbar display
    }
  }
}


// updateSlideEndY(event)
// updates layer translation ending Y origin  when you set it from the toolbar
function updateSlideEndY(event) {
  if (event.key == `Enter`) {
    if (interfaceToolMode == "edit") {
      //update the variable
      let buffer = activeLayer.slideEndY + (activeLayer.yOrigin - $("#layerTransEndY").val());
      activeLayer.slideEndY -= buffer;
    } else {
      setToolbarProperties(); //update the toolbar display
    }
  }
}


// setActiveLayer(tab)
// makes the arrangements to set tab as the active layer
function setActiveLayer(tab) {
  for (let i = 0; i < document.getElementById("layers-container").children.length; i++) {
    if (document.getElementById("layers-container").children[i] === tab) {
      activeLayer = layers[i]; //if the iterated tab is the one you clicked, make it the active one
    } else {
      document.getElementById("layers-container").children[i].id = "" //otherwise make sure it ISNT the active one
    }
  }
  tab.id += "current-layer-tab"; //give the clicked tab the current layer ID
}


// setToolbarProperties()
// updates the toolbar to display the active layer's properties
function setToolbarProperties() {
  //when a layer is selected, populate the toolbar with the name, type, and image tools
  document.getElementById("toolbar").innerHTML =
  `<h2 class="sidebar-title">Active Layer</h2>

  <div class="toolbar-section" id="">
    <p class="toolbar-section-title">Layer Name:</p>
    <input type="text" class="toolbar-active" id="layerName" name="layerName" value="" onkeydown="updateName(event)">
  </div>`

  if(activeLayer.img) {
    document.getElementById("toolbar").innerHTML +=
    `<div class="toolbar-section" id="">
      <p class="toolbar-section-title">Layer Type:</p>
      <select class="toolbar-active" id="layerType" name="layerType" onchange="updateType()">
        <option value="background">Static</option>
        <option value="rotational">Rotational</option>
        <option value="translational">Translational</option>
      </select>
    </div>`

  // code for future addition of "parented" layers
  /*<div class="toolbar-section" id="">
      <p class="toolbar-section-title">Follow layer:</p>
      <select class="" id="layerFollow" name="layerFollow" onchange="updateFollow()">
        <option value="none">none</option>`


    for (let i = 0; i < layers.length; i++) {
      if (activeLayer != layers[i]) {
        document.getElementById("layerFollow").innerHTML +=
        `<option value="${layers[i].name}">${layers[i].name}</option>`
      }
    }

    document.getElementById("toolbar").innerHTML +=
      `</select>
    </div>
    `*/
  }

  document.getElementById("toolbar").innerHTML +=
  `<div class="toolbar-section" id="">
    <p class="toolbar-section-title">Layer Image:</p>
    <input type="file" class="toolbar-active" id="layerImage" name="layerImage" value="" accept="image/*" onchange="updateImage()">
  </div>`;

  //if the layer has an image, populate the toolbar additionally with the center and size tools
  if(activeLayer.img) {
    document.getElementById("toolbar").innerHTML +=
    `<div class="toolbar-section" id="">
      <p class="toolbar-section-title">Center:</p>
      <p style="margin:0px;float:left;">X:</p> <input type="text" class="toolbar-active" id="layerX" name="layerX" value="" style="width:50px;float:left;" onkeydown="updateXOrigin(event)">
      <p style="margin:0px;margin-left:20px;float:left;">Y:</p> <input type="text" class="toolbar-active" id="layerY" name="layerY" value="" style="width:50px;float:left;" onkeydown="updateYOrigin(event)">
    </div>

    <div class="toolbar-section" id="">
      <p class="toolbar-section-title">Size:</p>
      <p style="margin:0px;float:left;">Width:</p> <input type="text" class="toolbar-active" id="layerWidth" name="layerWidth" value="" style="width:50px;float:left;" onkeydown="updateWidth(event)">
      <p style="margin:0px;margin-left:20px;float:left;">Height:</p> <input type="text" class="toolbar-active" id="layerHeight" name="layerHeight" value="" style="width:50px;float:left;" onkeydown="updateHeight(event)">
    </div>`;
  }

  if(activeLayer.type == "rotational") {
    document.getElementById("toolbar").innerHTML +=
    `<div class="toolbar-section" id="">
      <p class="toolbar-section-title">Pivot Point:</p>
      <p style="margin:0px;float:left;">X:</p> <input type="text" class="toolbar-active" id="layerRotX" name="layerRotX" value="" style="width:50px;float:left;" onkeydown="updateRotXOrigin(event)">
      <p style="margin:0px;margin-left:20px;float:left;">Y:</p> <input type="text" class="toolbar-active" id="layerRotY" name="layerRotY" value="" style="width:50px;float:left;" onkeydown="updateRotYOrigin(event)">
    </div>`;
  }

  if(activeLayer.type == "translational") {
    document.getElementById("toolbar").innerHTML +=
    `<div class="toolbar-section" id="">
      <p class="toolbar-section-title">Translation Start:</p>
      <p style="margin:0px;float:left;">X:</p> <input type="text" class="toolbar-active" id="layerTransStartX" name="layerTransStartX" value="" style="width:50px;float:left;" onkeydown="updateSlideStartX(event)">
      <p style="margin:0px;margin-left:20px;float:left;">Y:</p> <input type="text" class="toolbar-active" id="layerTransStartY" name="layerTransStartY" value="" style="width:50px;float:left;" onkeydown="updateSlideStartY(event)">
    </div>
    <div class="toolbar-section" id="">
      <p class="toolbar-section-title">Translation End:</p>
      <p style="margin:0px;float:left;">X:</p> <input type="text" class="toolbar-active" id="layerTransEndX" name="layerTransEndX" value="" style="width:50px;float:left;" onkeydown="updateSlideEndX(event)">
      <p style="margin:0px;margin-left:20px;float:left;">Y:</p> <input type="text" class="toolbar-active" id="layerTransEndY" name="layerTransEndY" value="" style="width:50px;float:left;" onkeydown="updateSlideEndY(event)">
    </div>`;
  }

  //populate the tool values
  document.getElementById("layerName").value = activeLayer.name;
  if(activeLayer.img) {
    document.getElementById("layerType").value = activeLayer.type;
    //document.getElementById("layerFollow").value = activeLayer.parent;
    updateToolbarTransform();
  }
}


// updateToolbarTransform
// updates the toolbar sidebar when a transformation is carried out
function updateToolbarTransform() {
  document.getElementById("layerX").value = activeLayer.xOrigin;
  document.getElementById("layerY").value = activeLayer.yOrigin;
  document.getElementById("layerWidth").value = activeLayer.width;
  document.getElementById("layerHeight").value = activeLayer.height;
  if(activeLayer.type == "rotational") {
    updateRotationalTransform();
  }
  if(activeLayer.type == "translational") {
    updateTranslationTransform();
  }
}


// updateRotationalTransform()
// updates the sidebar values for the rotational origin
function updateRotationalTransform() {
  document.getElementById("layerRotX").value = activeLayer.xOrigin + activeLayer.pivotXOffset;
  document.getElementById("layerRotY").value = activeLayer.yOrigin + activeLayer.pivotYOffset;
}


// updateTranslationTransform
// updates the sidebar values for the points that define the path of translation
function updateTranslationTransform() {
  document.getElementById("layerTransStartX").value = activeLayer.xOrigin + activeLayer.slideStartX;
  document.getElementById("layerTransStartY").value = activeLayer.yOrigin + activeLayer.slideStartY;
  document.getElementById("layerTransEndX").value = activeLayer.xOrigin + activeLayer.slideEndX;
  document.getElementById("layerTransEndY").value = activeLayer.yOrigin + activeLayer.slideEndY;
}


// swapToolMode(element, mode)
// swap to the appropriate tool mode when element is clicked
function swapToolMode(element, mode) {
  interfaceToolMode = mode;
  let interfaceButtons = document.getElementsByClassName(`interface-buttons`);
  for (let i = 0; i < interfaceButtons.length; i++) {
    interfaceButtons[i].style[`background-color`] = "lightgray";
  }
  element.style[`background-color`] = "white";
  if(mode ==`drag`) {
    document.getElementsByTagName("body")[0].style.cursor = "move";
  } else {
    document.getElementsByTagName("body")[0].style.cursor = "default";
    // reset layers so that they're in their intial position when swapping back to edit mode
    for (let i = 0; i < layers.length; i++) {
      layers[i].angle = 0;
      layers[i].displacement = 0;
    }
  }
}


// displayLayerList()
// draws the HTML elements based on the layers[] array
function displayLayerList() {
  let htmlBuffer = ``; //create an empty buffer to load with our layer tab elements
  //for each layer in the layers array, create appropriate tabs
  for (let i = 0; i < layers.length; i++) {
    //open a div in the buffer
    htmlBuffer +=
    `<div class="layer-tab" id="`

    //if this tab is the active one, give it the active tab ID
    if (layers[i] == activeLayer) {
      htmlBuffer +=
      `current-layer-tab`
    }

    //add most of the functional parts of the tab such as buttons and nametag
    htmlBuffer +=
    `">
      <div style="float: left;">
       <div class="up-button" title="Move layer up"><img src="assets/images/uparrow.png" alt=""></div>
       <div class="down-button" title="Move layer down"><img src="assets/images/downarrow.png" alt=""></div>
     </div>
     <div class="nametag-container">
      <H3 class="layer-nametag">${layers[i].name}</H3>
      <p class="close-button">&times</p>
     </div>
    </div>`;
  }

  $(`#layers-container`).html(htmlBuffer); //create the html element from what's in the buffer

  //give the html element the appropriate event listeners
  $(`.nametag-container`).on(`click`, function() {
    tabSelector(this.parentNode);
  });
  $(`.up-button`).on(`click`, function() {
    moveLayerUp(this);
  });
  $(`.down-button`).on(`click`, function() {
    moveLayerDown(this);
  });
  $(`.close-button`).on(`click`, function() {
    deleteLayer(this);
  })

}


// exportDiagram()
// compiles and downloads an HTML file of the interactive diagram
function exportDiagram() {
  //clear the html
  newHTMLDocument = ``;

  //open the head tag + generic head contents
  newHTMLDocument +=
  `<!-- Made with the Digital Interactive Manuscript Engine v${version} -->
  <!DOCTYPE html>
  <html lang="en" dir="ltr">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=0>

      <title>Digital Interactive Diagram</title>

      <!-- Library script(s) -->
      <script src="https://cdnjs.cloudflare.com/ajax/libs/p5.js/1.2.0/p5.min.js" type="text/javascript"></script>
      <script src="https://code.jquery.com/jquery-3.6.0.min.js" integrity="sha256-/xUj+3OJU5yExlq6GSYGSHk7tPXikynS7ogEvDej/m4=" crossorigin="anonymous"></script>`

  //open the style tag
  newHTMLDocument +=
      `<style>`

  //insert our CSS
  newHTMLDocument +=
        `html {
          margin: 0px;
          height: 100%;
        }

        body {
          margin: 0px;
          height: 100%;
        }`

  //close the style and body tags
  newHTMLDocument +=
      `</style>
    </head>`

  //open the body tag
  newHTMLDocument +=
    `<body>
      <div id="diagram-container">`

  //insert our body html
  newHTMLDocument +=
    ``

  //close the div tag for the visible diagram
  newHTMLDocument +=
  `</div>`

  //insert our script tag
  newHTMLDocument +=
  `<script>`

  ///////////////////////////////////////////////////////////////////////////////////
  //////////////////////// INSERT OUR MAIN FUNCTIONAL SCRIPT ////////////////////////
  ///////////////////////////////////////////////////////////////////////////////////

  //use strict
  newHTMLDocument +=
    `"use strict";

    let layers = [];
    `

  //insert layer objects
  for (let i = 0; i < layers.length; i++) {
    if (layers[i].img) {
      layers[i].img.loadPixels();
      newHTMLDocument +=
        `let layer${i+1} = {
            type: "${layers[i].type}",
            imgNativeWidth: ${layers[i].img.width},
            imgNativeHeight: ${layers[i].img.height},
            imgPixels: [${layers[i].img.pixels}],
            img: undefined,
            xOrigin: ${layers[i].xOrigin},
            yOrigin: ${layers[i].yOrigin},
            width: ${layers[i].width},
            height: ${layers[i].height},
            pivotXOffset: ${layers[i].pivotXOffset},
            pivotYOffset: ${layers[i].pivotYOffset},
            angle: 0,
            slideStartX: ${layers[i].slideStartX},
            slideStartY: ${layers[i].slideStartY},
            slideEndX: ${layers[i].slideEndX},
            slideEndY: ${layers[i].slideEndY},
            displacement: 0};
            layers.push(layer${i+1});


            `
    }
  }

  //insert main body of the script
  newHTMLDocument +=
    `let cnv;

    //variables for manipulating mouse position data
    let mouseOffsetX;
    let mouseOffsetY;
    let dragOffsetX;
    let dragOffsetY;

    //variables for live mode manipulation tracking
    let grabbedLayer = undefined;
    let initialAngle = undefined;
    let deltaAngle = undefined;
    let initialDisplacement = undefined;
    let deltaDisplacement = undefined;


    function preload() {

    }


    function setup() {
      cnv = createCanvas(${canvasWidth}, ${canvasHeight}); //create the canvas
      cnv.parent("diagram-container");
      cnv.background(0); //set canvas background
      angleMode(DEGREES); //set angle mode to degrees

      for (let i = 0; i < layers.length; i++) {
        layers[i].img = createImage(layers[i].imgNativeWidth, layers[i].imgNativeHeight);
        layers[i].img.loadPixels();
        for (let j = 0; j < layers[i].img.pixels.length; j++) {
          layers[i].img.pixels[j] = layers[i].imgPixels[j];
        }
        layers[i].img.updatePixels();
      }
    }


    function draw() {
      background(0);

      imageMode(CENTER);

      for (let i = layers.length - 1; i > -1; i--) {
        if(layers[i]) {
          push();

          //rotational handling
          translate(layers[i].xOrigin + layers[i].pivotXOffset, layers[i].yOrigin + layers[i].pivotYOffset);
          rotate(layers[i].angle);
          translate(-layers[i].pivotXOffset,-layers[i].pivotYOffset);

          //displacement handling
          let bufferLayerVector = createVector(layers[i].slideEndX - layers[i].slideStartX, layers[i].slideEndY - layers[i].slideStartY);
          bufferLayerVector.normalize();
          bufferLayerVector.mult(layers[i].displacement);
          translate(bufferLayerVector);

          image(layers[i].img, 0, 0, layers[i].width, layers[i].height);
          pop();
        }
      }

      if (grabbedLayer) { //when you've grabbed a layer in live mode
        updateLiveParameters(); //update it's manipulation transform
      }

    }


    function mousePressed() {
      getGrabbedObject(); //figure out which layer has been clicked on
      if (grabbedLayer && grabbedLayer.type == "rotational") {
        mouseOffsetX = mouseX - (grabbedLayer.xOrigin + grabbedLayer.pivotXOffset);
        mouseOffsetY = mouseY - (grabbedLayer.yOrigin + grabbedLayer.pivotYOffset);
        initialAngle = grabbedLayer.angle;
        deltaAngle = createVector(mouseOffsetX, mouseOffsetY).heading();
      } else if (grabbedLayer && grabbedLayer.type == "translational") {
        mouseOffsetX = mouseX;
        mouseOffsetY = mouseY;
        initialDisplacement = grabbedLayer.displacement;
      }
    }


    function mouseReleased() {
      grabbedLayer = undefined;
      initialAngle = undefined;
    }


    function detectClick(incomingX, incomingY, incomingLayer) {
      let bufferImage = incomingLayer.img; //put the incoming layer's image into a buffer
      bufferImage.resize(incomingLayer.width, incomingLayer.height); //resize the image to its size as displayed
      //
      let transAdjustedX = incomingX - incomingLayer.xOrigin + (incomingLayer.width/2);
      let transAdjustedY = incomingY - incomingLayer.yOrigin + (incomingLayer.height/2);

      // account for shift in the layer's rotation
      let bufferVector = createVector(transAdjustedX - (incomingLayer.width/2 + incomingLayer.pivotXOffset), transAdjustedY - (incomingLayer.height/2 + incomingLayer.pivotYOffset));
      bufferVector.rotate(-incomingLayer.angle);

      // account for shift in the layer's translation
      let bufferLayerVector = createVector(incomingLayer.slideEndX - incomingLayer.slideStartX, incomingLayer.slideEndY - incomingLayer.slideStartY);
      bufferLayerVector.normalize();
      bufferLayerVector.mult(incomingLayer.displacement);

      //
      let outgoingX = bufferVector.x + (incomingLayer.width/2 + incomingLayer.pivotXOffset) - bufferLayerVector.x;
      let outgoingY = bufferVector.y + (incomingLayer.height/2 + incomingLayer.pivotYOffset) - bufferLayerVector.y;

      if(incomingLayer.img.get(outgoingX, outgoingY)[3] == 255) {
        return true;
      } else {
        return false;
      }
    }


    function getGrabbedObject() {
      for (let i = 0; i < layers.length; i++) { //cycle through the layers
        if (layers[i].img && detectClick(event.offsetX, event.offsetY, layers[i])) {
          grabbedLayer = layers[i]; //take the first one you hit
          break;
        }
      }
    }


    function updateLiveParameters() {

      //if the grabbed layer is a rotating layer
      if(grabbedLayer.type == "rotational") {
        mouseOffsetX = mouseX - (grabbedLayer.xOrigin + grabbedLayer.pivotXOffset);
        mouseOffsetY = mouseY - (grabbedLayer.yOrigin + grabbedLayer.pivotYOffset);
        grabbedLayer.angle = (initialAngle - deltaAngle) + createVector(mouseOffsetX, mouseOffsetY).heading();
      }

      //if the grabbed layer is a sliding layer
      if(grabbedLayer.type == "translational") {
        //create a vector representing the change in mouse position
        let bufferVector = createVector(mouseOffsetX - mouseX, mouseOffsetY - mouseY);
        //create a vector representing the layer's axis of translation
        let axisVector = createVector(grabbedLayer.slideEndX - grabbedLayer.slideStartX, grabbedLayer.slideEndY - grabbedLayer.slideStartY);
        bufferVector.rotate(-axisVector.heading());
        if (initialDisplacement - bufferVector.x >= 0 && initialDisplacement - bufferVector.x <= dist(grabbedLayer.slideStartX, grabbedLayer.slideStartY, grabbedLayer.slideEndX, grabbedLayer.slideEndY)) {
          grabbedLayer.displacement = initialDisplacement - bufferVector.x;
        } else if (initialDisplacement - bufferVector.x < 0) {
          grabbedLayer.displacement = 0;
        } else if (initialDisplacement - bufferVector.x >= dist(grabbedLayer.slideStartX, grabbedLayer.slideStartY, grabbedLayer.slideEndX, grabbedLayer.slideEndY)) {
          grabbedLayer.displacement = dist(grabbedLayer.slideStartX, grabbedLayer.slideStartY, grabbedLayer.slideEndX, grabbedLayer.slideEndY);
        }
      }

    }



    `
  ///////////////////////////////////////////////////////////////////////////////////
  ///////////////////////////////////////////////////////////////////////////////////
  ///////////////////////////////////////////////////////////////////////////////////

  //close our script tag
  newHTMLDocument +=
  `</script>`

  //close the body tag
  newHTMLDocument +=
   `</body>
  </html>`

  //make a blob from our html, create a URL for it, and push it to the iframe
  let htmlBlob = new Blob([newHTMLDocument], {type : 'text/html'});
  exportURL = URL.createObjectURL(htmlBlob);

  $(`#download-link`).attr(`download`, `NewDiagram.html`); //assign title to the file
  $(`#download-link`).attr(`href`, exportURL);  //pass temporary URL to the link
  document.getElementById(`download-link`).click(); //simulate a click on the download link
}


// zoomIn()
// increments the scale of the canvas
function zoomIn() {
  scaleExp--;
}


// zoomHundred()
// zooms the canvas to a scale of 1
function zoomHundred() {
  scaleExp = 0;
}


// zoomOut()
// decrements the scale of the canvas
function zoomOut() {
  scaleExp++;
}
