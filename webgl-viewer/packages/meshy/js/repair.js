var Repair = (function() {


  // the algorithm is like this:
  //  1. generate an adjacency map
  //  2. from the adjacency map, get the hash table of vertices that border holes
  //  3. generate a list of border vertex cycles (wind them clockwise)
  //  4. use the advancing front mesh (AFM) method to fill the holes

  function generatePatchGeometry(mesh, p) {
    // vertex precision factor
    p = p || 1e5;

    // get the hash table detailing vertex adjacency
    var adjacencyMap = generateAdjacencyMap(
      mesh.geometry.vertices,
      mesh.geometry.faces,
      p, true, true
    );

    // from the adjacency map, get a hash table containing only border vertices
    var borderMap = generateBorderMap(adjacencyMap);

    // check for empty border map; if properties exist, then holes exist
    if (objectIsEmpty(borderMap)) {
      return null;
    }

    // array of THREE.Vertex3s and THREE.Face3s that will patch the holes
    var patchVertices = [];
    var patchFaces = [];

    var patchGeometry = new THREE.Geometry();
    patchGeometry.vertices = patchVertices;
    patchGeometry.faces = patchFaces;
    // need to make the vertices unique
    var patchVertexMap = {};

    // build an array of border edge cycles
    var borderCycles = [];
    var borderCycleNormals = [];

    while (true) {
      // start calculating a new cycle of border edges

      // break if no more border edges
      if (objectIsEmpty(borderMap)) break;

      // will contain a closed path of vertices
      var cycle = [];
      var cycleNormals = [];
      // only store cycle if search loop exits correctly
      var cycleClosed = false;

      var start = null;
      var current = null;
      var previous = null;
      // get a vertex from the borderMap that's on the edge of only one hole; if
      // nothing went wrong, this should always find such a vertex
      for (var key in borderMap) {
        if (borderMap[key].numHoles==1) {
          start = borderMap[key].vertex;
          break;
        }
      }
      // if can't get a vertex bordering only one hole, break (should never
      // fail here, but checking in case of weirdly malformed geometry)
      if (!start) break;
      current = start;

      // go along the cycle till we close the loop
      while (true) {
        // given a current vertex, search for the next vertex in the loop

        // hash current vertex to find its data
        var hash = vertexHash(current, p);
        var data = borderMap[hash];

        // juuuuuust in case; should never happen
        if (borderMap[hash]===undefined) break;

        // get the vertex's neighbors
        var neighbors = data.neighbors;
        var normal = data.normal;

        // store vertex in the cycle
        cycle.push(current);
        cycleNormals.push(normal);

        // if we're on the first vertex, need to wind the cycle in a consistent
        // direction (CW here) to make face generation easier
        if (previous==null) {
          // pick one of the two neighbors as next, giving a (next-current) edge;
          // if its winding order in the adjacency map is negative, that means the
          // adjacent geometry is to the left (looking along the negative normal)
          // and we're winding CW; if winding order is positive, need to pick the
          // other neighbor as next
          var next = neighbors[0];
          var currentAdjacentData = adjacencyMap[hash];
          if (currentAdjacentData.windingOrder[currentAdjacentData.neighbors.indexOf(next)]<0) {
            next = neighbors[1];
          }

          previous = current;
          current = next;
        }
        // else, two possibilities:
        //  1. current vertex borders only one hole; if so, just pick the neighbor
        //    that's not previous
        //  2. current vertex borders multiple holes; if so, find the neighbor
        //    that borders the same hole
        else {
          if (data.numHoles==1) {
            // pick the neighbor that's not previous
            var tmp = current;
            current = neighbors[0];
            if (current==previous) current = neighbors[1];
            previous = tmp;
          }
          else {
            // heuristic goes like this:
            //  1. project the edges out of current onto the plane perpendicular
            //    to the vertex normal
            //  2. find the one that's CCW from the prev-current edge, if
            //    looking along negative normal
            //  3. that edge points to the correct next vertex, assuming a
            //    correctly calculated normal
            var edges = [];
            for (var i=0; i<neighbors.length; i++) {
              // edge from current to neighbor
              edges[i] = neighbors[i].clone().sub(current);
              // project out the component along the normal
              edges[i] = edges[i].sub(normal.clone().multiplyScalar(normal.dot(edges[i]))).normalize();
            }

            // the angles of the outflowing edges around current vertex
            var angles = [];
            // need to be aware of the edge leading to previous vert; its angle
            // will be 0
            var prevEdge = edges[neighbors.indexOf(previous)];
            // orthogonal to both prevEdge and normal; use this to test for angles
            // greater than pi
            var orthogonalVector = prevEdge.clone().cross(normal);
            // calculate angles of every edge around normal w.r.t. prevEdge
            for (var i=0; i<edges.length; i++) {
              var edge = edges[i];
              if (edge==prevEdge) {
                angles[i] = 0;
                continue;
              }
              angles[i] = Math.acos(edge.dot(prevEdge));
              if (edge.dot(orthogonalVector)<0) angles[i] = 2.0*Math.PI - angles[i];
            }

            // find the edge that forms the largest angle with the edge to the
            // previous vert, so it's the first edge CCW from prevEdge
            var maxAngleIdx = 0;
            var maxAngle = angles[0];
            for (var i=1; i<angles.length; i++) {
              var angle = angles[i];
              if (angle>maxAngle) {
                maxAngleIdx = i;
                maxAngle = angle;
              }
            }
            var next = neighbors[maxAngleIdx];

            // need to remove prev and next from the neighbors list so that future
            // iterations don't take those turns
            neighbors.splice(neighbors.indexOf(previous), 1);
            neighbors.splice(neighbors.indexOf(next), 1);

            previous = current;
            current = next;
          }
        }

        // if single-hole vertex, delete its entry in the border map; if bordering
        // multiple holes, decrement number of adjacent holes
        if (data.numHoles==1) delete borderMap[hash];
        else data.numHoles--;

        // if we've reached the end of the loop, break
        if (current==start) {
          cycleClosed = true;
          break;
        }
      }

      // if cycle search loop found a correctly formed cycle, add it to the list;
      // should always happen, bugs notwithstanding
      if (cycleClosed) {
        borderCycles.push(cycle);
        borderCycleNormals.push(cycleNormals);
      }
    }

    // patch every border cycle
    for (var c=0; c<borderCycles.length; c++) {
      var cycle = borderCycles[c].slice();
      var normals = borderCycleNormals[c];

      var n = cycle.length;
      var originalCycleLength = n;
      var originalCyclePathLength = 0;
      var originalFaceCount = patchFaces.length;
      // every cycle should be nonempty, but check this just in case
      if (n==0) continue;

      // array of edges from vertex i to vertex i+1 (loops around at the end)
      var edges = [];
      // center of the hole
      var center = new THREE.Vector3();
      // average length of the edges
      var avgLen = 0;
      // average distance of cycle verts from the center
      var avgDist = 0;

      for (var i=0; i<n; i++) {
        var v = cycle[i];
        edges.push(cycle[(i+1)%n].clone().sub(v));
        var len = edges[i].length();
        avgLen += len/n;
        originalCyclePathLength += len;
        center.add(v.clone().divideScalar(n));
      }
      for (var i=0; i<n; i++) {
        avgDist += cycle[i].distanceTo(center)/n;
      }
      var angles = [];
      for (var i=0; i<n; i++) {
        angles.push(calculateAngleFromEdges(i, edges, cycle, normals, n));
      }

      // merge new vertices if adjacent edge length is below this threshold
      var threshold = avgLen * 1;
      // determines the combination of v and centerVector at each step; final
      // vertex is v + centerVector*redirectFactor, where centerVector is scaled
      // to the same length as v
      var redirectFactor = 0.2;

      var count = 0;

      // while the cycle of border edges can't be bridged by a single triangle,
      // add or remove vertices by the advancing front mesh method
      while (cycle.length>3) {
        count++;
        // if the front is expanding infinitely or doing something funky, break
        if (count%originalCycleLength==0) {
          var newPathLength = edges.reduce(function(acc,x) {return acc+x.length()}, 0);
          if (newPathLength > originalCyclePathLength) break;
        }

        // find vertex whose adjacent edges have the smallest angle
        var angle = angles[0];
        var idx = 0;
        for (var i=1; i<n; i++) {
          var a = angles[i];
          if (a < angle) {
            angle = a;
            idx = i;
          }
        }

        // local indices of cycle[idx] neighbors
        var prevIdx = (idx-1+n)%n;
        var nextIdx = (idx+1)%n;
        // cycle[idx] and its neighbors
        var v = cycle[idx];
        var vprev = cycle[prevIdx];
        var vnext = cycle[nextIdx];

        // indices into the patch vertex array
        var patchvidx = vertexMapIdx(patchVertexMap, v, patchVertices, p);
        var patchprevidx = vertexMapIdx(patchVertexMap, vprev, patchVertices, p);
        var patchnextidx = vertexMapIdx(patchVertexMap, vnext, patchVertices, p);

        // edges from v to next and from v to prev
        var enext = edges[idx];
        var eprev = edges[prevIdx].clone().multiplyScalar(-1);

        var centerVector = center.clone().sub(v);

        var newVerts;
        // determine how many verts to create; these rules are a modification of
        // those found in "A robust hole-filling algorithm for triangular mesh",
        // Zhao, Gao, Lin
        if (angle < 1.308996939) { // if angle < 75 degrees
          // do nothing; we're not creating any vertices
          newVerts = [];
        }
        else if (angle < 2.356194490) { // if 75 degrees <= angle < 135 degrees
          // create a new vertex and set its distance from v to be the average of
          // the two existing edges
          var v1 = eprev.clone().setLength((eprev.length()+enext.length())/2.0);
          // rotate and move the new vertex into position
          v1.applyAxisAngle(enext.clone().cross(eprev).normalize(), -angle/2.0).add(v);

          // check if the length is below the threshold; if so, skip creating the
          // vertex and just make one face
          if (v1.distanceTo(vnext)<threshold) {
            newVerts = [];
          }
          else {
            newVerts = [v1];
          }
        }
        else { // angle >= 135 degrees
          // create new vertices, interpolate their lengths between enext & eprev
          var prevlen = eprev.length(), nextlen = enext.length();
          var v1 = eprev.clone().setLength((prevlen*2.0+nextlen)/3.0);
          var v2 = eprev.clone().setLength((prevlen+nextlen*2.0)/3.0);
          // rotate and move the new vertices into position
          var axis = enext.clone().cross(eprev).normalize();
          v1.applyAxisAngle(axis, -angle/3.0).add(v);
          v2.applyAxisAngle(axis, -angle*2.0/3.0).add(v);

          // check if the length is below the threshold; if so, skip creating the
          // vertex and just make one face
          if (v2.distanceTo(v1)<threshold) {
            // removing v2; take v1, set it to the midpoint of v1 and v2
            v1.add(v2).divideScalar(2.0);
            newVerts = [v1];
          }
          else {
            newVerts = [v1, v2];
          }
        }

        if (newVerts.length==0) {
          // just make a face and remove v from the cycle
          var face = new THREE.Face3();
          face.a = patchvidx;
          // we know the order because the border vert cycle winds CW (see above)
          face.b = patchprevidx;
          face.c = patchnextidx;
          face.normal = vprev.clone().sub(v).cross(edges[idx]).normalize();
          patchFaces.push(face);

          n -= 1;
          // remove v from the cycle because it's been patched over
          cycle.splice(idx, 1);
          // update edges, angles, and normals
          edges.splice(idx, 1);
          angles.splice(idx, 1);
          normals.splice(idx, 1);
          // now idx will point to vprev
          if (idx==0) idx = prevIdx-1;
          else idx = prevIdx;
          nextIdx = (idx+1)%n;
          edges[idx] = cycle[nextIdx].clone().sub(cycle[idx]);
          // recalculate normals for the two vertices whose neigbors were changed;
          // set this as the old normal plus the new face's normal, both weighted
          // by their angle contributions at the vertex (old normal is weighted by
          // 2pi-angle, face normal by the angle between face's outermost edge and
          // the other edge adjacent to the vertex)
          // (you can really feel the clunky notation here >.>...)
          var faceAngle;
          faceAngle = Math.acos(
            edges[idx].clone().normalize().dot(
              v.clone().sub(cycle[idx]).normalize()
            )
          )*2.0;
          normals[idx].multiplyScalar(2*Math.PI-angle)
            .add(face.normal.clone().multiplyScalar(faceAngle)).normalize();
          faceAngle = Math.acos(
            edges[idx].clone().normalize().dot(
              cycle[nextIdx].clone().sub(v).normalize()
            )
          )*2.0;
          normals[nextIdx].multiplyScalar(2*Math.PI-angles[nextIdx])
            .add(face.normal.clone().multiplyScalar(faceAngle)).normalize();
          // recalculate angles
          angles[idx] = calculateAngleFromEdges(idx, edges, cycle, normals, n);
          angles[nextIdx] = calculateAngleFromEdges(nextIdx, edges, cycle, normals, n);
        }
        else if (newVerts.length==1) {
          var v1 = newVerts[0];
          // put the vertex into the patch map
          var patchv1idx = vertexMapIdx(patchVertexMap, v1, patchVertices, p);

          // new edge
          var e1 = v1.clone().sub(v);

          // adjust the new vertex to point more toward the center
          var redirect = centerVector.setLength(
            e1.length() * redirectFactor * v.distanceTo(center) / avgDist
          );
          v1.add(redirect);

          // construct the two new faces
          var face1 = new THREE.Face3();
          face1.a = patchvidx;
          face1.b = patchprevidx;
          face1.c = patchv1idx;
          face1.normal = eprev.clone().cross(e1).normalize();
          patchFaces.push(face1);
          var face2 = face1.clone();
          face2.b = patchv1idx;
          face2.c = patchnextidx;
          face2.normal = e1.clone().cross(enext).normalize();
          patchFaces.push(face2);

          // replace vertex v in the cycle with the new vertex
          cycle[idx] = v1;
          // update edges, angles, and normals
          edges[prevIdx] = v1.clone().sub(vprev);
          edges[idx] = vnext.clone().sub(v1);
          // recalculate normals
          var faceAngle;
          faceAngle = Math.acos(
            edges[prevIdx].clone().normalize().dot(
              v.clone().sub(cycle[prevIdx]).normalize()
            )
          )*2.0;
          normals[prevIdx].multiplyScalar(2*Math.PI-angles[prevIdx])
            .add(face1.normal.clone().multiplyScalar(faceAngle)).normalize();
          normals[idx] = face1.normal.clone().add(face2.normal).normalize();
          faceAngle = Math.acos(
            edges[idx].clone().normalize().dot(
              cycle[nextIdx].clone().sub(v).normalize()
            )
          )*2.0;
          normals[nextIdx].multiplyScalar(2*Math.PI-angles[nextIdx])
            .add(face2.normal.clone().multiplyScalar(faceAngle)).normalize();
          // recalculate angles
          angles[prevIdx] = calculateAngleFromEdges(prevIdx, edges, cycle, normals, n);
          angles[idx] = calculateAngleFromEdges(idx, edges, cycle, normals, n);
          angles[nextIdx] = calculateAngleFromEdges(nextIdx, edges, cycle, normals, n);
        }
        else {
          var v1 = newVerts[0];
          var v2 = newVerts[1];

          // put the vertices into the patch map
          var patchv1idx = vertexMapIdx(patchVertexMap, v1, patchVertices, p);
          var patchv2idx = vertexMapIdx(patchVertexMap, v2, patchVertices, p);

          // new edges
          var e1 = v1.clone().sub(v);
          var e2 = v2.clone().sub(v);

          // adjust the new vertex to point more toward the center
          var redirect;
          redirect = centerVector.setLength(
            e1.length() * redirectFactor * v.distanceTo(center) / avgDist
          );
          v1.add(redirect);
          redirect = centerVector.setLength(
            e2.length() * redirectFactor * v.distanceTo(center) / avgDist
          );
          v1.add(redirect);

          // construct the three new faces
          var face1 = new THREE.Face3();
          face1.a = patchvidx;
          face1.b = patchprevidx;
          face1.c = patchv1idx;
          face1.normal = eprev.clone().cross(e1).normalize();
          patchFaces.push(face1);
          var face2 = face1.clone();
          face2.b = patchv1idx;
          face2.c = patchv2idx;
          face2.normal = e1.clone().cross(e2).normalize();
          patchFaces.push(face2);
          var face3 = face2.clone();
          face3.b = patchv2idx;
          face3.c = patchnextidx;
          face3.normal = e2.clone().cross(enext).normalize();
          patchFaces.push(face3);

          n += 1;
          cycle.splice(idx, 1, v1, v2);
          if (idx==0) prevIdx += 1;
          edges.splice(idx, 1, v2.clone().sub(v1), vnext.clone().sub(v2));
          edges[prevIdx] = v1.clone().sub(vprev);
          var nextnextIdx = (nextIdx+1)%n;
          normals.splice(idx, 1, null, null);
          angles.splice(idx, 1, 0, 0);
          // recalculate normals
          var faceAngle;
          faceAngle = Math.acos(
            edges[prevIdx].clone().normalize().dot(
              v.clone().sub(cycle[prevIdx]).normalize()
            )
          )*2.0;
          normals[prevIdx].multiplyScalar(2*Math.PI-angles[prevIdx])
            .add(face1.normal.clone().multiplyScalar(faceAngle)).normalize();
          normals[idx] = face1.normal.clone().add(face2.normal).normalize();
          normals[nextIdx] = face2.normal.clone().add(face3.normal).normalize();
          faceAngle = Math.acos(
            edges[nextIdx].clone().normalize().dot(
              cycle[nextnextIdx].clone().sub(v).normalize()
            )
          )*2.0;
          normals[nextnextIdx].multiplyScalar(2*Math.PI-angles[nextnextIdx])
            .add(face3.normal.clone().multiplyScalar(faceAngle)).normalize();
          // recalculate angles
          angles[prevIdx] = calculateAngleFromEdges(prevIdx, edges, cycle, normals, n);
          angles[idx] = calculateAngleFromEdges(idx, edges, cycle, normals, n);
          angles[nextIdx] = calculateAngleFromEdges(nextIdx, edges, cycle, normals, n);
          angles[nextnextIdx] = calculateAngleFromEdges(nextnextIdx, edges, cycle, normals, n);
        }
      }

      // we should get here once the cycle only contains three verts; patch the
      // final hole
      if (cycle.length==3) {
        var face = new THREE.Face3();
        face.a = vertexMapIdx(patchVertexMap, cycle[0], patchVertices, p);
        face.b = vertexMapIdx(patchVertexMap, cycle[2], patchVertices, p);
        face.c = vertexMapIdx(patchVertexMap, cycle[1], patchVertices, p);
        var e01 = cycle[1].clone().sub(cycle[0]);
        var e02 = cycle[2].clone().sub(cycle[0]);
        face.normal = e02.cross(e01).normalize();
        patchFaces.push(face);
      }
      // ...but, if we found an infinitely expanding front (the algorithm isn't
      // perfect), we need to remove the faces we added
      else if (cycle.length>3) {
        patchFaces.splice(originalFaceCount);
      }

      // smooth the patch; algorithm looks like this:
      //  1. build an adjacency map for the verts in the patch
      //  2. for every vertex that's not on the boundary of the patch, set its
      //    position to the average of its neighbors
      //  3. iterate this several times
      var vertices = patchGeometry.vertices;
      var faces = patchGeometry.faces.slice(originalFaceCount);
      var patchAdjacencyMap = generateAdjacencyMap(vertices, faces, p);

      // set cycle to the initial array of border verts
      cycle = borderCycles[c];

      // skip the rest if the hole was triangular
      if (cycle.length<=3) continue;

      // remove verts that are on the border because we won't move them
      for (var key in patchAdjacencyMap) {
        if (cycle.indexOf(patchAdjacencyMap[key].vertex)>-1) {
          delete patchAdjacencyMap[key];
        }
        else {
          // make a copy of neighbor vertices so that every vertex gets updated
          // from its neighbors' original positions
          var data = patchAdjacencyMap[key];
          data.copyNeighbors = data.neighbors.map(function(x) {return x.clone();});
        }
      }

      var numIterations = 20;

      // do a set number of smoothing iterations; could do an adaptive algorithm
      // like "only adjust the vert if its distance to its new position is greater
      // than a threshold", but that seems like overkill as this is cheap
      for (var i=0; i<numIterations; i++) {
        // set each vertex to the average of its neighbors based on copNeighbors
        for (var key in patchAdjacencyMap) {
          var n = patchAdjacencyMap[key].neighbors.length;
          var neighbors = patchAdjacencyMap[key].copyNeighbors;
          var sum = neighbors.reduce(function (acc, x) {
            return acc.add(x);
          }, new THREE.Vector3());
          patchAdjacencyMap[key].vertex.copy(sum.divideScalar(n));
        }

        // skip updating the copy neighbor if no more iterations
        if (i == (numIterations-1)) break;

        // update copy neighbors
        for (var key in patchAdjacencyMap) {
          var data = patchAdjacencyMap[key];
          for (var j=0; j<data.neighbors.length; j++) {
            data.copyNeighbors[j].copy(data.neighbors[j]);
          }
        }
      }

      // vertices have moved, so recalculate normals
      for (var i=0; i<faces.length; i++) {
        var face = faces[i];
        var va = vertices[face.a];
        var vb = vertices[face.b];
        var vc = vertices[face.c];
        face.normal.copy(
          vb.clone().sub(va).cross(vc.clone().sub(va)).normalize()
        );
      }
    }

    return patchGeometry;

    function calculateAngleFromEdges(idx, edges, cycle, normals, n) {
      var prevIdx = (idx-1+n)%n;
      // first edge points to previous vert, second edge points to next vert
      var e1 = edges[prevIdx].clone().normalize().multiplyScalar(-1);
      var e2 = edges[idx].clone().normalize();
      var angle = Math.acos(e1.dot(e2));

      // need to check if the vertex is convex, i.e., protruding into the hole,
      // and, if so, subtract the calculated angle from 2pi; because we know the
      // winding order, this is true when the previous edge crossed with the
      // normal has a negative component along the current edge
      if (e1.cross(normals[idx]).dot(e2) > 0) {
        angle = 2.0*Math.PI - angle;
      }

      return angle;
    }
  }

  // build a hash table detailing vertex adjacency
  function generateAdjacencyMap(vertices, faces, p, storeWindingOrder, storeNormal) {
    // Will be an object { hash: data }, where data is { vertex, vertices, windingOrder, normal}.
    // For a given vertex, it will have an entry (keyed by hash) and contain an
    // object that stores the vertex, its adjacent vertices, and the count of
    // faces it shares with each adjacent vertex.
    // An important point is that, in a well-formed mesh, each vertex will share
    // exactly two faces with each neighbor.
    var adjacencyMap = {};

    // for each face
    for (var f=0; f<faces.length; f++) {
      var face = faces[f];
      var faceVerts = faceGetVerts(face, vertices);

      // for each vertex in the face
      for (var v=0; v<3; v++) {
        var vertex = faceVerts[v];
        var hash = vertexHash(vertex, p);

        // the other two vertices for the face; we will add these to adjacencyMap
        var vertex1 = faceVerts[(v+1)%3];
        var vertex2 = faceVerts[(v+2)%3];

        if (!(hash in adjacencyMap)) {
          adjacencyMap[hash] = {
            vertex: vertex,
            neighbors: []
          };
          if (storeWindingOrder) adjacencyMap[hash].windingOrder = [];
          if (storeNormal) adjacencyMap[hash].normal = new THREE.Vector3();
        }

        var data = adjacencyMap[hash];
        var normal = face.normal;
        // if winding CCW, store a winding order of 1; if CW, winding order is -1
        addAdjacentVertex(vertex1, data, 1);
        addAdjacentVertex(vertex2, data, -1);

        // weigh the accumulated normal by its angle at the vertex; this should
        // prevent the normal from having a negative component along the adjacent
        // face normals in all reasonable circumstances
        if (storeNormal) {
          data.normal.add(
            normal.clone().multiplyScalar(Math.acos(
              vertex1.clone().sub(vertex).normalize().dot(vertex2.clone().sub(vertex).normalize())
            ))
          );
        }
      }
    }

    // given an existing adjacency set for a given vertex (data), add a new
    // vertex (vertex) that's adjacent to the first one; also pass winding order
    // for the edge from data.vertex to vertex
    function addAdjacentVertex(vertex, data, windingOrder) {
      // hash of the vertex we're adding
      var hash = vertexHash(vertex, p);
      // index of the vertex in the existing adjacency list of data.vertex
      var idx = data.neighbors.indexOf(vertex);
      if (idx==-1) data.neighbors.push(vertex);

      if (storeWindingOrder) {
        // if the vertex we're adding existed in the adjacency list, add to its
        // winding order
        if (idx > -1) data.windingOrder[idx] += windingOrder;
        // if didn't exist, set winding order
        else data.windingOrder.push(windingOrder);
      }
    }

    return adjacencyMap;
  }

  // make a hash table with vertices that border holes, based on an adjacency map
  function generateBorderMap(adjacencyMap) {
    if (!adjacencyMap) return null;

    // isolate vertices bordering holes, also store the number of holes adjacent
    // to each vertex
    var borderMap = {};
    for (var key in adjacencyMap) {
      var edgeVertex = false;
      var data = adjacencyMap[key];
      var singleNeighborCount = 0;

      for (var c=0; c<data.windingOrder.length; c++) {
        if (data.windingOrder[c] != 0) {
          edgeVertex = true;
          singleNeighborCount += 1;
        }
      }

      if (edgeVertex) {
        var neighbors = [];
        for (var v=0; v<data.neighbors.length; v++) {
          if (data.windingOrder[v] != 0) neighbors.push(data.neighbors[v]);
        }
        borderMap[key] = {
          vertex: data.vertex,
          neighbors: neighbors,
          // every hole contributes two adjacent vertices with count 1
          numHoles: singleNeighborCount/2,
          normal: data.normal.normalize()
        };
      }
    }

    return borderMap;
  }

  return {
    generatePatchGeometry: generatePatchGeometry
  };

})();
