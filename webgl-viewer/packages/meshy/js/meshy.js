/* meshy.js

   classes:

   - Meshy
   description:
    Main class representing the Meshy viewport. Encompasses UI, creating and
    handling the model, and controlling the viewport.
*/

// Constructor.
Meshy = function() {
  this.units = Units.mm;

  // params
  this.buildVolumeSize = new THREE.Vector3(145, 145, 175);
  this.buildVolumeMin = null;
  this.buildVolumeMax = null;
  this.centerOriginOnBuildPlate = false;
  this.buildVolumeMaterials = {
    linePrimary: new THREE.LineBasicMaterial({
      color: 0xdddddd,
      linewidth: 1
    }),
    lineSecondary: new THREE.LineBasicMaterial({
      color: 0x777777,
      linewidth: 1
    }),
    lineTertiary: new THREE.LineBasicMaterial({
      color: 0x444444,
      linewidth: 1
    })
  };

  // toggles
  this.importEnabled = true;
  this.importingMeshName = "";
  this.buildVolumeVisible = true;

  this.importUnits = Units.mm;
  this.autocenterOnImport = true;

  // geometry
  this.model = null;
  var fileInput = document.createElement("input");
  fileInput.id = "file";
  fileInput.type = "file";
  fileInput.onchange = function() { meshy.handleFile(this.files[0]); };
  document.body.appendChild(fileInput);
  this.fileInput = fileInput;

  this.isLittleEndian = true;
  this.vertexPrecision = 5;
  this.displayPrecision = 4;

  // webgl viewport
  this.container = document.getElementById("container");
  this.camera = null;
  this.scene = null;
  this.renderer = null;
  this.axisWidget = null;
  this.printout = new Printout();

  // verify that WebGL is enabled
  if (!Detector.webgl) {
    var webGLWarning = document.createElement("div");
    webGLWarning.innerHTML = "Welp! Your browser doesn't support WebGL. This page will remain blank."
    webGLWarning.style.paddingTop = "100px";
    container.appendChild(webGLWarning);
    return;
  }

  // standard notifications
  this.printout.log("Meshy is freely available under the MIT license. Thanks for using!");
  this.printout.log("Supported import formats: OBJ, STL.");
  this.printout.log("Controls: LMB (turn), MMB (pan/zoom), RMB (pan), F (center on model), C (center of mass), W (wireframe), B (build volume), G (gizmo)");

  // undo stack
  this.editStack = new EditStack(this.printout);

  // UI
  this.generateUI();
}

// Creates the dat.gui element and the InfoBox, initializes the viewport,
// initializes build volume.
Meshy.prototype.generateUI = function() {
  this.gui = new dat.GUI();
  this.gui.add(this, "import").name("Import").title("Import a mesh.");

  var importSettingsFolder = this.gui.addFolder("Import Settings", "Defaults for the imported mesh.");
  importSettingsFolder.add(this, "importUnits", { mm: Units.mm, cm: Units.cm, inches: Units.inches })
    .name("Import units")
    .title("Units of the imported mesh.");
  importSettingsFolder.add(this, "autocenterOnImport").name("Autocenter")
    .title("Autocenter the mesh upon importing.");

  var exportFolder = this.gui.addFolder("Export", "Mesh export.");
  this.filename = "meshy";
  this.filenameController = exportFolder.add(this, "filename").name("Filename")
    .title("Filename for the exported mesh.");
  this.exportUnits = this.units;
  exportFolder.add(this, "exportUnits", { mm: Units.mm, cm: Units.cm, inches: Units.inches })
    .name("Export units")
    .title("Units of the exported mesh.");
  exportFolder.add(this, "exportOBJ").name("Export OBJ")
    .title("Export as OBJ file.");
  exportFolder.add(this, "exportSTL").name("Export STL")
    .title("Export as binary STL file.");
  exportFolder.add(this, "exportSTLascii").name("Export ASCII STL")
    .title("Export as ASCII STL file.");

  var settingsFolder = this.gui.addFolder("Settings", "Settings for computation.");

  settingsFolder.add(this, "isLittleEndian").name("Little endian")
    .title("Endianness toggle for imports and exports.");
  settingsFolder.add(this, "vertexPrecision").name("Vertex precision")
    .onChange(this.setVertexPrecision.bind(this))
    .title("Precision p; 10^p is used as a conversion factor between floating-point and fixed-point coordinates.");

  var displayFolder = this.gui.addFolder("Display", "Mesh and build volume display settings.");

  displayFolder.add(this, "displayPrecision", 0, 7).step(1).name("Display precision")
    .onChange(this.setDisplayPrecision.bind(this))
    .title("Maximal number of decimal places for displaying floating-point values.");
  displayFolder.add(this, "toggleGizmo").name("Toggle gizmo")
    .title("Toggle transform gizmo visibility (G).");
  displayFolder.add(this, "toggleAxisWidget").name("Toggle axis widget")
    .title("Toggle axis widget visibility.");
  displayFolder.add(this, "toggleWireframe").name("Toggle wireframe")
    .title("Toggle mesh wireframe (W).");
  displayFolder.add(this, "toggleCOM").name("Toggle center of mass")
    .title("Toggle the center of mass indicator (C).");
  displayFolder.add(this, "cameraToModel").name("Camera to model")
    .title("Snap camera to model (F).");
  this.backgroundColor = "#222222";
  this.meshColor = "#ffffff";//"#481a1a";
  this.wireframeColor = "#000000";
  this.meshRoughness = 0.3;
  this.meshMetalness = 0.5;
  this.backgroundColorController =
    displayFolder.addColor(this, "backgroundColor").name("Background color")
      .onChange(this.setBackgroundColor.bind(this))
      .title("Set background color.");
    this.meshColorController =
      displayFolder.addColor(this, "meshColor").name("Mesh color")
        .onChange(this.setMeshMaterial.bind(this))
        .title("Set mesh color.");
  displayFolder.add(this, "meshRoughness", 0, 1).name("Mesh roughness").onChange(this.setMeshMaterial.bind(this))
    .title("Set mesh roughness.");
  displayFolder.add(this, "meshMetalness", 0, 1).name("Mesh metalness").onChange(this.setMeshMaterial.bind(this))
    .title("Set mesh metalness.");
  this.meshColorController =
  displayFolder.addColor(this, "wireframeColor").name("Wireframe color")
    .onChange(this.setWireframeMaterial.bind(this))
    .title("Set wireframe color.");
  var buildVolumeFolder = displayFolder.addFolder("Build Volume", "Size and visibility settings for the build volume.");
  buildVolumeFolder.add(this, "toggleBuildVolume").name("Toggle volume")
    .title("Toggle build volume visibility.");
  buildVolumeFolder.add(this, "centerOriginOnBuildPlate").name("Center origin")
    .title("Center the origin on the floor of the build volume or place it in the corner.")
    .onChange(this.makeBuildVolume.bind(this));
  this.buildVolumeXController = buildVolumeFolder.add(this.buildVolumeSize, "x", 0)
    .name("Build volume x")
    .title("Build volume size on x in mm.")
    .onChange(this.makeBuildVolume.bind(this));
  this.buildVolumeYController = buildVolumeFolder.add(this.buildVolumeSize, "y", 0)
    .name("Build volume y")
    .title("Build volume size on y in mm.")
    .onChange(this.makeBuildVolume.bind(this));
  this.buildVOlumeZController = buildVolumeFolder.add(this.buildVolumeSize, "z", 0)
    .name("Build volume z")
    .title("Build volume size on z in mm.")
    .onChange(this.makeBuildVolume.bind(this));

  this.snapTransformationsToFloor = true;

  this.editFolder = this.gui.addFolder("Edit",
    "Mesh edit functions: translation, scaling, rotation, normals.");
  this.buildEditFolder();

  // init measurement structures
  this.measurementData = [];
  this.measurementIdx = -1;
  this.measurementFolder = this.gui.addFolder("Measure", "Make calculations based on mouse-placed markers.");
  this.measureConvexHull = false;
  this.buildMeasurementFolder();

  var thicknessFolder = this.gui.addFolder("Mesh Thickness", "Visualize approximate local mesh thickness.");
  this.thicknessThreshold = 1.0;
  thicknessFolder.add(this, "thicknessThreshold", 0).name("Threshold")
    .title("Thickness threshold: parts of the mesh below this thickness are shown as too thin.");
  thicknessFolder.add(this, "viewThickness").name("View thickness")
    .title("Calculate mesh thickness: parts of the mesh that are too thin are shown in a color interpolated over the [threshold, 0] range.");
  thicknessFolder.add(this, "clearThicknessView").name("Clear thickness view")
    .title("Clear the color indicating parts of the mesh that are too thin.");

  var repairFolder = this.gui.addFolder("Repair", "Repair missing polygons.");
  repairFolder.add(this, "repair").name("Repair")
    .title("Repair mesh.");

  this.layerHeight = .1;
  this.lineWidth = 0.1;
  this.sliceAxis = "z";
  this.supportSliceFolder = this.gui.addFolder("Supports & Slicing",
    "Generate supports, slice the mesh, and export the resulting G-code.");
  this.supportAngle = 45;
  this.supportSpacingFactor = 24;
  this.supportRadius = this.lineWidth * 4;
  this.supportTaperFactor = 0.25;
  this.supportSubdivs = 16;
  // can't set support radius fn directly from dat.gui because it returns the
  // function stringified, so just set fn name and then convert it to the fn
  this.supportRadiusFnMap = {
    constant: SupportGenerator.RadiusFunctions.constant,
    sqrt: SupportGenerator.RadiusFunctions.sqrt
  };
  this.supportRadiusFnName = "sqrt";
  this.supportRadiusFnK = 0.01;
  this.sliceMode = Slicer.Modes.preview;
  this.sliceModeOn = false;
  this.slicePreviewModeSliceMesh = true;
  this.sliceFullModeUpToLayer = true;
  this.sliceFullModeShowInfill = false;
  this.sliceNumWalls = 2;
  this.sliceNumTopLayers = 10;
  this.sliceOptimizeTopLayers = true;
  this.sliceInfillType = Slicer.InfillTypes.solid;
  this.sliceInfillDensity = 0.1;
  this.sliceInfillOverlap = 0.5;
  // raft options
  this.sliceMakeRaft = true;
  this.sliceRaftNumTopLayers = 3;
  this.sliceRaftTopLayerHeight = 0.1;
  this.sliceRaftTopLineWidth = 0.1;
  this.sliceRaftTopDensity = 1.0;
  this.sliceRaftNumBaseLayers = 1;
  this.sliceRaftBaseLayerHeight = 0.2;
  this.sliceRaftBaseLineWidth = 0.2;
  this.sliceRaftBaseDensity = 0.5;
  this.sliceRaftOffset = 1.0;
  this.sliceRaftGap = 0.05;
  this.sliceRaftWriteWalls = false;
  // gcode options
  this.gcodeFilename = this.filename;
  this.gcodeExtension = "gcode";
  this.gcodeTemperature = 200;
  this.gcodeFilamentDiameter = 2.5;
  this.gcodePrimeExtrusion = 3;
  this.gcodeExtrusionMultiplier = 1.0;
  this.gcodeInfillSpeed = 70;
  this.gcodeWallSpeed = 30;
  this.gcodeRaftBasePrintSpeed = 25;
  this.gcodeRaftTopPrintSpeed = 30;
  this.gcodeTravelSpeed = 150;
  this.gcodeCoordinatePrecision = 3;
  this.gcodeExtruderPrecision = 5;
  this.buildSupportSliceFolder();

  this.gui.add(this, "undo").name("Undo")
    .title("Undo the last edit action.");
  this.gui.add(this, "redo").name("Redo")
    .title("Redo the previous undo.");
  this.gui.add(this, "delete").name("Delete")
    .title("Delete the mesh.");

  this.infoBox = new InfoBox(this.displayPrecision);
  this.infoBox.add("Units", this, "units");
  this.infoBox.add("Polycount", this, ["model","getPolyCount"]);
  this.infoBox.add("Vertex count", this, ["model","getVertexCount"]);
  this.infoBox.add("x range", this, ["model","getXRange"]);
  this.infoBox.add("y range", this, ["model","getYRange"]);
  this.infoBox.add("z range", this, ["model","getZRange"]);
  this.infoBox.add("Center", this, ["model","getCenter"]);
  this.infoBox.add("Size", this, ["model","getSize"]);
  this.infoBox.add("Surface area", this, ["model","surfaceArea"]);
  this.infoBox.add("Volume", this, ["model","volume"]);
  this.infoBox.add("Center of mass", this, ["model","centerOfMass"]);
  this.infoBox.update();

  this.initViewport();
  this.makeBuildVolume();

  // initialize the pointer from the viewport
  this.pointer = new Pointer(this.camera, this.renderer.domElement, this.scene);

  // gizmo creation:
  // set parameters, building the gizmo outward - first scale handles, then
  // normal rotate handles, then orthogonal handle(s), then translate handles;
  // this ensures that everything is spaced correctly

  this.gizmoVisible = false;

  this.gizmoSpacing = 1;

  // current radial boundary; next handle begins one spacing unit away from here
  var gizmoEdge = 0;

  this.gizmoScaleHandleRadius = 1.5;
  this.gizmoScaleHandleHeight = 4.0;
  this.gizmoScaleHandleRadialSegments = 32;
  this.gizmoScaleHandleOffset = 14;
  this.gizmoScaleOrthogonalHandleRadius = 3.0;
  this.gizmoScaleOrthogonalHandleWidthSegments = 32;
  this.gizmoScaleOrthogonalHandleHeightSegments = 16;

  // edge of the
  gizmoEdge = this.gizmoScaleHandleOffset + this.gizmoScaleHandleHeight / 2;

  this.gizmoRotateHandleWidth = 0.6;
  this.gizmoRotateHandleHeight = this.gizmoRotateHandleWidth;
  this.gizmoRotateHandleOuterRadius =
    gizmoEdge + this.gizmoSpacing + this.gizmoRotateHandleWidth / 2;
  this.gizmoRotateHandleRadialSegments = 64;

  gizmoEdge = this.gizmoRotateHandleOuterRadius;

  this.gizmoRotateOrthogonalHandleOuterRadius =
    this.gizmoRotateHandleOuterRadius + this.gizmoSpacing + this.gizmoRotateHandleWidth;

  gizmoEdge = this.gizmoRotateOrthogonalHandleOuterRadius;

  this.gizmoTranslateHandleRadius = 1.5;
  this.gizmoTranslateHandleHeight = 7.5;
  this.gizmoTranslateHandleRadialSegments = 32;
  this.gizmoTranslateHandleOffset =
    gizmoEdge + this.gizmoSpacing + this.gizmoTranslateHandleHeight / 2;

  this.gizmoTranslateOrthogonalHandleWidth = 8,
  this.gizmoTranslateOrthogonalHandleHeight = 4,
  this.gizmoTranslateOrthogonalHandleThickness = 0,
  this.gizmoTranslateOrthogonalHandleInset = 2,
  this.gizmoTranslateOrthogonalHandleOffset =
    this.gizmoRotateOrthogonalHandleOuterRadius + this.gizmoSpacing + 3;

  this.gizmoScaleFactor = 0.003;
  this.gizmoColliderInflation = 0.5;

  var _this = this;

  this.gizmo = new Gizmo(this.camera, this.renderer.domElement, {
    scaleHandleRadius: this.gizmoScaleHandleRadius,
    scaleHandleHeight: this.gizmoScaleHandleHeight,
    scaleHandleRadialSegments: this.gizmoScaleHandleRadialSegments,
    scaleHandleOffset: this.gizmoScaleHandleOffset,
    scaleOrthogonalHandleRadius: this.gizmoScaleOrthogonalHandleRadius,
    scaleOrthogonalHandleWidthSegments: this.gizmoScaleOrthogonalHandleWidthSegments,
    scaleOrthogonalHandleHeightSegments: this.gizmoScaleOrthogonalHandleHeightSegments,

    rotateHandleOuterRadius: this.gizmoRotateHandleOuterRadius,
    rotateOrthogonalHandleOuterRadius: this.gizmoRotateOrthogonalHandleOuterRadius,
    rotateHandleWidth: this.gizmoRotateHandleWidth,
    rotateHandleHeight: this.gizmoRotateHandleHeight,
    rotateHandleRadialSegments: this.gizmoRotateHandleRadialSegments,

    translateHandleRadius: this.gizmoTranslateHandleRadius,
    translateHandleHeight: this.gizmoTranslateHandleHeight,
    translateHandleRadialSegments: this.gizmoTranslateHandleRadialSegments,
    translateHandleOffset: this.gizmoTranslateHandleOffset,
    translateOrthogonalHandleWidth: this.gizmoTranslateOrthogonalHandleWidth,
    translateOrthogonalHandleHeight: this.gizmoTranslateOrthogonalHandleHeight,
    translateOrthogonalHandleThickness: this.gizmoTranslateOrthogonalHandleThickness,
    translateOrthogonalHandleInset: this.gizmoTranslateOrthogonalHandleInset,
    translateOrthogonalHandleOffset: this.gizmoTranslateOrthogonalHandleOffset,

    scaleFactor: this.gizmoScaleFactor,
    colliderInflation: this.gizmoColliderInflation,

    onTransform: function() { _this.controls.disable(); },
    onFinishTransform: function() { _this.controls.enable(); },

    getPosition: function() { return _this.position.clone(); },
    setPosition: function(pos) { _this.position.copy(pos); },
    onTranslate: this.onTranslate.bind(this),
    onFinishTranslate: this.onFinishTranslate.bind(this),

    getRotation: function() { return _this.rotation.clone(); },
    setRotation: function(euler) { _this.rotation.copy(euler); },
    onRotate: this.onRotate.bind(this),
    onFinishRotate: this.onFinishRotate.bind(this),

    getScale: function() { return _this.scale.clone(); },
    setScale: function(scale) { _this.scale.copy(scale); },
    onScale: this.onScaleByFactor.bind(this),
    onFinishScale: this.onFinishScale.bind(this)
  });

  this.gizmo.visible = false;
  //this.gizmo.position.copy(this.calculateBuildPlateCenter());

  this.overlayScene.add(this.gizmo);

  // handle the state of the transformation snap checkbox
  this.handleSnapTransformationToFloorState();
}

// anything that needs to be refreshed by hand (not in every frame)
Meshy.prototype.updateUI = function() {
  this.filenameController.updateDisplay();
}

// used for internal optimization while building a list of unique vertices
Meshy.prototype.setVertexPrecision = function() {
  if (this.model) this.model.setVertexPrecision(this.vertexPrecision);
}
Meshy.prototype.setDisplayPrecision = function() {
  if (this.infoBox) {
    this.infoBox.decimals = this.displayPrecision;
    this.infoBox.update();
  }

  this.setFolderDisplayPrecision(this.editFolder);
  this.setFolderDisplayPrecision(this.crossSectionArrayFolder);
}

// Functions corresponding to buttons in the dat.gui.
Meshy.prototype.exportOBJ = function() { this.export("obj"); }
Meshy.prototype.exportSTL = function() { this.export("stl"); }
Meshy.prototype.exportSTLascii = function() { this.export("stlascii"); }

Meshy.prototype.undo = function() {
  // if slice mode is on, do nothing
  if (this.sliceModeOn) return;

  this.gizmo.transformFinish();

  try {
    this.editStack.undo();
  }
  catch (e) {
    this.printout.warn(e);
  }

  this.infoBox.update();
}
Meshy.prototype.redo = function() {
  // if slice mode is on, do nothing
  if (this.sliceModeOn) return;

  this.gizmo.transformFinish();

  try {
    this.editStack.redo();
  }
  catch (e) {
    this.printout.warn(e);
  }

  this.infoBox.update();
}

// functions for handling model transformations

Meshy.prototype.makeTranslateTransform = function(invertible) {
  var transform = new Transform("translate", this.model.getPosition());
  var _this = this;

  transform.preprocess = function(pos) {
    pos = pos.clone();
    // if snapping to floor, floor the model
    if (_this.snapTransformationsToFloor) {
      pos.z = _this.model.getPosition().z - _this.model.getMin().z;
    }
    return pos;
  }
  transform.onApply = function(pos) {
    // if any measurements active, translate markers
    var delta = pos.clone().sub(_this.model.getPosition());
    _this.forEachMeasurement(function(item) {
      item.measurement.translate(delta);
    });

    _this.model.translate(pos);
  };
  transform.onEnd = function() { _this.model.translateEnd(); };
  transform.invertible = invertible;

  return transform;
}

Meshy.prototype.makeRotateTransform = function(invertible) {
  var transform = new Transform("rotate", this.model.getRotation()), _this = this;

  transform.onApply = function(euler) {
    // disallow having measurements while rotating
    _this.removeAllMeasurements();

    _this.model.rotate(euler);
  };
  transform.onEnd = function() {
    _this.model.rotateEnd();
    if (_this.snapTransformationsToFloor) _this.floorZ(false);
  };
  transform.invertible = invertible;

  return transform;
}

Meshy.prototype.makeScaleTransform = function(invertible) {
  var transform = new Transform("scale", this.model.getScale()), _this = this;

  transform.onApply = function(scale) {
    scale = scale.clone();
    // never scale to 0
    if (scale.x <= 0) scale.x = 1;
    if (scale.y <= 0) scale.y = 1;
    if (scale.z <= 0) scale.z = 1;

    // scale measurement markers with respect to mesh center
    var vfactor = scale.clone().divide(_this.model.getScale());
    _this.forEachMeasurement(function(item, idx) {
      item.measurement.scaleFromPoint(vfactor, _this.position);
    });

    _this.onChangeMeasurementToScale();


    _this.model.scale(scale);
  };
  transform.onEnd = function() {
    _this.model.scaleEnd();
    if (_this.snapTransformationsToFloor) _this.floorZ(false);
  };
  transform.invertible = invertible;

  return transform;
}

Meshy.prototype.makeMirrorTransform = function(invertible) {
  var transform = new Transform("mirror"), _this = this;

  transform.onApply = function(axis) { _this.model.mirror(axis); };
  transform.invertible = invertible;

  return transform;
}

Meshy.prototype.makeFlipNormalsTransform = function(invertible) {
  var transform = new Transform("flipNormals"), _this = this;

  transform.onApply = function() { _this.model.flipNormals(); };
  transform.invertible = invertible;

  return transform;
}

Meshy.prototype.pushEdit = function(transform, onTransform) {
  if (transform && transform.invertible && !transform.noop()) {
    this.editStack.push(transform, onTransform);
  }
}

// called when a translation is in progress
Meshy.prototype.onTranslate = function() {
  if (!this.currentTransform) this.currentTransform = this.makeTranslateTransform();

  this.currentTransform.apply(this.position);
  this.infoBox.update();
}
// called on translation end
Meshy.prototype.onFinishTranslate = function() {
  if (this.currentTransform) this.currentTransform.end();

  this.pushEdit(this.currentTransform, this.updatePosition.bind(this));

  this.currentTransform = null;
  this.updatePosition();
  this.infoBox.update();
}

Meshy.prototype.onChangeRotationDegrees = function() {
  // translate rotation in degrees to rotation in radians
  this.rotation.copy(eulerRadNormalize(eulerDegToRad(this.rotationDeg)));

  this.onRotate();
}

// called when a rotation is in progress
Meshy.prototype.onRotate = function() {
  if (!this.currentTransform) this.currentTransform = this.makeRotateTransform();

  this.currentTransform.apply(this.rotation.clone());
}
// called on rotation end
Meshy.prototype.onFinishRotate = function() {
  if (this.currentTransform) this.currentTransform.end();

  this.pushEdit(this.currentTransform, this.updateRotation.bind(this));

  this.currentTransform = null;
  this.updateRotation();
  this.updatePosition();
  this.updateSize();
  this.infoBox.update();
}

// called when scale change is in progress
Meshy.prototype.onScaleByFactor = function() {
  if (!this.currentTransform) this.currentTransform = this.makeScaleTransform();

  this.currentTransform.apply(this.scale);
}
// called when scaling to size is in progress
Meshy.prototype.onScaleToSize = function() {
  // current size - changed dynamically via gui
  var size = this.size;
  // initial model size - only changes at the end of the transform
  var modelSize = this.model.getSize();

  // axis that's being scaled
  var axis = size.x !== modelSize.x ? "x" : size.y !== modelSize.y ? "y" : "z";
  // factor by which to scale - note zero-size failsafe
  var factor = size[axis] !== 0 ? size[axis] / modelSize[axis] : 1;

  // initial scale of model corresponding to the initial size
  var startScale = this.currentTransform ? this.currentTransform.startVal : this.scale;

  // set scale to a value that will result in the new size
  this.scale.copy(startScale.clone().multiplyScalar(factor));

  this.onScaleByFactor();
}
Meshy.prototype.onScaleToMeasurement = function() {
  var result = this.getCurrentMeasurementResult();

  if (!result || !result.ready) return;

  var key = this.measurementToScale;
  var currentValue = result[key];

  if (currentValue !== undefined) {
    var factor = this.measurementToScaleValue / currentValue;
    if (key === "area") factor = Math.sqrt(factor);

    // initial scale of the model
    var startScale = this.currentTransform ? this.currentTransform.startVal : this.scale;

    // set scale
    this.scale.multiplyScalar(factor);

    this.onScaleByFactor();
  }
}
// called on scale change end
Meshy.prototype.onFinishScale = function() {
  if (this.currentTransform) this.currentTransform.end();

  this.pushEdit(this.currentTransform, this.updateScale.bind(this));

  this.currentTransform = null;
  this.updatePosition();
  this.updateScale();
  this.infoBox.update();
}
// instantaneous scaling by factor
Meshy.prototype.scaleByFactor = function(factor, invertible) {
  if (!this.model) return;

  if (factor <= 0) factor = 1;

  var transform = this.makeScaleTransform(invertible);

  this.scale.multiplyScalar(factor);
  transform.apply(this.scale.clone());
  transform.end();

  this.pushEdit(transform, this.updateScale.bind(this));
  this.updatePosition();
  this.updateScale();
  this.infoBox.update();
}

// instantaneous transformations - mirror, floor, center, autocenter

Meshy.prototype.mirrorX = function(invertible) { this.mirror("x", invertible); }
Meshy.prototype.mirrorY = function(invertible) { this.mirror("y", invertible); }
Meshy.prototype.mirrorZ = function(invertible) { this.mirror("z", invertible); }
Meshy.prototype.mirror = function(axis, invertible) {
  if (!this.model) return;

  var transform = this.makeMirrorTransform(invertible);
  transform.apply(axis);

  this.pushEdit(transform);
}

Meshy.prototype.floorX = function(invertible) { this.floor("x", invertible); }
Meshy.prototype.floorY = function(invertible) { this.floor("y", invertible); }
Meshy.prototype.floorZ = function(invertible) { this.floor("z", invertible); }
Meshy.prototype.floor = function(axis, invertible) {
  if (!this.model) return;

  if (axis === undefined) axis = "z";

  // need to know bounds to floor to them
  this.calculateBuildVolumeBounds();

  var transform = this.makeTranslateTransform(invertible);

  this.position[axis] =
    this.buildVolumeMin[axis] + this.model.getPosition()[axis] - this.model.getMin()[axis];
  transform.apply(this.position.clone());
  transform.end();

  this.pushEdit(transform, this.updatePosition.bind(this));
  this.updatePosition();
}

Meshy.prototype.centerX = function(invertible) { this.center("x", invertible); }
Meshy.prototype.centerY = function(invertible) { this.center("y", invertible); }
Meshy.prototype.centerAll = function(invertible) { this.center("all", invertible); }
Meshy.prototype.center = function(axis, invertible) {
  if (!this.model) return;

  if (axis === undefined) axis = "all";

  var center = this.calculateBuildPlateCenter();

  if (axis === "x" || axis === "all") this.position.x = center.x;
  if (axis === "y" || axis === "all") this.position.y = center.y;

  var transform = this.makeTranslateTransform(invertible);

  transform.apply(this.position.clone());
  transform.end();

  this.pushEdit(transform, this.updatePosition.bind(this));
  this.updatePosition();
}

Meshy.prototype.autoCenter = function(invertible) {
  this.position.copy(this.calculateBuildPlateCenter());
  this.position.z += this.model.getSize().z / 2;

  var transform = this.makeTranslateTransform(invertible);

  transform.apply(this.position.clone());
  transform.end();

  this.pushEdit(transform, this.updatePosition.bind(this));
  this.updatePosition();
}

Meshy.prototype.toggleSetBase = function() {
  if (!this.pointer) return;

  // if currently setting the base, cancel
  if (this.setBaseOn) this.endSetBase();
  // else, start
  else this.startSetBase();
}

Meshy.prototype.startSetBase = function() {
  if (this.setBaseOn) return;

  this.setBaseOn = true;

  if (this.setBaseController) this.setBaseController.name("Cancel (ESC)");

  this.forEachMeasurement(function(item, idx) {
    item.measurement.deactivate();
  });

  this.pointer.deactivate();
  this.pointer.addCallback("set base", this.faceOrientDown.bind(this));
  this.pointer.setCursorPointer();
  this.pointer.activate();
}

Meshy.prototype.endSetBase = function() {
  if (!this.setBaseOn) return;

  this.setBaseOn = false;

  if (this.setBaseController) this.setBaseController.name("Set base");
  if (this.pointer) {
    this.pointer.removeCallback("set base");
    this.pointer.deactivate();
  }

  // a measurement may have been active - treat this as setting it active again
  this.onSetCurrentMeasurement();
}

Meshy.prototype.faceOrientDown = function(intersection) {
  if (!intersection) return;

  var point = intersection.point;
  var face = intersection.face;
  var mesh = intersection.object;

  // get the normal in world space
  var normal = face.normal.clone().transformDirection(mesh.matrixWorld);

  var down = new THREE.Vector3(0, 0, -1);

  var axis = new THREE.Vector3();
  var angle = 0;

  // if already pointing down, do nothing
  if (normal.equals(down)) {
    return;
  }
  // if pointing up, arbitrarily set rotation axis to x
  else if (normal.dot(down) === -1) {
    axis.set(1, 0, 0);
    angle = Math.PI;
  }
  // else, get the axis via cross-product
  else {
    axis.crossVectors(normal, down).normalize();
    angle = acos(normal.dot(down));
  }

  // make the transform and apply it (this operation is always invertible)
  var transform = this.makeRotateTransform();

  // rotate
  var q = new THREE.Quaternion().setFromEuler(this.rotation);
  var dq = new THREE.Quaternion().setFromAxisAngle(axis, angle);
  this.rotation.setFromQuaternion(q.premultiply(dq));

  transform.apply(this.rotation.clone());
  transform.end();

  this.pushEdit(transform, this.updateRotation.bind(this));
  this.updateRotation();
  this.updatePosition();
  this.updateSize();
  this.infoBox.update();

  this.endSetBase();
}

Meshy.prototype.flipNormals = function() {
  if (!this.model) return;

  var transform = this.makeFlipNormalsTransform();

  transform.apply();

  this.pushEdit(transform);
}

// invoked when toggling the checkbox for snapping transformations to floor
Meshy.prototype.handleSnapTransformationToFloorState = function() {
  var snap = this.snapTransformationsToFloor;

  // floor, but don't register the action as undoable
  if (snap) this.floorZ(false);

  if (snap) this.disableController(this.positionZController);
  else this.enableController(this.positionZController);

  if (snap) this.gizmo.disableHandle(Gizmo.HandleTypes.translate, "z");
  else this.gizmo.enableHandle(Gizmo.HandleTypes.translate, "z");
}

// position/rotation/scale GUI-updating functions
Meshy.prototype.updatePosition = function() {
  if (!this.model) return;

  this.position.copy(this.model.getPosition());

  if (this.positionXController) this.positionXController.updateDisplay();
  if (this.positionYController) this.positionYController.updateDisplay();
  if (this.positionZController) this.positionZController.updateDisplay();
}
Meshy.prototype.updateRotation = function() {
  if (!this.model) return;

  this.rotation.copy(eulerRadNormalize(this.model.getRotation()));
  this.rotationDeg.copy(eulerRadToDeg(this.rotation));

  if (this.rotationXController) this.rotationXController.updateDisplay();
  if (this.rotationYController) this.rotationYController.updateDisplay();
  if (this.rotationZController) this.rotationZController.updateDisplay();
}
Meshy.prototype.updateScale = function() {
  if (!this.model) return;

  this.scale.copy(this.model.getScale());

  if (this.scaleXController) this.scaleXController.updateDisplay();
  if (this.scaleYController) this.scaleYController.updateDisplay();
  if (this.scaleZController) this.scaleZController.updateDisplay();

  this.updateSize();
}
Meshy.prototype.updateSize = function() {
  if (!this.model) return;

  this.size.copy(this.model.getSize());

  if (this.scaleToSizeXController) this.scaleToSizeXController.updateDisplay();
  if (this.scaleToSizeYController) this.scaleToSizeYController.updateDisplay();
  if (this.scaleToSizeZController) this.scaleToSizeZController.updateDisplay();
}

Meshy.prototype.buildEditFolder = function() {
  this.clearFolder(this.editFolder);

  this.editFolder.add(this, "snapTransformationsToFloor").name("Snap to floor")
    .title("Snap all transformations to the build volume floor.")
    .onChange(this.handleSnapTransformationToFloorState.bind(this));

  if (!this.model) {
    return;
  }

  this.setBaseOn = false;
  this.setBaseController = this.editFolder.add(this, "toggleSetBase").name("Set base")
    .title("Select a face to align so that its normal points down.");

  // position vector
  this.position = new THREE.Vector3();
  // radian rotation (for internal use) and equivalent degree rotation (for display)
  this.rotation = new THREE.Euler();
  this.rotationDeg = new THREE.Euler();
  // vector of scale factors
  this.scale = new THREE.Vector3();
  // computed size of the model
  this.size = new THREE.Vector3();

  this.updatePosition();
  this.updateRotation();
  this.updateScale();
  this.updateSize();

  this.editFolder.add(this, "autoCenter").name("Autocenter")
    .title("Center the mesh on x and y; snap to the floor on z.");

  // transformation currently in progress
  this.currentTransform = null;

  var translateFolder = this.editFolder.addFolder("Translate", "Translate the mesh on a given axis.");
  this.positionXController = translateFolder.add(this.position, "x")
    .onChange(this.onTranslate.bind(this))
    .onFinishChange(this.onFinishTranslate.bind(this))
    .precision(4);
  this.positionYController = translateFolder.add(this.position, "y")
    .onChange(this.onTranslate.bind(this))
    .onFinishChange(this.onFinishTranslate.bind(this))
    .precision(4);
  this.positionZController = translateFolder.add(this.position, "z")
    .onChange(this.onTranslate.bind(this))
    .onFinishChange(this.onFinishTranslate.bind(this))
    .precision(4);
  // if snapping transformations to floor, might need to disable a controller
  this.handleSnapTransformationToFloorState();

  var rotateFolder = this.editFolder.addFolder("Rotate",
    "Rotate the mesh about a given axis. NB: the given Euler angles are applied in XYZ order, so subsequent rotations may affect previous rotations.");
  this.rotationXController = rotateFolder.add(this.rotationDeg, "x", 0, 360)
    .onChange(this.onChangeRotationDegrees.bind(this))
    .onFinishChange(this.onFinishRotate.bind(this));
  this.rotationYController = rotateFolder.add(this.rotationDeg, "y", 0, 360)
    .onChange(this.onChangeRotationDegrees.bind(this))
    .onFinishChange(this.onFinishRotate.bind(this));
  this.rotationZController = rotateFolder.add(this.rotationDeg, "z", 0, 360)
    .onChange(this.onChangeRotationDegrees.bind(this))
    .onFinishChange(this.onFinishRotate.bind(this));

  var scaleFolder = this.editFolder.addFolder("Scale", "Scale the mesh by given criteria.");

  var scaleByFactorFolder = scaleFolder.addFolder("Scale by Factor", "Scale the mesh by a given factor ");
  this.scaleXController = scaleByFactorFolder.add(this.scale, "x", 0)
    .onChange(this.onScaleByFactor.bind(this))
    .onFinishChange(this.onFinishScale.bind(this));
  this.scaleYController = scaleByFactorFolder.add(this.scale, "y", 0)
    .onChange(this.onScaleByFactor.bind(this))
    .onFinishChange(this.onFinishScale.bind(this));
  this.scaleZController = scaleByFactorFolder.add(this.scale, "z", 0)
    .onChange(this.onScaleByFactor.bind(this))
    .onFinishChange(this.onFinishScale.bind(this));

  var scaleToSizeFolder = scaleFolder.addFolder("Scale to Size", "Scale the mesh uniformly to a given size.");

  this.scaleToSizeXController = scaleToSizeFolder.add(this.size, "x", 0).name("x size")
    .onChange(this.onScaleToSize.bind(this))
    .onFinishChange(this.onFinishScale.bind(this));
  this.scaleToSizeYController = scaleToSizeFolder.add(this.size, "y", 0).name("y size")
    .onChange(this.onScaleToSize.bind(this))
    .onFinishChange(this.onFinishScale.bind(this));
  this.scaleToSizeZController = scaleToSizeFolder.add(this.size, "z", 0).name("z size")
    .onChange(this.onScaleToSize.bind(this))
    .onFinishChange(this.onFinishScale.bind(this));

  this.scaleToMeasurementFolder = scaleFolder.addFolder("Scale to Measurement",
    "Set up a measurement and then scale the mesh such that the measurement will now equal the given value.");

  var ringSizeFolder = scaleFolder.addFolder("Scale To Ring Size",
    "Set up a circle measurement around the inner circumference of a ring mesh, then scale so that the mesh will have the correct measurement in mm.");
  ringSizeFolder.add(this, "measureCircle").name("1. Mark circle")
    .title("Turn on the circle measurement tool and mark the inner circumference of the ring.");
  this.ringSize = 0;
  ringSizeFolder.add(this, "ringSize", ringSizes).name("2. Ring size")
    .title("Select ring size.");
  ringSizeFolder.add(this, "scaleToRingSize").name("3. Scale to size")
    .title("Scale the ring.");
  ringSizeFolder.add(this, "removeCurrentMeasurement").name("4. End measurement")
    .title("Turn off the measurement tool (ESC).");

  var mirrorFolder = this.editFolder.addFolder("Mirror", "Mirror the mesh on a given axis in object space.");
  mirrorFolder.add(this, "mirrorX").name("Mirror on x")
    .title("Mirror mesh on x axis.");
  mirrorFolder.add(this, "mirrorY").name("Mirror on y")
    .title("Mirror mesh on y axis.");
  mirrorFolder.add(this, "mirrorZ").name("Mirror on z")
    .title("Mirror mesh on z axis.");

  var floorFolder = this.editFolder.addFolder("Floor", "Floor the mesh on a given axis.");
  floorFolder.add(this, "floorX").name("Floor to x")
    .title("Floor the mesh on x axis.");
  floorFolder.add(this, "floorY").name("Floor to y")
    .title("Floor the mesh on y axis.");
  floorFolder.add(this, "floorZ").name("Floor to z")
    .title("Floor the mesh on z axis.");

  var centerFolder = this.editFolder.addFolder("Center", "Center the mesh on a given axis in the build volume.");
  centerFolder.add(this, "centerAll").name("Center on all")
    .title("Center the mesh on all axes.");
  centerFolder.add(this, "centerX").name("Center on x")
    .title("Center the mesh on x axis.");
  centerFolder.add(this, "centerY").name("Center on y")
    .title("Center the mesh on y axis.");

  this.editFolder.add(this, "flipNormals").name("Flip normals")
    .title("Flip mesh normals.");
}
Meshy.prototype.scaleToRingSize = function() {
  var measurement = this.getCurrentMeasurement();
  var result = this.getCurrentMeasurementResult();

  // must have an active circle measurement
  if (!measurement || !measurement.active || measurement.getType() !== Measurement.Types.circle
    // must have a measurement result and a diameter field in that result
    || !result || result.diameter === undefined)
  {
    this.printout.warn("Scaling to ring size requires an active, valid circle measurement.");
    return;
  }

  if (!this.ringSize) {
    this.printout.warn("Select a ring size.");
    return;
  }

  var tmpVal = this.measurementToScaleValue;
  var tmpType = this.measurementToScale;

  this.measurementToScale = "diameter";
  this.measurementToScaleValue = this.ringSize;

  this.onScaleToMeasurement();
  this.onFinishScale();

  this.measurementToScale = tmpType;
  this.measurementToScaleValue = tmpVal;

  // update the scale to measurement folder b/c the values changed
  this.onChangeMeasurementToScale();
}

Meshy.prototype.buildMeasurementFolder = function() {
  this.clearFolder(this.measurementFolder);

  this.measurementFolder.add(this, "measureLength").name("Length")
    .title("Measure point-to-point length.");
  this.measurementFolder.add(this, "measureAngle").name("Angle")
    .title("Measure angle (in degrees) between two segments formed by three consecutive points.");
  this.measurementFolder.add(this, "measureCircle").name("Circle")
    .title("Circle measurement: radius, diameter, circumference, arc length.");
  this.measurementFolder.add(this, "measureCrossSectionX").name("Cross-section x")
    .title("Measure cross-section on x axis.");
  this.measurementFolder.add(this, "measureCrossSectionY").name("Cross-section y")
    .title("Measure cross-section on y axis.");
  this.measurementFolder.add(this, "measureCrossSectionZ").name("Cross-section z")
    .title("Measure cross-section on z axis.");

  // todo: remove
  if (this.calculateManually === undefined) this.calculateManually = false;
  if (this.showPreviewMarker === undefined) this.showPreviewMarker = false;
  if (this.previewMarkerRadiusOffset === undefined) this.previewMarkerRadiusOffset = false;
  this.measurementFolder.add(this, "measureLocalCrossSection").name("Local cross-section")
    .title("Measure the cross-section of a single part of the mesh.");
  this.measurementFolder.add(this, "measureConvexHull").name("Convex hull")
    .title("Compute the convex hull for cross-sections.")
    .onChange(this.onToggleConvexHull.bind(this));

  this.crossSectionArrayAxis = "z";
  this.crossSectionArrayOffset = 0.5;
  this.crossSectionArrayIncrement = 1;
  this.crossSectionArrayFilename = "cross_section_results";
  this.crossSectionArrayFormat = "json";

  this.crossSectionArrayFolder = this.measurementFolder.addFolder("Cross-section array", "Make multiple cross-section measurements.");
  this.crossSectionArrayFolder.add(this, "crossSectionArrayAxis", ["x", "y", "z"]).name("Axis")
    .title("Axis normal to the cross-section planes.");
  this.crossSectionArrayFolder.add(this, "crossSectionArrayOffset", 0).precision(4).name("Min offset")
    .title("Offset from the mesh's minimum bound on the measurement axis.");
  this.crossSectionArrayFolder.add(this, "crossSectionArrayIncrement", 0.0001).precision(4).name("Increment")
    .title("Distance between adjacent cross-section planes.");
  this.crossSectionArrayFolder.add(this, "crossSectionArrayFilename").name("Filename")
    .title("Filename for the measurement result.")
  this.crossSectionArrayFolder.add(this, "crossSectionArrayFormat", ["json", "csv"]).name("Format")
    .title("Output format for the measurement result.");
  this.crossSectionArrayFolder.add(this, "measureCrossSectionArray").name("Measure")
    .title("Measure an array of cross-sections and export a JSON file with the results.");

  if (this.measurementsExist()) {
    var indices = {};
    this.forEachMeasurement(function(item, idx) {
      indices[idx + " (" + item.measurement.getType() + ")"] = idx;
    });

    this.measurementFolder.add(this, "measurementIdx", indices).name("Current")
      .title("Current measurement.")
      .onChange(this.onSetCurrentMeasurement.bind(this));
    // todo: remove
    //this.measurementFolder.add(this, "measurementCalculate").name("Calculate");
    this.measurementFolder.add(this, "removeCurrentMeasurement").name("Remove")
      .title("Remove the current measurement.");
    this.measurementFolder.add(this, "removeAllMeasurements").name("Remove all")
      .title("Remove the all measurements.");
  }
}
Meshy.prototype.onSetCurrentMeasurement = function() {
  this.pointer.setCursorCircle();

  var currentIdx = this.measurementIdx;

  if (currentIdx < 0) return;

  // deactivate every other measurement
  this.forEachMeasurement(function(item, idx) {
    item.measurement.deactivate();
  });

  // activate the current measurement
  this.getMeasurementItem(currentIdx).measurement.activate();

  // current measurement changed, so rebuild the scale to measurement folder
  this.buildScaleToMeasurementFolder();
}
Meshy.prototype.onToggleConvexHull = function() {
  var convexHull = this.measureConvexHull;

  this.forEachMeasurement(function(item, idx) {
    var measurement = item.measurement;

    measurement.setParams({ convexHull: convexHull });

    // recalculate the measurement, but do it only if there's a valid current
    // result, else there's no point
    if (measurement.result && measurement.result.ready) {
      measurement.calculate();
    }
  });
}
Meshy.prototype.getMeasurementItem = function(idx) {
  return this.measurementData[idx];
}
Meshy.prototype.getCurrentMeasurement = function() {
  var item = this.getMeasurementItem(this.measurementIdx);

  return item ? item.measurement : null;
}
Meshy.prototype.getCurrentMeasurementResult = function() {
  if (this.measurementIdx >= 0) return this.measurementData[this.measurementIdx].result;
  else return null;
}
Meshy.prototype.setCurrentMeasurementResult = function(result) {
  var item = this.getMeasurementItem(this.measurementIdx);

  if (item) item.result = result;
}
// todo: remove
Meshy.prototype.measurementCalculate = function() {
  this.getCurrentMeasurement().calculate();
}
Meshy.prototype.removeCurrentMeasurement = function() {
  var item = this.getMeasurementItem(this.measurementIdx);
  if (!item) return;

  // destroy measurement
  item.measurement.dispose();

  // remove entry from infobox
  this.infoBox.removeList(item.list);

  var measurementCount = this.measurementData.length;

  // remove measurement data item
  this.measurementData.splice(this.measurementIdx, 1);

  // if removing the last measurement, shift current measurement down
  if (this.measurementIdx >= measurementCount - 1) this.measurementIdx--;

  this.onSetCurrentMeasurement();

  this.buildMeasurementFolder();

  if (!this.measurementsExist()) this.onRemoveLastMeasurement();
}
Meshy.prototype.removeAllMeasurements = function() {
  for (var i = 0, l = this.measurementData.length; i < l; i++) {
    var item = this.getMeasurementItem(i);

    // destroy measurement
    item.measurement.dispose();

    // remove entry from infobox
    this.infoBox.removeList(item.list);
  }

  this.measurementData.length = 0;
  this.measurementIdx = -1;

  this.buildMeasurementFolder();

  this.onRemoveLastMeasurement();
}

Meshy.prototype.measureLength = function() {
  this.addMeasurement({ type: Measurement.Types.length });
}
Meshy.prototype.measureAngle = function() {
  this.addMeasurement({ type: Measurement.Types.angle });
}
Meshy.prototype.measureCircle = function() {
  this.addMeasurement({ type: Measurement.Types.circle });
}
Meshy.prototype.measureCrossSectionX = function() {
  this.addMeasurement({
    type: Measurement.Types.crossSection,
    axis: "x",
    convexHull: this.measureConvexHull
  });
}
Meshy.prototype.measureCrossSectionY = function() {
  this.addMeasurement({
    type: Measurement.Types.crossSection,
    axis: "y",
    convexHull: this.measureConvexHull
  });
}
Meshy.prototype.measureCrossSectionZ = function() {
  this.addMeasurement({
    type: Measurement.Types.crossSection,
    axis: "z",
    convexHull: this.measureConvexHull
  });
}
Meshy.prototype.measureCrossSectionArray = function() {
  // slice mode keeps its own copy of the mesh, so don't allow measuring
  if (this.sliceModeOn) {
    this.printout.warn("Cannot measure mesh while slice mode is on.");
    return;
  }

  if (!this.model) return;

  var axis = this.crossSectionArrayAxis;
  var increment = this.crossSectionArrayIncrement;
  var offset = this.crossSectionArrayOffset;
  var size = this.model.getSize()[axis];
  var min = this.model.getMin()[axis];

  if (size < offset) {
    this.printout.warn("Offset is larger than the model size.");
    return;
  }

  var measurement = new Measurement(this.pointer, this.scene);
  var results = [];

  var numberOfSteps = Math.ceil((size - offset) / increment);
  var start = new THREE.Vector3();
  start[axis] = min + offset;

  for (var i = 0; i < numberOfSteps; i++) {
    var point = start.clone();
    point[axis] += i * increment;

    var result = measurement.calculateNoninteractive({
      type: Measurement.Types.crossSection,
      axis: this.crossSectionArrayAxis,
      p: [point]
    });
    results.push({
      position: point[axis],
      area: result.area,
      length: result.length
    });
  }

  var format = this.crossSectionArrayFormat;

  var dataStr;
  if (format === "json") {
    // https://stackoverflow.com/a/30800715
    dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({
      axis: axis,
      results: results
    }));
  }
  else {
    var csvContent = results.map(function(result) { return result.position + ',' + result.area + ',' + result.length + '\n'; }).join('');
    dataStr = "data:text/csv;charset=utf-8," + encodeURIComponent(csvContent);
  }
  var downloadAnchorNode = document.createElement('a');
  downloadAnchorNode.setAttribute("href", dataStr);
  downloadAnchorNode.setAttribute("download", this.crossSectionArrayFilename + "." + format);
  document.body.appendChild(downloadAnchorNode); // required for firefox
  downloadAnchorNode.click();
  downloadAnchorNode.remove();
}
Meshy.prototype.measureLocalCrossSection = function() {
  this.addMeasurement({
    type: Measurement.Types.orientedCrossSection,
    nearestContour: true,
    convexHull: this.measureConvexHull,
    // todo: remove
    calculateManually: this.calculateManually,
    showPreviewMarker: this.showPreviewMarker,
    previewMarkerRadiusOffset: this.previewMarkerRadiusOffset
  });
}
Meshy.prototype.addMeasurement = function(params) {
  // slice mode keeps its own copy of the mesh, so don't allow measuring
  if (this.sliceModeOn) {
    this.printout.warn("Cannot measure mesh while slice mode is on.");
    return;
  }

  if (!this.model) return;

  // if setting base, stop doing that
  this.endSetBase();

  // disable rotation and axis scaling handles on the gizmo
  if (this.gizmo) {
    this.gizmo.disableHandle(Gizmo.HandleTypes.rotate, "x");
    this.gizmo.disableHandle(Gizmo.HandleTypes.rotate, "y");
    this.gizmo.disableHandle(Gizmo.HandleTypes.rotate, "z");
    this.gizmo.disableHandle(Gizmo.HandleTypes.rotate, "o");

    this.gizmo.disableHandle(Gizmo.HandleTypes.scale, "x");
    this.gizmo.disableHandle(Gizmo.HandleTypes.scale, "y");
    this.gizmo.disableHandle(Gizmo.HandleTypes.scale, "z");
  }

  // have a set color for the first measurement, random colors for anything after that
  params.color = !this.measurementsExist() ? 0x8adeff : Math.round((Math.random() / 2.0 + 0.5) * 0xffffff);

  // construct the structure containing the measurement, its infobox list, and the result
  var item = {
    measurement: new Measurement(this.pointer, this.scene),
    list: null,
    result: null
  };

  this.measurementIdx = this.measurementData.length;
  this.measurementData.push(item);

  var type = params.type;

  if (type === Measurement.Types.length) {
    item.list = this.infoBox.addList(item.measurement.uuid, "Length", params.color);
    item.list.add("Length", item, ["result", "length"]);
    item.list.add("X", item, ["result", "vector", "x"]);
    item.list.add("Y", item, ["result", "vector", "y"]);
    item.list.add("Z", item, ["result", "vector", "z"]);
  }
  else if (type === Measurement.Types.angle) {
    item.list = this.infoBox.addList(item.measurement.uuid, "Angle", params.color);
    item.list.add("Angle", item, ["result", "angleDegrees"]);
  }
  else if (type === Measurement.Types.circle) {
    item.list = this.infoBox.addList(item.measurement.uuid, "Circle", params.color);
    item.list.add("Radius", item, ["result", "radius"]);
    item.list.add("Diameter", item, ["result", "diameter"]);
    item.list.add("Circumference", item, ["result", "circumference"]);
    item.list.add("Area", item, ["result", "area"]);
    item.list.add("Normal", item, ["result", "normal"]);
  }
  else if (type === Measurement.Types.crossSection) {
    item.list = this.infoBox.addList(item.measurement.uuid, "Cross-section " + params.axis, params.color);
    item.list.add("Area", item, ["result", "area"]);
    item.list.add("Min", item, ["result", "boundingBox", "min"]);
    item.list.add("Max", item, ["result", "boundingBox", "max"]);
    item.list.add("Contour length", item, ["result", "length"]);
  }
  else if (type === Measurement.Types.orientedCrossSection) {
    item.list = this.infoBox.addList(item.measurement.uuid, "Local cross-section", params.color);
    item.list.add("Area", item, ["result", "area"]);
    item.list.add("Min", item, ["result", "boundingBox", "min"]);
    item.list.add("Max", item, ["result", "boundingBox", "max"]);
    item.list.add("Contour length", item, ["result", "length"]);
  }
  else return;

  // construct the onResultChange function

  var _this = this;
  item.measurement.onResultChange = function(result) {
    // need to update the folder if no result or result ready status changed
    var folderNeedsUpdate =
      item.result === null || item.result.ready !== result.ready;

    // update internal result
    item.result = result;

    // if necessary, rebuild the folder
    if (folderNeedsUpdate) {
      _this.buildScaleToMeasurementFolder();
    }

    // update measurement-to-scale field
    if (!this.currentTransform) _this.onChangeMeasurementToScale();

    // update infobox list
    item.list.update();
  }

  item.measurement.start(params);

  this.buildMeasurementFolder();
  this.buildScaleToMeasurementFolder();
  this.onSetCurrentMeasurement();
}
Meshy.prototype.forEachMeasurement = function(fn) {
  for (var m = 0; m < this.measurementData.length; m++) {
    fn(this.measurementData[m], m);
  }
}
Meshy.prototype.measurementsExist = function() {
  return this.measurementData.length > 0;
}
Meshy.prototype.buildScaleToMeasurementFolder = function() {
  this.clearFolder(this.scaleToMeasurementFolder);

  if (!this.measurementsExist()) return;

  var result = this.getCurrentMeasurementResult();
  if (!result || !result.ready) return;

  var measurement = this.getCurrentMeasurement();
  if (!measurement) return;

  // measurement type
  var type = measurement.getType();
  // measurements to scale
  var scalableMeasurements = [];
  this.scalableMeasurements = scalableMeasurements;

  if (type === Measurement.Types.length) {
    addScalableMeasurement("length");
  }
  else if (type === Measurement.Types.circle) {
    addScalableMeasurement("radius");
    addScalableMeasurement("diameter");
    addScalableMeasurement("circumference");
    addScalableMeasurement("area");
  }
  else if (type === Measurement.Types.crossSection) {
    addScalableMeasurement("area");
    addScalableMeasurement("length");
  }
  else if (type === Measurement.Types.orientedCrossSection) {
    addScalableMeasurement("area");
    addScalableMeasurement("length");
  }
  // do nothing if nothing to scale
  else return;

  this.measurementToScale = scalableMeasurements[0];
  this.measurementToScaleValue = 1;

  this.scaleToMeasurementFolder.add(this, "measurementToScale", this.scalableMeasurements)
    .name("Measurement to scale")
    .title("Select an available measurement to which to scale.")
    .onChange(this.onChangeMeasurementToScale.bind(this));
  this.measurementToScaleValueController = this.scaleToMeasurementFolder.add(this, "measurementToScaleValue")
    .name("Value")
    .title("Updating this field scales the mesh so that the measurement equals this value.")
    .onChange(this.onScaleToMeasurement.bind(this))
    .onFinishChange(this.onFinishScale.bind(this));

  this.setFolderDisplayPrecision(this.scaleToMeasurementFolder);

  this.onChangeMeasurementToScale();

  // adds a key to the scalableMeasurements array if
  function addScalableMeasurement(name) {
    if (result.hasOwnProperty(name)) scalableMeasurements.push(name);
  }
}
Meshy.prototype.onChangeMeasurementToScale = function() {
  var result = this.getCurrentMeasurementResult();
  if (!result || !result.ready) return;

  // the new value defaults to the current value
  this.measurementToScaleValue = result[this.measurementToScale];

  // update controller
  var controller = this.measurementToScaleValueController;

  if (controller) controller.updateDisplay();
}
Meshy.prototype.onRemoveLastMeasurement = function() {
  if (this.measurementsExist()) return;

  // clear scale to measurement folder
  if (this.scaleToMeasurementFolder) {
    this.clearFolder(this.scaleToMeasurementFolder);
    this.measurementToScale = "";
    this.measurementToScaleValueController = null;
  }

  // reenable rotation and axis scaling handles on the gizmo
  if (this.gizmo) {
    this.gizmo.enableHandle(Gizmo.HandleTypes.rotate, "x");
    this.gizmo.enableHandle(Gizmo.HandleTypes.rotate, "y");
    this.gizmo.enableHandle(Gizmo.HandleTypes.rotate, "z");
    this.gizmo.enableHandle(Gizmo.HandleTypes.rotate, "o");

    this.gizmo.enableHandle(Gizmo.HandleTypes.scale, "x");
    this.gizmo.enableHandle(Gizmo.HandleTypes.scale, "y");
    this.gizmo.enableHandle(Gizmo.HandleTypes.scale, "z");
  }
}
Meshy.prototype.viewThickness = function() {
  if (this.model) this.model.viewThickness(this.thicknessThreshold);
}
Meshy.prototype.clearThicknessView = function() {
  if (this.model) this.model.clearThicknessView();
}
Meshy.prototype.repair = function() {
  this.endSliceMode();
  if (this.model) this.model.repair();

  this.infoBox.update();
}
Meshy.prototype.generateSupports = function() {
  if (this.model) {
    if (this.supportRadius < this.lineWidth) {
      this.printout.warn("Support radius is lower than the planar resolution.");
    }
    else if (this.supportRadius * this.supportTaperFactor < this.lineWidth) {
      this.printout.warn("Support taper radius is lower than the planar resolution. This may result in missing support slices.");
    }

    this.model.generateSupports({
      angle: this.supportAngle,
      resolution: this.lineWidth * this.supportSpacingFactor,
      layerHeight: this.layerHeight,
      radius: this.supportRadius,
      taperFactor: this.supportTaperFactor,
      subdivs: this.supportSubdivs,
      radiusFn: this.supportRadiusFnMap[this.supportRadiusFnName],
      radiusFnK: this.supportRadiusFnK,
      axis: this.sliceAxis
    });
  }
}
Meshy.prototype.removeSupports = function() {
  if (this.model) this.model.removeSupports();
}
// build support & slicing folder
Meshy.prototype.buildSupportSliceFolder = function() {
  var supportSliceFolder = this.supportSliceFolder;
  this.clearFolder(supportSliceFolder);

  if (this.sliceModeOn) {
    this.buildSliceFolder(supportSliceFolder);
  }
  else {
    supportSliceFolder.add(this, "layerHeight", .0001, 1).name("Layer height")
      .title("Height of each mesh slice layer.");
    supportSliceFolder.add(this, "lineWidth", .0001, 1).name("Line width")
      .title("Width of the print line. Affects minimum resolvable detail size, decimation of sliced contours, and extrusion in the exported G-code.");
    supportSliceFolder.add(this, "sliceAxis", ["x", "y", "z"]).name("Up axis")
      .title("Axis normal to the slicing planes.");

    var supportFolder = supportSliceFolder.addFolder("Supports", "Generate supports for printing the model.");
    this.buildSupportFolder(supportFolder);

    var sliceFolder = supportSliceFolder.addFolder("Slice", "Slice the mesh.");
    this.buildSliceFolder(sliceFolder);
  }
}
Meshy.prototype.buildSupportFolder = function(folder) {
  folder.add(this, "supportAngle", 0, 89).name("Angle")
    .title("Angle defining faces that need support.");
  folder.add(this, "supportSpacingFactor", 1, 100).name("Spacing factor")
    .title("Greater spacing factor makes supports more sparse.");
  folder.add(this, "supportRadius", 0.0001, 1).name("Radius")
    .title("Base radius for supports. NB: if this radius is too low in comparison with line width, the supports may not print correctly.");
  folder.add(this, "supportTaperFactor", 0, 1).name("Taper factor")
    .title("Defines how much the supports taper when connected to the mesh.");
  folder.add(this, "supportSubdivs", 4).name("Subdivs")
    .title("Number of subdivisions in the cylindrical support struts.");
  folder.add(this, "supportRadiusFnName", ["constant", "sqrt"]).name("Radius function")
    .title("Function that defines how support radius grows with the volume it supports; default is square root.");
  folder.add(this, "supportRadiusFnK", 0).name("Function constant")
    .title("Multiplicative constant that modifies the support radius function.");
  folder.add(this, "generateSupports").name("Generate supports")
    .title("Generate the supports.");
  folder.add(this, "removeSupports").name("Remove supports")
    .title("Remove generated supports.");
}
Meshy.prototype.buildSliceDisplayFolder = function(folder) {
  this.clearFolder(folder);

  if (this.sliceMode === Slicer.Modes.preview) {
    folder.add(this, "slicePreviewModeSliceMesh", true).name("Show sliced mesh")
      .onChange(this.updateSlicerDisplayParams.bind(this))
      .title("If checked, the mesh is shown sliced by the current slicing plane; else, the mesh is shown as a ghost.");
  }
  else if (this.sliceMode === Slicer.Modes.full) {
    folder.add(this, "sliceFullModeUpToLayer").name("Up to layer")
      .onChange(this.updateSlicerDisplayParams.bind(this))
      .title("Display all contours, or all contours up to a given layer.");
    folder.add(this, "sliceFullModeShowInfill").name("Show infill")
      .onChange(this.updateSlicerDisplayParams.bind(this))
      .title("Show infill if checked; default setting is false because infill makes the layers hard to see.");
  }
}
Meshy.prototype.buildSliceFolder = function(folder) {
  this.clearFolder(folder);

  if (this.sliceModeOn) {
    var maxLevel = this.model.getMaxSliceLevel();
    var minLevel = this.model.getMinSliceLevel();

    this.currentSliceLevel = this.model.getCurrentSliceLevel();
    this.sliceLevelController = folder.add(this, "currentSliceLevel")
      .min(minLevel).max(maxLevel).step(1)
      .onChange(this.setSliceLevel.bind(this))
      .name("Slice")
      .title("Set the current slicing plane.");
    this.sliceMode = this.model.getSliceMode();
    folder.add(
      this,
      "sliceMode",
      { "preview": Slicer.Modes.preview, "full": Slicer.Modes.full }
    )
      .name("Mode").onChange(this.setSliceMode.bind(this))
      .title("Set slicer mode: preview mode shows the mesh sliced at a particular level; full mode shows all layers simultaneously.");

    this.sliceDisplayFolder = folder.addFolder("Display", "Display options for the current slice mode.");
    this.buildSliceDisplayFolder(this.sliceDisplayFolder);
  }
  this.buildLayerSettingsFolder(folder);
  this.buildRaftFolder(folder);
  this.buildGcodeFolder(folder);

  if (this.sliceModeOn) folder.add(this, "endSliceMode").name("Slice mode off")
    .title("Turn slice mode off.");
  else folder.add(this, "startSliceMode").name("Slice mode on")
    .title("Turn slice mode on.");
}
Meshy.prototype.buildLayerSettingsFolder = function(folder) {
  var sliceLayerSettingsFolder = folder.addFolder("Layer Settings", "Settings for computing layers.");
  this.clearFolder(sliceLayerSettingsFolder);

  sliceLayerSettingsFolder.add(this, "sliceNumWalls", 1, 10).name("Walls").step(1)
    .title("Number of horizontal walls between the print exterior and the interior.");
  sliceLayerSettingsFolder.add(this, "sliceNumTopLayers", 1, 10).name("Top layers").step(1)
    .title("Number of layers of solid infill that must be present between the print interior and exterior in the vertical direction.");
  sliceLayerSettingsFolder.add(this, "sliceOptimizeTopLayers").name("Optimize top layers")
    .title("Calculate the top layers in an optimized way. This may result in slightly less accurate solid infill computation but should cheapen computation.");
  sliceLayerSettingsFolder.add(this, "sliceInfillType", {
    "none": Slicer.InfillTypes.none,
    "solid": Slicer.InfillTypes.solid,
    "grid": Slicer.InfillTypes.grid,
    "lines": Slicer.InfillTypes.lines,
    //"triangle": Slicer.InfillTypes.triangle,
    //"hex": Slicer.InfillTypes.hex
  }).name("Infill type")
    .title("Print infill type: fills the parts of each contour that aren't occupied by solid infill forming top layers. If 'none' is selected, solid top layer infill is still generated.");
  sliceLayerSettingsFolder.add(this, "sliceInfillDensity", 0, 1).name("Infill density")
    .title("0 density means no infill, 1 means solid.");
  sliceLayerSettingsFolder.add(this, "sliceInfillOverlap", 0, 1).name("Infill overlap")
    .title("Defines how much infill overlaps with the innermost wall. 0 gives a separation of a full line width, 1 means the printline of an infill line starts and ends on the centerline of the wall.");
  if (this.sliceModeOn) {
    sliceLayerSettingsFolder.add(this, "updateSlicerParams").name("Apply")
      .title("Update the layer parameters and recalculate as necessary.");
  }
}
Meshy.prototype.buildRaftFolder = function(folder) {
  var sliceRaftFolder = folder.addFolder("Raft", "Settings for computing the raft.");
  this.clearFolder(sliceRaftFolder);

  sliceRaftFolder.add(this, "sliceMakeRaft").name("Make raft")
    .title("Checked if the slicer needs to generate a raft. The raft is formed from several layers of infill to provide initial adhesion to the build plate.");
  sliceRaftFolder.add(this, "sliceRaftNumBaseLayers", 0).step(1).name("Base layers")
    .title("Number of raft base layers. These layers are printed slowly to ensure initial adhesion.");
  sliceRaftFolder.add(this, "sliceRaftBaseLayerHeight", 0).name("Base height")
    .title("Print height of the raft base layers.");
  sliceRaftFolder.add(this, "sliceRaftBaseLineWidth", 0).name("Base width")
    .title("Line width of the raft base layers.");
  sliceRaftFolder.add(this, "sliceRaftBaseDensity", 0, 1).name("Base density")
    .title("Density of the infill forming the raft base layers.");
  sliceRaftFolder.add(this, "sliceRaftNumTopLayers", 0).step(1).name("Top layers")
    .title("Number of additional layers on top of the raft base layers.");
  sliceRaftFolder.add(this, "sliceRaftTopLayerHeight", 0).name("Top height")
    .title("Print height of the raft top layers.");
  sliceRaftFolder.add(this, "sliceRaftTopLineWidth", 0).name("Top width")
    .title("Line width of the raft top layers.");
  sliceRaftFolder.add(this, "sliceRaftTopDensity", 0, 1).name("Top density")
    .title("Density of the infill forming the raft top layers.");
  sliceRaftFolder.add(this, "sliceRaftOffset", 0).name("Offset")
    .title("Horizontal outward offset distance of the raft from the bottom of the mesh. A wider raft will adhere to the build plate better.");
  sliceRaftFolder.add(this, "sliceRaftGap", 0).name("Air gap")
    .title("Small air gap between the top of the raft and the bottom of the main print to make detaching the print easier.");
  sliceRaftFolder.add(this, "sliceRaftWriteWalls").name("Print perimeter")
    .title("Optionally print the raft with walls around the infill.");
  if (this.sliceModeOn) {
    sliceRaftFolder.add(this, "updateSlicerParams").name("Apply")
      .title("Update the raft parameters and recalculate as necessary.");
  }
}
Meshy.prototype.buildGcodeFolder = function(folder) {
  var gcodeFolder = folder.addFolder("G-code", "Settings for computing the G-code.");
  this.clearFolder(gcodeFolder);

  this.gcodeFilenameController = gcodeFolder.add(this, "gcodeFilename").name("Filename")
    .title("Filename to save.");
  gcodeFolder.add(this, "gcodeExtension", { gcode: "gcode" }).name("Extension")
    .title("File extension.");
  gcodeFolder.add(this, "gcodeTemperature", 0).name("Temperature")
    .title("Extruder temperature.");
  gcodeFolder.add(this, "gcodeFilamentDiameter", 0.1, 5).name("Filament diameter")
    .title("Filament diameter (mm); affects the computation of how much to extrude.");
  gcodeFolder.add(this, "gcodePrimeExtrusion", 0).name("Prime extrusion")
    .title("Small length (mm) of filament to extrude for priming the nozzle.");
  gcodeFolder.add(this, "gcodeExtrusionMultiplier", 0).name("Extrusion multiplier")
    .title("Factor that can be used to tweak under- or over-extrusion. Directly multiplies gcode extrusion values. Default is 1.");
  gcodeFolder.add(this, "gcodeInfillSpeed", 0).name("Infill speed")
    .title("Speed (mm/s) at which infill is printed. Infill is less sensitive to accuracy issues, so it can be printed more quickly than the walls.");
  gcodeFolder.add(this, "gcodeWallSpeed", 0).name("Wall speed")
    .title("Speed (mm/s) at which the walls are printed.");
  gcodeFolder.add(this, "gcodeRaftBasePrintSpeed", 0).name("Raft base speed")
    .title("Speed (mm/s) at which the raft base layer should be printed. Should be slow so that the layer is thick and adheres properly.");
  gcodeFolder.add(this, "gcodeRaftTopPrintSpeed", 0).name("Raft top speed")
    .title("Speed (mm/s) at which the raft top layer should be printed.");
  gcodeFolder.add(this, "gcodeTravelSpeed", 0).name("Travel speed")
    .title("Speed (mm/s) at which the extruder travels while not printing.");
  gcodeFolder.add(this, "gcodeCoordinatePrecision", 0).name("Coord precision")
    .title("Number of digits used for filament position coordinates. More digits increases file size.");
  gcodeFolder.add(this, "gcodeExtruderPrecision", 0).name("Extruder precision")
    .title("Number of digits used for extrusion values. More digits increases file size.");
  if (this.sliceModeOn) {
    gcodeFolder.add(this, "gcodeSave", 0).name("Save G-code")
      .title("Generate g-code and save it to a file.");
  }
}
Meshy.prototype.setSliceMode = function() {
  if (this.model) {
    this.model.setSliceMode(this.sliceMode);
    this.buildSliceDisplayFolder(this.sliceDisplayFolder);
  }
}
Meshy.prototype.updateSlicerDisplayParams = function() {
  if (this.model) {
    this.model.updateSlicerParams({
      previewSliceMesh: this.slicePreviewModeSliceMesh,
      fullUpToLayer: this.sliceFullModeUpToLayer,
      fullShowInfill: this.sliceFullModeShowInfill
    });
    this.setSliceLevel();
  }
}
Meshy.prototype.updateSlicerParams = function() {
  if (this.model) {
    this.model.updateSlicerParams(this.makeSlicerParams());
    if (this.sliceLevelController) {
      this.sliceLevelController.min(this.model.getMinSliceLevel());
      this.sliceLevelController.max(this.model.getMaxSliceLevel());
    }
  }
  this.setSliceLevel();
}
Meshy.prototype.startSliceMode = function() {
  this.removeAllMeasurements();

  if (this.model) {
    this.sliceModeOn = true;
    this.model.startSliceMode(this.makeSlicerParams());
    this.buildSliceFolder(this.supportSliceFolder);
  }
  this.handleGizmoVisibility();
}
Meshy.prototype.makeSlicerParams = function() {
  return {
    mode: this.sliceMode,
    axis: this.sliceAxis,
    layerHeight: this.layerHeight,
    lineWidth: this.lineWidth,
    numWalls: this.sliceNumWalls,
    numTopLayers: this.sliceNumTopLayers,
    optimizeTopLayers: this.sliceOptimizeTopLayers,
    infillType: parseInt(this.sliceInfillType),
    infillDensity: this.sliceInfillDensity,
    infillOverlap: this.sliceInfillOverlap,
    makeRaft: this.sliceMakeRaft,
    raftNumTopLayers: this.sliceRaftNumTopLayers,
    raftTopLayerHeight: this.sliceRaftTopLayerHeight,
    raftTopLineWidth: this.sliceRaftTopLineWidth,
    raftTopDensity: this.sliceRaftTopDensity,
    raftNumBaseLayers: this.sliceRaftNumBaseLayers,
    raftBaseLayerHeight: this.sliceRaftBaseLayerHeight,
    raftBaseLineWidth: this.sliceRaftBaseLineWidth,
    raftBaseDensity: this.sliceRaftBaseDensity,
    raftOffset: this.sliceRaftOffset,
    raftGap: this.sliceRaftGap,
    raftWriteWalls: this.sliceRaftWriteWalls,
    precision: this.vertexPrecision,
    // display params
    previewSliceMesh: this.slicePreviewModeSliceMesh,
    fullUpToLayer: this.sliceFullModeUpToLayer,
    fullShowInfill: this.sliceFullModeShowInfill
  };
}
Meshy.prototype.makeGcodeParams = function() {
  return {
    filename: this.gcodeFilename,
    extension: this.gcodeExtension,
    temperature: this.gcodeTemperature,
    filamentDiameter: this.gcodeFilamentDiameter,
    primeExtrusion: this.gcodePrimeExtrusion,
    extrusionMultiplier: this.gcodeExtrusionMultiplier,
    infillSpeed: this.gcodeInfillSpeed,
    wallSpeed: this.gcodeWallSpeed,
    raftBasePrintSpeed: this.gcodeRaftBasePrintSpeed,
    raftTopPrintSpeed: this.gcodeRaftTopPrintSpeed,
    travelSpeed: this.gcodeTravelSpeed,
    coordPrecision: this.gcodeCoordinatePrecision,
    extruderPrecision: this.gcodeExtruderPrecision
  };
}
Meshy.prototype.endSliceMode = function() {
  this.sliceModeOn = false;
  this.sliceLevelController = null;
  this.buildSupportSliceFolder();
  if (this.model) {
    this.model.endSliceMode();
  }
  this.handleGizmoVisibility();
}
Meshy.prototype.setSliceLevel = function() {
  if (this.model) {
    this.model.setSliceLevel(this.currentSliceLevel);
  }
}
Meshy.prototype.gcodeSave = function() {
  if (this.model) {
    this.model.gcodeSave(this.makeGcodeParams());
  }
}
Meshy.prototype.clearFolder = function(folder) {
  for (var i=folder.__controllers.length-1; i>=0; i--) {
    folder.remove(folder.__controllers[i]);
  }
  for (var folderName in folder.__folders) {
    folder.removeFolder(folder.__folders[folderName]);
  }
}
Meshy.prototype.disableController = function(controller) {
  if (!controller) return;

  controller.domElement.style.pointerEvents = "none";
  controller.domElement.style.opacity = 0.5;
}
Meshy.prototype.enableController = function(controller) {
  if (!controller) return;

  controller.domElement.style.pointerEvents = "";
  controller.domElement.style.opacity = "";
}
Meshy.prototype.setFolderDisplayPrecision = function(folder) {
  for (var ci = 0; ci < folder.__controllers.length; ci++) {
    var controller = folder.__controllers[ci];
    // if number controller, set precision
    if (isNumber(controller.initialValue)) {
      controller.precision(this.displayPrecision);
      controller.updateDisplay();
    }
  }

  for (var fkey in folder.__folders) {
    this.setFolderDisplayPrecision(folder.__folders[fkey]);
  }
}
Meshy.prototype.toggleBuildVolume = function() {
  this.buildVolumeVisible = !this.buildVolumeVisible;
  this.setBuildVolumeState();
}
Meshy.prototype.setBuildVolumeState = function() {
  var visible = this.buildVolumeVisible;
  this.scene.traverse(function(o) {
    if (o.name=="buildVolume") o.visible = visible;
  });
}
Meshy.prototype.toggleGizmo = function() {
  if (!this.gizmo) return;

  this.gizmoVisible = !!this.model && !this.gizmoVisible;

  this.handleGizmoVisibility();
}
Meshy.prototype.handleGizmoVisibility = function() {
  this.gizmo.visible = this.sliceModeOn ? false : this.gizmoVisible;
}
Meshy.prototype.toggleCOM = function() {
  if (this.model) {
    this.model.toggleCenterOfMass();
  }
}
Meshy.prototype.toggleWireframe = function() {
  if (this.model) this.model.toggleWireframe();
}
Meshy.prototype.toggleAxisWidget = function() {
  this.axisWidget.toggleVisibility();
}
Meshy.prototype.setBackgroundColor = function() {
  if (this.scene) this.scene.background.set(this.backgroundColor);
}
Meshy.prototype.setMeshMaterial = function() {
  if (this.model) this.model.setMeshMaterialParams({
    color: this.meshColor,
    roughness: this.meshRoughness,
    metalness: this.meshMetalness
  });
}
Meshy.prototype.setWireframeMaterial = function() {
  if (this.model) this.model.setWireframeMaterialParams({
    color: this.wireframeColor
  });
}

// Initialize the viewport, set up everything with WebGL including the
// axis widget.
Meshy.prototype.initViewport = function() {
  var width, height;
  var _this = this;

  init();
  animate();

  function init() {
    height = container.offsetHeight;
    width = container.offsetWidth;

    _this.camera = new THREE.PerspectiveCamera(30, width/height, .1, 10000);
    // z axis is up as is customary for 3D printers
    _this.camera.up.set(0, 0, 1);

    _this.scene = new THREE.Scene();
    _this.scene.background = new THREE.Color(_this.backgroundColor);
    debug = new Debug(_this.scene); // todo: remove

    _this.overlayScene = new THREE.Scene();

    _this.controls = new Controls(
      _this.camera,
      _this.container,
      {
        r: _this.buildVolumeSize.length() * 1,
        phi: -Math.PI / 6,
        theta: 5 * Math.PI / 12,
        origin: _this.defaultCameraCenter()
      }
    );

    // for lighting the scene
    var pointLight = new THREE.PointLight(0xffffff, 3);
    _this.scene.add(pointLight);
    _this.controls.addObject(pointLight);
    // for lighting the gizmo
    var gizmoPointLight = pointLight.clone();
    _this.overlayScene.add(gizmoPointLight);
    _this.controls.addObject(gizmoPointLight);

    var ambientLight = new THREE.AmbientLight(0xffffff, 0.1);
    _this.scene.add(ambientLight);
    _this.overlayScene.add(ambientLight);

    _this.axisWidget = new AxisWidget(_this.camera);

    _this.controls.update();

    /* RENDER */
    _this.renderer = new THREE.WebGLRenderer({ antialias: true });
    _this.renderer.autoClear = false;
    //_this.renderer.setClearColor(0x000000, 0);
    //_this.renderer.shadowMap.enabled = true;
    _this.renderer.toneMapping = THREE.ReinhardToneMapping;
    _this.renderer.setPixelRatio(window.devicePixelRatio);
    _this.renderer.setSize(width, height);
    _this.container.appendChild(_this.renderer.domElement);

    addEventListeners();

    // make canvas focusable
    _this.renderer.domElement.tabIndex = 0;
    // focus the canvas so that keyboard shortcuts work right after loading
    _this.renderer.domElement.focus();
  }

  function addEventListeners() {
    window.addEventListener('keydown', onKeyDown, false);
    window.addEventListener('resize', onWindowResize, false);
  }

  function onWindowResize() {
    height = _this.container.offsetHeight;
    width = _this.container.offsetWidth;
    _this.camera.aspect = width / height;
    _this.camera.updateProjectionMatrix();

    _this.renderer.setSize(width, height);
  }

  // keyboard controls for the rendering canvas
  function onKeyDown(e) {
    // don't intercept keyboard events as normal if a text field is in focus
    if (document.activeElement.nodeName.toLowerCase() === "input") {
      // esc blurs the current text field
      if (e.keyCode === 27) document.activeElement.blur();

      return;
    }

    var k = e.key.toLowerCase();
    var caught = true;

    if (e.ctrlKey) {
      if (e.shiftKey) {
        if (k=="z") _this.redo();
        else caught = false;
      }
      else {
        if (k=="i") _this.import();
        else if (k=="z") _this.undo();
        else if (k=="y") _this.redo();
        else caught = false;
      }
    }
    else {
      if (k=="f") _this.cameraToModel();
      else if (k=="c") _this.toggleCOM();
      else if (k=="w") _this.toggleWireframe();
      else if (k=="b") _this.toggleBuildVolume();
      else if (k=="g") _this.toggleGizmo();
      else caught = false;
    }

    // esc key
    if (e.keyCode === 27) {
      // if setting base, turn that off
      if (_this.setBaseOn) _this.endSetBase();
      // else, if not setting base but a measurement is active, remove it
      else _this.removeCurrentMeasurement();

      caught = true;
    }

    // if some app-specific action was taken, prevent default action (e.g.,
    // propagating an undo to input elements)
    if (caught) e.preventDefault();
  }

  this.animationID = -1;

  function animate() {
    _this.animationID = requestAnimationFrame(animate);
    render();
  }

  function render() {
    if (!_this.camera || !_this.scene) return;

    // update controls
    _this.controls.update();
    // update gizmo size and position
    if (_this.gizmo && _this.gizmoVisible && _this.model) {
      _this.gizmo.update(_this.model.getMesh());
    }
    // update pointer cursor
    if (_this.pointer && _this.pointer.active) {
      _this.pointer.updateCursor();
    }
    // update measurement markers
    _this.forEachMeasurement(function(item) {
      item.measurement.updateFromCamera(_this.camera);
    });
    // update axis widget
    _this.axisWidget.update();

    // render the main scene
    _this.renderer.clear();
    _this.renderer.render(_this.scene, _this.camera);

    // render the overlay scene
    _this.renderer.clearDepth();
    _this.renderer.render(_this.overlayScene, _this.camera);
  }
}

Meshy.prototype.stopAnimation = function() {
  cancelAnimationFrame(this.animationID);
}

Meshy.prototype.calculateBuildVolumeBounds = function() {
  var size = this.buildVolumeSize;
  var x0, x1;
  var y0, y1;
  var z0 = 0, z1 = size.z;

  if (this.centerOriginOnBuildPlate) {
    x0 = -size.x / 2, x1 = size.x / 2;
    y0 = -size.y / 2, y1 = size.y / 2;
  }
  else {
    x0 = 0, x1 = size.x;
    y0 = 0, y1 = size.y;
  }

  this.buildVolumeMin = new THREE.Vector3(x0, y0, z0);
  this.buildVolumeMax = new THREE.Vector3(x1, y1, z1);
}

Meshy.prototype.calculateBuildVolumeCenter = function() {
  if (!this.buildVolumeMin || !this.buildVolumeMax) this.calculateBuildVolumeBounds();

  return this.buildVolumeMin.clone().add(this.buildVolumeMax).divideScalar(2);
}

Meshy.prototype.calculateBuildPlateCenter = function() {
  return this.calculateBuildVolumeCenter().setZ(0);
}

Meshy.prototype.defaultCameraCenter = function() {
  return this.calculateBuildVolumeCenter().setZ(this.buildVolumeSize.z/8);
}

// Create the build volume.
Meshy.prototype.makeBuildVolume = function() {
  removeMeshByName(this.scene, "buildVolume");
  removeMeshByName(this.scene, "buildVolumePlane");

  this.calculateBuildVolumeBounds();
  var min = this.buildVolumeMin, max = this.buildVolumeMax;

  var x0 = min.x, x1 = max.x;
  var y0 = min.y, y1 = max.y;
  var z0 = min.z, z1 = max.z;

  // Primary: center line through origin
  // Secondary: lines along multiples of 5
  // Tertiary: everything else
  var geoPrimary = new THREE.Geometry();
  var geoSecondary = new THREE.Geometry();
  var geoTertiary = new THREE.Geometry();
  var geoFloor = new THREE.Geometry();
  var matPrimary = this.buildVolumeMaterials.linePrimary;
  var matSecondary = this.buildVolumeMaterials.lineSecondary;
  var matTertiary = this.buildVolumeMaterials.lineTertiary;
  var matFloor = this.buildVolumeMaterials.floorPlane;

  // draw grid
  for (var i = Math.floor(x0 + 1); i < x1; i++) {
    var geo = i === 0 ? geoPrimary : i%5 === 0 ? geoSecondary : geoTertiary;
    pushSegment(geo, i, y0, z0, i, y1, z0);
  }
  for (var i = Math.floor(y0 + 1); i < y1; i++) {
    var geo = i === 0 ? geoPrimary : i%5 === 0 ? geoSecondary : geoTertiary;
    pushSegment(geo, x0, i, z0, x1, i, z0);
  }

  // draw a box around the build volume
  pushSegment(geoPrimary, x0, y0, z0, x0, y1, z0);
  pushSegment(geoPrimary, x0, y0, z0, x1, y0, z0);
  pushSegment(geoPrimary, x0, y1, z0, x1, y1, z0);
  pushSegment(geoPrimary, x1, y0, z0, x1, y1, z0);

  // vertical box uses a less conspicuous material
  pushSegment(geoTertiary, x0, y0, z1, x0, y1, z1);
  pushSegment(geoTertiary, x0, y0, z1, x1, y0, z1);
  pushSegment(geoTertiary, x0, y1, z1, x1, y1, z1);
  pushSegment(geoTertiary, x1, y0, z1, x1, y1, z1);
  pushSegment(geoTertiary, x0, y0, z0, x0, y0, z1);
  pushSegment(geoTertiary, x0, y1, z0, x0, y1, z1);
  pushSegment(geoTertiary, x1, y0, z0, x1, y0, z1);
  pushSegment(geoTertiary, x1, y1, z0, x1, y1, z1);

  var linePrimary = new THREE.LineSegments(geoPrimary, matPrimary);
  var lineSecondary = new THREE.LineSegments(geoSecondary, matSecondary);
  var lineTertiary = new THREE.LineSegments(geoTertiary, matTertiary);
  linePrimary.name = "buildVolume";
  lineSecondary.name = "buildVolume";
  lineTertiary.name = "buildVolume";
  this.scene.add(linePrimary);
  this.scene.add(lineSecondary);
  this.scene.add(lineTertiary);

  this.setBuildVolumeState();

  function pushSegment(geo, x0, y0, z0, x1, y1, z1) {
    var vs = geo.vertices;
    vs.push(new THREE.Vector3(x0, y0, z0));
    vs.push(new THREE.Vector3(x1, y1, z1));
  }
}

// Interface for the dat.gui button.
Meshy.prototype.import = function() {
  if (this.model) {
    this.printout.warn("A model is already loaded; delete the current model to import a new one.");
    return;
  }

  if (!this.importEnabled) {
    this.printout.warn("Already importing mesh " + this.importingMeshName);
    return;
  }

  if (this.fileInput) {
    this.fileInput.click();
  }
}

// Called from HTML when the import button is clicked. Creates the Model
// instance and tells it to load the geometry.
Meshy.prototype.handleFile = function(file) {
  this.importingMeshName = file.name;
  this.importEnabled = false;

  var loader = new FileLoader();
  try {
    loader.load(file, this.createModel.bind(this));
  }
  catch (e) {
    this.printout.error(e);

    this.importEnabled = true;
    this.fileInput.value = "";
    this.importingMeshName = "";
  }
};

Meshy.prototype.createModel = function(geometry, filename) {
  // scale geometry to match internal units (assumes THREE.Geometry)
  if (this.units !== this.importUnits) {
    var vertices = geometry.vertices;
    var convert = Units.getConverterV3(this.importUnits, this.units);

    for (var v = 0; v < vertices.length; v++) {
      vertices[v].copy(convert(vertices[v]));
    }
  }

  this.model = new Model(
    geometry,
    this.scene,
    this.camera,
    this.container,
    this.printout,
    this.infoBox
  );

  this.printout.log("Imported file " + this.importingMeshName);

  this.importEnabled = true;
  this.fileInput.value = "";
  this.importingMeshName = "";

  this.buildEditFolder();

  this.filename = filename;
  this.gcodeFilename = filename;
  this.gcodeFilenameController.updateDisplay();

  if (this.autocenterOnImport) this.autoCenter(false);
  else if (this.snapTransformationsToFloor) this.floor(false);

  this.cameraToModel();

  this.setMeshMaterial();
  this.setWireframeMaterial();
  this.updateUI();

  this.gizmoVisible = true;
  this.handleGizmoVisibility();

  this.pointer.addObject(this.model.getMesh());

  this.infoBox.update();
}

// Interface for the dat.gui button. Saves the model.
Meshy.prototype.export = function(format) {
  if (!this.model) {
    this.printout.warn("No model to export.");
    return;
  }

  var factor = Units.getFactor(this.units, this.exportUnits);
  var exporter = new Exporter();
  exporter.littleEndian = this.isLittleEndian;
  exporter.p = this.vertexPrecision;

  try {
    exporter.export(this.model.getMesh(), format, this.filename, factor);
    this.printout.log("Saved file '" + this.filename + "' as " + format.toUpperCase());
  }
  catch (e) {
    this.printout.error(e);
  }
}

// Interface for the dat.gui button. Completely removes the model and resets
// everything to a clean state.
Meshy.prototype.delete = function() {
  // it's necessary to clear file input box because it blocks importing
  // a model with the same name twice in a row
  this.fileInput.value = "";

  if (this.model) {
    this.pointer.removeObject(this.model.getMesh());
    this.model.dispose();
    this.model = null;
  }
  else {
    this.printout.warn("No model to delete.");
    return;
  }

  this.endSliceMode();

  this.removeAllMeasurements();
  this.endSetBase();

  this.editStack.clear();
  this.buildEditFolder();
  this.gizmo.visible = false;

  this.infoBox.update();

  this.printout.log("Model deleted.");
}

// Reposition the camera to look at the model.
Meshy.prototype.cameraToModel = function() {
  if (!this.model) {
    this.printout.warn("No model to align camera.");
    return;
  }
  this.controls.update({
    origin: this.model.getCenter(),
    r: this.model.getMaxSize() * 3 // factor of 3 empirically determined
  });
}
