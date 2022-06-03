// Generates a support structure for a mesh with the given vertices and faces.
// This is a modified version of "Clever Support: Efficient Support Structure
// Generation for Digital Fabrication" by Vanek et al. The main difference is
// that we don't use the GPU to find the nearest point-mesh interesection,
// instead casting a ray to check the down and diagonal directions only.
//
// params:
//  faces, vertices: the geometry of the mesh for which we'll generate supports
var SupportGenerator = (function() {
  function SupportGenerator(mesh, octree) {
    this.mesh = mesh;
    this.faces = mesh.geometry.faces;
    this.vertices = mesh.geometry.vertices;
    this.matrixWorld = mesh.matrixWorld;

    this.octree = octree;
  }

  SupportGenerator.RadiusFunctions = {
    constant: function(r, w, k) { return r; },
    sqrt: function(r, w, k) { return r + k * Math.sqrt(w); }
  };

  // params:
  //  angleDegrees: the maximal angle, given in degrees, between a face's normal
  //    and the downward vector; essentially specifies the steepness range in
  //    which faces require support
  //  resolution: horizontal resolution for spacing out support points
  //  layerHeight: for finding points that don't need supporting
  //  radius: radius of support struts
  //  subdivs: angular subdivisions on each support
  //  taperFactor: multiplies radius to determine support radius when
  //    connecting to the mesh
  //  radiusFn(K): function and constant used to determine strut radius
  //  axis: up axis
  //  min, max: min and max bounds of the mesh
  //  epsilon: optional
  SupportGenerator.prototype.generate = function(params) {
    params = params || {};

    var angleDegrees = params.angle || 45;
    var resolution = params.resolution || 0.3;
    var layerHeight = params.layerHeight || 0.1;
    var radius = params.radius || 0.1;
    var subdivs = params.subdivs || 16;
    var taperFactor = params.taperFactor || 0.5;
    var radiusFn = params.radiusFn || SupportGenerator.RadiusFunctions.sqrt;
    var radiusFnK = params.radiusFnK || 0.01;
    var axis = params.axis || "z";
    var epsilon = params.epsilon || 1e-5;

    var octree = this.octree;
    var matrixWorld = this.matrixWorld;

    var vs = this.vertices;
    var fs = this.faces;

    var nv = vs.length;
    var nf = fs.length;

    var boundingBox = new THREE.Box3().setFromObject(this.mesh);

    // axes in the horizontal plane
    var ah = cycleAxis(axis);
    var av = cycleAxis(ah);

    // angle in radians
    var angle = (90 - angleDegrees) * Math.PI / 180;
    var minHeight = 0;
    var resolution = resolution;
    var minSupportLength = 3 * radius;

    // used to determine overhangs
    var dotProductCutoff = Math.cos(Math.PI / 2 - angle);

    var down = new THREE.Vector3();
    down[axis] = -1;
    var up = down.clone().negate();

    // generate an array of faces that require support
    var supportFaces = getSupportFaces();

    // rasterize each overhang face set to find sampling points over every set
    var points = samplePoints(supportFaces);

    // create the underlying structure for the support trees
    var supportTrees = buildSupportTrees(points);

    var supportTreeGeometry = new THREE.Geometry();

    var treeWriteParams = {
      geo: supportTreeGeometry,
      radius: radius,
      subdivs: subdivs,
      taperFactor: taperFactor,
      endOffsetFactor: 0.5,
      radiusFn: radiusFn,
      radiusFnK: radiusFnK
    };

    for (var s=0; s<supportTrees.length; s++) {
      var tree = supportTrees[s];
      //tree.debug();
      tree.writeToGeometry(treeWriteParams);
    }

    supportTreeGeometry.computeFaceNormals();

    return supportTreeGeometry;

    function getSupportFaces() {
      var normal = new THREE.Vector3();
      var a = new THREE.Vector3();
      var b = new THREE.Vector3();
      var c = new THREE.Vector3();

      var minFaceMax = minHeight + layerHeight / 2;
      var supportFaces = [];


      for (var f = 0, l = fs.length; f < l; f++) {
        var face = fs[f];

        Calculate.faceVertices(face, vs, matrixWorld, a, b, c);
        var faceMax = Math.max(a[axis], b[axis], c[axis]);

        normal.copy(face.normal).transformDirection(matrixWorld);

        if (down.dot(normal) > dotProductCutoff && faceMax > minFaceMax) {
          supportFaces.push(face);
        }
      }

      return supportFaces;
    }

    function samplePoints(supportFaces) {
      // rasterization lower bounds on h and v axes
      var rhmin = boundingBox.min[ah];
      var rvmin = boundingBox.min[av];

      var pt = new THREE.Vector3();
      var a = new THREE.Vector3();
      var b = new THREE.Vector3();
      var c = new THREE.Vector3();

      var points = [];

      // iterate over all faces in the face set
      for (var f = 0, l = supportFaces.length; f < l; f++) {
        var face = supportFaces[f];

        Calculate.faceVertices(face, vs, matrixWorld, a, b, c);

        // bounding box for the face
        var facebb = Calculate.faceBoundingBox(face, vs, matrixWorld);

        // normal in world space
        var normal = face.normal.clone().transformDirection(matrixWorld);

        // this face's lower bounds in rasterization space
        var hmin = rhmin + Math.floor((facebb.min[ah] - rhmin) / resolution) * resolution;
        var vmin = rvmin + Math.floor((facebb.min[av] - rvmin) / resolution) * resolution;
        // this face's upper bounds in rasterization space
        var hmax = rhmin + Math.ceil((facebb.max[ah] - rhmin) / resolution) * resolution;
        var vmax = rvmin + Math.ceil((facebb.max[av] - rvmin) / resolution) * resolution;

        // iterate over all possible points
        for (var ph = hmin; ph < hmax; ph += resolution) {
          for (var pv = vmin; pv < vmax; pv += resolution) {
            pt[ah] = ph;
            pt[av] = pv;

            // two triangle verts are flipped because the triangle faces down
            // and is thus wound CW when looking into the plane
            if (pointInsideTriangle(pt, b, a, c, axis, epsilon)) {
              points.push({
                v: projectToPlaneOnAxis(pt, a, normal, axis),
                normal: normal
              });
            }
          }
        }
      }

      return points;
    }

    function buildSupportTrees(points) {
      // iterate through sampled points, build support trees

      // list of support tree roots
      var result = [];

      // support tree nodes for this island
      var nodes = [];

      var ray = new THREE.Ray();
      var faceNormal = new THREE.Vector3();

      // orders a priority queue from highest to lowest coordinate on axis
      var pqComparator = function (a, b) { return nodes[b].v[axis] - nodes[a].v[axis]; }
      var pq = new PriorityQueue({
        comparator: pqComparator
      });
      var activeIndices = new Set();

      // put the point indices on the priority queue;
      // also put them into a set of active indices so that we can take a point
      // and test it against all other active points to find the nearest
      // intersection; we could just iterate over the pq.priv.data to do the same,
      // but that's a hack that breaks encapsulation
      for (var pi = 0; pi < points.length; pi++) {
        var point = points[pi];
        var v = point.v;
        var normal = point.normal;

        // one of the leaves of the support tree ends here
        var startNode = new SupportTreeNode(v);
        var idx = nodes.length;

        nodes.push(startNode);

        // attempt to extend a short support strut from the starting point
        // along the normal
        var raycastNormal = octree.raycast(ray.set(v, normal));
        var nv = v.clone().addScaledVector(normal, minSupportLength);

        // if a ray cast along the normal hits too close, goes below mesh
        // min, or can be more directly extended less than a strut length
        // straight down, just leave the original node
        if ((raycastNormal && raycastNormal.distance < minSupportLength) ||
            (nv[axis] < minHeight) ||
            (v[axis] - minHeight < minSupportLength)) {
          activeIndices.add(idx);
          pq.queue(idx);
        }
        // else, connect a new support node to the start node
        else {
          var newNode = new SupportTreeNode(nv, startNode);

          nodes.push(newNode);
          idx++;
          activeIndices.add(idx);
          pq.queue(idx);
        }
      }

      var ct = 0;
      while (pq.length > 0) {
        var pi = pq.dequeue();

        if (!activeIndices.has(pi)) continue;
        activeIndices.delete(pi);

        var p = nodes[pi];

        // find the closest intersection between p's cone and another cone
        var intersection = null;
        var intersectionDist = Infinity;
        var qiFinal = -1;

        for (var qi of activeIndices) {
          var q = nodes[qi];
          var ixn = coneConeIntersection(p.v, q.v, angle, axis);

          // if valid intersection and it's inside the mesh boundary
          if (ixn && (ixn[axis] - minHeight > radius)) {
            var pidist = p.v.distanceTo(ixn);
            var qidist = q.v.distanceTo(ixn);
            if (pidist < intersectionDist && pidist > radius && qidist > radius) {
              intersectionDist = pidist;
              intersection = ixn;
              qiFinal = qi;
            }
          }
        }

        // build one or two struts

        // will need to check if connecting down is cheaper than connecting in
        // the direction of intersection
        var raycastDown = octree.raycast(ray.set(p.v, down));
        // ray may hit the bottom side of the octree, which may not coincide
        // with mesh min; calculate the point and distance for a ray pointed
        // straight down
        var pointDown = new THREE.Vector3();
        var distanceDown = 0;

        if (raycastDown) {
          pointDown.copy(raycastDown.point);
          pointDown[axis] = Math.max(pointDown[axis], minHeight);
          distanceDown = Math.min(raycastDown.distance, p.v[axis] - minHeight);
        }
        else {
          pointDown.copy(p.v);
          pointDown[axis] = minHeight;
          distanceDown = p.v[axis] - minHeight;
        }

        // one or two nodes will connect to the target point
        var q = null;
        var target = null;
        var dist = 0;

        // if p-q intersection exists, either p and q connect or p's ray to
        // intersection hits the mesh first
        if (intersection) {
          var d = intersection.clone().sub(p.v).normalize();
          // cast a ray from p to the intersection
          var raycastP = octree.raycast(ray.set(p.v, d));

          // if p's ray to the intersection hits the mesh first, join it to the
          // mesh and leave q to join to something else later
          if (raycastP && raycastP.distance < intersectionDist) {
            // hit along p's ray to intersection is closer than intersection
            // itself, so join there
            if (raycastP.distance < distanceDown) {
              // get face normal in world space at the ray hit
              faceNormal.copy(raycastP.face.normal).transformDirection(matrixWorld);

              // if angle is not too shallow, connect at the mesh
              if (Math.acos(Math.abs(faceNormal.dot(d))) <= Math.PI / 4 + epsilon) {
                target = raycastP.point;
                dist = raycastP.distance;
              }
              // else, connect down
              else {
                target = pointDown;
                dist = distanceDown;
              }
            }
            // downward connection is closer, so join downward
            else {
              target = pointDown;
              dist = distanceDown;
            }
          }
          // no obstacle for p's strut
          else {
            // intersection joint may be too close to a point on the mesh - cast
            // a ray down from there, and, if it's too close, join p downward
            var raycastIntersectionDown = octree.raycast(ray.set(intersection, down));

            if (raycastIntersectionDown && raycastIntersectionDown.distance < minSupportLength) {
              target = pointDown;
              dist = distanceDown;
            }
            else {
              q = nodes[qiFinal];
              target = intersection;
              dist = p.v.distanceTo(intersection);
            }
          }
        }
        // if no intersection between p and q, cast a ray down and build a strut
        // where it intersects the mesh or the ground
        else {
          target = pointDown;
          dist = distanceDown;
        }

        // if distance somehow ended up as 0, ignore this point
        if (dist === 0) continue;

        // if the strut hits the bottom of the mesh's bounding box, force it
        // to not taper at the end
        var noTaper = target.equals(pointDown) && !raycastDown;

        nodes.push(new SupportTreeNode(target, p, q, { noTaper: noTaper }));

        if (q !== null) {
          activeIndices.delete(qiFinal);

          var newidx = nodes.length - 1;
          activeIndices.add(newidx);
          pq.queue(newidx);
        }
      }

      // store the root nodes
      for (var i = 0; i < nodes.length; i++) {
        if (nodes[i].isRoot()) result.push(nodes[i]);
      }

      return result;
    }

  }

  SupportGenerator.prototype.cleanup = function() {
    debug.cleanup();
  }



  // a node in a tree of support nodes
  // params:
  //  v: vertex at which this node is placed
  //  b0, b1: this node's branches, if any
  //  params: specify if node need to be forced to not taper
  function SupportTreeNode(v, b0, b1, params) {
    this.v = v;

    // every node is a root when created; when connected as a branch node to
    // another node, it stops being root
    this.source = null;

    // branch nodes
    this.b0 = (b0 ? b0 : b1) || null;
    this.b1 = (b0 ? b1 : null) || null;

    // if connected a branch node, that node is no longer root
    if (b0) b0.source = this;
    if (b1) b1.source = this;

    // no-taper parameter
    this.noTaper = (params && params.noTaper) || false;

    this.weight = 0;
    if (b0) this.weight += b0.weight + v.distanceTo(b0.v);
    if (b1) this.weight += b1.weight + v.distanceTo(b1.v);
  }

  // true if at the bottom of a tree
  SupportTreeNode.prototype.isRoot = function() {
    return this.source === null;
  }

  // true if at the top of a tree
  SupportTreeNode.prototype.isLeaf = function() {
    return this.b0 === null && this.b1 === null;
  }

  // true if one strut connecting from above and one from below
  SupportTreeNode.prototype.isElbowJoint = function() {
    return this.b0 !== null && this.b1 === null && this.source !== null;
  }

  // true if two struts connecting from above and one from below
  SupportTreeNode.prototype.isTJoint = function() {
    return this.b0 !== null && this.b1 !== null && this.source !== null;
  }

  SupportTreeNode.prototype.writeToGeometry = function(params) {
    if (!this.isRoot()) return null;

    params = params || {};
    var subdivs = params.subdivs;

    // subdivs must be at least 4 and even
    if (subdivs === undefined || subdivs < 4) subidvs = 4;
    subdivs -= subdivs%2;

    params.subdivs = subdivs;

    this.makeProfiles(params);
    this.connectProfiles(params);
  }

  // build the profiles of vertices where the cylindrical struts will join or end;
  // cases for nodes:
  //  root: make a circular profile and recurse to branches
  //  leaf: make a circular profile
  //  elbow joint: make a circular profile and recurse to one branch
  //  internal: form three half-ellipse profiles joined at the two points where
  //    all three struts meet, then recurse to branches
  // params:
  //  geo: geometry object
  //  radius: base strut radius
  //  subdivs: the number of sides on each strut; this is even and >= 4
  //  taperFactor: factor that determines the radius of the taper attaching the
  //    root/leaf nodes to the mesh; taper radius is radius * taperFactor
  //  endOffsetFactor: strut extends past its node's center by radius * endOffsetFactor
  //  radiusFn, radiusFnK: function and parameter that determine how radius
  //    grows based on supported weight
  SupportTreeNode.prototype.makeProfiles = function(params) {
    var pi2 = Math.PI * 2;

    var vertices = params.geo.vertices;

    var isRoot = this.isRoot();
    var isLeaf = this.isLeaf();
    var isElbowJoint = this.isElbowJoint();

    var radius = params.radius;
    var subdivs = params.subdivs;
    var endOffsetFactor = params.endOffsetFactor;

    // calculate radius at this strut from base radius, weight supported by this
    // node, and the given constant
    var r = params.radiusFn(radius, this.weight, params.radiusFnK);

    if (isRoot || isLeaf) {
      // node's neighbor; if root, then this is the single branch node; if leaf,
      // this is the source
      var n = isRoot ? this.b0 : this.source;

      if (!n) return;

      // outgoing vector up to the neighbor
      var vn = n.v.clone().sub(this.v).normalize();

      // point where the profile center will go
      var endOffset = this.noTaper ? 0 : -endOffsetFactor * r;
      var p = this.v.clone().addScaledVector(vn, endOffset);

      // two axes orthogonal to strut axis
      var b = orthogonalVector(vn).normalize();
      var c = vn.clone().cross(b);

      // starting index for the profile
      var sidx = vertices.length;

      // profile - array of vertex indices
      var ps = [];

      // angle increment
      var aincr = (isRoot ? 1 : -1) * pi2 / subdivs;

      var r = this.noTaper ? r : params.taperFactor * r;

      // push verts and vertex indices to profile
      for (var ia = 0; ia < subdivs; ia++) {
        var a = ia * aincr;
        vertices.push(
          p.clone()
          .addScaledVector(b, r * Math.cos(a))
          .addScaledVector(c, r * Math.sin(a))
        );
        ps.push(sidx + ia);
      }

      // push center point
      vertices.push(p);
      ps.push(sidx + subdivs);

      if (isRoot) this.p0 = ps;
      else this.ps = ps;
    }
    else if (isElbowJoint) {
      var v = this.v;

      // outgoing vectors along the adjoining struts
      var v0 = this.b0.v.clone().sub(v).normalize();
      var vs = this.source.v.clone().sub(v).normalize();

      // calculate bisector of the outgoing struts (just use an orthogonal vector
      // if struts are parallel)
      var s = v0.clone().add(vs);
      var b = equal(s.length(), 0) ? orthogonalVector(v0) : s;
      b.normalize();

      // half-angle between the struts
      var ha = acos(v0.dot(vs)) / 2;

      // distance from center to the farthest intersection of the struts
      var m = r / Math.sin(ha);

      // minor axis vector and magnitude
      var c = v0.clone().cross(b);
      var n = r;

      // starting index for the profile
      var sidx = vertices.length;

      // profile - array of vertex indices
      var p0 = [];

      // angle increment
      var aincr = pi2 / subdivs;

      // make the profile, wound CCW looking down (against) upward branch
      for (var ia = 0; ia < subdivs; ia++) {
        var a = ia * aincr;
        vertices.push(v.clone()
          .addScaledVector(b, m * Math.cos(a))
          .addScaledVector(c, n * Math.sin(a))
        );
        p0.push(sidx + ia);
      }

      // upward-facing profile is wound CCW (looking down the upward strut) and
      // downward-facing profile is would CW (looking up), so both are the same
      this.p0 = p0;
      this.ps = p0;
    }
    else {
      // outgoing vectors down the adjoining struts
      var v0 = this.b0.v.clone().sub(this.v).normalize();
      var v1 = this.b1.v.clone().sub(this.v).normalize();
      var vs = this.source.v.clone().sub(this.v).normalize();

      // sums of adjacent strut vectors
      var sm01 = v0.clone().add(v1);
      var sm0s = v0.clone().add(vs);
      var sm1s = v1.clone().add(vs);

      // bisectors between adjoining struts
      // default method is to add the two strut vectors; if two strut vectors are
      // antiparallel, use the third strut vector to get the correct bisector
      var b01 = equal(sm01.length(), 0) ? projectOut(vs, v0).negate() : sm01;
      var b0s = equal(sm0s.length(), 0) ? projectOut(v1, vs).negate() : sm0s;
      var b1s = equal(sm1s.length(), 0) ? projectOut(v0, v1).negate() : sm1s;
      // normalize bisectors
      b01.normalize();
      b0s.normalize();
      b1s.normalize();

      // angles between each strut and the halfplanes separating them from the
      // adjoining struts
      var a01 = acos(v0.dot(v1)) / 2;
      var a0s = acos(v0.dot(vs)) / 2;
      var a1s = acos(v1.dot(vs)) / 2;

      // distance from center to the farthest intersection of two struts
      var m01 = r / Math.sin(a01);
      var m0s = r / Math.sin(a0s);
      var m1s = r / Math.sin(a1s);

      // find the normal to the plane formed by the strut vectors
      var v01 = v1.clone().sub(v0);
      var v0s = vs.clone().sub(v0);
      // unit vector to inward vertex; its inverse points to outward vertex
      var ihat = v01.cross(v0s).normalize();

      // correct sign in case inward vector points outward
      var dot = ihat.dot(v1);
      if (dot < 0) ihat.negate();

      // magnitude of in/out vector is r / sin(acos(dot)), where dot is the
      // cosine of the angle between ihat and one of the strut vectors (this is
      // mathematically equivalent to the square root thing)
      var mio = r / Math.sqrt(1 - dot*dot);

      // An ellipse is specified like so:
      //  x = m cos t
      //  y = n sin t
      // where t is an angle CCW from the major axis. t here is not an actual
      // angle between the (x,y) point and the major axis, but a parameter, so we
      // can't get it straight from a dot product between a point and the axis.
      // I'll call it an angle, though.

      // dot products between inward unit vector and intersection vectors
      var d01 = ihat.dot(b01);
      var d0s = ihat.dot(b0s);
      var d1s = ihat.dot(b1s);

      // determine starting angle params for each ellipse; the major axis is at
      // 0, the intersection of the ellipse with the inward point is at the
      // starting angle, (starting angle - pi) is the ending angle
      var s01 = acos(mio * d01 / m01);
      var s0s = acos(mio * d0s / m0s);
      var s1s = acos(mio * d1s / m1s);

      // ellipse major axis length is m01... with unit vectors b01...; now
      // compute minor axes with length n01... and unit vectors c01...

      // unit vectors along minor axes
      var c01 = projectOut(ihat, b01).normalize();
      var c0s = projectOut(ihat, b0s).normalize();
      var c1s = projectOut(ihat, b1s).normalize();

      // minor axis magnitudes
      var n01 = mio * Math.sqrt(1 - d01*d01) / Math.sin(s01);
      var n0s = mio * Math.sqrt(1 - d0s*d0s) / Math.sin(s0s);
      var n1s = mio * Math.sqrt(1 - d1s*d1s) / Math.sin(s1s);

      // put the calculated points into the geometry

      // indices of inward and outward vertices
      var inidx = vertices.length;
      var outidx = inidx + 1;
      // push inward and outward vertices
      vertices.push(this.v.clone().addScaledVector(ihat, mio));
      vertices.push(this.v.clone().addScaledVector(ihat, -mio));

      // number of verts in each elliptical arc, excluding endpoints
      var scount = (subdivs - 2) / 2;
      var scount1 = scount + 1;

      // start indices of each arc
      var s01idx = vertices.length;
      var s0sidx = s01idx + scount;
      var s1sidx = s0sidx + scount;

      // push the arc vertices, excluding inward and outward vertices (which are
      // the endpoints of all three arcs)
      for (var ia = 1; ia < scount1; ia++) {
        var a = s01 - ia * Math.PI / scount1;
        vertices.push(
          this.v.clone()
          .addScaledVector(b01, m01 * Math.cos(a))
          .addScaledVector(c01, n01 * Math.sin(a))
        );
      }
      for (var ia = 1; ia < scount1; ia++) {
        var a = s0s - ia * Math.PI / scount1;
        vertices.push(
          this.v.clone()
          .addScaledVector(b0s, m0s * Math.cos(a))
          .addScaledVector(c0s, n0s * Math.sin(a))
        );
      }
      for (var ia = 1; ia < scount1; ia++) {
        var a = s1s - ia * Math.PI / scount1;
        vertices.push(
          this.v.clone()
          .addScaledVector(b1s, m1s * Math.cos(a))
          .addScaledVector(c1s, n1s * Math.sin(a))
        );
      }

      // build the profiles; each profile is an array of indices into the vertex
      // array, denoting a vertex loop

      // looking into (against) the strut vectors, profiles 0 and 1 are wound CCW,
      // while profile s is wound CW
      // determining orientation: looking down the inward vector with vs pointing
      // down, there are two possibilities for 0/1 (0 on the left and 1 on the
      // right or vice versa), and we can determine which with a cross product;
      // given this, for every profile there will be a left and right arc (looking
      // into the strut vector) and the right arc will wind in reverse order

      // if this is > 0, 0 is on the left; else 1 is on the left
      var dir = ihat.clone().cross(vs).dot(v0);
      if (equal(dir, 0)) dir = -ihat.clone().cross(vs).dot(v1);

      // s strut left and right indices
      var idxsL = dir > 0 ? s0sidx : s1sidx;
      var idxsR = dir > 0 ? s1sidx : s0sidx;
      // 0 strut left and right indices
      var idx0L = dir > 0 ? s0sidx : s01idx;
      var idx0R = dir > 0 ? s01idx : s0sidx;
      // 1 strut left and right indices
      var idx1L = dir > 0 ? s01idx : s1sidx;
      var idx1R = dir > 0 ? s1sidx : s01idx;

      // profile arrays
      var ps = [];
      var p0 = [];
      var p1 = [];

      // write inward verts
      ps.push(inidx);
      p0.push(inidx);
      p1.push(inidx);

      // write left arcs
      for (var ia = 0; ia < scount; ia++) {
        ps.push(idxsL + ia);
        p0.push(idx0L + ia);
        p1.push(idx1L + ia);
      }

      // write outward verts
      ps.push(outidx);
      p0.push(outidx);
      p1.push(outidx);

      // write right arcs
      for (var ia = scount-1; ia >= 0; ia--) {
        ps.push(idxsR + ia);
        p0.push(idx0R + ia);
        p1.push(idx1R + ia);
      }

      // store profiles
      this.ps = ps;
      this.p0 = p0;
      this.p1 = p1;
    }

    if (this.b0) this.b0.makeProfiles(params);
    if (this.b1) this.b1.makeProfiles(params);
  }

  // connect created profiles with geometry
  SupportTreeNode.prototype.connectProfiles = function(params) {
    var geo = params.geo;
    var vertices = geo.vertices;
    var faces = geo.faces;

    if (this.isRoot()) {
      this.connectToBranch(this.b0, params);
      this.makeCap(params);
    }
    else if (this.isLeaf()) {
      this.makeCap(params);
    }
    else {
      this.connectToBranch(this.b0, params);
      this.connectToBranch(this.b1, params);
    }

    if (this.b0) this.b0.connectProfiles(params);
    if (this.b1) this.b1.connectProfiles(params);
  }

  // connect a node to one of its branch nodes
  SupportTreeNode.prototype.connectToBranch = function(n, params) {
    if (!n) return;

    var geo = params.geo;
    var vertices = geo.vertices;
    var faces = geo.faces;

    var subdivs = params.subdivs;

    // source and target profiles
    var sp = (n === this.b0) ? this.p0 : this.p1;
    var tp = n.ps;

    // unit vector pointing up to other node
    var vn = n.v.clone().sub(this.v).normalize();

    // start index on target profile
    var tidx = 0;
    // maximal dot product between points from source to target
    var maxdot = 0;

    // arbitrary point on source profile
    var spt = vertices[sp[0]];

    // given this point on source profile, find the most closely matching point
    // on target profile
    for (var ii = 0; ii < subdivs; ii++) {
      var vst, dot;

      // unit vector from source point to target point
      vst = vertices[tp[ii]].clone().sub(spt).normalize();

      dot = vst.dot(vn);
      if (dot > maxdot) {
        maxdot = dot;
        tidx = ii;
      }
    }

    for (var ii = 0; ii < subdivs; ii++) {
      var a = tp[(tidx + ii) % subdivs];
      var b = tp[(tidx + ii + 1) % subdivs];
      var c = sp[ii];
      var d = sp[(ii + 1) % subdivs];

      faces.push(new THREE.Face3(a, c, d));
      faces.push(new THREE.Face3(a, d, b));
    }
  }

  SupportTreeNode.prototype.makeCap = function(params) {
    var geo = params.geo;
    var vertices = geo.vertices;
    var faces = geo.faces;

    var subdivs = params.subdivs;

    // get the profile and the incoming strut vector
    var p, vn;

    if (this.isRoot()) {
      p = this.p0;
      vn = this.v.clone().sub(this.b0.v).normalize();
    }
    else if (this.isLeaf()) {
      p = this.ps;
      vn = this.v.clone().sub(this.source.v).normalize();
    }
    else return;

    // index increment (accounts for opposite winding)
    var iincr = this.isRoot() ? subdivs - 1 : 1

    // index of center vertex
    var pc = p[subdivs];

    // write faces
    for (var ii = 0; ii < subdivs; ii++) {
      faces.push(new THREE.Face3(pc, p[ii], p[(ii + iincr) % subdivs]));
    }
  }

  // for root/leaf nodes, returns how far we can offset a circular profile from
  // the node such that it doesn't interfere with the other struts incident on
  // this node
  SupportTreeNode.prototype.offsetLimit = function(radius) {
    var isRoot = this.isRoot();
    var isLeaf = this.isLeaf();

    // if internal node, return no limit
    if (!(isRoot || isLeaf)) return Infinity;

    // other node connected to this node, and the two nodes connected to that
    var n, a, b;

    // branch node 0 if root; source if leaf
    n = isRoot ? this.b0 : this.source;

    // if node is isolated (shouldn't happen), return 0
    if (!n) return 0;

    // length of the strut
    var l = this.v.distanceTo(n.v);

    // root connects to leaf - can offset by <= half the length of the strut
    if (n.isLeaf() || n.isRoot()) return l / 2;

    // if root, a and b are the two branch nodes from n
    if (isRoot) {
      a = n.b0;
      b = n.b1;
    }
    // if leaf, a and b are n's other branch and its source
    else {
      a = (this === n.b0) ? n.b1 : n.b0;
      b = n.source;
    }

    // unit vectors along n strut
    var vn = this.v.clone().sub(n.v).normalize();

    // extents of struts a and b (due to their thickness) along n
    var ea = 0, eb = 0;

    if (a) {
      // unit vector along a strut
      var va = a.v.clone().sub(n.v).normalize();

      // bisector between n and a
      var bna = vn.clone().add(va).normalize();

      // dot product between vn and a-n bisector
      var dna = vn.dot(bna);

      // how far strut a's intersection point with n extends along n strut;
      // equal to radius / tan (acos (vn dot bna)) with
      // tan (acos x) = sqrt (1 - x*x) / x
      var ea = radius * dna / Math.sqrt(1 - dna * dna);
    }

    // failsafe in case either strut is parallel to n strut
    //if (equal(dna, 0) || equal(dnb, 0)) return 0;

    if (b) {
      // unit vector along b strut
      var vb = b.v.clone().sub(n.v).normalize();

      // bisector between n and b
      var bnb = vn.clone().add(vb).normalize();

      // dot product between vn and b-n bisector
      var dnb = vn.dot(bnb);

      // how far strut a's intersection point with n extends along n strut;
      // equal to radius / tan (acos (vn dot bna)) with
      // tan (acos x) = sqrt (1 - x*x) / x
      b = radius * dnb / Math.sqrt(1 - dnb * dnb);
    }

    // limit is strut length minus the largest of these two extents
    var limit = l - Math.max(ea, eb);

    return limit;
  }

  SupportTreeNode.prototype.debug = function() {
    if (this.b0) {
      debug.line(this.v, this.b0.v);
      this.b0.debug();
    }
    if (this.b1) {
      debug.line(this.v, this.b1.v);
      this.b1.debug();
    }

    if (this.isRoot()) debug.lines(12);
  }



  return SupportGenerator;

}());
