MCG.Polygon = (function() {

  // circular double-linked list representing an edge loop
  function Polygon(vertices, axis, epsilon) {
    if (axis === undefined) axis = 'z';
    if (epsilon === undefined) epsilon = 1e-7;

    this.axis = axis;
    this.ah = cycleAxis(axis);
    this.av = cycleAxis(this.ah);
    this.up = makeAxisUnitVector(axis);

    this.valid = true;

    this.count = 0;
    this.area = 0;
    this.hole = false;
    this.vertex = null;

    // nodes that are maximal/minimal on axes 1 and 2 - used for bounding-box
    // tests and for joining holes
    this.minh = null;
    this.maxh = null;
    this.minv = null;
    this.maxv = null;

    this.holes = [];

    // no vertices or an insufficient number of vertices
    if (!vertices || vertices.length < 3) {
      this.valid = false;
      return;
    }

    var start = null;

    for (var i = 0; i < vertices.length; i++) {
      var v = vertices[i];

      // create the node for this vertex
      var node = {
        v: v,
        idx: -1,
        prev: null,
        next: null,
        reflex: false,
        ear: false
      };

      // insert into the linked list
      if (this.vertex) {
        node.prev = this.vertex;
        this.vertex.next = node;
      }
      else start = node;

      this.vertex = node;

      this.count++;
      if (this.count > 2) {
        this.area += triangleArea(start.v, this.vertex.prev.v, this.vertex.v, axis);
      }
    }

    // close the last connection
    this.vertex.next = start;
    start.prev = this.vertex;

    // eliminate collinear vertices and update bounds
    start = null;
    var current = this.vertex;
    do {
      if (this.collinear(current)) {
        this.removeNode(current);
      }
      else {
        if (!start) start = current;
        this.updateBounds(current);
      }

      // it's possible that the entire polygon is collinear, so just return when
      // all nodes have been removed
      if (this.count < 3) {
        this.valid = false;
        return;
      }

      current = current.next;
    } while (current != start);

    this.vertex = start;

    // negative area means the poly is a hole, so set a readable parameter
    if (this.area < 0) this.hole = true;

    // calculate reflex state
    current = this.vertex;
    var up = this.up;
    do {
      this.nodeCalculateReflex(current);

      current = current.next;
    } while (current != this.vertex);

    this.setIndices();
  }

  Polygon.prototype.getVertexArray = function() {
    var vertices = [];

    var start = this.vertex;
    var current = start;
    do {
      vertices.push(current.v);

      current = current.next;
    } while (current != start);

    return vertices;
  }

  Polygon.prototype.updateBounds = function(n) {
    var ah = this.ah;
    var av = this.av;

    if (this.minh === null) {
      this.minh = n;
      this.maxh = n;
      this.minv = n;
      this.maxv = n;
    }
    else {
      this.minh = this.minh.v[ah] < n.v[ah] ? this.minh : n;
      this.maxh = this.maxh.v[ah] > n.v[ah] ? this.maxh : n;
      this.minv = this.minv.v[av] < n.v[av] ? this.minv : n;
      this.maxv = this.maxv.v[av] > n.v[av] ? this.maxv : n;
    }
  }

  Polygon.prototype.setIndices = function() {
    var idx = 0;

    var start = this.vertex;
    var current = start;
    do {
      current.idx = idx++;

      current = current.next;
    } while (current != start);
  }

  Polygon.prototype.collinear = function(node) {
    var p = node.prev;
    var n = node.next;
    return collinear(p.v, node.v, n.v, this.axis, this.epsilon)
  }

  Polygon.prototype.removeNode = function(node) {
    node.prev.next = node.next;
    node.next.prev = node.prev;

    this.count--;
  }

  // test if this edge loop contains the other edge loop
  Polygon.prototype.contains = function(other) {
    // horizontal and vertical axes; the convention is that we're looking along
    // negative this.axis, ah points right and av points up - we'll call
    // pt[ah] h and pt[av] v
    var ah = this.ah;
    var av = this.av;

    // bounding box tests first as they are cheaper
    if (this.maxh.v[ah] < other.minh.v[ah] || this.minh.v[ah] > other.maxh.v[ah]) {
      return false;
    }
    if (this.maxv.v[av] < other.minv.v[av] || this.minv.v[av] > other.maxv.v[av]) {
      return false;
    }

    // else, do point-in-polygon testing

    // use other's entry vertex
    var pt = other.vertex.v;

    return this.containsPoint(pt);
  }

  // point-in-polygon testing - see if some point of other is inside this loop;
  // see O'Rourke's book, sec. 7.4
  Polygon.prototype.containsPoint = function(pt) {
    var axis = this.axis;
    var ah = this.ah;
    var av = this.av;
    var h = pt[ah];
    var v = pt[av];

    // number of times a ray crosses
    var crossCount = 0;

    var current = this.vertex;
    do {
      var s1 = current.v;
      var s2 = current.next.v;

      // segment encloses pt on vertical axis
      if ((s1[av] >= v && s2[av] < v) || (s2[av] >= v && s1[av] < v)) {
        // calculate intersection
        var intersection = raySegmentIntersectionOnHAxis(s1, s2, pt, axis);

        // if intersection strictly to the right of pt, it crosses the segment
        if (intersection > h) crossCount++;
      }

      current = current.next;
    } while (current != this.vertex);

    return crossCount%2 != 0;
  }

  // join the polygon with the holes it immediately contains so that it can be
  // triangulated as a single convex polygon
  // see David Eberly's writeup - we cast a ray to the right, see where it
  // intersects the closest segment, then check inside a triangle
  Polygon.prototype.mergeHolesIntoPoly = function() {
    if (this.holes.length === 0) return;

    var axis = this.axis;
    var ah = this.ah;
    var av = this.av;

    var holes = this.holes;

    // sort holes on maximal vertex on axis 1 in descending order
    // once sorted, start merging from rightmost hole
    holes.sort(function(a,b) {
      var amax = a.maxh.v[ah];
      var bmax = b.maxh.v[ah];

      if (amax > bmax) return -1;
      if (amax < bmax) return 1;
      return 0;
    });


    for (var i=0; i<holes.length; i++) {
      var hole = holes[i];

      var P = this.findVisiblePointFromHole(hole);

      this.mergeHoleIntoPoly(P, hole, hole.maxh);
    }

    this.setIndices();
    this.holes.length = 0;
  }

  // join vertex node in polygon to given vertex node in hole
  Polygon.prototype.mergeHoleIntoPoly = function(polyNode, hole, holeNode) {
    // loop goes CCW around poly, exits the poly, goes around hole, exits hole,
    // enters poly
    var polyExit = polyNode;
    var holeEntry = holeNode;
    // have to duplicate the vertex nodes
    var holeExit = shallowCopy(holeEntry);
    var polyEntry = shallowCopy(polyExit);

    // update vert nodes that are next to those that got copied
    holeEntry.prev.next = holeExit;
    polyExit.next.prev = polyEntry;

    // make degenerate edges
    polyExit.next = holeEntry;
    holeEntry.prev = polyExit;
    holeExit.next = polyEntry;
    polyEntry.prev = holeExit;

    // update reflex state
    this.nodeCalculateReflex(polyExit);
    this.nodeCalculateReflex(holeEntry);
    this.nodeCalculateReflex(holeExit);
    this.nodeCalculateReflex(polyEntry);

    this.count += hole.count + 2;
    this.area += hole.area;
  }

  Polygon.prototype.findVisiblePointFromHole = function(hole) {
    var axis = this.axis;
    var ah = this.ah;
    var av = this.av;

    // hole's rightmost point
    var M = hole.maxh.v;
    // closest intersection of ray from M and loop edges along axis ah
    var minIAxis = Infinity;
    // full vector of intersection, directly to the right of m
    var I = M.clone();
    // vertex node at which intersection edge starts
    var S;

    // check all segments for intersection
    var current = this.vertex;
    do {
      var v = current.v;
      var vn = current.next.v;

      // polygon winds conterclockwise, so, if m is inside and the right-ward
      // ray intersects the v-vn segment, v must be less than m and vn must be
      // greater than m on the vertical axis
      if (vn[av] > M[av] && v[av] <= M[av]) {
        var IAxis = raySegmentIntersectionOnHAxis(v, vn, M, axis);

        if (IAxis > M[ah] && IAxis < minIAxis) {
          minIAxis = IAxis;
          I[ah] = IAxis;
          S = current;
        }
      }

      current = current.next;
    } while (current != this.vertex);

    // candidate for the final node guaranteed to be visible from the hole's
    // rightmost point
    var P = S;

    // check all reflex verts; if they're present inside the triangle between m,
    // the intersection point, and the edge source, then return the one with the
    // smallest angle with the horizontal
    current = this.vertex;

    var angle = Math.PI/2;
    var hEdge = I.clone().sub(M).normalize();
    do {
      if (current.reflex) {
        // if the point is inside the triangle formed by intersection segment
        // source, intersection point, and ray source, then might need to update
        // the visible node to the current one
        if (pointInsideTriangle(current.v, S.v, I, M, axis)) {
          var newEdge = current.v.clone().sub(M).normalize();
          var newAngle = hEdge.angleTo(newEdge);

          if (newAngle < angle) {
            angle = newAngle;
            P = current;
          }
        }
      }

      current = current.next;
    } while (current != this.vertex);

    return P;
  }

  // triangulation by ear clipping
  // returns an array of 3*n indices for n new triangles
  // see O'Rourke's book for details
  Polygon.prototype.triangulate = function() {
    this.calculateEars();

    var start = this.vertex;
    var current = start;
    do {
      debug.line(current.v, current.next.v, 10, true);

      current = current.next;
    } while (current != start);
    debug.lines();

    var count = this.count;

    var indices = [];

    while (count > 3) {
      var current = this.vertex;
      var added = false;
      do {
        if (current.ear) {
          added = true;
          var p = current.prev;
          var n = current.next;

          indices.push(p.idx);
          indices.push(current.idx);
          indices.push(n.idx);

          p.next = n;
          n.prev = p;

          this.vertex = n;

          this.nodeCalculateEar(p);
          this.nodeCalculateReflex(p);
          this.nodeCalculateEar(n);
          this.nodeCalculateReflex(n);

          count--;

          break;
        }

        current = current.next;
      } while (current != this.vertex);

      // in case we failed to find an ear, break to avoid an infinite loop
      if (!added) break;
    }

    indices.push(this.vertex.prev.idx);
    indices.push(this.vertex.idx);
    indices.push(this.vertex.next.idx);

    this.count = count;

    return indices;
  }

  // calculate ear status of all ears
  Polygon.prototype.calculateEars = function() {
    var current = this.vertex;
    do {
      this.nodeCalculateEar(current);

      current = current.next;
    } while (current != this.vertex);
  }

  Polygon.prototype.nodeCalculateEar = function(node) {
    node.ear = this.diagonal(node);
  }

  Polygon.prototype.diagonal = function(node) {
    var p = node.prev;
    var n = node.next;

    return this.inCone(p, n) && this.inCone(n, p) && this.nonintersection(p, n);
  }

  Polygon.prototype.inCone = function(a, b) {
    var axis = this.axis;
    var apv = a.prev.v;
    var anv = a.next.v;

    if (a.reflex) return !(leftOn(anv, a.v, b.v, axis) && leftOn(a.v, apv, b.v, axis));
    else return left(apv, a.v, b.v, axis) && left(a.v, anv, b.v, axis);
  }

  Polygon.prototype.nonintersection = function(a, b) {
    var axis = this.axis;
    var epsilon = this.epsilon;
    var c = this.vertex;

    do {
      var d = c.next;

      // only segments not sharing a/b as endpoints can intersect ab segment
      if (c!=a && c!=b && d!=a && d!=b) {
        if (segmentSegmentIntersection(a.v, b.v, c.v, d.v, axis, epsilon)) return false;
      }

      c = c.next;
    } while (c != this.vertex);

    return true;
  }

  Polygon.prototype.hasHoles = function() {
    return this.holes.length > 0;
  }

  Polygon.prototype.nodeCalculateReflex = function(node) {
    var area = triangleArea(node.prev.v, node.v, node.next.v, this.axis);

    if (area < 0) {
      // area calculation contains a subtraction, so when the result should be
      // exactly 0, it might go to something like -1e-17; if the area is less
      // than some reeeeeally small epsilon, it doesn't matter if it's reflex
      // anyway, so might as well call those vertices convex
      if (Math.abs(area) > this.epsilon) node.reflex = true;
    }
    else node.reflex = false;
  }

  Polygon.prototype.writeSegments = function(vertices) {
    var loops = [this].concat(this.holes);

    for (var i=0; i<loops.length; i++) {
      var loop = loops[i];
      var curr = loop.vertex;
      do {
        vertices.push(curr.v);
        vertices.push(curr.next.v);

        curr = curr.next;
      } while (curr != loop.vertex);
    }
  }

  return Polygon;

})();
