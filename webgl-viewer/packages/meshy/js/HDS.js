/* Typical halfedge data structure. */

function HDSHalfedge(node, face) {
  // node at the start of this halfedge
  if (node!==undefined) {
    this.node = node;
    node.halfedge = this;
  }
  else {
    this.node = null;
  }
  // next halfedge CCW around the same face
  this.next = null;
  // twin halfedge
  this.twin = null;
  // HDS face to the left of this halfedge
  this.face = face;
}

HDSHalfedge.prototype.prev = function() {
  var twin = this.twin;

  while (twin.next != this) {
    if (!twin || !twin.next) return null;
    twin = twin.next.twin;
  }

  return twin;
}

HDSHalfedge.prototype.nstart = function() {
  return this.node;
}

HDSHalfedge.prototype.nend = function() {
  if (!this.next) return null;
  return this.next.node;
}

HDSHalfedge.prototype.rotated = function() {
  if (!this.twin) return null;
  return this.twin.next;
}



function HDSNode(v) {
  // vertex
  this.v = v!==undefined ? v : null;
  // one of the 1+ halfedges starting at this node
  this.halfedge = null;
}

HDSNode.prototype.isolated = function() {
  return this.halfedge == null;
}

HDSNode.prototype.terminal = function() {
  return this.halfedge.twin.next == this.halfedge;
}



function HDSFace(he, face3) {
  this.id = -1;
  // one of the halfedges on this face
  this.halfedge = he!==undefined ? he : null;
  // THREE.Face3 object
  this.face3 = face3;
}



function HDSFaceArray(vs) {
  this.vs = vs;
  this.faces = [];
  this.count = 0;
  this.area = 0;
}

HDSFaceArray.prototype.addFace = function(face) {
  // add face
  this.faces.push(face);
  this.count++;
  this.area += faceGetArea(face.face3, this.vs);
}



function HDS(sourceVertices, sourceFaces) {
  var vs = sourceVertices;
  var fs = sourceFaces;

  this.vs = vs;

  var nv = vs.length;
  var nf = fs.length;

  var nodes = new Array(nv);
  var halfedges = [];
  var faces = new Array(nf);

  this.nodes = nodes;
  this.halfedges = halfedges;
  this.faces = faces;

  // maps tuples of vertex indices (each signifying a CCW-directed edge) to a
  // halfedge array index
  var hemap = {};

  // prepopulate node array
  for (var n = 0; n < nv; n++) {
    nodes[n] = new HDSNode(vs[n]);
  }

  // populate face and halfedge arrays
  for (var f = 0; f < nf; f++) {
    var face3 = fs[f];

    var face = new HDSFace(null, face3);
    face.id = f;
    faces[f] = face;

    var a = face3.a;
    var b = face3.b;
    var c = face3.c;

    var heab = addHalfedge(a, b);
    var hebc = addHalfedge(b, c);
    var heca = addHalfedge(c, a);

    heab.next = hebc;
    hebc.next = heca;
    heca.next = heab;

    face.halfedge = heab;
  }

  function addHalfedge(i, j) {
    // create new halfedge from i to j
    var he = new HDSHalfedge(nodes[i]);

    var hash = tupleHash(j, i);

    // if halfedge map has a twin for this halfedge, assign their .twins
    if (hemap.hasOwnProperty(hash)) {
      var twin = halfedges[hemap[hash]];

      twin.twin = he;
      he.twin = twin;
    }

    // store hashmap entry
    var idx = halfedges.length;
    hemap[tupleHash(i, j)] = idx;

    // store halfedge
    halfedges.push(he);

    he.face = face;

    return he;
  }

  function tupleHash(i, j) { return i+"_"+j; }
}

// extract groups of connected faces that satisfy the given criterion
HDS.prototype.groupIntoIslands = function(valid) {
  if (valid===undefined) valid = function() { return true; }

  var faces = this.faces;
  var vs = this.vs;
  var nf = faces.length;

  var seen = new Array(nf);
  seen.fill(false);

  var islands = [];

  // go over every face
  for (var f = 0; f < nf; f++) {
    if (seen[f]) continue;

    var fstart = faces[f];

    // if face is valid, perform a DFS for all reachable valid faces
    if (valid(fstart)) {
      var island = search(fstart);

      if (island.count > 0) islands.push(island);
    }
    else seen[f] = true;
  }

  return islands;

  // does the depth-first search
  function search(fstart) {
    var island = new HDSFaceArray(vs);

    var faceStack = [];

    faceStack.push(fstart);
    while (faceStack.length > 0) {
      var face = faceStack.pop();

      if (seen[face.id]) continue;
      seen[face.id] = true;

      if (valid(face)) {
        island.addFace(face);

        var hestart = face.halfedge;
        var he = hestart;
        do {
          if (he.twin) {
            var neighbor = he.twin.face;
            if (neighbor) faceStack.push(neighbor);
          }
          he = he.next;
        } while (he != hestart);
      }
    }

    return island;
  }
}

HDS.prototype.filterFaces = function(valid) {
  var faces = this.faces;
  var nf = faces.length;

  var result = new HDSFaceArray(this.vs);

  for (var f = 0; f < nf; f++) {
    var face = faces[f];
    if (valid(face)) result.addFace(face);
  }

  return result;
}
