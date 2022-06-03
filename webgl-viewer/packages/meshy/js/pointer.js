// pointer.js
//
// dependencies:
//  three.js
//  marker.js
//
// description:
//  enables clicking/tapping an object
//
// classes:
//  Pointer
//  constructor arguments:
//   - camera: THREE.Camera, used to cast rays
//   - domElement: DOM element with which to interact - usually renderer.domElement
//   - scene: THREE.Scene necessary to add cursors
//
// example:
//  var pointer = new Pointer(camera, domElement, scene);
//  pointer.addObject(obj); // object for raycasting
//
//  /* optionally set cursor */
//  pointer.setCursorCircle(); // follows the surface
//  /* or */
//  pointer.setCursorPointer(); // explicitly shows the surface normal
//
//  pointer.addCallback(callback); // callback after a click
//  pointer.activate(); // make interactive
//
//  /* call this in the render loop to scale the cursor in proportion to its
//  distance from the camera */
//  pointer.updateCursor();
//
//  /* do stuff with the pointer here */
//
//  pointer.deactivate(); // make noninteractive
//
//  /* when done, destroy */
//  pointer.dispose();

// Anton Bovin, 2018



var Pointer = (function() {

  function Pointer(camera, domElement, scene) {
    if (!camera) console.error("Pointer requires a THREE.Camera.");
    if (!domElement) console.error("Pointer requires a DOM element.");
    if (!scene) console.error("Pointer requires a THREE.Scene.");

    // these are required for raycasting
    this.camera = camera;
    this.domElement = domElement;
    // for displaying the cursor
    this.scene = scene;

    this.objects = [];
    this.active = false;

    this.raycaster = new THREE.Raycaster();

    // contains functions invoked on mouse up
    this.callbacks = {};

    // create the cursor
    this.cursor = null;

    this.cursorColor = 0xcccccc;
    this.cursorColorDown = 0x2adeff;

    // mouse/touch interaction

    var _this = this;

    // pointer object; not null when mouse is down or screen is tapped
    this.pressedPointer = null;

    // allowance in pixels between the mousedown and mouseup events - determines
    // whether a click counts or not
    this.clickAllowance = 5;

    // intersection object returned by raycasting if the cursor currently
    // intersects an object, else null
    this.intersection = null;

    domElement.addEventListener('mousemove', pointerMove, false);
    domElement.addEventListener('mousedown', pointerDown, false);
    domElement.addEventListener('touchstart', pointerDown, false);
    domElement.addEventListener('mouseup', pointerUp, false);
    domElement.addEventListener('touchend', pointerUp, false);
    domElement.addEventListener('touchcancel', pointerUp, false);
    domElement.addEventListener('touchleave', pointerUp, false);

    this.dispose = function() {
      this.deactivate();

      if (this.cursor) {
        this.cursor.removeFromScene();
        this.cursor = null;
      }

      domElement.removeEventListener('mousemove', pointerMove);
      domElement.removeEventListener('mousedown', pointerDown);
      domElement.removeEventListener('touchstart', pointerDown);
      domElement.removeEventListener('mouseup', pointerUp);
      domElement.removeEventListener('touchend', pointerUp);
      domElement.removeEventListener('touchcancel', pointerUp);
      domElement.removeEventListener('touchleave', pointerUp);
    };

    // collect normalized screen coordinates and keys/button pressed
    function getPointer(event) {
      var r = domElement.getBoundingClientRect();

      var ptr = event.changedTouches ? event.changedTouches[0] : event;

      var cx = ptr.clientX - r.left;
      var cy = ptr.clientY - r.top;
      var x = (cx / r.width) * 2 - 1;
      var y = -((cy / r.height) * 2 - 1);

      return {
        pixelCoords: new THREE.Vector2(cx, cy),
        coords: new THREE.Vector2(x, y),
        ctrlKey: event.ctrlKey,
        shiftKey: event.shiftKey,
        button: event.button
      };
    }

    function pointerMove(event) {
      if (!_this.active) return;

      _this.pointerMove(getPointer(event));
    }

    function pointerDown(event) {
      if (!_this.active) return;

      _this.pointerDown(getPointer(event));
    }

    function pointerUp(event) {
      if (!_this.active) return;

      event.preventDefault();

      _this.pointerUp(getPointer(event));
    }
  }

  Object.assign(Pointer.prototype, {

    addObject: function(object) {
      this.objects.push(object);
      return this;
    },

    removeObject: function(object) {
      var idx = this.objects.indexOf(object);

      if (idx > -1) this.objects.splice(idx);

      return this;
    },

    removeObjects: function() {
      this.objects.length = 0;
      return this;
    },

    activate: function() {
      // if cursor is not set, default to circle
      if (this.cursor === null) {
        this.setCursorCircle();
      }

      this.cursor.addToScene(this.scene);
      this.active = true;

      return this;
    },

    deactivate: function() {
      // make inactive and invisible
      this.active = false;

      // deactivate cursor, if any
      if (this.cursor) this.cursor.deactivate();

      return this;
    },

    // set the cursor to a circle marker
    setCursorCircle: function() {
      if (this.cursor) this.cursor.removeFromScene();

      this.cursor = new Markers.CircleMarker().setColor(this.cursorColor);

      return this;
    },

    // set the cursor to the pointer marker
    setCursorPointer: function() {
      if (this.cursor) this.cursor.removeFromScene();

      this.cursor = new Markers.PointerMarker().setColor(this.cursorColor);

      return this;
    },

    // unset the cursor
    setCursorNull: function() {
      if (this.cursor) this.cursor.removeFromScene();

      this.cursor = null;

      return this;
    },

    // add a callback to call when the object is clicked
    addCallback: function(key, callback) {
      this.callbacks[key] = callback;

      return true;
    },

    // remove a callback at the given key, return true if removed, else false
    removeCallback: function(key) {
      if (this.callbacks.hasOwnProperty(key)) {
        delete this.callbacks[key];
        return true;
      }

      return false;
    },

    // calculate three.js intersection object from the pointer position
    getPointerIntersection: function(pointer) {
      this.raycaster.setFromCamera(pointer.coords, this.camera);

      var intersects = this.raycaster.intersectObjects(this.objects, false);

      if (intersects.length > 0) return intersects[0];
      else return null;
    },

    pointerMove: function(pointer) {
      var intersection = this.getPointerIntersection(pointer);
      var cursor = this.cursor;

      // if intersecting object, position the cursor
      if (intersection) {
        // get the normal in world space
        var rotation = new THREE.Matrix3().getNormalMatrix(intersection.object.matrixWorld);
        var normal = intersection.face.normal.clone().applyMatrix3(rotation);
        var point = intersection.point;

        cursor.setPosition(point);
        cursor.setNormal(normal);

        if (!cursor.active) cursor.activate();

        this.updateCursor();
      }
      else {
        cursor.deactivate();
      }
    },

    pointerDown: function(pointer) {
      // do nothing if pressing a button but the button is not LMB
      if (pointer.button !== undefined && pointer.button !== 0) return;

      this.pressedPointer = pointer;
      if (this.cursor) this.cursor.setColor(this.cursorColorDown);
    },

    pointerUp: function(pointer) {
      if (!this.pressedPointer) return;

      var dist = pointer.pixelCoords.distanceTo(this.pressedPointer.pixelCoords);

      if (dist < this.clickAllowance) {
        var intersection = this.getPointerIntersection(pointer);

        if (intersection) {
          for (var key in this.callbacks) {
            this.callbacks[key](intersection);
          }
        }
      }

      this.pressedPointer = null;
      if (this.cursor) this.cursor.setColor(this.cursorColor);
    },

    updateCursor: function() {
      var cursor = this.cursor;

      if (!this.active || !cursor.active) return;

      var dist = cursor.getPosition().distanceTo(this.camera.position);

      cursor.setScale(dist * 0.005);
    }

  });

  return Pointer;

})();
