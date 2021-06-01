import * as THREE from 'three';

export class Calculate {
  inner() {}

  // internal functions - computations are performed on 3 vertices instead of
  // Face3 objects
  static triangleArea(va: THREE.Vector3, vb: THREE.Vector3, vc: THREE.Vector3) {
    const vab = va.clone().sub(vb);
    const vac = va.clone().sub(vc);

    // |(b - a) cross (c - a)| / 2
    return vab.cross(vac).length() / 2.0;
  }

  static triangleVolume(va: THREE.Vector3, vb: THREE.Vector3, vc: THREE.Vector3) {
    let volume = 0;
    volume += -vc.x * vb.y * va.z + vb.x * vc.y * va.z + vc.x * va.y * vb.z;
    volume += -va.x * vc.y * vb.z - vb.x * va.y * vc.z + va.x * vb.y * vc.z;

    return volume / 6.0;
  }

  static triangleCenter(va: THREE.Vector3, vb: THREE.Vector3, vc: THREE.Vector3) {
    const v = new THREE.Vector3();

    return v
      .add(va)
      .add(vb)
      .add(vc)
      .divideScalar(3);
  }

  static triangleCenterOfMass(va: THREE.Vector3, vb: THREE.Vector3, vc: THREE.Vector3) {
    const v = new THREE.Vector3();

    return v
      .add(va)
      .add(vb)
      .add(vc)
      .divideScalar(4);
  }

  static triangleBoundingBox(va: THREE.Vector3, vb: THREE.Vector3, vc: THREE.Vector3) {
    const box = new THREE.Box3();

    box.expandByPoint(va);
    box.expandByPoint(vb);
    box.expandByPoint(vc);

    return box;
  }

  static planeTriangleIntersection(
    plane: THREE.Plane,
    va: THREE.Vector3,
    vb: THREE.Vector3,
    vc: THREE.Vector3,
    normal: any
  ) {
    // intersection points of the plane with all three face segments; each is
    // undefined if no intersection
    let iab = new THREE.Vector3();
    let ibc = new THREE.Vector3();
    let ica = new THREE.Vector3();

    iab = plane.intersectLine(new THREE.Line3(va, vb), iab);
    ibc = plane.intersectLine(new THREE.Line3(vb, vc), ibc);
    ica = plane.intersectLine(new THREE.Line3(vc, va), ica);

    let result = null;

    // if no intersections, return null
    if (iab === undefined && ibc === undefined && ica === undefined) {
      return null;
    }
    // in the anomalous situation that the plane intersects all three segments,
    // do special handling
    else if (iab !== undefined && ibc !== undefined && ica !== undefined) {
      // two possible degenerate cases:
      // 1. all three points lie on the plane, so there's no segment intersection
      // 2. two points lie on the plane - they form the segment
      const da = plane.distanceToPoint(va);
      const db = plane.distanceToPoint(vb);
      const dc = plane.distanceToPoint(vc);

      // if 1, return null
      if (da === 0 && db === 0 && dc === 0) return null;

      // if 2, two of the intersection points will be coincident; return two
      // non-coincident points (but only if one of them is above the plane)
      if (iab.equals(ibc) && (da > 0 || dc > 0)) result = new THREE.Line3(iab, ica);
      else if (ibc.equals(ica) && (db > 0 || da > 0)) result = new THREE.Line3(ibc, iab);
      else if (ica.equals(iab) && (dc > 0 || db > 0)) result = new THREE.Line3(ica, ibc);
      else return null;
    }
    // else two intersections, so get them and set the result
    else {
      // get the first and second intersections
      const v0 = iab !== undefined ? iab : ibc !== undefined ? ibc : ica;
      const v1 = v0 === iab ? (ibc !== undefined ? ibc : ica) : v0 === ibc ? ica : undefined;

      // if either intersection doesn't exist, return null
      if (v0 === undefined || v1 === undefined) return null;
      // if intersection points are the same, return null
      if (v0.equals(v1)) return null;

      result = new THREE.Line3(v0, v1);
    }

    if (result === null) return null;

    // correct the order of points based on the normal
    const delta = new THREE.Vector3();
    result.delta(delta);

    if (normal.dot(delta.cross(plane.normal)) < 0) {
      const tmp = result.start;
      result.start = result.end;
      result.end = tmp;
    }

    return result;
  }

  // external functions

  // get an array of the face's vertices in the original winding order
  static faceVertices(
    face: any,
    vertices: any,
    matrix: any,
    va?: THREE.Vector3,
    vb?: THREE.Vector3,
    vc?: THREE.Vector3
  ) {
    va = va || new THREE.Vector3();
    vb = vb || new THREE.Vector3();
    vc = vc || new THREE.Vector3();

    va.copy(vertices[face.a]);
    vb.copy(vertices[face.b]);
    vc.copy(vertices[face.c]);

    if (matrix !== undefined) {
      va.applyMatrix4(matrix);
      vb.applyMatrix4(matrix);
      vc.applyMatrix4(matrix);
    }

    return [va, vb, vc];
  }

  // calculate face area
  static faceArea(face: any, vertices: any, matrix: any) {
    const [va, vb, vc] = Calculate.faceVertices(face, vertices, matrix);

    return Calculate.triangleArea(va, vb, vc);
  }

  // calculate the volume of an irregular tetrahedron with one vertex at the
  // origin and the given face forming the remaining three vertices
  static faceVolume(face: any, vertices: any, matrix: any) {
    const [va, vb, vc] = Calculate.faceVertices(face, vertices, matrix);

    return Calculate.triangleVolume(va, vb, vc);
  }

  // center of a face
  static faceCenter(face: any, vertices: any, matrix: any) {
    const [va, vb, vc] = Calculate.faceVertices(face, vertices, matrix);

    return Calculate.triangleCenter(va, vb, vc);
  }

  // center of mass of an irregular tetrahedron with one vertex at the origin
  // and the given face forming the remaining three vertices
  static faceCenterOfMass(face: any, vertices: any, matrix: any) {
    const [va, vb, vc] = Calculate.faceVertices(face, vertices, matrix);

    return Calculate.triangleCenterOfMass(va, vb, vc);
  }

  // calculate a bounding box for a face
  static faceBoundingBox(face: any, vertices: any, matrix: any) {
    const [va, vb, vc] = Calculate.faceVertices(face, vertices, matrix);

    return Calculate.triangleBoundingBox(va, vb, vc);
  }

  // calculate the intersection of a face with an arbitrary plane
  static planeFaceIntersection(plane: THREE.Plane, face: any, vertices: any, matrix: any) {
    const [va, vb, vc] = Calculate.faceVertices(face, vertices, matrix);

    const normal = face.normal.clone().transformDirection(matrix);

    return Calculate.planeTriangleIntersection(plane, va, vb, vc, normal);
  }

  // apply a function to each face
  // arguments:
  //  objects: an array of THREE.Mesh objects, or a single THREE.Mesh
  //  callback: takes three vertices, a normal, and an index, all in world
  //   space; these vectors are local variables in this function and should be
  //   copied, never stored directly
  static traverseFaces(objects: any, callback: any) {
    if (Array.isArray(objects)) {
      for (let o = 0, ol = objects.length; o < ol; o++) {
        const mesh = objects[o];

        Calculate.traverseFaces(mesh, callback);
      }

      return;
    }

    const mesh = objects;

    const geo = mesh.geometry;
    const matrixWorld = mesh.matrixWorld;

    const va = new THREE.Vector3();
    const vb = new THREE.Vector3();
    const vc = new THREE.Vector3();
    const normal = new THREE.Vector3();

    if (geo.isBufferGeometry) {
      const index = geo.index;
      const position = geo.attributes.position;

      // indexed faces - each triple of indices represents a face
      if (index !== null) {
        for (let i = 0, l = index.count; i < l; i += 3) {
          const a = index.getX(i);
          const b = index.getX(i + 1);
          const c = index.getX(i + 2);

          va.fromBufferAttribute(position, a).applyMatrix4(matrixWorld);
          vb.fromBufferAttribute(position, b).applyMatrix4(matrixWorld);
          vc.fromBufferAttribute(position, c).applyMatrix4(matrixWorld);

          THREE.Triangle.getNormal(va, vb, vc, normal);

          callback(va, vb, vc, normal, i / 3);
        }
      }
      // else, each three contiguous verts in position attribute constitute a
      // face
      else {
        for (let i = 0, l = position.count; i < l; i += 3) {
          va.fromBufferAttribute(position, i).applyMatrix4(matrixWorld);
          vb.fromBufferAttribute(position, i + 1).applyMatrix4(matrixWorld);
          vc.fromBufferAttribute(position, i + 2).applyMatrix4(matrixWorld);

          THREE.Triangle.getNormal(va, vb, vc, normal);

          callback(va, vb, vc, normal, i / 3);
        }
      }
    } else {
      const faces = geo.faces,
        vertices = geo.vertices;

      for (let f = 0; f < faces.length; f++) {
        const face = faces[f];

        Calculate.faceVertices(face, vertices, matrixWorld, va, vb, vc);
        normal.copy(face.normal).transformDirection(matrixWorld);

        callback(va, vb, vc, normal, f);
      }
    }
  }

  // calculate the surface area of a mesh
  static surfaceArea(mesh: any) {
    let area = 0;

    Calculate.traverseFaces(mesh, function(
      va: THREE.Vector3,
      vb: THREE.Vector3,
      vc: THREE.Vector3
    ) {
      area += Calculate.triangleArea(va, vb, vc);
    });

    return area;
  }

  // calculate the volume of a mesh
  static volume(mesh: any) {
    let volume = 0;

    Calculate.traverseFaces(mesh, function(
      va: THREE.Vector3,
      vb: THREE.Vector3,
      vc: THREE.Vector3
    ) {
      volume += Calculate.triangleVolume(va, vb, vc);
    });

    return volume;
  }

  // calculate the center of mass of a mesh
  static centerOfMass(mesh: any) {
    const center = new THREE.Vector3();
    let volume = 0;

    Calculate.traverseFaces(mesh, function(
      va: THREE.Vector3,
      vb: THREE.Vector3,
      vc: THREE.Vector3
    ) {
      const faceVolume = Calculate.triangleVolume(va, vb, vc);
      const faceCenterOfMass = Calculate.triangleCenterOfMass(va, vb, vc);

      // add current face's center of mass, weighted by its volume
      center.add(faceCenterOfMass.multiplyScalar(faceVolume));

      // update volume
      volume += faceVolume;
    });

    // divide by total volume to get center of mass
    return center.divideScalar(volume);
  }

  // calculate the intersection of the plane and mesh
  // arguments:
  //  plane: THREE.Plane
  //  mesh: THREE.Mesh
  //  splitPolygons: true to split the intersection into polygons, false to
  //    leave the result as an unordered array of segments
  // returns an array of objects like { segments, boundingBox, area, length }
  static crossSection(plane: THREE.Plane, mesh: any, splitPolygons: any) {
    // don't split by default
    splitPolygons = splitPolygons || false;

    const point = new THREE.Vector3();
    plane.coplanarPoint(point);

    const pa = new THREE.Vector3();
    const pb = new THREE.Vector3();
    const delta = new THREE.Vector3();
    const cross = new THREE.Vector3();

    // store the segments forming the intersection
    const segments: any[] = [];

    Calculate.traverseFaces(mesh, function(
      va: THREE.Vector3,
      vb: THREE.Vector3,
      vc: THREE.Vector3,
      normal: any
    ) {
      const segment = Calculate.planeTriangleIntersection(plane, va, vb, vc, normal);

      // nonzero contribution if plane intersects face
      if (segment !== null) segments.push(segment);
    });

    // make an array of polygons - if not splitting, the only element will be
    // an aggregate of the all the segments of the cross-section
    const segmentSets = splitPolygons ? Calculate.polygonsFromSegments(segments) : [segments];

    // calculate a { segments, boundingBox, area, length } object for each poly
    const result = [];

    for (let ss = 0, lss = segmentSets.length; ss < lss; ss++) {
      const segmentSet = segmentSets[ss];

      let area = 0;
      let length = 0;
      const boundingBox = new THREE.Box3();

      for (let s = 0, ls = segmentSet.length; s < ls; s++) {
        const segment = segmentSet[s];

        boundingBox.expandByPoint(segment.start);
        boundingBox.expandByPoint(segment.end);

        // triangle between coplanar point and the two endpoints of the segment
        pa.subVectors(segment.start, point);
        pb.subVectors(segment.end, point);

        // compute area of the triangle; possibly change sign depending on the
        // normal
        segment.delta(delta);
        cross.crossVectors(delta, plane.normal);
        const sign = Math.sign(pa.dot(cross));
        const segmentArea = pa.cross(pb).length() / 2;

        // increment area
        area += segmentArea * sign;

        // increment length
        length += segment.distance();
      }

      // result for the current polygon
      result.push({
        segments: segmentSet,
        boundingBox: boundingBox,
        area: area,
        length: length
      });
    }

    return result;
  }

  // gets the contour (object like { segments, boundingBox, area, length })
  // whose total distance to the set of points is minimal
  static nearestContourToPoints(contours: any, points: any) {
    if (contours.length < 1) return null;
    if (contours.length === 1) return contours[0];

    const n = points.length;
    let nearestContour = null;

    // the points will all have some distance from the nearest
    // contour - they should all be exactly on the contour, so their
    // total distance to the closest segments of the contour should be
    // about 0; use this fact to find the closest contour
    let minDist = Infinity;

    const closestPoint = new THREE.Vector3();

    for (let c = 0, lc = contours.length; c < lc; c++) {
      const contour = contours[c];

      // minimum distances of each marker point to the contour's segments
      const contourMinDist = [];
      for (let p = 0; p < n; p++) contourMinDist.push(Infinity);

      for (let s = 0, ls = contour.segments.length; s < ls; s++) {
        const segment = contour.segments[s];

        for (let p = 0; p < n; p++) {
          const point = points[p];

          // calculate closest point on segment to this point
          segment.closestPointToPoint(point, false, closestPoint);

          // update min distance from contour to this point
          contourMinDist[p] = Math.min(contourMinDist[p], closestPoint.distanceTo(point));
        }
      }

      let distSum = 0;
      for (let p = 0; p < n; p++) distSum += contourMinDist[p];

      if (distSum < minDist) {
        nearestContour = contour;
        minDist = distSum;
      }
    }

    return nearestContour;
  }

  // calculates a planar convex hull of a set of segments
  // arguments:
  //  plane: THREE.Plane
  //  segments: an array of THREE.THREE.Line3 objects
  // returns an object like { segments, boundingBox, area, length }
  static planarConvexHull(plane: any, segments: any) {
    if ((THREE as any).QuickHull === undefined) {
      console.error('Calculating the convex hull relies on THREE.QuickHull.');

      return null;
    }

    const boundingBox = new THREE.Box3();

    // build an array of the points forming the cross-section to compute
    // the hull
    const points = [];

    for (let p = 0, lp = segments.length; p < lp; p++) {
      const point = segments[p].start;

      points.push(point);
      boundingBox.expandByPoint(point);
    }

    // push two points on either side of the plane to force the convex
    // hull to occupy some volume (else, the 3D hull would be in a plane,
    // which is not well-defined behavior);
    // the resulting 3D hull will consist of triangles with two verts on
    // the intended 2D hull and the remaining vert on either above or
    // below vert
    const center = new THREE.Vector3();
    const size = new THREE.Vector3();
    boundingBox.getCenter(center);
    boundingBox.getSize(size);
    const maxSize = Math.max(size.x, size.y, size.z);

    const below = center.clone().addScaledVector(plane.normal, -maxSize);
    const above = center.clone().addScaledVector(plane.normal, maxSize);

    points.push(below, above);

    // compute the hull
    const hull = new (THREE as any).QuickHull().setFromPoints(points);

    // get one of the halfedges in the plane of the cross-section
    const faces = hull.faces;
    let startHalfedge = null;

    for (let f = 0, lf = faces.length; f < lf; f++) {
      const face = faces[f];
      let he = face.edge;

      // iterate over a face's halfedges (wound CCW), find the one that
      // ends on above vert, get its predecessor
      do {
        if (he.head().point.equals(above)) {
          startHalfedge = he.prev;
          break;
        }
        he = he.next;
      } while (he !== face.edge);

      if (startHalfedge !== null) break;
    }

    // trace around the 2D hull from the starting halfedge, store segments
    let halfedge = startHalfedge;
    const _segments: any[] = [];
    let area = 0;
    let length = 0;

    const pa = new THREE.Vector3();
    const pb = new THREE.Vector3();
    const delta = new THREE.Vector3();
    const cross = new THREE.Vector3();
    const planePoint = new THREE.Vector3();
    plane.coplanarPoint(planePoint);

    do {
      const v0 = halfedge.tail().point;
      const v1 = halfedge.head().point;
      const segment = new THREE.Line3(v0, v1);

      // push new segment
      _segments.push(segment);

      // increment contour length
      length += v0.distanceTo(v1);

      pa.subVectors(v0, planePoint);
      pb.subVectors(v1, planePoint);

      // compute area of the triangle; possibly change sign depending on the
      // normal
      segment.delta(delta);
      cross.crossVectors(delta, plane.normal);
      const sign = Math.sign(pa.dot(cross));
      const segmentArea = pa.cross(pb).length() / 2;

      // increment area
      area += segmentArea * sign;

      halfedge = halfedge.next.twin.next;
    } while (halfedge !== startHalfedge);

    return {
      segments: _segments,
      boundingBox: boundingBox,
      area: area,
      length: length
    };
  }

  // calculate circle normal, center, and radius from three coplanar points:
  // take two pairs of coplanar points, calculate bisector of both pairs;
  // the bisectors will intersect at the center
  static circleFromThreePoints(p0: any, p1: any, p2: any) {
    const sa = p0.clone().sub(p1);
    const sb = p2.clone().sub(p1);

    // normal
    const normal = sa
      .clone()
      .cross(sb)
      .normalize();

    // if points are collinear, can't compute the circle, so unready the
    // result and return
    if (normal.length() === 0) return null;

    // bisector points
    const pa = p0
      .clone()
      .add(p1)
      .multiplyScalar(0.5);
    const pb = p2
      .clone()
      .add(p1)
      .multiplyScalar(0.5);

    // bisector directions
    const da = normal
      .clone()
      .cross(sa)
      .normalize();
    const db = normal
      .clone()
      .cross(sb)
      .normalize();

    // the bisectors won't generally intersect exactly, but we can
    // calculate a point of closest approach:
    // if line 0 and 1 are
    // v0 = p0 + t0d0, v1 = p1 + t1d1, then
    // t0 = ((d0 - d1 (d0 dot d1)) dot (p1 - p0)) / (1 - (d0 dot d1)^2)
    // t1 = ((d0 (d0 dot d1) - d1) dot (p1 - p0)) / (1 - (d0 dot d1)^2)

    const dadb = da.dot(db);
    const denominator = 1 - dadb * dadb;

    // just in case, to avoid division by 0
    if (denominator === 0) return null;

    // scalar parameter
    const ta =
      da
        .clone()
        .addScaledVector(db, -dadb)
        .dot(pb.clone().sub(pa)) / denominator;

    const center = pa.clone().addScaledVector(da, ta);
    const radius = center.distanceTo(p2);

    return {
      normal: normal,
      center: center,
      radius: radius
    };
  }

  // hash map utilities for extracting polygons from segment lists

  static numHash(n: any, p: any) {
    return Math.round(n * p);
  }

  static vectorHash(v: any, p: any) {
    return (
      Calculate.numHash(v.x, p) + '_' + Calculate.numHash(v.y, p) + '_' + Calculate.numHash(v.z, p)
    );
  }

  static objectGetKey(object: any) {
    for (const key in object) return key;
    return null;
  }

  static polygonsFromSegments(segments: any, p?: any) {
    p = p !== undefined ? p : 1e5;

    // adjacency map
    const m = {};

    let segment, startHash, endHash;

    // build the map
    for (let s = 0, l = segments.length; s < l; s++) {
      const segment = segments[s];
      const startHash = Calculate.vectorHash(segment.start, p);
      const endHash = Calculate.vectorHash(segment.end, p);

      // if segment is sufficiently long that its start and end don't hash to
      // the same value, add it to the map
      if (startHash !== endHash) m[startHash] = segment;
    }

    for (let s = 0, l = segments.length; s < l; s++) {
      const segment = segments[s];
      const startHash = Calculate.vectorHash(segment.start, p);
      const endHash = Calculate.vectorHash(segment.end, p);
    }

    // extract the polygons
    const polygons = [];
    let polygon;

    let start;
    let current = null;

    while ((start = Calculate.objectGetKey(m)) !== null) {
      current = start;
      polygon = [];

      do {
        segment = m[current];

        if (segment === undefined) break;

        polygon.push(segment);
        delete m[current];

        current = Calculate.vectorHash(segment.end, p);
      } while (current !== start);

      if (current === start) polygons.push(polygon);
    }

    return polygons;
  }
}
