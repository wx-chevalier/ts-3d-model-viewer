// markers.js
//
// dependencies:
//  three.js
//
// description:
//  visual element to mark stuff on the screen
//
// classes:
//  Marker (base class, rest are derived)
//  constructor arguments:
//   - params
//  params:
//   - material: optional material to use
//   - color: optional material color, unless material is set
//
//  SphereMarker
//  params:
//   - radius: radius for the sphere
//   - widthSegments: subdivisions along width
//   - heightSegments: subdivisions along height
//  PlaneMarker
//  params:
//   - axis: "x", "y", or "z"
//  CircleMarker
//   - segments: number of segments in the circle
//  LineMarker
//  ContourMarker
//  PointerMarker
//
// example:
//  var marker = Markers.create(Markers.Types.sphere, params);
//
//  see the individual marker constructors for typical usage functions;
//  functions in the Marker prototype is shared between all derived classes



var Markers = (function() {

  var Types = {
    none: "none",
    sphere: "sphere",
    plane: "plane",
    circle: "circle",
    line: "line",
    contour: "contour",
    pointer: "pointer"
  };

  // abstract Marker class

  function Marker(params) {
    params = params || {};

    this.active = false;
    this.object = null;
    this.scene = null;
    this.objectName = params.name || "marker";

    this.type = Types.none;
  }

  // abstract Marker class prototype

  Object.assign(Marker.prototype, {
    // create the underlying THREE object and set its name/visibility
    createObject: function(constr, geo, mat){
      this.object = new constr(geo, mat);

      this.object.name = this.objectName;
      this.object.visible = this.active;

      return this;
    },

    setPosition: function(position) {
      if (this.object) this.object.position.copy(position);

      return this;
    },

    getPosition: function() {
      return this.object ? this.object.position : null;
    },

    translate: function(delta) {
      this.object.position.add(delta);

      return this;
    },

    setScale: function(scale) {
      if (this.object) {
        if (scale.isVector3) this.object.scale.copy(scale);
        else this.object.scale.setScalar(scale);
      }

      return this;
    },

    // scale the object with respect to a world-space point (instead of from
    // object-space origin), which requires updating position as well
    scaleFromPoint: function() {
      var vfactor = new THREE.Vector3();

      return function(factor, point) {
        if (factor.isVector3) vfactor.copy(factor);
        else vfactor.setScalar(factor);

        // scale object position: shift position to origin, multiply by factor,
        // then shift back
        this.object.position.sub(point).multiply(vfactor).add(point);

        // multiply object scale
        this.object.scale.multiply(vfactor);

        return this;
      }
    }(),

    setColor: function(color) {
      if (this.object) this.object.material.color.set(color);

      return this;
    },

    addToScene: function(scene) {
      if (this.object) {
        scene.add(this.object);
        this.scene = scene;
      }

      return this;
    },

    removeFromScene: function() {
      if (!this.object || !this.scene) return;

      this.scene.remove(this.object);
    },

    activate: function() {
      this.active = true;

      if (this.object) this.object.visible = true;

      return this;
    },

    deactivate: function() {
      this.active = false;

      if (this.object) this.object.visible = false;

      return this;
    }
  });



  // object to export

  var Markers = {
    Types: Types
  };



  // derived Marker types



  // marker representing a sphere

  Markers.SphereMarker = function(params) {
    params = params || {};

    Marker.call(this, params);

    var radius = params.radius || 1;
    var widthSegments = params.widthSegments || 16;
    var heightSegments = params.heightSegments || 8;

    var geo = new THREE.SphereBufferGeometry(radius, widthSegments, heightSegments);
    var mat = params.material ? params.material.clone() : new THREE.MeshStandardMaterial({
      color: params.hasOwnProperty("color") ? params.color : 0xffffff,
    });

    this.createObject(THREE.Mesh, geo, mat);

    this.type = Types.sphere;
  }

  Markers.SphereMarker.prototype = Object.create(Marker.prototype);
  Object.assign(Markers.SphereMarker.prototype, {
    constructor: Markers.SphereMarker,

    setRadius: function(radius) {
      return this.setScale(radius);
    }
  });



  // marker representing an axis-aligned plane

  Markers.PlaneMarker = function(params) {
    params = params || {};
    params.axis = params.axis || "z";

    Marker.call(this, params);

    var geo = new THREE.PlaneBufferGeometry(1, 1);

    // geometry points up z by default, so reorient if necessary
    if (params.axis === "x") geo.rotateY(Math.PI / 2);
    else if (params.axis === "y") geo.rotateX(Math.PI / 2);

    var mat = params.material ? params.material.clone() : new THREE.MeshStandardMaterial({
      color: params.hasOwnProperty("color") ? params.color : 0xffffff,
      transparent: true,
      opacity: 0.25,
      side: THREE.DoubleSide
    });

    this.createObject(THREE.Mesh, geo, mat);

    this.type = Types.plane;
  }

  Markers.PlaneMarker.prototype = Object.create(Marker.prototype);
  Object.assign(Markers.PlaneMarker.prototype, {
    constructor: Markers.PlaneMarker,

    setCenter: function(center) {
      this.object.position.copy(center);

      return this;
    },

    // set the axis-aligned plane to fill the bounding box
    // overflow factor directly multiplies size - e.g., 1.5 will extend the
    // plane by 0.25 of its size in every direction
    setFromBoundingBox: function() {
      var center = new THREE.Vector3();
      var size = new THREE.Vector3();

      return function(boundingBox, overflowFactor) {
        overflowFactor = overflowFactor || 1;

        var min = boundingBox.min;
        var max = boundingBox.max;

        center.copy(min).add(max).multiplyScalar(0.5);
        size.copy(max).sub(min).multiplyScalar(overflowFactor);
        if (size.x <= 0) size.x = 1;
        if (size.y <= 0) size.y = 1;
        if (size.z <= 0) size.z = 1;

        this.object.position.copy(center);
        this.object.scale.copy(size);
      }
    }()
  });



  // marker representing a circle

  Markers.CircleMarker = function(params) {
    params = params || {};

    Marker.call(this, params);

    var segments = params.segments || 64;
    var dt = 2 * Math.PI / segments;

    var geo = new THREE.BufferGeometry();

    var position = new Float32Array(segments * 2 * 3);
    var positionAttr = new THREE.BufferAttribute(position, 3);

    geo.addAttribute('position', positionAttr);

    for (var i = 0; i <= segments; i++) {
      var theta = i * dt;
      var thetanext = theta + dt;

      positionAttr.setXYZ(i * 2, Math.cos(theta), Math.sin(theta), 0);
      positionAttr.setXYZ(i * 2 + 1, Math.cos(thetanext), Math.sin(thetanext), 0);
    }

    var mat = params.material ? params.material.clone() : new THREE.LineBasicMaterial({
      color: params.hasOwnProperty("color") ? params.color : 0xffffff,
    });

    this.createObject(THREE.LineSegments, geo, mat);

    this.type = Types.circle;
  }

  Markers.CircleMarker.prototype = Object.create(Marker.prototype);
  Object.assign(Markers.CircleMarker.prototype, {
    constructor: Markers.CircleMarker,

    setCenter: function(center) {
      this.object.position.copy(center);

      return this;
    },

    setNormal: function() {
      var target = new THREE.Vector3();

      return function(normal) {
        target.copy(this.object.position).add(normal);

        this.object.lookAt(target);

        return this;
      }
    }(),

    setRadius: function(radius) {
      this.object.scale.setScalar(radius || 1);

      return this;
    },

    lookAt: function(target) {
      this.object.lookAt(target);

      return this;
    }
  });



  // marker representing a line

  Markers.LineMarker = function(params) {
    params = params || {};

    Marker.call(this, params);

    // use a normal geometry for ease of manipulation
    var geo = new THREE.Geometry();

    var vertices = geo.vertices;
    vertices.push(new THREE.Vector3());
    vertices.push(new THREE.Vector3());

    var mat = params.material ? params.material.clone() : new THREE.LineBasicMaterial({
      color: params.hasOwnProperty("color") ? params.color : 0xffffff,
    });

    this.createObject(THREE.LineSegments, geo, mat);

    this.type = Types.line;
  }

  Markers.LineMarker.prototype = Object.create(Marker.prototype);
  Object.assign(Markers.LineMarker.prototype, {
    constructor: Markers.LineMarker,

    setFromPointPair: function(a, b) {
      // when this marker is set from a set of segments (in world space), reset
      // the object position to 0 and rebuild geometry
      this.object.position.setScalar(0);
      this.object.scale.setScalar(1);

      var geo = this.object.geometry;
      var vertices = geo.vertices;

      vertices[0].copy(a);
      vertices[1].copy(b);

      geo.verticesNeedUpdate = true;

      return this;
    }
  });



  // marker representing a contour

  Markers.ContourMarker = function(params) {
    params = params || {};

    Marker.call(this, params);

    var geo = new THREE.Geometry();
    var mat = params.material ? params.material.clone() : new THREE.LineBasicMaterial({
      color: params.hasOwnProperty("color") ? params.color : 0xffffff,
    });

    this.createObject(THREE.LineSegments, geo, mat);

    this.type = Types.contour;
  }

  Markers.ContourMarker.prototype = Object.create(Marker.prototype);
  Object.assign(Markers.ContourMarker.prototype, {
    constructor: Markers.ContourMarker,

    setFromSegments: function(segments) {
      if (!segments) return;

      // when this marker is set from a set of segments (in world space), reset
      // the object position to 0 and rebuild geometry
      this.object.position.setScalar(0);
      this.object.scale.setScalar(1);

      var geo = new THREE.Geometry();
      var vertices = geo.vertices;

      for (var s = 0, l = segments.length; s < l; s++) {
        var segment = segments[s];

        vertices.push(segment.start);
        vertices.push(segment.end);
      }

      this.object.geometry = geo;

      return this;
    }
  });



  // marker representing a pointer

  Markers.PointerMarker = function(params) {
    params = params || {};

    Marker.call(this, params);

    var segments = params.segments || 32;

    var coneBufferGeo = new THREE.ConeBufferGeometry(1, 4.0, segments);
    coneBufferGeo.rotateX(Math.PI / 2);
    coneBufferGeo.translate(0, 0, 4.0);
    var sphereBufferGeo = new THREE.SphereBufferGeometry(1, segments, segments / 2);

    var geo = new THREE.Geometry();
    geo.merge(new THREE.Geometry().fromBufferGeometry(coneBufferGeo));
    geo.merge(new THREE.Geometry().fromBufferGeometry(sphereBufferGeo));

    var mat = params.material ? params.material.clone() : new THREE.MeshStandardMaterial({
      color: params.hasOwnProperty("color") ? params.color : 0xffffff,
      roughness: 0.0,
      metalness: 0.5
    });

    this.createObject(THREE.Mesh, geo, mat);

    this.type = Types.pointer;
  }

  Markers.PointerMarker.prototype = Object.create(Marker.prototype);
  Object.assign(Markers.PointerMarker.prototype, {
    constructor: Markers.PointerMarker,

    setCenter: function(center) {
      this.object.position.copy(center);

      return this;
    },

    setNormal: function() {
      var target = new THREE.Vector3();

      return function(normal) {
        target.copy(this.object.position).add(normal);

        this.object.lookAt(target);

        return this;
      }
    }(),

    lookAt: function(target) {
      this.object.lookAt(target);

      return this;
    }
  });



  // function that constructs a marker of the given type with the given params

  Markers.create = function(type, params) {
    var constr = null;

    if (type === Types.sphere) constr = Markers.SphereMarker
    else if (type === Types.plane) constr = Markers.PlaneMarker;
    else if (type === Types.circle) constr = Markers.CircleMarker;
    else if (type === Types.line) constr = Markers.LineMarker;
    else if (type === Types.contour) constr = Markers.ContourMarker;
    else if (type === Types.pointer) constr = Markers.PointerMarker;

    if (constr) {
      return new constr(params);
    }
    else {
      return null;
    }
  }




  return Markers;

})();
