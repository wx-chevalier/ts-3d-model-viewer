// 0x00019913's camera controls
// To be used with the THREE.js camera.
// See the constructor for various settable properties like rates and limits.

// Free Cam
// Characterized by:
//  origin
//  radial distance r (from origin)
//  angles theta (0-pi), phi (0-2pi)
// Angles signify rotation about origin.
// Origin can move by panning with MMB. Rotate w/ LMB. Camera always
// looks at origin.
var FreeCam = 0;
// Cyl Cam - moves on the surface of a cylinder and pivots around that point
// Characterized by:
//  radius of cylinder r
//  angle around cylinder phi
//  z (vertical displacement along cylinder, may not use)
//  target pivot params tr, ttheta, tphi (around camera's location on cylinder)
// Camera's position on cylinder is set w/ MMB. Camera's rotation around pivot
// is set w/ LMB; this moves the origin and teMins camera to look at it. Zooming
// adds a displacement vector to camera and origin, which rotates w/ phi.
var CylCam = 1;

//  constructor
//  arguments:
//    camera: THREE.Camera
//    domElement: dom element on which to listen for user input
//    params (optional): object containing initialization params,
//                       e.g., { r: 15, theta: Math.PI/2 }
Controls = function(camera, domElement, params) {
  this.objects = [];
  this.camera = camera;
  this.domElement = (domElement!==undefined) ? domElement : document;
  // need to offset some default limits to prevent gimbal lock
  this.epsilon = 0.001;

  if (!params) params = { type: FreeCam };
  if (!params.type) params.type = FreeCam;

  this.setDefaults(params.type);

  for (var key in params) {
    this[key] = params[key];
  }

  this.enabled = true;

  // EVENT HANDLING

  // for use inside the event handlers
  var _this = this;
  var mouseX = 0, mouseY = 0;
  var mouseXprev, mouseYprev;
  var dX, dY;
  var mouseButton = -1;

  // add event listeners
  this.domElement.addEventListener('mousemove', onMouseMove, false);
  this.domElement.addEventListener('mousedown', onMouseDown, false);
  this.domElement.addEventListener('mouseup', onMouseUp, false);
  this.domElement.addEventListener('mouseenter', onMouseEnter, false);
  this.domElement.addEventListener('mousewheel', onMousewheel, false);
  this.domElement.addEventListener('DOMMouseScroll', onMousewheel, false); //Firefox
  this.domElement.addEventListener('contextmenu', onContextmenu, false);

  function onMouseMove(e) {
    if (!_this.enabled) return;

    // calculate difference in mouse position between this and the previous events
    mouseXprev = mouseX;
    mouseYprev = mouseY;
    mouseX = (e.clientX / _this.domElement.offsetWidth) * 2 - 1;
    mouseY = (e.clientY / _this.domElement.offsetHeight) * 2 - 1;
    dX = mouseX-mouseXprev;
    dY = mouseY-mouseYprev;
    if (mouseButton==0) { // LMB
      handleLMB();
    }

    if (mouseButton==1) { // MMB
      handleMMB();
    }

    if (mouseButton==2) { // RMB
      handleRMB();
    }
  }

  function onContextmenu(e) {
    e.preventDefault();
  }

  function onMousewheel(e) {
    var d = ((typeof e.wheelDelta !== "undefined")?(-e.wheelDelta):(e.detail));
    handleWheel(d);
  }

  function onMouseDown(e) {
    mouseButton = e.button;
  };
  function onMouseUp(e) {
    mouseButton = -1;
  };
  function onMouseEnter(e) {
    mouseButton = -1;
  };

  function handleLMB() {
    if (_this.type==FreeCam) {
      _this.theta += _this.thetaRate * dY;
      if (_this.theta < _this.thetaMin) _this.theta = _this.thetaMin;
      if (_this.theta > _this.thetaMax) _this.theta = _this.thetaMax;
      _this.phi -= _this.phiRate * dX;
      if (_this.phi < _this.phiMin) _this.phi = _this.phiMin;
      if (_this.phi > _this.phiMax) _this.phi = _this.phiMax;
    }
    if (_this.type==CylCam) {
      _this.otheta -= _this.othetaRate * dY;
      if (_this.otheta < _this.othetaMin) _this.otheta = _this.othetaMin;
      if (_this.otheta > _this.othetaMax) _this.otheta = _this.othetaMax;
      _this.phi += _this.phiRate * dX;
      if (_this.phi < _this.phiMin) _this.phi = _this.phiMin;
      if (_this.phi > _this.phiMax) _this.phi = _this.phiMax;
    }
  }

  function handleMMB() {
    if (_this.type==FreeCam) {
      // Not obvious:
      // default plane (theta=phi=0) is Y up, Z right, so put displacement
      // vector in that plane (larger for larger r), rotate around Z to adjust
      // for theta, then rotate around Y to adjust for phi
      var displacement = new THREE.Vector3(
        -dY*_this.yPanRate*_this.r,
        -dX*_this.xPanRate*_this.r,
        0
      );
      displacement.applyAxisAngle(new THREE.Vector3(0,1,0), _this.theta);
      displacement.applyAxisAngle(new THREE.Vector3(0,0,1), _this.phi);
      // minus is necessary; I think it's because we're in a left-handed coord system
      //displacement.x *= -1;
      _this.origin.add(displacement);
    }
    if (_this.type==CylCam) {
      _this.z += dY*_this.zRate*_this.r;
      if (_this.z < _this.zMin) _this.z = _this.zMin;
      if (_this.z > _this.zMax) _this.z = _this.zMax;
    }
  }

  function handleRMB() {
    // MMB was initially intended for panning, so just so that
    handleMMB();
  }

  function handleWheel(d) {
    if (_this.type==FreeCam) {
      _this.r += _this.r * ((d>0)?_this.rRate:(-1*_this.rRate));
      if (_this.r<_this.rMin) _this.r = _this.rMin;
      if (_this.r>_this.rMax) _this.r = _this.rMax;
    }
    if (_this.type==CylCam) {
      _this.r += _this.r * ((d>0)?_this.rRate:(-1*_this.rRate));
      if (_this.r<_this.rMin) _this.r = _this.rMin;
      if (_this.r>_this.rMax) _this.r = _this.rMax;
    }
  }
}

Controls.prototype.enable = function() {
  this.enabled = true;
}

Controls.prototype.disable = function() {
  this.enabled = false;
}

Controls.prototype.setDefaults = function(type) {
  // init to default values that work well
  if (type == FreeCam) {
    this.r = 5;
    this.theta = Math.PI/2;
    this.phi = 0;
    this.rRate = 0.1;

    this.thetaRate = -3;
    this.phiRate = 3;
    this.xPanRate = 0.5;
    this.yPanRate = 0.5;

    this.rMin = this.epsilon;
    this.rMax = Infinity;
    this.thetaMin = this.epsilon;
    this.thetaMax = Math.PI-this.epsilon;

    this.origin = new THREE.Vector3(0,0,0);
  }
  else if (type == CylCam) {
    // cylindrical coordinates of camera
    this.r = 15;
    this.phi = 0;
    this.z = 0;
    // spherical coordinates of target around camera
    this.tr = 1;
    this.ttheta = Math.PI/2;
    this.tphi = 0;

    this.rRate = 0.1;
    this.phiRate = 5;
    this.zRate = 1.5;
    this.tthetaRate = -1;
    this.tphiRate = -0.5;

    this.rMin = this.epsilon;
    this.rMax = Infinity;
    this.phiMin = -Infinity;
    this.phiMax = Infinity;
    this.zMin = -Infinity;
    this.zMax = Infinity;
    this.tthetaMin = this.epsilon;
    this.tthetaMax = Math.PI-this.epsilon;
    this.target = new THREE.Vector3(0,0,0);
  }
  else {
    console.log("ERROR: Unknown camera type: ", type);
  }
}

Controls.prototype.update = function(params) {
  // update can be used to set the params
  if (params) {
    for (var key in params) {
      this[key] = params[key];
    }
  }

  var camPos = [0, 0, 0];

  if (this.type==FreeCam) {
    camPos[0] = this.r * Math.cos(this.phi) * Math.sin(this.theta) + this.origin.x;
    camPos[1] = this.r * Math.sin(this.phi) * Math.sin(this.theta) + this.origin.y;
    camPos[2] = this.r * Math.cos(this.theta) + this.origin.z;
    this.camera.position.fromArray(camPos);
    this.camera.lookAt(this.origin);
  }
  if (this.type==CylCam) {
    camPos[0] = this.r * Math.cos(this.phi);
    camPos[2] = this.r * Math.sin(this.phi);
    camPos[1] = this.z;
    this.camera.position.fromArray(camPos);
    this.origin.x = this.tr * Math.cos(this.tphi) * Math.sin(this.ttheta);
    this.origin.z = this.tr * Math.sin(this.tphi) * Math.sin(this.ttheta);
    this.origin.y = this.tr * Math.cos(this.ttheta);
    this.target.applyAxisAngle(new THREE.Vector3(0,1,0),-this.phi);
    this.target.add(camera.position);
    camera.lookAt(this.target);
  }

  for (var i=0; i<this.objects.length; i++) {
    this.objects[i].position.fromArray(camPos);
  }
}

// adds more objects whose position will coincide with the camera's;
// e.g., for making a light that follows the camera
Controls.prototype.addObject = function(object) {
  this.objects.push(object);
}
