/*****************

DIGITAL INTERACTIVE MANUSCRIPT ENGINE (DIME)
Layer Class
Author: Chip Limeburner

A class to represent parameters for user-create layer objects.
A subset of this infromation is transfered to exported diagrams.

******************/

class Layer {

  constructor(idNum) {
    this.layerIdNum = idNum; //an id numebr that increments each time the user creates a new layer
    this.layersIndex = 1; //the index of the layer within the layers[] array
    this.name = `Layer ${idNum}`; //the name of the layer (editable by user)
    this.type = "background" //type of manipulations available for the layer (editable by user)
    this.parent = "none"; //placeholder for future option to "parent" layers to each other
    this.children = []; //extension of above
    this.img; //the layer's display image (editable by user)
    this.imgURL; //the URL that refers to the blob holding the layer image

    //basic layer transform information
    this.xOrigin = width/2;
    this.yOrigin = height/2;
    this.width;
    this.height;

    //variables for future implementation of "locking" layer image aspect ratio
    this.dimensionsLocked = false;
    this.dimenseionsRatio = width/height;

    //rotational values
    this.pivotXOffset = 0;
    this.pivotYOffset = 0;
    this.angle = 0;

    //translational values
    this.slideStartX = 0;
    this.slideStartY = 0;
    this.slideEndX = 100;
    this.slideEndY = 0;
    this.displacement = 0;
  }
}
