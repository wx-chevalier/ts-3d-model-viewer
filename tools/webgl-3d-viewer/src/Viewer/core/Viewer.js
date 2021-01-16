import max from "lodash/math/max";
import merge from "lodash/object/merge";
import rest from "lodash/array/rest";
import each from "lodash/collection/each";

import ProgressBar from "./../utils/ProgressBar";
import ModelLoader from "./../loaders/ModelLoaderRegistry";
import ModelControls from "./../controls/ModelControls";
import DragDropControls from "./../controls/DragDropControls";

export default class Viewer {
  constructor(domElm, config = {}) {
    // Setup container
    this.container = Viewer._setupContainer(domElm);

    this.scene = null;
    this.camera = null;
    this.loader = null;
    this.model = null;
    this.controls = null;
    this.plane = null;
    this.axisHelper = null;
    this.sphere = null;
    this.boundingBox = null;
    this.modelWireframe = null;
    this.stats = null;
    this.group = null;
    this.config = {};
    this.progressBar = null;
    this.loaderPath = null;
    this.loaderContent = null;

    // Default viewer configuration
    this.defaultConfig = {
      wireframe: false,
      plane: false,
      boundingBox: false,
      sphere: false,
      axis: false,
      stats: null,
      autoRotate: false,
      zoom: false,
      dragDrop: false,
      material: true,
      startupAnimation: false,
      fudge: 1.0,
      progressBar: {},
    };

    // Prepare config
    this.config = merge(this.config, this.defaultConfig, config);

    // Prepare stats
    if (this.config.stats) {
      this.stats = this.config.stats;
    }

    // Init progress
    this.progressBar = new ProgressBar(this.container, this.config.progressBar);
    this.progressBar.show();

    // Loading state
    this.loaded = false;

    // Listener
    this._resizeListener = null;
  }

  load(path, cb) {
    if (this.loaderPath === path) {
      return false;
    }

    this._unload();

    // Setup listener
    this._setupListener();

    if (!this.progressBar) {
      this.progressBar = new ProgressBar(this.container);
    }

    let callb = cb || function () {};
    let loader = new ModelLoader();
    let onLoadCB = (geometry) => {
      this.loaderPath = path;
      this._initializeGeometry(geometry, callb);

      if (geometry.registry === true) {
        this.progressBar.hide();
      }
    };

    let onProgressCB = (item) => {
      if (item) {
        let progress = Math.round((100 * item.loaded) / item.total);

        if (progress < 0) {
          progress = 0;
        } else if (progress > 100) {
          progress = 100;
        }

        if (this.progressBar) {
          this.progressBar.progress = progress;
        }

        if (progress === 100) {
          setTimeout(() => {
            if (this.progressBar) {
              this.progressBar.hide();
            }
          }, 500);
        }
      }
    };

    let onErrorCB = () => {
      if (this.progressBar) {
        this.progressBar.hide();
      }
    };

    if (this.progressBar) {
      this.progressBar.show();
    }

    this.loader = loader.load(path, onLoadCB, onProgressCB, onErrorCB);
  }

  parse(fileContent, cb) {
    if (this.loaded) {
      this._unload();
      // Setup listener
      this._setupListener();
    }

    this.loaderContent = fileContent;

    let callb = cb || function () {};
    let loader = new ModelLoader();
    let geometry = loader.parse(fileContent);

    if (this.progressBar) {
      this.progressBar.hide();
    }

    this._initializeGeometry(geometry, callb);
  }

  enablePlane(state = true) {
    const cfgState = this.config.plane;

    if (cfgState !== state) {
      if (this.plane) {
        this.group.remove(this.plane);
        this.plane = null;
      }

      if (state === true) {
        this._setupPlane();
      }

      this.config.plane = state;
    }

    return this.config.plane;
  }

  set zoom(val) {
    this.controls.zoom = val;
    this.config.zoom = val;
  }

  get zoom() {
    return this.config.zoom;
  }

  enableModelWireframe(state = true) {
    const cfgState = this.config.wireframe;

    if (state !== cfgState) {
      if (this.modelWireframe) {
        this.group.remove(this.modelWireframe);
        this.modelWireframe = null;
      }

      if (state === true) {
        this._setupModelWireframe();
      }
    }

    return this.config.wireframe;
  }

  enableAxis(state = true) {
    const cfgState = this.config.axis;

    if (state !== cfgState) {
      if (this.axisHelper) {
        this.group.remove(this.axisHelper);
        this.axisHelper = null;
      }

      if (state === true) {
        this._setupAxisHelper();
      }

      this.config.state = state;
    }
    return this.config.axis;
  }

  enableSphere(state = true) {
    const cfgState = this.config.sphere;

    if (state !== cfgState) {
      if (this.sphere) {
        this.group.remove(this.sphere);
        this.sphere = null;
      }

      if (state === true) {
        this._setupSphereGrid();
      }
      this.config.sphere = state;
    }

    return this.config.sphere;
  }

  enableBoundingBox(state = true) {
    const cfgState = this.config.boundingBox;

    if (cfgState !== state) {
      if (this.boundingBox) {
        this.group.remove(this.boundingBox);
        this.boundingBox = null;
      }

      if (state === true) {
        this._setupBoundingBox();
      }

      this.config.boundingBox = state;
    }

    return this.config.boundingBox;
  }

  enableAutoRotate(state = true) {
    const cfgState = this.config.autoRotate;

    if (this.model && cfgState !== state) {
      this.controls.autoRotate = state;
      this.config.autoRotate = state;
    }

    return this.config.autoRotate;
  }

  enableMaterial(state = true) {
    if (this.model && state !== this.config.material) {
      if (state) {
        this.group.add(this.model);
      } else {
        this.group.remove(this.model);
      }

      this.config.material = state;
    }

    return this.config.material;
  }

  setStats(stats) {
    this.stats = stats;
  }

  static _setupContainer(domElm) {
    const vElm = document.createElement("div");
    vElm.style.height = "100%";
    vElm.style.width = "100%";
    vElm.style.position = "absolute";
    vElm.style.left = 0;
    vElm.style.right = 0;
    vElm.style.bottom = 0;
    vElm.style.top = 0;
    domElm.appendChild(vElm);

    return vElm;
  }

  setModelColor(color) {
    if (this.model && color) {
      this.model.material.color = color;
    }
  }

  setModelColorByHexcode(hexcode) {
    if (hexcode) {
      const colorValue = hexcode.replace("#", "0x");
      const color = new THREE.Color(parseInt(colorValue, 16));
      this.setModelColor(color);
    }
  }

  render() {
    // horizontal rotation
    if (!this.group) {
      return;
    }

    this.renderer.render(this.scene, this.camera);
  }

  animate(time) {
    if (this.stats) {
      this.stats.begin();
    }

    this.animationId = requestAnimationFrame((time) => {
      this.animate(time);
    });

    if (this.controls) {
      this.controls.update(time);
    }

    this.render();

    if (this.stats) {
      this.stats.end();
    }
  }

  destroy() {
    this._unload();
    this.container.remove();
  }

  _setupCamera() {
    const height = this.container.clientHeight;
    const width = this.container.clientWidth;
    const camera = new THREE.PerspectiveCamera(45, width / height, 1, 4000);

    if (this.model) {
      const geometry = this.model.geometry;
      geometry.computeBoundingSphere();

      let g = this.model.geometry.boundingSphere.radius;
      let dist = g * 3;

      // fudge factor so you can see the boundaries
      camera.position.set(0, 0, dist * this.config.fudge);
    }

    this.camera = camera;
  }

  _setupScene() {
    const scene = new THREE.Scene();
    const group = new THREE.Group();

    this.scene = scene;
    this.group = group;

    this.scene.add(this.group);
  }

  _setupControls() {
    this._setupCamera();

    if (this.model) {
      if (this.controls) {
        this.controls.destroy();
        this.controls = null;
      }

      let config = this.config;

      if (this.model.geometry.registry === true) {
        config = merge({}, this.config, this.model.geometry.controlsConfig);
        config.startupAnimation = false;
      }

      this.controls = new ModelControls(
        this.container,
        this.camera,
        this.group,
        config
      );
    }
  }

  _setupRenderer() {
    const height = this.container.clientHeight;
    const width = this.container.clientWidth;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    const devicePixelRatio = window.devicePixelRatio || 1;

    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(devicePixelRatio);
    renderer.setSize(width, height);

    renderer.gammaInput = true;
    renderer.gammaOutput = true;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.cullFace = THREE.CullFaceBack;

    this.container.appendChild(renderer.domElement);

    this.renderer = renderer;
  }

  _setupLights() {
    // Ambient
    this.scene.add(new THREE.AmbientLight(0xcccccc));

    // Light 3
    const light = new THREE.SpotLight(0xcccccc);
    light.angle = 1.7;
    light.position.set(100, 500, 100);

    const target = new THREE.Object3D();
    target.position.set(0, 0, 0);
    light.target = target;

    this.scene.add(light);
  }

  _setupAxisHelper() {
    if (this.model) {
      if (this.axisHelper) {
        this.group.remove(this.axisHelper);
      }

      // Get max dimention and add 50% overlap for plane
      // with a gutter of 10
      const geometry = this.model.geometry;
      geometry.computeBoundingBox();
      geometry.computeBoundingSphere();

      let maxDimension = max(this.model.geometry.boundingBox.max);
      maxDimension = Math.ceil(~~(maxDimension * 1.5) / 10) * 10;

      const axisHelper = new THREE.AxisHelper(maxDimension);

      // reset center point
      axisHelper.position.x = 0;
      axisHelper.position.y = 0;
      axisHelper.position.z = 0;

      this.axisHelper = axisHelper;
      this.group.add(this.axisHelper);
      this.config.axis = true;
    }
  }

  _setupPlane() {
    if (this.model) {
      if (this.plane) {
        this.group.remove(this.plane);
      }

      // Getmax dimention and add 10% overlap for plane
      // with a gutter of 10
      let geometry = this.model.geometry;
      geometry.computeBoundingBox();
      geometry.computeBoundingSphere();

      let maxDimension = max(this.model.geometry.boundingBox.max);
      maxDimension = Math.ceil(~~(maxDimension * 1.1) / 10) * 10;

      const plane = new THREE.GridHelper(maxDimension, 10);

      // reset center point
      const box = new THREE.Box3().setFromObject(plane);
      box.center(plane.position);
      plane.position.multiplyScalar(-1);

      plane.position.y = geometry.boundingSphere.center.y * -1;

      this.plane = plane;
      this.group.add(this.plane);
      this.config.plane = true;
    }
  }

  _setupSphereGrid() {
    if (this.model) {
      if (this.sphere) {
        this.group.remove(this.sphere);
      }

      let geometry = this.model.geometry;
      geometry.computeBoundingBox();
      geometry.computeBoundingSphere();

      let { x, y, z } = this.model.geometry.boundingBox.max;
      let d = Math.sqrt(Math.pow(x, 2) + Math.pow(y, 2) + Math.pow(z, 2));
      let maxDimension = Math.ceil(~~(d * 0.6) / 10) * 10;

      let geometrySphere = new THREE.SphereGeometry(maxDimension, 10, 10);
      let material = new THREE.MeshBasicMaterial({
        color: 0x4d635d,
        wireframe: true,
      });
      let sphere = new THREE.Mesh(geometrySphere, material);

      // reset center point
      const box = new THREE.Box3().setFromObject(sphere);
      box.center(sphere.position);
      sphere.position.multiplyScalar(-1);

      geometrySphere.computeBoundingBox();
      geometrySphere.computeBoundingSphere();

      sphere.position.x = geometrySphere.boundingSphere.center.x;
      sphere.position.y = geometrySphere.boundingSphere.center.y;
      sphere.position.z = geometrySphere.boundingSphere.center.z;

      this.sphere = sphere;
      this.group.add(this.sphere);
      this.config.sphere = true;
    }
  }

  _setupBoundingBox() {
    if (this.model) {
      if (this.boundingBox) {
        this.group.remove(this.boundingBox);
      }

      const wireframe = new THREE.WireframeGeometry(this.model.geometry);
      const line = new THREE.LineSegments(wireframe);

      line.material.depthTest = false;
      line.material.opacity = 0.25;
      line.material.transparent = true;

      // reset center point
      const box = new THREE.Box3().setFromObject(line);
      box.center(line.position);
      line.position.multiplyScalar(-1);

      this.boundingBox = new THREE.BoxHelper(line);

      this.group.add(this.boundingBox);
      this.config.boundingBox = true;
    }
  }

  _unload() {
    cancelAnimationFrame(this.animationId);

    if (this.scene !== null) {
      let objsToRemoveFromGroup = rest(this.group.children, 1);
      each(objsToRemoveFromGroup, (object) => {
        this.group.remove(object);
      });

      let objsToRemoveFromScene = rest(this.scene.children, 1);
      each(objsToRemoveFromScene, (object) => {
        this.scene.remove(object);
      });
    }

    this.scene = null;
    this.group = null;
    this.camera = null;
    this.loader = null;
    this.plane = null;
    this.axisHelper = null;
    this.renderer = null;
    this.sphere = null;
    this.animationId = null;
    this.boundingBox = null;
    this.modelWireframe = null;
    this.loaderPath = null;
    this.loaderContent = null;

    // Remove Model
    if (this.model) {
      this.model.geometry.controlsConfig = this.controls.controlsConfig;
      this.model = null;
    }

    // Remove progressBar
    if (this.progressBar) {
      this.progressBar.destroy();
      this.progressBar = null;
    }

    // Remove controls
    if (this.controls) {
      this.controls.destroy();
      this.controls = null;
    }

    // DragDrop controls
    if (this.ddControls) {
      this.ddControls.destroy();
      this.ddControls = null;
    }

    if (this.container !== null) {
      // Clear container
      const elem = this.container;

      while (elem.lastChild) {
        elem.removeChild(elem.lastChild);
      }
    }

    this.loaded = false;
    this.loaderPath = null;

    // Remove listener
    window.removeEventListener("resize", this._resizeListener, false);
    this._resizeListener = null;

    while (this.container.firstChild) {
      this.container.removeChild(this.container.firstChild);
    }
  }

  _setupModelWireframe() {
    if (this.model) {
      if (this.modelWireframe) {
        this.group.remove(this.modelWireframe);
      }

      let material = new THREE.MeshPhongMaterial({
        color: 0xffffff,
        specular: 0x111111,
        shininess: 20,
        wireframe: true,
      });

      const mesh = this.model.clone();
      mesh.material = material;
      this.modelWireframe = mesh;
      this.group.add(mesh);
      this.config.wireframe = true;
    }
  }

  _setupListener() {
    this._resizeListener = (evt) => {
      this._onWindowResize(evt);
    };

    window.addEventListener("resize", this._resizeListener, false);

    if (this.config.dragDrop === true) {
      this.ddControls = new DragDropControls(this.container, (result) => {
        this.parse(result);
      });
    }
  }

  _restoreConfig() {
    const { wireframe, plane, boundingBox, sphere, axis } = this.config;

    if (wireframe) {
      this._setupModelWireframe();
    }
    if (plane) {
      this._setupPlane();
    }
    if (boundingBox) {
      this._setupBoundingBox();
    }
    if (sphere) {
      this._setupSphereGrid();
    }
    if (axis) {
      this._setupAxisHelper();
    }
  }

  _initializeGeometry(geometry, cb) {
    const callb = cb || function () {};
    this._setupScene();
    this._setupRenderer();
    this._setupLights();

    const n = geometry;
    n.computeBoundingSphere();
    n.computeBoundingBox();

    if (geometry.registry === false) {
      n.applyMatrix(new THREE.Matrix4().makeRotationX(-Math.PI / 2));
    }

    const material = new THREE.MeshPhongMaterial({
      color: 0xb3b3b3,
      specular: 0x111111,
      shininess: 20,
    });
    const mesh = new THREE.Mesh(geometry, material);

    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.material = material;

    // reset center point
    const box = new THREE.Box3().setFromObject(mesh);
    box.center(mesh.position);
    mesh.position.multiplyScalar(-1);

    this.model = mesh;

    if (this.config.material) {
      this.group.add(this.model);
    }

    this.scene.updateMatrixWorld();

    this._setupControls();
    this._restoreConfig();

    requestAnimationFrame((time) => {
      this.animate(time);
      this.loaded = true;
      callb();
    });
  }

  _onWindowResize() {
    if (this.container) {
      let height = this.container.clientHeight;
      let width = this.container.clientWidth;

      if (this.camera) {
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
      }

      if (this.renderer) {
        this.renderer.setSize(width, height);
      }
    }
  }
}
