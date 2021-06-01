import * as THREE from 'three';

// Octree.js
// Octree instance contains the root node for the octree and some data that
// apply to the entire octree.
// params:
//  depth: depth at the root node; child nodes will have smaller depth
//  origin: coords of the corner with the smallest coordinates
//  size: side length; same for all sides

export class Octree {
  mesh: THREE.Mesh;

  constructor(
    mesh: THREE.Mesh,
    params: {
      depth: any;
      origin: any;
      size: any;
    }
  ) {
    if (!mesh) return;

    var faces = mesh.geometry.faces;
    var vertices = mesh.geometry.vertices;

    if (!faces || !vertices) return;
    params = params || {};

    this.mesh = mesh;
    this.matrixWorld = mesh.matrixWorld;
    this.faces = faces;
    this.vertices = vertices;

    // bounds
    this.min = null;
    this.max = null;

    this.calculateBounds();

    // set params

    // small overflow so that mesh is entirely contained in the root node
    var overflow = params.overflow || 0.00001;
    var origin = params.origin || this.min.clone().subScalar(overflow / 2);
    var size = params.size || vector3MaxElement(this.max.clone().sub(this.min)) + overflow;
    var depth;

    if (params.hasOwnProperty('depth')) {
      depth = params.depth;
    } else {
      // heuristic is that the tree should be as deep as necessary to have 1-10 faces
      // per leaf node so as to make raytracing cheap; the effectiveness will vary
      // between different meshes, of course, but I estimate that ln(polycount)*0.6
      // should be good
      depth = Math.round(Math.log(faces.length) * 0.6);

      /* Commented out - it appears that this can lead to excessive depth and
         cause meshy death.
      // adjustment for meshes that may occupy only a small fraction of the
      // octree root volume - increment the depth based on the ratio of the
      // octree root volume to the mesh bounding box volume (the factor is
      // based on some testing)
      var vsize = this.max.clone().sub(this.min);
      var vratio = (size * size * size) / (vsize.x * vsize.y * vsize.z);
      depth += Math.round(vratio / 16);
      */
    }

    this.depth = depth;
    this.origin = origin;
    this.size = size;

    this.node = new TreeNode(depth, origin, size);

    // construct the octree
    for (var f = 0, l = faces.length; f < l; f++) this.addFace(f);

    // for visualizing the octree, optional
    this.density = 0;
  }

  addFace = function(i) {
    var face = this.faces[i];
    this.node.addFace(
      {
        verts: faceGetVerts(face, this.vertices),
        normal: face.normal
      },
      i
    );
  };

  calculateBounds = function() {
    this.min = new THREE.Vector3().setScalar(Infinity);
    this.max = new THREE.Vector3().setScalar(-Infinity);

    var vertices = this.vertices;

    for (var i = 0; i < vertices.length; i++) {
      var v = vertices[i];
      this.min.min(v);
      this.max.max(v);
    }
  };

  numLeaves = function() {
    return this.node.numLeaves();
  };

  // return the distance traveled by the ray before it hits a face that has a
  // normal with a positive component along the ray direction
  // params:
  //  ray: THREE.Ray in world space
  raycastInternal = function(ray) {
    if (!this.raycasterInternal) {
      this.raycasterInternal = new Raycaster(raycasterTypes.internal);
    }

    return this.raycasterInternal.castRay(this.node, ray, this.mesh);
  };

  // same as above, but for external (normal) raycasts
  raycast = function(ray) {
    if (!this.raycasterExternal) {
      this.raycasterExternal = new Raycaster(raycasterTypes.external);
    }

    return this.raycasterExternal.castRay(this.node, ray, this.mesh);
  };

  // visualize the octree
  // params:
  //  drawLines: if true, draw an outline along the edges of every cube; if false,
  //    just draw a point in the center of a node
  //  depthLimit: if provided, draw nodes at this depth (depth at leaf nodes is
  //    0); if not provided, draw the leaf nodes
  visualize = function(scene, drawLines, depthLimit) {
    if (!scene) return;
    this.unvisualize();

    var outlineGeo = new THREE.Geometry();
    // populate the geometry object
    this.node.visualize(outlineGeo, drawLines, depthLimit);

    // if drawLines, then outline child nodes with lines; else, draw a point in
    // each one's center
    if (drawLines) {
      var outlineMat = new THREE.LineBasicMaterial({ color: 0xff0000 });
      var outlineMesh = new THREE.LineSegments(outlineGeo, outlineMat);
    } else {
      var outlineMat = new THREE.PointsMaterial({ color: 0xff0000, size: 0.03 });
      var outlineMesh = new THREE.Points(outlineGeo, outlineMat);
    }
    outlineMesh.name = 'octree';
    scene.add(outlineMesh);

    var boxGeo = new THREE.Geometry();
    v = this.node.nodeVertices();

    boxGeo.vertices.push(v[0]);
    boxGeo.vertices.push(v[1]);
    boxGeo.vertices.push(v[2]);
    boxGeo.vertices.push(v[3]);
    boxGeo.vertices.push(v[4]);
    boxGeo.vertices.push(v[5]);
    boxGeo.vertices.push(v[6]);
    boxGeo.vertices.push(v[7]);

    boxGeo.vertices.push(v[0]);
    boxGeo.vertices.push(v[2]);
    boxGeo.vertices.push(v[1]);
    boxGeo.vertices.push(v[3]);
    boxGeo.vertices.push(v[4]);
    boxGeo.vertices.push(v[6]);
    boxGeo.vertices.push(v[5]);
    boxGeo.vertices.push(v[7]);

    boxGeo.vertices.push(v[0]);
    boxGeo.vertices.push(v[4]);
    boxGeo.vertices.push(v[1]);
    boxGeo.vertices.push(v[5]);
    boxGeo.vertices.push(v[2]);
    boxGeo.vertices.push(v[6]);
    boxGeo.vertices.push(v[3]);
    boxGeo.vertices.push(v[7]);

    var boxMat = new THREE.LineBasicMaterial({ color: 0xff0000 });
    var boxMesh = new THREE.LineSegments(boxGeo, boxMat);
    boxMesh.name = 'octree';
    scene.add(boxMesh);
  };

  // remove visualization
  unvisualize = function(scene) {
    if (!scene) return;

    for (var i = scene.children.length - 1; i >= 0; i--) {
      var child = scene.children[i];
      if (child.name == 'octree') {
        scene.remove(child);
      }
    }
  };

  calculateEdgeIntersections = function() {
    this.node.calculateEdgeIntersections(this.faces, this.vertices);
  };

  visualizeBorderEdges = function(scene) {
    if (!scene) return;

    var borderGeo = new THREE.Geometry();
    this.node.visualizeBorderEdges(borderGeo);
    var borderMat = new THREE.LineBasicMaterial({ color: 0x00ff00 });
    var borderMesh = new THREE.LineSegments(borderGeo, borderMat);
    borderMesh.name = 'octree';
    scene.add(borderMesh);
  };

  unvisualizeBorderEdges = function() {
    if (!scene) return;

    for (var i = scene.children.length - 1; i >= 0; i--) {
      var child = scene.children[i];
      if (child.name == 'octreeBorderEdges') {
        scene.remove(child);
      }
    }
  };
}

export class ThreeNode {
  // TreeNode constructor
  // params:
  //  depth: depth at the current node; child nodes will have smaller depth
  //  origin: coords of the corner with the smallest coordinates
  //  size: side length; same for all sides
  constructor(depth, origin, size) {
    this.depth = depth;
    this.origin = origin;
    this.size = size;

    this.children = [];
  }

  // params:
  //  face: { verts, normal } object; verts is an array of THREE.Vector3s.
  //  idx: index to add to a root node if intersecting with the face
  // cell numbering convention:
  //  cells are indexed by three bits 0-7; bit 0 is x, bit 1 is y, bit 2 is z
  addFace = function(face, idx) {
    var depth = this.depth;
    if (depth == 0) {
      this.children.push(idx);
      return;
    }
    var co, cs;
    for (var i = 0; i < 8; i++) {
      var child = this.children[i];
      if (child === undefined) {
        // child size
        cs = this.size / 2.0;
        // child origin
        co = this.origin.clone();
        co.x += cs * (i & 1);
        co.y += (cs * (i & 2)) / 2;
        co.z += (cs * (i & 4)) / 4;
      } else {
        cs = child.size;
        co = child.origin;
      }

      if (cubeIntersectsTri(co, cs, face)) {
        if (child === undefined) this.children[i] = new TreeNode(depth - 1, co, cs);
        this.children[i].addFace(face, idx);
      }
    }
  };

  edgeIndices = [
    [0, 1],
    [2, 3],
    [4, 5],
    [6, 7], // x-aligned
    [0, 2],
    [1, 3],
    [4, 6],
    [5, 7], // y-aligned
    [0, 4],
    [1, 5],
    [2, 6],
    [3, 7] // z-aligned
  ];
  // faces are labeled with normal axis; "far" faces have a larger coordinate on
  // the axis than "near" faces
  faceEdgeIndices = [
    [0, 2, 8, 9], // x, near
    [1, 3, 10, 11], // x, far
    [0, 1, 4, 5], // y, near
    [2, 3, 6, 7], // y, far
    [4, 6, 8, 10], // z, near
    [5, 7, 9, 11] // z, far
  ];
  nodeVertices = function() {
    // cube vertices
    v = [];
    for (var i = 0; i < 8; i++) {
      v[i] = this.origin.clone();
      v[i].x += this.size * (i & 1);
      v[i].y += (this.size * (i & 2)) / 2;
      v[i].z += (this.size * (i & 4)) / 4;
    }
    return v;
  };
  // convert axis to a node-signifying bit as per our numbering convention (see
  // above)
  axisToBit = function(axis) {
    return axis == 'x' ? 1 : axis == 'y' ? 2 : 4;
  };

  // store a mask in each leaf node that indicates edge intersections
  // params:
  //  faces, vertices: pass these in to convert face indices to faces to vertices
  calculateEdgeIntersections = function(faces, vertices) {
    if (!faces || !vertices) return;

    var depth = this.depth;
    if (depth == 0) {
      var edgeMask = 0;

      var s = this.nodeVertices();
      for (var i = 0; i < this.children.length; i++) {
        var face = faces[this.children[i]];
        var v1 = vertices[face.a];
        var v2 = vertices[face.b];
        var v3 = vertices[face.c];
        // walk through the edges of the node
        // get edge vertices from the LUT (this.edgeIndices)
        for (var j = 0; j < 12; j++) {
          var edgeIndices = this.edgeIndices[j];
          var s1 = s[edgeIndices[0]];
          var s2 = s[edgeIndices[1]];

          // if tri intersects a given edge, flip the corresponding edgeMask bit;
          // a set bit corresponds to an edge that has an odd number of triangle
          // intersections
          if (triSegmentIntersection(v1, v2, v3, s1, s2)) {
            edgeMask ^= 1 << j;
          }
        }
      }
      this.edgeMask = edgeMask;
    } else {
      for (var i = 0; i < 8; i++) {
        var child = this.children[i];
        if (child !== undefined) child.calculateEdgeIntersections(faces, vertices);
      }
    }
  };

  // return the total number of leaf nodes in the node
  numLeaves = function() {
    if (this.depth == 0) {
      return 1;
    } else {
      var total = 0;
      for (var i = 0; i < 8; i++) {
        var child = this.children[i];
        if (child !== undefined) total += child.numLeaves();
      }
      return total;
    }
  };

  // populate a THREE.Geometry with points or line segments signifying the nodes
  // of the tree
  visualize = function(geo, drawLines, depthLimit) {
    if (this.depth == 0 || (depthLimit !== undefined && this.depth == depthLimit)) {
      if (drawLines) {
        var v = this.nodeVertices();

        geo.vertices.push(v[0]);
        geo.vertices.push(v[1]);
        geo.vertices.push(v[2]);
        geo.vertices.push(v[3]);
        geo.vertices.push(v[4]);
        geo.vertices.push(v[5]);
        geo.vertices.push(v[6]);
        geo.vertices.push(v[7]);

        geo.vertices.push(v[0]);
        geo.vertices.push(v[2]);
        geo.vertices.push(v[1]);
        geo.vertices.push(v[3]);
        geo.vertices.push(v[4]);
        geo.vertices.push(v[6]);
        geo.vertices.push(v[5]);
        geo.vertices.push(v[7]);

        geo.vertices.push(v[0]);
        geo.vertices.push(v[4]);
        geo.vertices.push(v[1]);
        geo.vertices.push(v[5]);
        geo.vertices.push(v[2]);
        geo.vertices.push(v[6]);
        geo.vertices.push(v[3]);
        geo.vertices.push(v[7]);
      } else {
        var center = this.origin.clone().addScalar(this.size / 2);
        geo.vertices.push(center);
      }
    } else {
      for (var i = 0; i < 8; i++) {
        var child = this.children[i];
        if (child !== undefined) {
          child.visualize(geo, drawLines, depthLimit);
        }
      }
    }
  };

  // populate a THREE.Geometry with segments signifying border edges
  visualizeBorderEdges = function(geo) {
    if (this.depth == 0) {
      if (!this.edgeMask) return;
      var v = this.nodeVertices();

      // walk through all 6 faces
      for (var i = 0; i < 6; i++) {
        var edges = this.faceEdgeIndices[i];

        // test if total number of intersections on face is even or odd
        var total = 0;
        for (var j = 0; j < 4; j++) {
          total += (this.edgeMask & (1 << edges[j])) >> edges[j];
        }

        // if face has an odd number of intersections, show it
        if (total & (1 != 0)) {
          for (var j = 0; j < 4; j++) {
            var edgeIndices = this.edgeIndices[edges[j]];
            geo.vertices.push(v[edgeIndices[0]]);
            geo.vertices.push(v[edgeIndices[1]]);
          }
        }
      }
    } else {
      for (var i = 0; i < 8; i++) {
        var child = this.children[i];
        if (child !== undefined) {
          child.visualizeBorderEdges(geo);
        }
      }
    }
  };
}
