/* slicer.js */

// src is either one THREE.Mesh or an array of them
function Slicer(src, params) {
  var meshes = isArray(src) ? src : [src];

  var sourceGeo = new THREE.Geometry();

  // merge the input meshes into the slicer's own copy of the source geometry
  for (var m = 0; m < meshes.length; m++) {
    var mesh = meshes[m];
    if (!mesh) continue;

    sourceGeo.merge(mesh.geometry, mesh.matrixWorld);
  }

  this.sourceGeo = sourceGeo;
  this.sourceVertexCount = sourceGeo.vertices.length;
  this.sourceFaceCount = sourceGeo.faces.length;

  // set only the base parameters - need these to calculate mesh bounds and
  // slice count
  this.setBaseParams(params);

  // 1. assume right-handed coords
  // 2. look along negative this.axis with the other axes pointing up and right
  // then this.ah points right and this.av points up
  this.ah = cycleAxis(this.axis);
  this.av = cycleAxis(this.ah);

  // calculate upper and lower bounds of all faces and the entire mesh
  this.calculateFaceBounds();

  // calculate number of slices
  this.calculateNumSlices();

  // init layers to null
  this.sliceLayers = null;
  this.raftLayers = null;

  // set the rest of the parameters
  this.updateParams(params);

  this.currentLevel = this.getMaxLevel();

  // contains the geometry objects that are shown on the screen
  this.geometries = {};
  this.makeGeometry();

  // construct the layers array, which contains the lazily constructed contours
  this.makeLayers();
  // construct the raft layers
  this.makeRaftLayers();

  this.setMode(this.mode);
}

Slicer.Modes = {
  preview: "preview",
  full: "full"
};

Slicer.InfillTypes = {
  none: 0,
  solid: 1,
  lines: 2,
  grid: 4,
  triangles: 8,
  hex: 16,
  // mask for all infill types that consist of lines that don't need to be
  // connected to each other
  disconnectedLineType: 1 | 4 | 8
};

Slicer.DefaultParams = {
  // base params
  axis: "z",
  layerHeight: 0.1,
  lineWidth: 0.1,
  precision: 5,
  mode: Slicer.Modes.preview,

  numWalls: 2,
  numTopLayers: 3,
  optimizeTopLayers: true,
  infillType: Slicer.InfillTypes.none,
  infillDensity: 0.1,
  infillOverlap: 0.5,

  makeRaft: true,
  raftNumTopLayers: 3,
  raftTopLayerHeight: 0.05,
  raftTopLineWidth: 0.05,
  raftTopDensity: 1.0,
  raftNumBaseLayers: 1,
  raftBaseLayerHeight: 0.1,
  raftBaseLineWidth: 0.1,
  raftBaseDensity: 0.5,
  raftOffset: 1.0,
  raftGap: 0.05,
  raftWriteWalls: false,

  // display params; these determine how much to compute
  previewSliceMesh: false,
  fullUpToLayer: true,
  fullShowInfill: false
};

Slicer.prototype.setParams = function(params) {
  params = params || {};

  for (var p in Slicer.DefaultParams) {
    if (params.hasOwnProperty(p)) {
      this[p] = params[p];
    }
    else {
      this[p] = Slicer.DefaultParams[p];
    }
  }
}

// set only the base parameters
Slicer.prototype.setBaseParams = function(params) {
  var defaults = Slicer.DefaultParams;

  this.axis = params.axis || defaults.axis;
  this.layerHeight = params.layerHeight || defaults.layerHeight;
  this.lineWidth = params.lineWidth || defaults.lineWidth;
  this.precision = params.precision || defaults.precision;

  this.mode = params.mode || defaults.mode;
}

// update slicer params, handle the consequences of updating them, and return
// those that were updated
Slicer.prototype.updateParams = function(params) {
  params = params || {};
  var defaults = Slicer.DefaultParams;
  var updated = {};

  for (var p in defaults) {
    var hasParam = params.hasOwnProperty(p);
    var val = undefined;

    // if no initial value set, get one from params if present, else, from
    // defaults
    if (this[p] === undefined) val = hasParam ? params[p] : defaults[p];
    // else, if initial value set, only update if present in params
    else if (hasParam) val = params[p];

    if (val !== undefined && this[p] !== val) {
      this[p] = val;
      updated[p] = val;
    }
  }

  this.handleUpdatedParams(updated);

  return updated;
}

// if some params changed, they may require invalidating some existing data
// structures
Slicer.prototype.handleUpdatedParams = function(params) {
  var raftUpdated = false;

  if (hasProp("numWalls")) {
    this.forEachSliceLayer(function(layer) {
      layer.unreadyWalls();
      layer.params.numWalls = params.numWalls;
    });
  }
  if (hasProp("numTopLayers") || hasProp("optimizeTopLayers")) {
    var numTopLayers = this.numTopLayers;
    this.forEachSliceLayer(function(layer) {
      layer.unreadyInfillContour();
      layer.params.numTopLayers = numTopLayers;
    });
  }
  if (hasProp("infillType")) {
    this.forEachSliceLayer(function(layer) {
      layer.unreadyInfill();
      layer.params.infillType = params.infillType;
    });
  }
  if (hasProp("infillDensity")) {
    if (this.infillDensity === 0) this.infillType = Slicer.InfillTypes.none;
    this.forEachSliceLayer(function(layer) {
      layer.unreadyInfill();
      layer.params.infillDensity = params.infillDensity;
    });
  }
  if (hasProp("infillOverlap")) {
    this.forEachSliceLayer(function(layer) {
      layer.unreadyInfillContour();
      layer.params.infillOverlap = params.infillOverlap;
    });
  }
  if (hasProp("makeRaft")
    || hasProp("raftNumTopLayers")
    || hasProp("raftNumBaseLayers")) {
    this.numRaftLayers = this.makeRaft ? this.raftNumBaseLayers + this.raftNumTopLayers : 0;
    raftUpdated = true;
  }
  if (hasProp("raftTopLayerHeight")
    || hasProp("raftTopDensity")
    || hasProp("raftBaseLayerHeight")
    || hasProp("raftBaseDensity")
    || hasProp("raftGap")
    || hasProp("raftOffset")) {
    raftUpdated = true;
  }

  if (raftUpdated) {
    this.calculateBaseline();
    this.floorToBaseline();
    this.makeRaftLayers();
  }

  function hasProp(name) { return params.hasOwnProperty(name); }
}

// map a function to all slice layers
Slicer.prototype.forEachSliceLayer = function(f) {
  if (!this.sliceLayers) return;

  for (var i = 0; i < this.sliceLayers.length; i++) {
    f(this.sliceLayers[i]);
  }
}

// map a function to all raft layers
Slicer.prototype.forEachRaftLayer = function(f) {
  if (!this.raftLayers) return;

  for (var i = 0; i < this.raftLayers.length; i++) {
    f(this.raftLayers[i]);
  }
}

// map a function to all layers
Slicer.prototype.forEachLayer = function(f) {
  this.forEachSliceLayer(f);
  this.forEachRaftLayer(f);
}

// called from constructor, calculates min and max for every face on the axis
Slicer.prototype.calculateFaceBounds = function() {
  var faceBounds = [];
  var axis = this.axis;
  var min = new THREE.Vector3().setScalar(Infinity);
  var max = new THREE.Vector3().setScalar(-Infinity);

  for (var i = 0; i < this.sourceFaceCount; i++) {
    var face = this.sourceGeo.faces[i];
    var bounds = faceGetBounds(face, this.sourceGeo.vertices);

    max.max(bounds.max);
    min.min(bounds.min);

    // store min and max for each face
    faceBounds.push({
      face: face.clone(),
      max: bounds.max[axis],
      min: bounds.min[axis]
    });
  }

  this.min = min;
  this.max = max;

  this.faceBoundsArray = faceBounds;
}

Slicer.prototype.calculateNumSlices = function() {
  // first slice is half a slice height above mesh min and last slice is
  // strictly above mesh, hence +1
  var amax = this.max[this.axis], amin = this.min[this.axis];
  this.numSlices = Math.floor(0.5 + (amax - amin) / this.layerHeight) + 1;
}

// calculate the lowest boundary of the print, including the raft
Slicer.prototype.calculateBaseline = function() {
  this.baseline = this.min[this.axis];
  if (this.makeRaft) {
    var raftTopHeight = this.raftTopLayerHeight * this.raftNumTopLayers;
    var raftBaseHeight = this.raftBaseLayerHeight * this.raftNumBaseLayers;
    this.baseline -= raftTopHeight + raftBaseHeight + this.raftGap;
  }
}

Slicer.prototype.floorToBaseline = function() {
  if (this.baseline === undefined) this.calculateBaseline();

  var axis = this.axis;
  var baseline = this.baseline;
  var sourceVertices = this.sourceGeo.vertices;
  var faceBounds = this.faceBoundsArray;

  // shift all vertices
  for (var i = 0; i < this.sourceVertexCount; i++) {
    sourceVertices[i][axis] -= baseline;
  }

  this.sourceGeo.verticesNeedUpdate = true;

  // shift all computed face bounds
  for (var i = 0; i < this.sourceFaceCount; i++) {
    var bounds = faceBounds[i];
    bounds.min -= baseline;
    bounds.max -= baseline;
  }

  // shift mesh AABB
  this.min[axis] -= baseline;
  this.max[axis] -= baseline;

  // shift the context calculated for each layer
  this.forEachLayer(function(layer) {
    layer.context.d -= baseline;
  });

  // b/c we just floored, the baseline is 0
  this.baseline = 0;
}

Slicer.prototype.gcodeSave = function(params) {
  var filamentDiameter = params.filamentDiameter;
  var filamentCrossSection = filamentDiameter * filamentDiameter * Math.PI / 4;
  var axis = this.axis;
  var coincident = MCG.Math.coincident;

  var exporter = new GcodeExporter();

  exporter.setFilename(params.filename);
  exporter.setExtension(params.extension);
  exporter.setTravelSpeed(params.travelSpeed);
  exporter.setCoordPrecision(params.coordPrecision);
  exporter.setExtruderPrecision(params.extruderPrecision);

  exporter.init();

  exporter.writeHeader();
  exporter.writeNewline();

  exporter.writeHeatExtruder(params.temperature);
  exporter.writeAbsolutePositionionMode();
  exporter.writeNewline();
  exporter.writeComment("PRIME EXTRUDER");
  exporter.writePrimingSequence(params.primeExtrusion);

  var extruderPosition = exporter.e;

  var level0 = this.getMinLevel(), levelk = this.getMaxLevel();

  // write geometry for every layer
  for (var level = level0; level <= levelk; level++) {
    var layer = this.getLayer(level);

    var isRaft = level < 0;
    var isRaftBase = level < (level0 + this.raftNumBaseLayers);

    var layerHeight, lineWidth;
    var wallSpeed, infillSpeed;

    if (isRaft) {
      if (isRaftBase) {
        layerHeight = this.raftBaseLayerHeight;
        lineWidth = this.raftBaseLineWidth;
        wallSpeed = params.wallSpeed;
        infillSpeed = params.raftBasePrintSpeed;
      }
      else {
        layerHeight = this.raftTopLayerHeight;
        lineWidth = this.raftTopLineWidth;
        wallSpeed = params.wallSpeed;
        infillSpeed = params.raftTopPrintSpeed;
      }
    }
    else {
      layerHeight = this.layerHeight;
      lineWidth = this.lineWidth;
      wallSpeed = params.wallSpeed;
      infillSpeed = params.infillSpeed;
    }

    // ratio of cross-sections of printed line and filament; multiply by length
    // of segment to get how much to extrude
    var printCrossSection = layerHeight * lineWidth;
    var extrusionFactor = params.extrusionMultiplier * printCrossSection / filamentCrossSection;

    // duplicate context and shift its recorded position up by half a layer
    // height above the center line b/c that's where the extruder will be
    var context = layer.context.clone();
    context.d += layerHeight / 2;
    // constructor for converting intger-space vectors to physical vectors
    var constr = THREE.Vector3;

    // current position in integer-space coordinates; when encountering a new
    // segment to print and current position is not the same as its start point,
    // travel there first
    var ipos = null;

    exporter.writeNewline();
    exporter.writeComment("LAYER " + level);
    if (isRaft) exporter.writeComment("RAFT");
    exporter.writeNewline();

    var infill = layer.getInfill();
    var infillInner = infill.inner;
    var infillSolid = infill.solid;

    // write inner infill
    writeContour(infillInner, infillSpeed);
    // write solid infill
    writeContour(infillSolid, infillSpeed);

    if (!isRaft || this.raftWriteWalls) {
      var walls = layer.getWalls();
      // write walls
      for (var w = walls.length - 1; w >= 0; w--) {
        writeContour(walls[w], wallSpeed);
      }
    }
  }

  exporter.saveToFile();

  function writeContour(contour, speed) {
    if (!contour) return;

    contour.forEachPointPair(function(p1, p2) {
      var v1 = p1.toVector3(constr, context);
      var v2 = p2.toVector3(constr, context);
      var extrusion = v1.distanceTo(v2) * extrusionFactor;
      extruderPosition += extrusion;

      if (ipos === null || !coincident(ipos, p1)) {
        exporter.writeTravel(v1);
      }

      exporter.writePrint(v2, extruderPosition, speed);

      ipos = p2;
    });
  }
}

Slicer.prototype.setMode = function(mode) {
  this.mode = mode;

  this.setLevel(this.currentLevel);
}

Slicer.prototype.getMode = function() {
  return this.mode;
}

Slicer.prototype.getGeometry = function() {
  return this.geometries;
}

Slicer.prototype.getMinLevel = function() {
  return -this.numRaftLayers;
}

Slicer.prototype.getMaxLevel = function() {
  return this.numSlices - 1;
}

Slicer.prototype.getCurrentLevel = function() {
  return this.currentLevel;
}

Slicer.prototype.getLayer = function(level) {
  if (level >= 0) return this.sliceLayers[level];
  else return this.raftLayers[this.numRaftLayers + level];
}

Slicer.prototype.getLevelPos = function(level) {
  return this.min[this.axis] + (level + 0.5) * this.layerHeight;
}

Slicer.prototype.setLevel = function(level) {
  if (level === undefined) level = this.getCurrentLevel();
  level = clamp(level, this.getMinLevel(), this.getMaxLevel());

  var prevLevel = this.currentLevel;
  this.currentLevel = level;

  var layers = this.sliceLayers;
  var layer = this.getLayer(level);
  var context = layer.context;
  var axis = context.axis;

  var geos = this.geometries;

  // write the current layer if necessary for the mode and display settings
  if (this.mode !== Slicer.Modes.full || this.fullUpToLayer) {
    var currentLayerBaseGeo = geos.currentLayerBase.geo;
    var currentLayerContourGeo = geos.currentLayerContours.geo;
    var currentLayerInfillGeo = geos.currentLayerInfill.geo;

    var baseVertices = currentLayerBaseGeo.vertices;
    baseVertices.length = 0;
    layer.writeBase(baseVertices);

    var contourVertices = currentLayerContourGeo.vertices;
    contourVertices.length = 0;
    // write walls if slice level, or if raft level and writing raft walls
    if (level >= 0 || (level < 0 && this.raftWriteWalls)) {
      layer.writeWalls(contourVertices);
    }

    var infillVertices = currentLayerInfillGeo.vertices;
    infillVertices.length = 0;
    layer.writeInfill(infillVertices);
  }

  if (this.mode === Slicer.Modes.preview) {
    var slicePos = this.getLevelPos(level);
    var faceBoundsArray = this.faceBoundsArray;

    var vertices = this.sourceGeo.vertices;

    // local vars for ease of access
    var vertexCount = this.sourceVertexCount;
    var faceCount = this.sourceFaceCount;

    if (this.previewSliceMesh) {
      var position = geos.slicedMesh.geo.attributes.position;
      var normal = geos.slicedMesh.geo.attributes.normal;

      var idx = 0;

      for (var f = 0, l = this.faceBoundsArray.length; f < l; f++) {
        var bounds = faceBoundsArray[f];
        var face = bounds.face;

        // if the face is entirely below the slicing plane, include it whole
        if (bounds.max < slicePos) {
          var verts = Calculate.faceVertices(face, vertices);

          for (var v = 0; v < 3; v++) {
            position.setX(idx, verts[v].x);
            position.setY(idx, verts[v].y);
            position.setZ(idx, verts[v].z);

            normal.setX(idx, face.normal.x);
            normal.setY(idx, face.normal.y);
            normal.setZ(idx, face.normal.z);

            idx += 1;
          }
        }
        // else, if the face intersects the slicing plane, include one or two
        // faces from slicing the face
        else if (bounds.min < slicePos) {
          this.sliceFace(face, vertices, slicePos, axis, function(n, contour, A, B, C) {
            var verts = [A, B, C];

            for (var v = 0; v < 3; v++) {
              position.setX(idx, verts[v].x);
              position.setY(idx, verts[v].y);
              position.setZ(idx, verts[v].z);

              normal.setX(idx, n.x);
              normal.setY(idx, n.y);
              normal.setZ(idx, n.z);

              idx += 1;
            }
          });
        }
      }

      position.needsUpdate = true;
      normal.needsUpdate = true;

      geos.slicedMesh.geo.setDrawRange(0, idx);
    }
  }
  else if (this.mode === Slicer.Modes.full) {
    var allContoursGeo = geos.allContours.geo;

    var contourVertices = allContoursGeo.vertices;
    contourVertices.length = 0;

    var topLevel = this.fullUpToLayer ? level - 1 : this.getMaxLevel();

    for (var i = this.getMinLevel(); i <= topLevel; i++) {
      var ilayer = this.getLayer(i);

      ilayer.writeWalls(contourVertices);

      if (this.fullShowInfill) ilayer.writeInfill(contourVertices);
    }
  }
}

Slicer.prototype.makeGeometry = function() {
  var geos = this.geometries;

  geos.source = {
    geo: this.sourceGeo
  };
  geos.currentLayerContours = {
    geo: new THREE.Geometry()
  };
  geos.currentLayerBase = {
    geo: new THREE.Geometry()
  };
  geos.currentLayerInfill = {
    geo: new THREE.Geometry()
  };
  geos.allContours = {
    geo: new THREE.Geometry()
  };
  geos.slicedMesh = {
    geo: new THREE.Geometry()
  };

  geos.slicedMesh.geo = new THREE.BufferGeometry();

  // factor of 2 because each face may be sliced into two faces, so we need
  // to reserve twice the space
  var position = new Float32Array(this.sourceGeo.faces.length * 9 * 2);
  var normal = new Float32Array(this.sourceGeo.faces.length * 9 * 2);

  var positionAttr = new THREE.BufferAttribute(position, 3);
  var normalAttr = new THREE.BufferAttribute(normal, 3);

  geos.slicedMesh.geo.addAttribute('position', positionAttr);
  geos.slicedMesh.geo.addAttribute('normal', normalAttr);

  /*
  return;

  var vertices = this.sourceGeo.vertices;
  var faces = this.sourceGeo.faces;

  for (var f = 0; f < faces.length; f++) {
    var face = faces[f];

    var vs = [vertices[face.a], vertices[face.b], vertices[face.c]];

    for (var v = 0; v < 3; v++) {
      positionAttr.setX(f*3 + v, vs[v].x);
      positionAttr.setY(f*3 + v, vs[v].y);
      positionAttr.setZ(f*3 + v, vs[v].z);

      normalAttr.setX(f*3 + v, face.normal.x);
      normalAttr.setY(f*3 + v, face.normal.y);
      normalAttr.setZ(f*3 + v, face.normal.z);
    }
  }

  geos.slicedMesh.geo.setDrawRange(0, this.sourceGeo.faces.length * 3);
  */
}

Slicer.prototype.makeLayers = function() {
  var numSlices = this.numSlices;
  var layers = new Array(numSlices);

  // arrays of segment sets, each array signifying all segments in one layer
  var segmentSets = this.buildLayerSegmentSets();
  var layerParamsInit = {
    lineWidth: this.lineWidth,
    numWalls: this.numWalls,
    numTopLayers: this.numTopLayers,
    optimizeTopLayers: this.optimizeTopLayers,
    infillType: this.infillType,
    infillDensity: this.infillDensity,
    infillOverlap: this.infillOverlap,
    infillConnectLines: false,
    layers: layers,
    idx: -1
  };

  // make layers containing slices of the mesh
  for (var i = 0; i < segmentSets.length; i++) {
    var params = shallowCopy(layerParamsInit);
    params.idx = i;
    var layer = new Layer(params);
    layer.setSource(segmentSets[i]);

    layers[i] = layer;
  }

  this.sliceLayers = layers;
}

Slicer.prototype.makeRaftLayers = function() {
  // if not making a raft or there are no layers on which to base it, return
  if (!this.makeRaft || !this.sliceLayers) {
    this.raftLayers = null;
    return;
  }

  var numRaftLayers = this.numRaftLayers;
  var raftNumTopLayers = this.raftNumTopLayers;
  var raftNumBaseLayers = this.raftNumBaseLayers;
  var raftLayers = new Array(numRaftLayers);
  var raftBaseLayerHeight = this.raftBaseLayerHeight;
  var raftTopLayerHeight = this.raftTopLayerHeight;
  var raftBaseHeight = raftNumBaseLayers * raftBaseLayerHeight;

  // get the lowest slice layer and offset it to use as the base for the raft
  var sourceLayer = this.getLayer(0);
  var sourceOffset = sourceLayer.getBase().foffset(this.raftOffset, this.lineWidth);
  var base = MCG.Boolean.union(sourceOffset).union.toPolygonSet();
  var gap = this.raftGap;
  var baseline = this.baseline;

  var layerParamsInit = {
    lineWidth: this.lineWidth,
    numWalls: this.numWalls,
    numTopLayers: 0,
    infillType: Slicer.InfillTypes.lines,
    infillDensity: 1,
    infillOverlap: this.infillOverlap,
    // connect neighboring lines if not writing walls
    infillConnectLines: !this.raftWriteWalls,
    layers: raftLayers,
    idx: -1
  };

  for (var i = 0; i < numRaftLayers; i++) {
    var isBase = i < raftNumBaseLayers;

    var levelPos = baseline;
    if (isBase) {
      levelPos += (i + 0.5) * raftBaseLayerHeight;
    }
    else {
      levelPos += raftBaseHeight + (i - raftNumBaseLayers + 0.5) * raftTopLayerHeight;
    }

    var context = new MCG.Context(this.axis, levelPos, this.precision);

    // make params object with correct density and idx
    var params = shallowCopy(layerParamsInit);

    if (isBase) params.infillDensity = this.raftBaseDensity;
    else params.infillDensity = this.raftTopDensity;
    params.idx = i;

    var layer = new Layer(params);
    layer.setBase(base);
    layer.setContext(context);

    raftLayers[i] = layer;
  }

  this.raftLayers = raftLayers;
}



// SLICING THE MESH INTO PATHS

// uses an implementation of "An Optimal Algorithm for 3D Triangle Mesh Slicing"
// http://www.dainf.ct.utfpr.edu.br/~murilo/public/CAD-slicing.pdf

// build arrays of faces crossing each slicing plane
Slicer.prototype.buildLayerFaceLists = function() {
  var layerHeight = this.layerHeight;
  var faceBoundsArray = this.faceBoundsArray;
  var min = this.min[this.axis];

  var numSlices = this.numSlices;

  // position of first and last layer
  var layer0 = min + layerHeight / 2;
  var layerk = layer0 + layerHeight * (numSlices);

  // init layer lists
  var layerLists = new Array(numSlices);
  for (var i = 0; i < numSlices; i++) layerLists[i] = [];

  // bucket the faces
  for (var i = 0; i < this.sourceFaceCount; i++) {
    var bounds = faceBoundsArray[i];
    var idx;

    /*if (bounds.min < layer0) idx = 0;
    else if (bounds.min > layerk) idx = numSlices;
    else idx = Math.ceil((bounds.min - layer0) / layerHeight);*/

    idx = Math.ceil((bounds.min - layer0) / layerHeight);

    layerLists[idx].push(i);
  }

  return layerLists;
}

// build segment sets in each slicing plane
Slicer.prototype.buildLayerSegmentSets = function() {
  var layerLists = this.buildLayerFaceLists();

  // various local vars
  var numSlices = layerLists.length;
  var faceBoundsArray = this.faceBoundsArray;
  var axis = this.axis;
  var min = this.min[axis];
  var layerHeight = this.layerHeight;
  var vertices = this.sourceGeo.vertices;
  var faces = this.sourceGeo.faces;

  var segmentSets = new Array(numSlices);

  // running set of active face indices as we sweep up along the layers
  var sweepSet = new Set();

  for (var i = 0; i < numSlices; i++) {
    // height of layer from mesh min
    var slicePos = this.getLevelPos(i);

    // reaching a new layer, insert whatever new active face indices for that layer
    if (layerLists[i].length>0) sweepSet = new Set([...sweepSet, ...layerLists[i]]);

    var context = new MCG.Context(axis, slicePos, this.precision);

    // accumulate segments for this layer
    var segmentSet = new MCG.SegmentSet(context);

    // for each index in the sweep list, see if it intersects the slicing plane:
    //  if it's below the slicing plane, eliminate it
    //  else, store its intersection with the slicing plane
    for (var idx of sweepSet) {
      var bounds = faceBoundsArray[idx];

      if (bounds.max < slicePos) sweepSet.delete(idx);
      else {
        this.sliceFace(bounds.face, vertices, slicePos, axis, function(normal, contour, A, B) {
          if (!contour) return;

          var segment = new MCG.Segment(context);
          segment.fromVector3Pair(A, B, normal);
          segmentSet.add(segment);
        });
      }
    }

    segmentSets[i] = segmentSet;
  }

  return segmentSets;
}

// slice a face at the given level and then call the callback
// callback arguments:
//  normal: face normal
//  contour: true if first two points border the slice plane
//  P, Q, R: three CCW-wound points forming a triangle
Slicer.prototype.sliceFace = function(face, vertices, level, axis, callback) {
  // in the following, A is the bottom vert, B is the middle vert, and XY
  // are the points where the triangle intersects the X-Y segment

  var normal = face.normal;

  // get verts sorted on axis; check if this flipped winding order (default is CCW)
  var vertsSorted = faceGetVertsSorted(face, vertices, axis);
  var [A, B, C] = vertsSorted.verts;
  var ccw = vertsSorted.ccw;

  // if middle vert is greater than slice level, slice into 1 triangle A-AB-AC
  if (B[axis] > level) {
    // calculate intersection of A-B and A-C
    var AB = segmentPlaneIntersection(axis, level, A, B);
    var AC = segmentPlaneIntersection(axis, level, A, C);

    if (ccw) callback(normal, true, AB, AC, A);
    else callback(normal, true, AC, AB, A);
  }
  // else, slice into two triangles: A-B-AC and B-BC-AC
  else {
    // calculate intersection of A-C and B-C
    var AC = segmentPlaneIntersection(axis, level, A, C);
    var BC = segmentPlaneIntersection(axis, level, B, C);

    if (ccw) {
      callback(normal, false, A, B, AC);
      callback(normal, true, BC, AC, B);
    }
    else {
      callback(normal, false, B, A, AC);
      callback(normal, true, AC, BC, B);
    }
  }

  // intersection between line segment and plane normal to axis
  function segmentPlaneIntersection(axis, level, va, vb) {
    if (axis === undefined) axis = 'z';

    // if equal, just return va
    if (va[axis] === vb[axis]) return va;

    // calculate linear interpolation factor; note that, as checked above, the
    // denominator will be positive
    var t = (level - va[axis]) / (vb[axis] - va[axis]);
    // difference vector
    var d = vb.clone().sub(va);
    // interpolate
    return va.clone().addScaledVector(d, t);
  }
}



// contains a single slice of the mesh
function Layer(params) {
  // store parameters
  this.params = params;
  this.context = null;

  // source geometry - base and everything else is derived from this
  this.source = null;

  // base contour, decimated and unified
  this.base = null;

  // internal contours for printing
  this.walls = null;

  // main contour containing the infill
  this.infillContour = null;

  // if infill is not solid, some regions may be filled with that infill, but
  // some might need solid infill b/c they're exposed to air above or below:
  // inner contour can be filled with the specified infill type; solid infill
  // is filled with solid infill
  this.disjointInfillContours = null;

  // set of segments containing the mesh infill
  this.infill = null;
}

// readiness checks for various components
Layer.prototype.baseReady = function() { return this.base !== null; }
Layer.prototype.wallsReady = function() { return this.walls !== null; }
Layer.prototype.infillContourReady = function() { return this.infillContour !== null; }
Layer.prototype.disjointInfillContoursReady = function() { return this.disjointInfillContours !== null;}
Layer.prototype.infillReady = function() { return this.infill !== null; }

// unready components and the components derived from them
Layer.prototype.unreadyInfill = function() {
  this.infill = null;
}
Layer.prototype.unreadyDisjointInfillContours = function() {
  this.disjointInfillContours = null;
  this.unreadyInfill();
}
Layer.prototype.unreadyInfillContour = function() {
  this.infillContour = null;
  this.unreadyDisjointInfillContours();
}
Layer.prototype.unreadyWalls = function() {
  this.walls = null;
  this.unreadyInfillContour();
}
Layer.prototype.unreadyBase = function() {
  this.base = null;
  this.unreadyWalls();
}

// getters for geometry

Layer.prototype.getSource = function() {
  return this.source;
}

Layer.prototype.getBase = function() {
  this.computeBase();
  return this.base;
}

Layer.prototype.getWalls = function() {
  this.computeWalls();
  return this.walls;
}

Layer.prototype.getInfillContour = function() {
  this.computeInfillContour();
  return this.infillContour;
}

Layer.prototype.getDisjointInfillContours = function() {
  this.computeDisjointInfillContours();
  return this.disjointInfillContours;
}

Layer.prototype.getInfill = function() {
  this.computeInfill();
  return this.infill;
}

// setters for geometry

Layer.prototype.setSource = function(source) {
  this.source = source;
  this.context = source.context;
  return this;
}

Layer.prototype.setBase = function(base) {
  this.base = base;
  this.context = base.context;
  return this;
}

Layer.prototype.setInfillContour = function(infillContour) {
  this.infillContour = infillContour;
  this.context = base.context;
  return this;
}

Layer.prototype.setContext = function(context) {
  this.context = context;
  return this;
}

Layer.prototype.computeBase = function() {
  if (this.baseReady()) return;

  var lineWidth = this.params.lineWidth;

  var sourceDecimated = this.getSource().toPolygonSet().fdecimate(lineWidth);
  var base = MCG.Boolean.union(sourceDecimated).union.toPolygonSet();

  this.base = base;
}

Layer.prototype.computeWalls = function() {
  if (this.wallsReady()) return;

  var lineWidth = this.params.lineWidth;
  var lineWidthsq = lineWidth * lineWidth;
  var numWalls = this.params.numWalls;

  var walls = [];
  var contour = this.getBase();

  for (var w = 0; w < numWalls; w++) {
    // inset the first contour by half line width, all others by full width,
    // from the preceding contour
    var dist = (w === 0 ? -0.5 : -1) * lineWidth;

    var offset = contour.foffset(dist, lineWidth);
    var union = MCG.Boolean.union(offset).union.toPolygonSet();//.filter(areaFilterFn);
    walls.push(union);

    contour = union;
  }

  this.walls = walls;

  function areaFilterFn(poly) { return poly.areaGreaterThanTolerance(lineWidthsq); }
}

Layer.prototype.computeInfillContour = function() {
  if (this.infillContourReady()) return;

  var lineWidth = this.params.lineWidth
  var numWalls = this.params.numWalls;
  var overlapFactor = 1.0 - this.params.infillOverlap;

  var source, dist;

  if (this.wallsReady()) {
    source = this.walls[this.walls.length-1];
    dist = lineWidth * overlapFactor;
  }
  else {
    source = this.getBase();
    dist = lineWidth * (numWalls + overlapFactor - 0.5);
  }

  this.infillContour = MCG.Boolean.union(source.foffset(-dist, lineWidth)).union;
}

Layer.prototype.computeDisjointInfillContours = function() {
  if (this.disjointInfillContoursReady()) return;

  var layers = this.params.layers;
  var idx = this.params.idx;
  var idxk = layers.length-1;
  var numTopLayers = this.params.numTopLayers;
  var context = this.context;
  var contour = this.getInfillContour();

  // if number of top layers is 0, don't fill any part of any layer with solid
  // infill - just use inner infill for everything
  if (numTopLayers === 0) {
    this.disjointInfillContours = {
      inner: contour,
      solid: new MCG.SegmentSet(context)
    };
  }
  // else, if the layer is within numTopLayers of the top or bottom, fill the
  // whole layer with solid infill
  else if ((idx < numTopLayers) || (idx > idxk - numTopLayers)) {
    this.disjointInfillContours = {
      inner: new MCG.SegmentSet(context),
      solid: contour
    };
  }
  // else, it has at least numTopLayers layers above and below, calculate infill
  // from those
  else {
    var neighborContours = new MCG.SegmentSet(context);
    var numLayers = 0;

    // if optimizing top layer computation (and there are more than 2 top
    // layers), only use the adjacent layers and the farthest layers
    if (this.params.optimizeTopLayers && numTopLayers > 2) {
      neighborContours.merge(layers[idx + 1].getInfillContour());
      neighborContours.merge(layers[idx - 1].getInfillContour());
      neighborContours.merge(layers[idx + numTopLayers].getInfillContour());
      neighborContours.merge(layers[idx - numTopLayers].getInfillContour());

      numLayers = 4;
    }
    else {
      for (var i = 1; i <= numTopLayers; i++) {
        neighborContours.merge(layers[idx + i].getInfillContour());
        neighborContours.merge(layers[idx - i].getInfillContour());
      }

      numLayers = numTopLayers * 2;
    }

    var fullDifference = MCG.Boolean.fullDifference(contour, neighborContours, {
      minDepthB: numLayers
    });

    this.disjointInfillContours = {
      inner: fullDifference.intersection.toPolygonSet().filter(sliverFilterFn),
      solid: fullDifference.AminusB.toPolygonSet().filter(sliverFilterFn)
    };
  }

  function sliverFilterFn(poly) { return !poly.isSliver(); }
}

Layer.prototype.computeInfill = function() {
  if (this.infillReady()) return;

  var lineWidth = this.params.lineWidth;
  var type = this.params.infillType;
  var density = this.params.infillDensity;
  var connectLines = this.params.infillConnectLines;

  // if grid infill and density is too high, use solid infill instead
  if (type === Slicer.InfillTypes.grid && density >= 1.0) {
    type = Slicer.InfillTypes.solid;
  }

  var iLineWidth = MCG.Math.ftoi(lineWidth, this.context);
  var iLineWidthsq = iLineWidth*iLineWidth;
  var infillInner = null, infillSolid = null;

  // if solid infill, just fill the entire contour
  if (type === Slicer.InfillTypes.solid) {
    var infillContour = this.getInfillContour();

    infillSolid = MCG.Infill.generate(infillContour, MCG.Infill.Types.linear, {
      angle: Math.PI / 4,
      spacing: iLineWidth,
      parity: this.params.idx%2,
      connectLines: connectLines
    });
  }
  // if other infill, need to determine where to fill with that and where to
  // fill with solid infill
  else {
    var disjointInfillContours = this.getDisjointInfillContours();

    var innerContour = disjointInfillContours.inner;
    var solidContour = disjointInfillContours.solid;

    if (type === Slicer.InfillTypes.lines) {
      infillInner = MCG.Infill.generate(innerContour, MCG.Infill.Types.linear, {
        angle: Math.PI / 4,
        spacing: iLineWidth / density,
        parity: this.params.idx%2,
        connectLines: connectLines
      });
    }
    else if (type === Slicer.InfillTypes.grid) {
      infillInner = MCG.Infill.generate(innerContour, MCG.Infill.Types.grid, {
        angle: Math.PI / 4,
        spacing: iLineWidth / density,
        connectLines: connectLines
      });
    }

    infillSolid = MCG.Infill.generate(solidContour, MCG.Infill.Types.linear, {
      angle: Math.PI / 4,
      spacing: iLineWidth,
      parity: this.params.idx%2,
      connectLines: connectLines
    });
  }

  if (infillInner !== null) infillInner.filter(lengthFilterFn);
  if (infillSolid !== null) infillSolid.filter(lengthFilterFn);

  this.infill = {
    inner: infillInner,
    solid: infillSolid
  };

  function lengthFilterFn(segment) { return segment.lengthSq() >= iLineWidthsq / 4; }
}

Layer.prototype.writeBase = function(vertices) {
  var context = this.context;
  var base = this.getBase();
  var count = 0;

  if (base) {
    base.forEachPointPair(function(p1, p2) {
      vertices.push(p1.toVector3(THREE.Vector3, context));
      vertices.push(p2.toVector3(THREE.Vector3, context));
      count += 2;
    });
  }

  return count;
}

Layer.prototype.writeWalls = function(vertices) {
  var context = this.context;
  var walls = this.getWalls();
  var count = 0;

  if (walls) {
    for (var w = 0; w < walls.length; w++) {
      walls[w].forEachPointPair(function(p1, p2) {
        vertices.push(p1.toVector3(THREE.Vector3, context));
        vertices.push(p2.toVector3(THREE.Vector3, context));
        count += 2;
      });
    }
  }

  return count;
}

Layer.prototype.writeInfill = function(vertices) {
  var context = this.context;
  var infill = this.getInfill();
  var infillInner = infill.inner;
  var infillSolid = infill.solid;
  var count = 0;

  if (infillInner) {
    infillInner.forEachPointPair(function(p1, p2) {
      vertices.push(p1.toVector3(THREE.Vector3, context));
      vertices.push(p2.toVector3(THREE.Vector3, context));
      count += 2;
    });
  }

  if (infillSolid) {
    infillSolid.forEachPointPair(function(p1, p2) {
      vertices.push(p1.toVector3(THREE.Vector3, context));
      vertices.push(p2.toVector3(THREE.Vector3, context));
      count += 2;
    });
  }

  return count;
}
