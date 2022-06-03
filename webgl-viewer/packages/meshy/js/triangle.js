/* triangle.js
   classes:
    Triangle
   description:
    Represents a face in triangulated geometry. Initialize with a prepared list
    of vertices, or at least one that will contain the necessary vertices at the
    time of adding them.
    Add vertex indices with .addVertex. Three indices per face.
    Has methods for recalculating bounds plus calculating surface area and
    signed volume.
*/

// Constructor - initialize with a list of vertices for the entire model.
function Triangle(vertices) {
  this.vertices = vertices;
  this.indices = [];
  this.normal = null;
  this.resetBounds();
  this.count = 0;
  this.surfaceArea = null;
  this.signedVolume = null;
}

// Add a new index idx and update the bounds based on this.vertices[idx], the
// corresponding vertex object.
Triangle.prototype.addVertex = function(idx) {
  if (this.count>=3) {
    console.log("ERROR: tried to push a fourth vertex onto a triangle");
    return;
  }
  this.indices.push(idx);
  var vertex = this.vertices[idx];
  this.count++;
  if (this.count==1) {
    this.xmin = vertex.x;
    this.xmax = vertex.x;
    this.ymin = vertex.y;
    this.ymax = vertex.y;
    this.zmin = vertex.z;
    this.zmax = vertex.z;
  }
  else {
    this.updateBoundsV(vertex);
  }
};

// All bounds to Inifinity.
Triangle.prototype.resetBounds = function() {
  this.xmin = Infinity;
  this.xmax = -Infinity;
  this.ymin = Infinity;
  this.ymax = -Infinity;
  this.zmin = Infinity;
  this.zmax = -Infinity;
}

// Update bounds with the addition of a new vertex.
Triangle.prototype.updateBoundsV = function(vertex) {
  this.xmin = vertex.x<this.xmin ? vertex.x : this.xmin;
  this.xmax = vertex.x>this.xmax ? vertex.x : this.xmax;
  this.ymin = vertex.y<this.ymin ? vertex.y : this.ymin;
  this.ymax = vertex.y>this.ymax ? vertex.y : this.ymax;
  this.zmin = vertex.z<this.zmin ? vertex.z : this.zmin;
  this.zmax = vertex.z>this.zmax ? vertex.z : this.zmax;
}
// Recalculate all bounds.
Triangle.prototype.updateBounds = function() {
  this.resetBounds();
  for (var i=0; i<3; i++) {
    this.updateBoundsV(this.vertices[this.indices[i]]);
  }
}

// Set the normal.
Triangle.prototype.setNormal = function(normal) {
  this.normal = normal;
};

// Calculate triangle area via cross-product.
Triangle.prototype.calcSurfaceArea = function() {
  if (this.surfaceArea!==null) return this.surfaceArea;
  var v = new THREE.Vector3();
  var v2 = new THREE.Vector3();
  v.subVectors(this.vertices[this.indices[0]], this.vertices[this.indices[1]]);
  v2.subVectors(this.vertices[this.indices[0]], this.vertices[this.indices[2]]);
  v.cross(v2);
  this.surfaceArea = 0.5 * v.length();
  return this.surfaceArea;
}

// Calculate the volume of a tetrahedron with one vertex on the origin and
// with the triangle forming the outer face; sign is determined by the inner
// product of the normal with any of the vertices.
Triangle.prototype.calcSignedVolume = function() {
  if (this.signedVolume!==null) return this.signedVolume;
  var sign = Math.sign(this.vertices[this.indices[0]].dot(this.normal));
  var v1 = this.vertices[this.indices[0]];
  var v2 = this.vertices[this.indices[1]];
  var v3 = this.vertices[this.indices[2]];
  var volume = (-v3.x*v2.y*v1.z + v2.x*v3.y*v1.z + v3.x*v1.y*v2.z);
  volume += (-v1.x*v3.y*v2.z - v2.x*v1.y*v3.z + v1.x*v2.y*v3.z);
  this.signedVolume = sign * Math.abs(volume/6.0);
  return this.signedVolume;
}

// Calculate the endpoints of the segment formed by the intersection of this
// triangle and a plane normal to the given axis.
// Returns an array of two Vector3s in the plane.
Triangle.prototype.intersection = function(axis, pos) {
  if (this[axis+"max"]<=pos || this[axis+"min"]>=pos) return [];
  var segment = [];
  for (var i=0; i<3; i++) {
    var v1 = this.vertices[this.indices[i]];
    var v2 = this.vertices[this.indices[(i+1)%3]];
    if ((v1[axis]<pos && v2[axis]>pos) || (v1[axis]>pos && v2[axis]<pos)) {
      var d = v2[axis]-v1[axis];
      if (d==0) return;
      var factor = (pos-v1[axis])/d;
      // more efficient to have a bunch of cases than being clever and calculating
      // the orthogonal axes and building a Vector3 from basis vectors, etc.
      if (axis=="x") {
        var y = v1.y + (v2.y-v1.y)*factor;
        var z = v1.z + (v2.z-v1.z)*factor;
        segment.push(new THREE.Vector3(pos,y,z));
      }
      else if (axis=="y") {
        var x = v1.x + (v2.x-v1.x)*factor;
        var z = v1.z + (v2.z-v1.z)*factor;
        segment.push(new THREE.Vector3(x,pos,z));
      }
      else { // axis=="z"
        var x = v1.x + (v2.x-v1.x)*factor;
        var y = v1.y + (v2.y-v1.y)*factor;
        segment.push(new THREE.Vector3(x,y,pos));
      }
    }
  }
  if (segment.length!=2) console.log("Plane-triangle intersection: strange segment length: ", segment);
  return segment;
}
