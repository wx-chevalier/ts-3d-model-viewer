/* model.js
   classes:
    Model
   description:
    Represents a discrete model corresponding to one loaded OBJ or STL
    file. Has transformation functions, associated bounds that are
    recalculated on transformation, methods to do calculations, methods
    to import and export.
    Call .dispose() before leaving the instance to be cleaned up so that
    the geometry added to the scene can be properly deleted.
*/

/* Constructor - Initialize with a THREE.Scene, a THREE.Camera, an
   HTML element containing the viewport, a printout source (can be an
   instance of Printout, or console by default), and an output for
   measurements.
*/
function Model(geometry, scene, camera, container, printout) {
  this.scene = scene;
  this.camera = camera;
  this.container = container;
  this.printout = printout ? printout : console;

  // calculated stuff
  this.boundingBox = new THREE.Box3();
  this.surfaceArea = null;
  this.volume = null;
  this.centerOfMass = null;
  // octree
  this.octree = null;

  // for display
  this.wireframe = false;
  this.wireframeMesh = null;
  this.generateMaterials();

  // instance of module responsible for slicing
  this.slicer = null;

  // current mode
  this.mode = "base";

  // meshes

  // base mesh
  this.baseMesh = null;
  geometry.mergeVertices();
  // fixes merge issue
  geometry.faceVertexUvs = [new Array(0)];
  this.makeBaseMesh(geometry);

  // setup: clear colors, make bounding box, shift geometry to the mesh's
  // origin, set mode, and compute various quantities
  this.resetFaceColors();
  this.resetVertexColors();
  this.resetGeometryColors();
  this.computeBoundingBox();
  this.shiftBaseGeometryToOrigin();
  this.setMode("base");

  this.calculateSurfaceArea();
  this.calculateVolume();
  this.calculateCenterOfMass();

  // support mesh
  this.supportMesh = null;

  // slice meshes
  this.sliceOneLayerBaseMesh = null;
  this.sliceOneLayerContourMesh = null;
  this.sliceOneLayerInfillMesh = null;
  this.sliceAllContourMesh = null;
  this.slicePreviewSlicedMesh = null;
  this.slicePreviewGhostMesh = null;

  // three orthogonal planes that intersect at the center of the mesh
  this.centerOfMassIndicator = null;

  // for supports
  this.supportGenerator = null;
  this.supportsGenerated = false;
}

Model.prototype.generateMaterials = function() {
  this.materials = {
    base: new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.3,
      metalness: 0.5,
      polygonOffset: true,
      polygonOffsetFactor: 1,
      polygonOffsetUnits: 1
    }),
    wireframe: new THREE.MeshBasicMaterial({
      color: 0x000000,
      wireframe: true
    }),
    thicknessPreview: new THREE.MeshStandardMaterial({
      color: 0xffffff,
      vertexColors: THREE.FaceColors,
      roughness: 0.3,
      metalness: 0.5,
      polygonOffset: true,
      polygonOffsetFactor: 1,
      polygonOffsetUnits: 1
    }),
    sliceOneLayerBase: new THREE.LineBasicMaterial({
      color: 0x666666,
      linewidth: 1
    }),
    sliceOneLayerContour: new THREE.LineBasicMaterial({
      color: 0xffffff,
      linewidth: 1
    }),
    sliceOneLayerInfill: new THREE.LineBasicMaterial({
      color: 0xffffff,
      linewidth: 1
    }),
    sliceAllContours: new THREE.LineBasicMaterial({
      color: 0x666666,
      linewidth: 1
    }),
    slicePreviewMesh: new THREE.MeshStandardMaterial({
      side: THREE.DoubleSide,
      color: 0x0f0f30,
      roughness: 0.8,
      metalness: 0.3,
      polygonOffset: true,
      polygonOffsetFactor: 1,
      polygonOffsetUnits: 1
    }),
    slicePreviewMeshGhost: new THREE.MeshStandardMaterial({
      color: 0x0f0f30,
      transparent: true,
      opacity: 0.3,
      roughness: 0.7,
      metalness: 0.3,
      polygonOffset: true,
      polygonOffsetFactor: 1,
      polygonOffsetUnits: 1
    }),
    centerOfMassPlane: new THREE.MeshStandardMaterial({
      color: 0xffffff,
      side: THREE.DoubleSide,
      roughness: 1.0,
      metalness: 0.0,
      transparent: true,
      opacity: 0.25
    }),
    centerOfMassLine: new THREE.LineBasicMaterial({
      color: 0xffffff
    })
  };
}


// Bounding box functions.

// Compute the bounding box.
Model.prototype.computeBoundingBox = function() {
  this.boundingBox.setFromObject(this.baseMesh);
}
// All bounds to Infinity.
Model.prototype.resetBoundingBox = function() {
  this.boundingBox.makeEmpty();
}

Model.prototype.getMin = function() {
  return this.boundingBox.min;
}
Model.prototype.getMax = function() {
  return this.boundingBox.max;
}

// Get a vector representing the coords of the center.
Model.prototype.getCenter = function() {
  var center = new THREE.Vector3();
  this.boundingBox.getCenter(center);
  return center;
}
// Get a vector representing the size of the model in every direction.
Model.prototype.getSize = function() {
  var size = new THREE.Vector3();
  this.boundingBox.getSize(size);
  return size;
}
// Largest dimension of the model.
Model.prototype.getMaxSize = function() {
  var size = this.getSize();
  return Math.max(size.x, size.y, size.z);
}
// Smallest dimension of the model.
Model.prototype.getMinSize = function() {
  var size = this.getSize();
  return Math.min(size.x, size.y, size.z);
}

Model.prototype.getXRange = function() {
  return new THREE.Vector2(this.boundingBox.min.x, this.boundingBox.max.x);
}
Model.prototype.getYRange = function() {
  return new THREE.Vector2(this.boundingBox.min.y, this.boundingBox.max.y);
}
Model.prototype.getZRange = function() {
  return new THREE.Vector2(this.boundingBox.min.z, this.boundingBox.max.z);
}

Model.prototype.getPolyCount = function() {
  return this.baseMesh.geometry.faces.length;
}

Model.prototype.getVertexCount = function() {
  return this.baseMesh.geometry.vertices.length;
}

Model.prototype.getPosition = function() {
  return this.baseMesh.position;
}
Model.prototype.getRotation = function() {
  return this.baseMesh.rotation;
}
Model.prototype.getScale = function() {
  return this.baseMesh.scale;
}
Model.prototype.getMesh = function() {
  return this.baseMesh;
}

// set the precision factor used to merge geometries
Model.prototype.setVertexPrecision = function(precision) {
  this.vertexPrecision = precision;
  this.p = Math.pow(10, precision);
}

/* RAYCASTING */

// pass straight through to the base mesh to raycast;
// todo: route through an octree instead for efficiency
Model.prototype.raycast = function(raycaster, intersects) {
  this.baseMesh.raycast(raycaster, intersects);
}

/* TRANSFORMATIONS */

// want rotations and scalings to occur with respect to the geometry center
Model.prototype.shiftBaseGeometryToOrigin = function() {
  var mesh = this.baseMesh;
  var center = this.getCenter();
  var shift = mesh.position.clone().sub(center);

  // shift geometry center to origin
  mesh.position.copy(center.negate());
  mesh.updateMatrixWorld();
  mesh.geometry.applyMatrix(mesh.matrixWorld);

  // reset mesh position to 0
  mesh.position.set(0, 0, 0);
  mesh.updateMatrixWorld();

  // shift bounds appropriately
  this.boundingBox.translate(shift);
}

Model.prototype.translate = function(position) {
  var diff = position.clone().sub(this.baseMesh.position);

  this.baseMesh.position.copy(position);
  if (this.supportMesh) this.supportMesh.position.copy(position);
  if (this.wireframeMesh) this.wireframeMesh.position.copy(position);
  this.baseMesh.updateMatrixWorld();

  this.boundingBox.translate(diff);

  if (this.centerOfMass) {
    this.centerOfMass.add(diff);
    // transform center of mass indicator
    this.positionCenterOfMassIndicator();
  }
}
Model.prototype.translateEnd = function() {
  // no-op
}

Model.prototype.rotate = function(euler) {
  this.removeSupports();
  this.baseMesh.rotation.copy(euler);
  if (this.wireframeMesh) this.wireframeMesh.rotation.copy(euler);
  this.baseMesh.updateMatrixWorld();
}
Model.prototype.rotateEnd = function() {
  this.computeBoundingBox();
  this.calculateCenterOfMass();
  this.positionCenterOfMassIndicator();
}

Model.prototype.scale = function(scale) {
  this.removeSupports();
  this.baseMesh.scale.copy(scale);
  if (this.wireframeMesh) this.wireframeMesh.scale.copy(scale);
  this.baseMesh.updateMatrixWorld();
}
Model.prototype.scaleEnd = function() {
  this.clearThicknessView();
  this.computeBoundingBox();
  this.calculateVolume();
  this.calculateSurfaceArea();
  this.calculateCenterOfMass();
  this.positionCenterOfMassIndicator();
}

// mirror the geometry on an axis
// NB: assumes that the geometry is centered on 0
Model.prototype.mirror = function(axis) {
  var scale = new THREE.Vector3(1, 1, 1);
  scale[axis] = -1;
  var geo = this.baseMesh.geometry;

  // reflect each vertex across 0
  for (var v = 0; v < geo.vertices.length; v++) {
    geo.vertices[v].multiply(scale);
  }

  for (var f = 0; f < geo.faces.length; f++) {
    var face = geo.faces[f];

    // flip winding order on each face
    var tmp = face.a;
    face.a = face.b;
    face.b = tmp;

    // flip face normal on the axis
    face.normal.multiply(scale);

    // also flip vertex normals if present
    if (face.vertexNormals) {
      for (var n = 0; n < face.vertexNormals.length; n++) {
        face.vertexNormals[n].multiply(scale);
      }
    }
  }

  geo.verticesNeedUpdate = true;
  geo.elementsNeedUpdate = true;
}

Model.prototype.flipNormals = function() {
  var geo = this.baseMesh.geometry;

  for (var f = 0; f < geo.faces.length; f++) {
    var face = geo.faces[f];

    // flip winding order on each face
    var tmp = face.a;
    face.a = face.b;
    face.b = tmp;

    // flip face normal
    face.normal.negate();

    // also flip vertex normals if present
    if (face.vertexNormals) {
      for (var n = 0; n < face.vertexNormals.length; n++) {
        face.vertexNormals[n].negate();
      }
    }
  }

  geo.elementsNeedUpdate = true;
  geo.normalsNeedUpdate = true;
}



/* CALCULATIONS */

// Calculate surface area.
Model.prototype.calculateSurfaceArea = function() {
  this.surfaceArea = Calculate.surfaceArea(this.baseMesh);
}

// Calculate volume.
Model.prototype.calculateVolume = function() {
  this.volume = Calculate.volume(this.baseMesh);
}

// Calculate center of mass.
Model.prototype.calculateCenterOfMass = function() {
  this.centerOfMass = Calculate.centerOfMass(this.baseMesh);
}

// Calculate cross-section.
Model.prototype.calcCrossSection = function(axis, pos) {
  var axisVector = new THREE.Vector3();
  axisVector[axis] = 1;
  var point = axisVector.clone();
  point[axis] = pos;
  var plane = new THREE.Plane().setFromNormalAndCoplanarPoint(axisVector, point);

  return Calculate.crossSection(plane, this.baseMesh);
}



/* UI AND RENDERING */

// Toggle wireframe.
Model.prototype.toggleWireframe = function() {
  this.wireframe = !this.wireframe;
  this.setWireframeVisibility(this.wireframe);
}
Model.prototype.setWireframeVisibility = function(visible) {
  if (this.wireframeMesh === null) this.makeWireframeMesh();

  this.printout.log("Wireframe is " + (visible ? "on" : "off") + ".");

  this.wireframeMesh.visible = visible;
}

Model.prototype.makeWireframeMesh = function() {
  var mesh = this.baseMesh.clone();

  mesh.material = this.materials.wireframe;
  mesh.visible = false;
  mesh.name = "wireframe";
  this.scene.add(mesh);

  this.wireframeMesh = mesh;
}

// Get and set material color.
Model.prototype.getMeshColor = function() {
  if (this.baseMesh) return this.baseMesh.material.color.getHex();
}
Model.prototype.setMeshMaterialParams = function(params) {
  params = params || {};

  var mat = this.materials.base;

  for (var param in params) {
    if (param === "color") mat.color.set(params.color);
    else mat[param] = params[param];
  }
}
Model.prototype.setWireframeMaterialParams = function(params) {
  params = params || {};

  var mat = this.materials.wireframe;

  for (var param in params) {
    if (param === "color") mat.color.set(params.color);
    else mat[param] = params[param];
  }
}

// Toggle the COM indicator. If the COM hasn't been calculated, then
// calculate it.
Model.prototype.toggleCenterOfMass = function() {
  if (this.centerOfMass === null) this.calculateCenterOfMass();

  this.centerOfMassIndicator.visible = !this.centerOfMassIndicator.visible;
  this.printout.log(
    "Center of mass indicator is "+(this.centerOfMassIndicator.visible ? "on" : "off")+"."
  );
  this.positionCenterOfMassIndicator();
}

// Create the target planes forming the COM indicator.
Model.prototype.generateCenterOfMassIndicator = function() {
  var centerOfMassIndicator = new THREE.Object3D;

  centerOfMassIndicator.name = "centerOfMassIndicator";
  centerOfMassIndicator.visible = false;

  var xplanegeo = new THREE.PlaneGeometry(1, 1).rotateY(Math.PI / 2); // normal x
  var yplanegeo = new THREE.PlaneGeometry(1, 1).rotateX(Math.PI / 2); // normal y
  var zplanegeo = new THREE.PlaneGeometry(1, 1); // normal z

  // lines at the intersection of each pair of lines
  var xlinegeo = new THREE.Geometry();
  xlinegeo.vertices.push(new THREE.Vector3(-0.5, 0, 0));
  xlinegeo.vertices.push(new THREE.Vector3(0.5, 0, 0));
  var ylinegeo = new THREE.Geometry();
  ylinegeo.vertices.push(new THREE.Vector3(0, -0.5, 0));
  ylinegeo.vertices.push(new THREE.Vector3(0, 0.5, 0));
  var zlinegeo = new THREE.Geometry();
  zlinegeo.vertices.push(new THREE.Vector3(0, 0, -0.5));
  zlinegeo.vertices.push(new THREE.Vector3(0, 0, 0.5));

  var planemat = this.materials.centerOfMassPlane;
  var linemat = this.materials.centerOfMassLine;

  centerOfMassIndicator.add(
    new THREE.Mesh(xplanegeo, planemat),
    new THREE.Mesh(yplanegeo, planemat),
    new THREE.Mesh(zplanegeo, planemat),
    new THREE.LineSegments(xlinegeo, linemat),
    new THREE.LineSegments(ylinegeo, linemat),
    new THREE.LineSegments(zlinegeo, linemat)
  );

  this.centerOfMassIndicator = centerOfMassIndicator;

  this.scene.add(centerOfMassIndicator);
}

// Position the COM indicator.
Model.prototype.positionCenterOfMassIndicator = function() {
  if (!this.centerOfMassIndicator) this.generateCenterOfMassIndicator();

  var size = this.getSize();

  // position the meshes within the indicator object
  var indicator = this.centerOfMassIndicator;
  var children = indicator.children;
  var pos = this.centerOfMass.clone().sub(this.boundingBox.min).divide(size).subScalar(0.5);

  // position planes
  children[0].position.x = pos.x;
  children[1].position.y = pos.y;
  children[2].position.z = pos.z;

  // position lines
  children[3].position.y = pos.y;
  children[3].position.z = pos.z;
  children[4].position.x = pos.x;
  children[4].position.z = pos.z;
  children[5].position.x = pos.x;
  children[5].position.y = pos.y;

  // position and scale the indicator
  var extendFactor = 1.1;
  var scale = size.clone().multiplyScalar(extendFactor);

  this.centerOfMassIndicator.scale.copy(scale);
  this.centerOfMassIndicator.position.copy(this.getCenter());
}

// Set the mode.
Model.prototype.setMode = function(mode, params) {
  this.mode = mode;
  // remove any current meshes in the scene
  removeMeshByName(this.scene, "base");
  removeMeshByName(this.scene, "support");
  removeMeshByName(this.scene, "slice");

  // base mode - display the normal, plain mesh
  if (mode == "base") {
    this.scene.add(this.baseMesh);
    if (this.supportsGenerated) {
      this.makeSupportMesh();
      this.scene.add(this.supportMesh);
    }
  }
  // slicing mode - init slicer and display a model in preview mode by default
  else if (mode == "slice") {
    this.slicer = new Slicer([this.baseMesh, this.supportMesh], params);

    this.makeSliceMeshes();
    this.addSliceMeshesToScene();
  }
}

// Create the base mesh (as opposed to another display mode).
Model.prototype.makeBaseMesh = function(geo) {
  if (!this.baseMesh) {
    this.baseMesh = new THREE.Mesh(geo, this.materials.base);
    this.baseMesh.name = "base";
  }

  return this.baseMesh;
}
Model.prototype.makeSupportMesh = function() {
  if (!this.supportMesh) {
    var geo = new THREE.Geometry();
    this.supportMesh = new THREE.Mesh(geo, this.materials.base);
    this.supportMesh.name = "support";

    this.supportMesh.position.copy(this.baseMesh.position);
    this.supportMesh.rotation.copy(this.baseMesh.rotation);
    this.supportMesh.scale.copy(this.baseMesh.scale);
  }

  return this.supportMesh;
}

Model.prototype.addSliceMeshesToScene = function() {
  if (!this.slicer) return;

  removeMeshByName(this.scene, "slice");

  // add meshes for current layer contours and infill, unless mode is full and
  // showing all layers at once
  if (this.slicer.mode !== Slicer.Modes.full || this.slicer.fullUpToLayer) {
    this.scene.add(this.sliceOneLayerBaseMesh);
    this.scene.add(this.sliceOneLayerContourMesh);
    this.scene.add(this.sliceOneLayerInfillMesh);
  }

  // if preview, either add sliced mesh or ghost mesh
  if (this.slicer.mode === Slicer.Modes.preview) {
    if (this.slicer.previewSliceMesh) this.scene.add(this.slicePreviewSlicedMesh);
    else this.scene.add(this.slicePreviewGhostMesh);
  }
  // else, if full, add all-contour mesh
  else if (this.slicer.mode === Slicer.Modes.full) {
    this.scene.add(this.sliceAllContourMesh);
  }
}

// mark slice meshes in the scene as needing update
Model.prototype.updateSliceMeshesInScene = function() {
  if (!this.slicer) return;

  var geos = this.slicer.getGeometry();

  if (!this.slicer.mode !== Slicer.Modes.full || this.slicer.fullUpToLayer) {
    var oneLayerBaseGeo = new THREE.Geometry();
    oneLayerBaseGeo.vertices = geos.currentLayerBase.geo.vertices;
    this.sliceOneLayerBaseMesh.geometry = oneLayerBaseGeo;

    var oneLayerContourGeo = new THREE.Geometry();
    oneLayerContourGeo.vertices = geos.currentLayerContours.geo.vertices;
    this.sliceOneLayerContourMesh.geometry = oneLayerContourGeo;

    var oneLayerInfillGeo = new THREE.Geometry();
    oneLayerInfillGeo.vertices = geos.currentLayerInfill.geo.vertices;
    this.sliceOneLayerInfillMesh.geometry = oneLayerInfillGeo;
  }

  if (this.slicer.mode === Slicer.Modes.preview) {
    if (this.slicer.previewSliceMesh) {
      this.slicePreviewSlicedMesh.visible = true;
    }
  }
  else if (this.slicer.mode === Slicer.Modes.full) {
    var allContourGeo = new THREE.Geometry();
    allContourGeo.vertices = geos.allContours.geo.vertices;
    this.sliceAllContourMesh.geometry = allContourGeo;
  }
}

// make display meshes for slice mode
Model.prototype.makeSliceMeshes = function() {
  if (!this.slicer) return;

  var geos = this.slicer.getGeometry();
  var mesh;

  // make mesh for current layer's base contour
  mesh = new THREE.LineSegments(
    geos.currentLayerBase.geo,
    this.materials.sliceOneLayerBase
  );
  mesh.name = "slice";
  this.sliceOneLayerBaseMesh = mesh;

  // make mesh for current layer's print contours
  mesh = new THREE.LineSegments(
    geos.currentLayerContours.geo,
    this.materials.sliceOneLayerContour
  );
  mesh.name = "slice";
  this.sliceOneLayerContourMesh = mesh;

  // make mesh for current layer's infill
  mesh = new THREE.LineSegments(
    geos.currentLayerInfill.geo,
    this.materials.sliceOneLayerInfill
  );
  mesh.name = "slice";
  this.sliceOneLayerInfillMesh = mesh;

  // make mesh for all non-current layer contours
  mesh = new THREE.LineSegments(
    geos.allContours.geo,
    this.materials.sliceAllContours
  );
  mesh.name = "slice";
  this.sliceAllContourMesh = mesh;

  // make mesh for sliced geometry
  mesh = new THREE.Mesh(
    geos.slicedMesh.geo,
    this.materials.slicePreviewMesh
  );
  mesh.name = "slice";
  this.slicePreviewSlicedMesh = mesh;

  // to make the ghost, just clone the base mesh and assign ghost material
  mesh = new THREE.Mesh(geos.source.geo, this.materials.slicePreviewMeshGhost);
  mesh.name = "slice";
  this.slicePreviewGhostMesh = mesh;
}



// get the octree, build it if necessary
Model.prototype.getOctree = function() {
  if (this.octree === null) this.octree = new Octree(this.baseMesh);

  return this.octree;
}


/* MESH THICKNESS */

// color the verts according to their local diameter
Model.prototype.viewThickness = function(threshold) {
  var octree = this.getOctree();

  // set the material
  this.baseMesh.material = this.materials.thicknessPreview;

  // make sure the world matrix is up to date
  this.baseMesh.updateMatrixWorld();

  var geo = this.baseMesh.geometry;
  var vertices = geo.vertices;
  var faces = geo.faces;
  var matrixWorld = this.baseMesh.matrixWorld;

  var ray = new THREE.Ray();
  var normal = new THREE.Vector3();

  this.resetFaceColors();

  for (var f = 0, l = faces.length; f < l; f++) {
    var face = faces[f];

    // compute ray in world space
    ray.origin = Calculate.faceCenter(face, vertices, matrixWorld);
    ray.direction = normal.copy(face.normal).transformDirection(matrixWorld).negate();

    var intersection = octree.raycastInternal(ray);

    if (intersection) {
      var level = Math.min(intersection.distance / threshold, 1.0);

      face.color.setRGB(1.0, level, level);
    }
  }

  geo.colorsNeedUpdate = true;
}

// clear any coloration that occurred as part of thickness visualization
Model.prototype.clearThicknessView = function() {
  this.baseMesh.material = this.materials.base;

  //this.resetFaceColors();
}

// reset face colors to white
Model.prototype.resetFaceColors = function() {
  var faces = this.baseMesh.geometry.faces;
  for (var f = 0; f < faces.length; f++) {
    faces[f].color.setRGB(1.0, 1.0, 1.0);
  }

  this.baseMesh.geometry.colorsNeedUpdate = true;
}

// reset vertex colors to white
Model.prototype.resetVertexColors = function() {
  var faces = this.baseMesh.geometry.faces;
  for (var f = 0; f < faces.length; f++) {
    var vertexColors = faces[f].vertexColors;

    if (vertexColors) vertexColors.length = 0;
  }

  this.baseMesh.geometry.colorsNeedUpdate = true;
}

Model.prototype.resetGeometryColors = function() {
  this.baseMesh.geometry.colors.length = 0;
  this.baseMesh.geometry.colorsNeedUpdate = true;
}


/* MESH REPAIR */

Model.prototype.repair = function() {
  var patchGeo = Repair.generatePatchGeometry(this.baseMesh);

  if (!patchGeo) {
    this.printout.log("Mesh does not require repair.");
    return;
  }

  var geo = this.baseMesh.geometry;

  geo.merge(patchGeo);
  geo.mergeVertices();
  geo.verticesNeedUpdate = true;
  geo.elementsNeedUpdate = true;
}


/* SUPPORTS */

Model.prototype.generateSupports = function(params) {
  this.removeSupports();

  if (!this.supportGenerator) {
    this.supportGenerator = new SupportGenerator(this.baseMesh, this.getOctree());
  }

  var supportMesh = this.makeSupportMesh();
  var supportGeometry = this.supportGenerator.generate(params);

  if (!supportGeometry) return;

  // support geometry is generated in world space; put it in the base mesh's
  // object space so that they can be transformed with the same matrix
  var inverseMatrix = new THREE.Matrix4().getInverse(this.baseMesh.matrixWorld);
  supportGeometry.applyMatrix(inverseMatrix);

  supportMesh.geometry = supportGeometry;
  this.scene.add(supportMesh);
  this.supportsGenerated = true;
}

Model.prototype.removeSupports = function() {
  if (this.supportGenerator) this.supportGenerator.cleanup();

  this.supportsGenerated = false;
  this.supportMesh = null;
  removeMeshByName(this.scene, "support");
}


/* SLICING */

// Turn on slice mode: set mode to "slice", passing various params. Slice mode
// defaults to preview.
Model.prototype.startSliceMode = function(params) {
  this.setWireframeVisibility(false);

  this.setMode("slice", params);
}

// Turn off slice mode: set mode to "base".
Model.prototype.endSliceMode = function() {
  if (this.slicer === null) return;

  this.setMode("base");
  this.slicer = null;
  this.sliceFullMesh = null;
}

Model.prototype.getMaxSliceLevel = function() {
  if (this.slicer) return this.slicer.getMaxLevel();
  else return 0;
}

Model.prototype.getMinSliceLevel = function() {
  if (this.slicer) return this.slicer.getMinLevel();
  else return 0;
}

Model.prototype.getCurrentSliceLevel = function() {
  if (this.slicer) return this.slicer.getCurrentLevel();
  else return 0;
}

Model.prototype.getSliceMode = function() {
  if (this.slicer) return this.slicer.getMode();
  else return null;
}

Model.prototype.setSliceMode = function(sliceMode) {
  if (this.slicer.mode == sliceMode || !this.slicer) return;

  this.slicer.setMode(sliceMode);

  this.addSliceMeshesToScene();
  this.updateSliceMeshesInScene();
}

Model.prototype.setSliceLevel = function(level) {
  if (!this.slicer) return;

  this.slicer.setLevel(level);

  this.updateSliceMeshesInScene();
}

Model.prototype.updateSlicerParams = function(params) {
  if (!this.slicer) return;

  var updated = this.slicer.updateParams(params);
  this.setSliceLevel();

  this.addSliceMeshesToScene();
}

Model.prototype.gcodeSave = function(params) {
  if (!this.slicer) return;

  this.slicer.gcodeSave(params);
}

// Delete the THREE.Mesh because these wouldn't be automatically disposed of
// when the Model instance disappears.
Model.prototype.dispose = function() {
  if (!this.scene) return;

  removeMeshByName(this.scene, "base");
  removeMeshByName(this.scene, "support");
  removeMeshByName(this.scene, "slice");
  removeMeshByName(this.scene, "wireframe");
  removeMeshByName(this.scene, "centerOfMassIndicator");
}
