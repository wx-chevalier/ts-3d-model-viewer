function Debug(scene) {
  this.scene = scene;
  this.debugPointGeo = new THREE.Geometry();
  this.debugLineGeo = new THREE.Geometry();
}
Debug.prototype.loop = function(loop, fn) {
  if (fn === undefined) fn = function() { return true; };
  var curr = loop.vertex;
  do {
    if (fn(curr)) this.point(curr.v);
    curr = curr.next;
  } while (curr != loop.vertex);
}
Debug.prototype.line = function(v, w, n, lastonly, o, axis) {
  if (n === undefined) n = 1;
  if (lastonly === undefined) lastonly = false;
  if (o === undefined) o = 0;
  if (axis === undefined) axis = "z";

  for (var i=0; i<=n; i++) {
    if (lastonly && (n==0 || i<n-1)) continue;
    var vert = w.clone().multiplyScalar(i/n).add(v.clone().multiplyScalar((n-i)/n));
    vert.z += o;
    this.debugPointGeo.vertices.push(vert);
  }
  var vv = v.clone();
  vv.z += o;
  var ww = w.clone();
  ww.z += o;
  this.debugLineGeo.vertices.push(vv);
  this.debugLineGeo.vertices.push(ww);
  this.debugPointGeo.verticesNeedUpdate = true;
}
Debug.prototype.oneline = function(v, w, c, offset, dist) {
  if (c === undefined) c = 0xff6666;
  if (offset === undefined) offset = new THREE.Vector3();
  if (dist !== undefined) offset = offset.clone().setLength(dist);

  var vv = v.clone().add(offset);
  var ww = w.clone().add(offset);

  var geo = new THREE.Geometry();
  geo.vertices.push(vv);
  geo.vertices.push(ww);
  var mat = new THREE.LineBasicMaterial({color: c, linewidth: 1 });
  var mesh = new THREE.LineSegments(geo, mat);
  mesh.name = "debugLine";
  this.scene.add(mesh);

  //this.point(vv);
  //this.point(ww);
}
Debug.prototype.ray = function(v, r, l) {
  this.line(v, v.clone().add(r.clone().setLength(l)));
}
Debug.prototype.segmentPair = function(s, se, t, te) {
  var ms = s.clone().add(se).divideScalar(2);
  var mt = t.clone().add(te).divideScalar(2);
  this.line(ms, mt);
}
Debug.prototype.point = function(v, o, axis) {
  if (o===undefined) o = 0;
  if (axis===undefined) axis = "z";
  var vv = v;
  if (o!==0) {
    vv = v.clone();
    vv[axis] += o;
  }

  this.debugPointGeo.vertices.push(vv);
  this.debugPointGeo.verticesNeedUpdate = true;
}
Debug.prototype.face = function(f, vs) {
  var [a, b, c] = faceGetVerts(f, vs);
  this.point(a.clone().add(b).add(c).divideScalar(3));
}
Debug.prototype.fedges = function(f, vs) {
  var [a, b, c] = faceGetVerts(f, vs);
  this.oneline(a, b, 0, undefined, 0x66ff66);
  this.oneline(b, c, 0, undefined, 0x66ff66);
  this.oneline(c, a, 0, undefined, 0x66ff66);
}
Debug.prototype.points = function(idx, incr) {
  var color = 0xff6666;
  if (incr===undefined) incr = 0;
  if (idx!==undefined) {
    color = parseInt(('0.'+Math.sin(idx+incr).toString().substr(6))*0xffffff);
  }
  else idx = 0;
  var debugMaterial = new THREE.PointsMaterial( { color: color, size: 3, sizeAttenuation: false });
  var debugMesh = new THREE.Points(this.debugPointGeo, debugMaterial);
  debugMesh.name = "debug";
  this.scene.add(debugMesh);

  this.debugPointGeo = new THREE.Geometry();
}
Debug.prototype.lines = function(idx, incr) {
  var color = 0xff6666;
  if (incr===undefined) incr = 0;
  if (idx!==undefined) {
    color = parseInt(('0.'+Math.sin(idx+incr).toString().substr(6))*0xffffff);
    //console.log("%c idx "+idx, 'color: #'+color.toString(16));
  }
  else idx = 0;
  var debugLineMaterial = new THREE.LineBasicMaterial({color: color, linewidth: 1 });
  var debugLineMesh = new THREE.LineSegments(this.debugLineGeo, debugLineMaterial);
  debugLineMesh.name = "debugLine";
  this.scene.add(debugLineMesh);

  this.debugLineGeo = new THREE.Geometry();

  this.points();
}
Debug.prototype.cleanup = function() {
  removeMeshByName(this.scene, "debug");
  removeMeshByName(this.scene, "debugLine");
}
