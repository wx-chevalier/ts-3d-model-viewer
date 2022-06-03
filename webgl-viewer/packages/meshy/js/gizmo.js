var Gizmo = (function () {
  function makeHandleName(axis, type) {
    return axis + '_' + type;
  }

  // clamp a number to two boundary values
  function clamp(x, minVal, maxVal) {
    if (x < minVal) x = minVal;
    else if (x > maxVal) x = maxVal;
    return x;
  }
  // compute acos, but clamp the input
  function acos(a) {
    return Math.acos(clamp(a, -1, 1));
  }
  // compute asin, but clamp the input
  function asin(a) {
    return Math.asin(clamp(a, -1, 1));
  }

  function Gizmo(camera, domElement, params) {
    THREE.Object3D.call(this);

    this.camera = camera;
    this.up = camera.up.clone();
    this.domElement = domElement !== undefined ? domElement : document;

    this.visible = true;

    // if some/all params are not provided, set defaults
    this.params = params || {};
    this.setDefaultParams();

    // color and material setup

    var activeFactor = 3;
    var al = 0.2; // axis color light
    var ad = 0.05; // axis color dark
    var oc = 0.2; // orthogonal handle color

    this.colors = {
      x: {},
      y: {},
      z: {},
      o: {},
    };

    (this.colors.x.inactive = new THREE.Color(al, ad, ad)),
      (this.colors.x.active = this.colors.x.inactive
        .clone()
        .multiplyScalar(activeFactor));
    this.colors.x.disabled = new THREE.Color(ad, ad, ad);
    (this.colors.y.inactive = new THREE.Color(ad, al, ad)),
      (this.colors.y.active = this.colors.y.inactive
        .clone()
        .multiplyScalar(activeFactor));
    this.colors.y.disabled = new THREE.Color(ad, ad, ad);
    (this.colors.z.inactive = new THREE.Color(ad, ad, al)),
      (this.colors.z.active = this.colors.z.inactive
        .clone()
        .multiplyScalar(activeFactor));
    this.colors.z.disabled = new THREE.Color(ad, ad, ad);
    (this.colors.o.inactive = new THREE.Color(oc, oc, oc)),
      (this.colors.o.active = this.colors.o.inactive
        .clone()
        .multiplyScalar(activeFactor));
    this.colors.o.disabled = new THREE.Color(ad, ad, ad);

    this.opacityInactive = 0.75;
    this.opacityActive = 1.0;

    var baseMaterial = new THREE.MeshStandardMaterial({
      color: 0x000000,
      roughness: 1.0,
      metalness: 0.2,
      transparent: true,
      opacity: this.opacityInactive,
    });

    this.colliderMaterial = new THREE.MeshBasicMaterial({
      visible: false,
    });

    // clone base material and give it the appropriate color

    this.materials = {
      x: baseMaterial.clone(),
      y: baseMaterial.clone(),
      z: baseMaterial.clone(),
      o: baseMaterial.clone(),
    };
    this.materials.x.setValues({
      color: this.colors.x.inactive,
    });
    this.materials.y.setValues({
      color: this.colors.y.inactive,
    });
    this.materials.z.setValues({
      color: this.colors.z.inactive,
    });
    this.materials.o.setValues({
      color: this.colors.o.inactive,
    });

    // currently active handle and the point on which the mouse hit it
    this.activeHandle = null;
    this.activePoint = null;

    // interaction setup

    // used to determine mouse movement wrt the gizmo meshes
    this.raycaster = new THREE.Raycaster();

    // when dragging, gives the current transform type and axis
    this.transformType = Gizmo.HandleTypes.none;
    this.transformAxis = '';
    this.transformStart = null;
    this.transformStartCoords = null;

    // each group contains the handles of a particular type so that they can be
    // transformed together
    this.handleGroups = {};
    this.handleGroups[Gizmo.HandleTypes.translate] = new THREE.Group();
    this.handleGroups[Gizmo.HandleTypes.rotate] = new THREE.Group();
    this.handleGroups[Gizmo.HandleTypes.scale] = new THREE.Group();
    // special group for orthogonal handles because they don't need to be
    // transformed with the rest
    this.handleGroups.orthogonal = new THREE.Group();
    this.handleGroups.orthogonal.matrixAutoUpdate = false;

    this.add(this.handleGroups.translate);
    this.add(this.handleGroups.rotate);
    this.add(this.handleGroups.scale);
    this.add(this.handleGroups.orthogonal);

    this.handles = {};
    this.handles[Gizmo.HandleTypes.translate] = {};
    this.handles[Gizmo.HandleTypes.rotate] = {};
    this.handles[Gizmo.HandleTypes.scale] = {};
    this.colliders = [];

    this.makeHandles();

    var _this = this;

    this.domElement.addEventListener('mousemove', mousemove, false);
    this.domElement.addEventListener('mousedown', mousedown, false);
    this.domElement.addEventListener('mouseup', mouseup, false);

    // collect normalized screen coordinates and keys/button pressed
    function getPointer(event) {
      var r = domElement.getBoundingClientRect();

      var x = ((event.clientX - r.left) / r.width) * 2 - 1;
      var y = -(((event.clientY - r.top) / r.height) * 2 - 1);

      return {
        coords: new THREE.Vector2(x, y),
        ctrlKey: event.ctrlKey,
        shiftKey: event.shiftKey,
        button: event.button,
      };
    }

    function mousemove(event) {
      _this.mousemove(getPointer(event));
    }

    function mousedown(event) {
      _this.mousedown(getPointer(event));
    }

    function mouseup(event) {
      _this.mouseup(getPointer(event));
    }
  }

  Gizmo.HandleTypes = {
    none: 'none',
    translate: 'translate',
    rotate: 'rotate',
    scale: 'scale',
  };

  Gizmo.prototype = Object.create(THREE.Object3D.prototype);

  Object.assign(Gizmo.prototype, {
    constructor: Gizmo,

    setDefaultParams: function () {
      var params = this.params;

      setProp('scaleHandleRadius', 1.25);
      setProp('scaleHandleHeight', 2.5);
      setProp('scaleHandleRadialSegments', 32);
      setProp('scaleHandleOffset', 14);
      setProp('scaleOrthogonalHandleRadius', 3.0);
      setProp('scaleOrthogonalHandleWidthSegments', 32);
      setProp('scaleOrthogonalHandleHeightSegments', 16);

      setProp('rotateHandleOuterRadius', 16.55);
      setProp('rotateHandleWidth', 0.6);
      setProp('rotateHandleHeight', 0.6);
      setProp('rotateHandleRadialSegments', 64);

      setProp('rotateOrthogonalHandleOuterRadius', 18.15);

      setProp('translateHandleRadius', 1.25);
      setProp('translateHandleHeight', 6);
      setProp('translateHandleRadialSegments', 32);
      setProp('translateHandleOffset', 22.15);
      setProp('translateOrthogonalHandleWidth', 8);
      setProp('translateOrthogonalHandleHeight', 4);
      setProp('translateOrthogonalHandleThickness', 2);
      setProp('translateOrthogonalHandleInset', 2);
      setProp('translateOrthogonalHandleOffset', 27);

      setProp('scaleFactor', 0.003);
      setProp('colliderInflation', 0.5);

      // if params object doesn't contain a property, set it
      function setProp(name, val) {
        if (!params.hasOwnProperty(name)) params[name] = val;
      }
    },

    makeHandleAndCollider: function (type, axis, material) {
      var handle = this.makeHandle(type, axis, material);
      var collider;

      if (this.params.colliderInflation) {
        collider = this.makeCollider(type, axis);
      } else {
        collider = handle;
        this.colliders.push(collider);
      }

      this.handles[type][axis] = handle;
      this.colliders.push(collider);

      // link handles and corresponding colliders
      handle.userData.collider = collider;
      collider.userData.handle = handle;
    },

    makeHandle: function (type, axis, material) {
      return this.makeMesh(type, axis, false, material);
    },

    makeCollider: function (type, axis) {
      return this.makeMesh(type, axis, true);
    },

    makeMesh: function (type, axis, collider, material) {
      material = collider ? this.colliderMaterial : material.clone();

      var geo;
      var d = collider ? this.params.colliderInflation : 0;
      var d2 = d * 2;

      if (type === Gizmo.HandleTypes.translate) {
        if (axis === 'o') {
          var w = this.params.translateOrthogonalHandleWidth + d2;
          var h = this.params.translateOrthogonalHandleHeight + d2;
          var t = this.params.translateOrthogonalHandleThickness;
          var i = this.params.translateOrthogonalHandleInset + d;
          var o = this.params.translateOrthogonalHandleOffset - d;

          var bgeo0 = new ChevronBufferGeometry(w, h, t, i);
          bgeo0.translate(0, 0, o);
          bgeo0.rotateY(Math.PI / 4);

          var bgeo1 = new ChevronBufferGeometry(w, h, t, i);
          bgeo1.translate(0, 0, o);
          bgeo1.rotateY((Math.PI * 3) / 4);

          var bgeo2 = new ChevronBufferGeometry(w, h, t, i);
          bgeo2.translate(0, 0, o);
          bgeo2.rotateY((Math.PI * 5) / 4);

          var bgeo3 = new ChevronBufferGeometry(w, h, t, i);
          bgeo3.translate(0, 0, o);
          bgeo3.rotateY((Math.PI * 7) / 4);

          var geo0 = new THREE.Geometry().fromBufferGeometry(bgeo0);
          geo0.merge(new THREE.Geometry().fromBufferGeometry(bgeo1));
          geo0.merge(new THREE.Geometry().fromBufferGeometry(bgeo2));
          geo0.merge(new THREE.Geometry().fromBufferGeometry(bgeo3));

          geo = new THREE.BufferGeometry().fromGeometry(geo0);
        } else {
          geo = new THREE.ConeBufferGeometry(
            this.params.translateHandleRadius + d,
            this.params.translateHandleHeight + d,
            this.params.translateHandleRadialSegments,
          );
        }
      } else if (type === Gizmo.HandleTypes.rotate) {
        var outerRadius;
        if (axis === 'o') {
          outerRadius = this.params.rotateOrthogonalHandleOuterRadius;
        } else {
          outerRadius = this.params.rotateHandleOuterRadius;
        }

        geo = new PipeBufferGeometry(
          outerRadius + d,
          outerRadius - this.params.rotateHandleWidth - d,
          this.params.rotateHandleHeight + d2,
          this.params.rotateHandleRadialSegments,
        );
      } else if (type === Gizmo.HandleTypes.scale) {
        if (axis === 'o') {
          geo = new THREE.SphereBufferGeometry(
            this.params.scaleOrthogonalHandleRadius + d,
            this.params.scaleOrthogonalHandleWidthSegments,
            this.params.scaleOrthogonalHandleHeightSegments,
          );
        } else {
          geo = new THREE.CylinderBufferGeometry(
            this.params.scaleHandleRadius + d,
            this.params.scaleHandleRadius + d,
            this.params.scaleHandleHeight + d2,
            this.params.scaleHandleRadialSegments,
          );
        }
      } else return;

      var mesh = new THREE.Mesh(geo, material);

      // if axis-oriented handles, axis-shift them if necessary
      if (axis !== 'o') {
        if (type === Gizmo.HandleTypes.translate) {
          mesh.position[axis] = this.params.translateHandleOffset + d;
        } else if (type === Gizmo.HandleTypes.scale) {
          mesh.position[axis] = this.params.scaleHandleOffset;
        }
      }

      // point the mesh in the right direction
      if (axis === 'x') mesh.rotation.z = -Math.PI / 2;
      else if (axis === 'z') mesh.rotation.x = Math.PI / 2;

      // add the mesh to the appropriate handle group
      if (axis === 'o') this.handleGroups.orthogonal.add(mesh);
      else this.handleGroups[type].add(mesh);

      // store references from handles to colliders and vice versa
      if (collider) {
        mesh.userData = {
          handle: null,
        };
      } else {
        mesh.userData = {
          type: type,
          axis: axis,
          collider: null,
          enabled: true,
        };
      }

      mesh.name = makeHandleName(axis, type);

      return mesh;
    },

    makeHandles: function () {
      // translate handles

      // x translation
      this.makeHandleAndCollider(
        Gizmo.HandleTypes.translate,
        'x',
        this.materials.x,
      );
      // y translation
      this.makeHandleAndCollider(
        Gizmo.HandleTypes.translate,
        'y',
        this.materials.y,
      );
      // z translation
      this.makeHandleAndCollider(
        Gizmo.HandleTypes.translate,
        'z',
        this.materials.z,
      );
      // o translation
      this.makeHandleAndCollider(
        Gizmo.HandleTypes.translate,
        'o',
        this.materials.o,
      );

      // rotate handles

      // x rotation
      this.makeHandleAndCollider(
        Gizmo.HandleTypes.rotate,
        'x',
        this.materials.x,
      );
      // y rotation
      this.makeHandleAndCollider(
        Gizmo.HandleTypes.rotate,
        'y',
        this.materials.y,
      );
      // z rotation
      this.makeHandleAndCollider(
        Gizmo.HandleTypes.rotate,
        'z',
        this.materials.z,
      );
      // o rotation
      this.makeHandleAndCollider(
        Gizmo.HandleTypes.rotate,
        'o',
        this.materials.o,
      );

      // scale handles

      // x scale
      this.makeHandleAndCollider(
        Gizmo.HandleTypes.scale,
        'x',
        this.materials.x,
      );
      // y scale
      this.makeHandleAndCollider(
        Gizmo.HandleTypes.scale,
        'y',
        this.materials.y,
      );
      // z scale
      this.makeHandleAndCollider(
        Gizmo.HandleTypes.scale,
        'z',
        this.materials.z,
      );
      // o scale
      this.makeHandleAndCollider(
        Gizmo.HandleTypes.scale,
        'o',
        this.materials.o,
      );
    },

    update: function (mesh) {
      if (mesh !== undefined) {
        // if new position given, set to this position
        this.position.copy(mesh.position);

        // if new rotation given, set rotation of cardinal scale handles to this
        // rotation
        this.handleGroups[Gizmo.HandleTypes.scale].rotation.copy(mesh.rotation);
      }

      // camera position in object space
      var camPosLocal = this.camera.position.clone().sub(this.position);

      // get the camera's basis vectors
      var xc = new THREE.Vector3();
      var yc = new THREE.Vector3();
      var zc = new THREE.Vector3();
      this.camera.matrix.extractBasis(xc, yc, zc);

      // orthogonal handle group initially points in y direction and lies in xy
      // plane; orient it so that y now points at the camera and z points up in
      // camera space
      var xp = camPosLocal.clone().cross(yc).normalize();
      var yp = camPosLocal.normalize();
      var zp = xp.clone().cross(yp);
      this.handleGroups.orthogonal.matrix.makeBasis(xp, yp, zp);

      // scale gizmo proportionally to its distance to the camera
      var distanceToCamera = this.position.distanceTo(this.camera.position);
      this.scale.setScalar(this.params.scaleFactor * distanceToCamera);
    },

    mousemove: function (pointer) {
      if (!this.visible) {
        this.transformFinish();

        return;
      }

      this.raycaster.setFromCamera(pointer.coords, this.camera);

      // if currently active transform
      if (
        this.transformType !== Gizmo.HandleTypes.none &&
        this.transformAxis !== ''
      ) {
        this.transformmove(pointer);
      }
      // no currently active transform, so handle handle mouseover
      else {
        var intersections = this.raycaster.intersectObjects(
          this.colliders,
          true,
        );

        // intersecting some collider - the intersections are sorted by
        // distance, but the first one or more may be disabled, so find the
        // closest enabled collider
        if (intersections.length > 0) {
          var collider = null;

          for (var i = 0; i < intersections.length; i++) {
            var intersection = intersections[i];
            var object = intersection.object;
            var enabled = object.userData.handle.userData.enabled;

            if (enabled) {
              collider = object;
              this.activePoint = intersection.point;

              break;
            }
          }

          if (collider !== null) {
            var handle = collider.userData.handle;

            if (this.activeHandle !== handle) this.deactivateHandle();
            this.activateHandle(handle);
          } else this.deactivateHandle();
        } else {
          this.deactivateHandle();
        }
      }
    },

    mousedown: function (pointer) {
      if (pointer.button !== 0) return;

      var handle = this.activeHandle;

      if (handle !== null) {
        if (this.params.onTransform) this.params.onTransform();

        var handleData = handle.userData;
        var type = handleData.type;
        var axis = handleData.axis;

        this.transformType = type;
        this.transformAxis = axis;

        if (type === Gizmo.HandleTypes.translate) {
          this.transformStart = this.params.getPosition().clone();
        } else if (type === Gizmo.HandleTypes.rotate) {
          this.transformStart = this.params.getRotation().clone();
        } else if (type === Gizmo.HandleTypes.scale) {
          this.transformStart = this.params.getScale().clone();
        }

        this.transformStartCoords = pointer.coords;
      }
    },

    mouseup: function (pointer) {
      if (pointer.button !== 0) return;

      this.transformFinish();
    },

    // with a transform currently active, handles the effect of a mouse move
    transformmove: function (pointer) {
      if (this.activePoint === null) return;

      var type = this.transformType;
      var axis = this.transformAxis;

      // rotation transforms rely on the position of the cursor in a particular
      // plane, as do all orthogonal transforms
      var planeTransform = type === Gizmo.HandleTypes.rotate || axis === 'o';

      // if plane transform, get the projected position of the cursor in the
      // transform plane
      if (planeTransform) {
        // normal to the plane transform:
        // if translating but one axis is disabled, set normal to that axis;
        // else, just use the default normal
        var normal = new THREE.Vector3();
        if (type === Gizmo.HandleTypes.translate) {
          if (!this.handleEnabled(type, 'x')) normal.set(1, 0, 0);
          else if (!this.handleEnabled(type, 'y')) normal.set(0, 1, 0);
          else if (!this.handleEnabled(type, 'z')) normal.set(0, 0, 1);
          else normal.copy(this.transformDirection());
        } else normal.copy(this.transformDirection());

        var plane = new THREE.Plane().setFromNormalAndCoplanarPoint(
          normal,
          this.activePoint,
        );
        var cursor = new THREE.Vector3();
        this.raycaster.ray.intersectPlane(plane, cursor);

        if (cursor) {
          var v0 = this.activePoint.clone().sub(this.position).normalize();
          var v1 = cursor.clone().sub(this.position).normalize();

          // handle rotation, normal or orthogonal
          if (type === Gizmo.HandleTypes.rotate) {
            // calculate rotation angle
            var angle = Math.acos(v0.dot(v1));
            // CCW rotations are positive, CW rotations are negative
            angle *= Math.sign(v1.clone().cross(normal).dot(v0));

            // if ctrl is pressed, round the angle to 15 degrees
            var c = 180.0 / Math.PI;
            if (pointer.ctrlKey)
              angle = (Math.round((angle * c) / 15) * 15) / c;

            // get initial quaternion, rotate it by the angle, set euler from
            // the quaternion
            var euler = this.transformStart.clone();
            var q = new THREE.Quaternion().setFromEuler(euler);
            var dq = new THREE.Quaternion().setFromAxisAngle(normal, angle);
            euler.setFromQuaternion(q.premultiply(dq));

            this.params.setRotation(euler);
            this.params.onRotate();
          } else if (type === Gizmo.HandleTypes.scale) {
            // difference in vertical screen-space coords
            var coordDelta = pointer.coords.y - this.transformStartCoords.y;

            // factor of 4.0 empirically determined
            var factor = Math.exp(4.0 * coordDelta);

            // if ctrl key, round factor to powers of 2
            if (pointer.ctrlKey) factor = roundToPowerOf2(factor);

            var scale = this.transformStart.clone().multiplyScalar(factor);
            this.params.setScale(scale);
            this.params.onScale();
          } else if (type === Gizmo.HandleTypes.translate) {
            var shift = cursor.clone().sub(this.activePoint);

            // if ctrl key, snap to integer values
            if (pointer.ctrlKey) shift.round();

            this.params.setPosition(this.transformStart.clone().add(shift));
            this.params.onTranslate();
          }
        }
      }
      // else, handle a shift along an axis
      else {
        // transform line parameters - point and direction
        var p0 = this.activePoint,
          d0 = this.transformDirection();

        // ray from the camera params
        var ray = this.raycaster.ray;
        var p1 = ray.origin,
          d1 = ray.direction;

        // calculate the point on the transform line that is closest to the view
        // ray:
        // v0 = p0 + t0d0, v1 = p1 + t1d1
        // t0 = ((d0 - d1 (d0 dot d1)) dot (p1 - p0)) / (1 - (d0 dot d1)^2)
        // t1 = ((d0 (d0 dot d1) - d1) dot (p1 - p0)) / (1 - (d0 dot d1)^2)
        var d0d1 = d0.dot(d1);
        var dn = 1 - d0d1 * d0d1;

        var t0 =
          d0.clone().addScaledVector(d1, -d0d1).dot(p1.clone().sub(p0)) / dn;
        var v0 = p0.clone().addScaledVector(d0, t0);

        var shift = v0.clone().sub(p0);

        if (type === Gizmo.HandleTypes.translate) {
          // if ctrl key, snap to integer values
          if (pointer.ctrlKey) shift.round();

          this.params.setPosition(this.transformStart.clone().add(shift));
          this.params.onTranslate();
        } else if (type === Gizmo.HandleTypes.scale) {
          var pos = this.params.getPosition();
          var scale = this.transformStart.clone();
          var factor = pos.distanceTo(v0) / pos.distanceTo(p0);

          if (factor <= 0) factor = 1;

          // if ctrl key, round factor to powers of 2
          if (pointer.ctrlKey) factor = roundToPowerOf2(factor);

          scale[axis] *= factor;
          this.params.setScale(scale);
          this.params.onScale();
        }
      }

      function roundToPowerOf2(x) {
        return Math.pow(2, Math.round(Math.log2(x)));
      }

      function roundVectorToPowerOf2(v) {
        v.x = Math.pow(2, Math.round(Math.log2(v.x)));
        v.y = Math.pow(2, Math.round(Math.log2(v.y)));
        v.z = Math.pow(2, Math.round(Math.log2(v.z)));
        return v;
      }
    },

    transformFinish: function () {
      if (this.transformType === Gizmo.HandleTypes.translate) {
        if (this.params.onFinishTranslate) this.params.onFinishTranslate();
      } else if (this.transformType === Gizmo.HandleTypes.scale) {
        if (this.params.onFinishScale) this.params.onFinishScale();
      } else if (this.transformType === Gizmo.HandleTypes.rotate) {
        if (this.params.onFinishRotate) this.params.onFinishRotate();
      } else return;

      this.transformType = Gizmo.HandleTypes.none;
      this.transformAxis = '';
      this.transformStart = null;
      this.transformStartCoords = null;

      if (this.params.onFinishTransform) this.params.onFinishTransform();
    },

    transformDirection: function () {
      var axis = this.transformAxis;
      var v = new THREE.Vector3();

      if (axis === 'o')
        v.subVectors(this.position, this.camera.position).normalize();
      else {
        if (axis === 'x') v.set(1, 0, 0);
        else if (axis === 'y') v.set(0, 1, 0);
        else if (axis === 'z') v.set(0, 0, 1);
        else return null;

        if (this.transformType === Gizmo.HandleTypes.scale) {
          var matrix = this.handleGroups[this.transformType].matrix;
          v.applyMatrix4(matrix);
        }
      }

      return v;
    },

    activateHandle: function (handle) {
      var axis = handle.userData.axis;
      handle.material.color = this.colors[axis].active;
      handle.material.opacity = this.opacityActive;

      this.activeHandle = handle;
    },

    deactivateHandle: function () {
      var handle = this.activeHandle;
      if (handle === null) return;

      var axis = handle.userData.axis;

      handle.material.color = this.colors[axis].inactive;
      handle.material.opacity = this.opacityInactive;

      this.activeHandle = null;
      this.activePoint = null;
    },

    disableHandle: function (type, axis) {
      var handle = this.handles[type][axis];

      handle.userData.enabled = false;
      handle.material.color = this.colors[axis].disabled;
    },

    enableHandle: function (type, axis) {
      var handle = this.handles[type][axis];

      handle.userData.enabled = true;
      handle.material.color = this.colors[axis].inactive;
    },

    handleEnabled: function (type, axis) {
      return this.handles[type][axis].userData.enabled;
    },
  });

  return Gizmo;
})();
