import Viewer from "./Viewer";

export default class ViewerFactory {
  constructor(domNode, config = {}) {
    this._domNode = domNode;
    this._config = config;
    this._viewer = null;
  }

  zoomIn(scale = 2) {
    this.viewer.controls.zoomIn(scale);
  }

  zoomOut(scale) {
    this.viewer.controls.zoomOut(scale);
  }

  get viewer() {
    if (!this._viewer) {
      this._viewer = new Viewer(this._domNode, this._config);
    }

    return this._viewer;
  }

  get zoom() {
    return this.viewer.zoom;
  }

  set zoom(val) {
    this.viewer.zoom = val;
  }

  togglePlane() {
    const viewer = this.viewer;
    return viewer.enablePlane(!viewer.config.plane);
  }

  toggleModelWireframe() {
    const viewer = this.viewer;
    return viewer.enableModelWireframe(!viewer.config.wireframe);
  }

  toggleAxis() {
    const viewer = this.viewer;
    return viewer.enableAxis(!viewer.config.axis);
  }

  toggleSphere() {
    const viewer = this.viewer;
    return viewer.enableSphere(!viewer.config.sphere);
  }

  toggleBoundingBox() {
    const viewer = this.viewer;
    return viewer.enableBoundingBox(!viewer.config.boundingBox);
  }

  toggleAutoRotate() {
    const viewer = this.viewer;
    return viewer.enableAutoRotate(!viewer.config.autoRotate);
  }

  toggleMaterial() {
    const viewer = this.viewer;
    return viewer.enableMaterial(!viewer.config.material);
  }

  setModelColorByHexcode(hexcode) {
    return this.viewer.setModelColorByHexcode(hexcode);
  }

  load(path, cb) {
    return this.viewer.load(path, cb);
  }

  parse(content, cb) {
    return this.viewer.parse(content, cb);
  }

  reload(cb) {
    const path = this.viewer.loaderPath;
    const content = this.viewer.loaderContent;
    const config = this.viewer.config;

    this.viewer.destroy();
    this._config = config;
    this._viewer = undefined;

    if (content) {
      this.viewer.parse(content, cb);
    } else if (path) {
      this.viewer.load(path, cb);
    }
  }

  destroy() {
    if (this._viewer) {
      this._viewer.destroy();
    }
    this._viewer = undefined;
    this._domNode = null;
    this._config = null;
    return null;
  }
}
