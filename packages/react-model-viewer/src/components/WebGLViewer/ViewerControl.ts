import merge from 'lodash/merge';
import round from 'lodash/round';
import sample from 'lodash/sample';
import * as THREE from 'three';
import { OrbitControls } from 'three-orbitcontrols-ts';
import TWEEN from 'tween.ts';

/** 控制器配置 */
export interface ViewerControlConfig {
  startupAnimation?: boolean;
  targetRotationX?: number;
  targetRotationOnMouseDownX?: number;
  targetRotationY: number;
  targetRotationOnMouseDownY: number;
  mouseX: number;
  mouseXOnMouseDown: number;
  mouseY: number;
  mouseYOnMouseDown: number;
  clientHalfX: number;
  clientHalfY: number;
  finalRotationY: number;
  currentRotationX: number;
  currentRotationY: number;
}

export class ViewerControl {
  container: HTMLDivElement;
  camera: THREE.PerspectiveCamera;
  group: THREE.Group;

  _animations: any[] = [];
  _zoomTween: any;

  controls: OrbitControls;
  controlsConfigDefault: ViewerControlConfig;
  controlsConfig: ViewerControlConfig;

  _startUpAnimations = [
    {
      easing: TWEEN.Easing.Quintic.Out,
      to: { x: 5 * 360 + 45 },
      time: 3500
    },
    {
      easing: TWEEN.Easing.Exponential.InOut,
      to: { x: 3 * 360 + 45 },
      time: 2500
    },
    {
      easing: TWEEN.Easing.Elastic.Out,
      to: { x: 3 * 360 + 45 },
      time: 5500
    },
    {
      easing: TWEEN.Easing.Circular.In,
      to: { x: 4 * 360 + 45 },
      time: 2500
    },
    {
      easing: TWEEN.Easing.Quintic.InOut,
      to: { x: 3 * 360 + 45 },
      time: 2500
    },
    {
      easing: TWEEN.Easing.Exponential.Out,
      to: { x: 4 * 360 + 45 },
      time: 2800
    }
  ];

  constructor(
    container: HTMLDivElement,
    camera: THREE.PerspectiveCamera,
    group: THREE.Group,
    config: Partial<ViewerControlConfig> = {}
  ) {
    this.container = container;
    this.camera = camera;
    this.group = group;

    this._animations = [];
    this._zoomTween = new TWEEN.Tween({ zoom: camera.zoom });

    this.controlsConfigDefault = {
      startupAnimation: false,

      targetRotationX: 0,
      targetRotationOnMouseDownX: 0,

      targetRotationY: 0,
      targetRotationOnMouseDownY: 0,

      mouseX: 0,
      mouseXOnMouseDown: 0,

      mouseY: 0,
      mouseYOnMouseDown: 0,

      clientHalfX: this.container.clientWidth / 2,
      clientHalfY: this.container.clientHeight / 2,

      finalRotationY: null,

      currentRotationX: 0,
      currentRotationY: 0
    };

    this.controlsConfig = merge({}, this.controlsConfigDefault, config);

    this._init();

    if (this.controlsConfig.startupAnimation === true) {
      this._createStartUpAnimation();
    } else {
      this.group.rotation.y = this.controlsConfig.currentRotationY;
      this.group.rotation.x = this.controlsConfig.currentRotationX;
    }
  }

  update(time: number) {
    const group = this.group;

    // Do tweening
    if (this.controlsConfig.startupAnimation === true) {
      TWEEN.update(time);
    }

    if (group) {
      const cfg = this.controlsConfig;

      group.rotation.y += round((cfg.targetRotationX - group.rotation.y) * 0.1, 2);

      // vertical rotation
      cfg.finalRotationY = round(cfg.targetRotationY - group.rotation.x, 2);
      group.rotation.x += round(cfg.finalRotationY * 0.05, 2);

      this.controlsConfig.currentRotationX = group.rotation.x;
      this.controlsConfig.currentRotationY = group.rotation.y;
    }
  }

  zoomIn(scale = 2) {
    TWEEN.remove(this._zoomTween as any);

    const cam = this.camera;
    const dollyScale = Math.pow(0.95, scale);
    const minZoom = this.controls.minZoom;
    const maxZoom = this.controls.maxZoom;
    const zoomLvl = Math.max(minZoom, Math.min(maxZoom, cam.zoom / dollyScale));

    this._dollyZoom(zoomLvl);
  }

  zoomOut(scale = 2) {
    TWEEN.remove(this._zoomTween);

    const cam = this.camera;
    const dollyScale = Math.pow(0.95, scale);
    const minZoom = this.controls.minZoom;
    const maxZoom = this.controls.maxZoom;
    const zoomLvl = Math.max(minZoom, Math.min(maxZoom, cam.zoom * dollyScale));

    this._dollyZoom(zoomLvl);
  }

  _dollyZoom(zoomLvl: number) {
    const cam = this.camera;
    const tween = new TWEEN.Tween({ zoom: cam.zoom });
    tween.to({ zoom: zoomLvl }, 300);
    tween.onUpdate(object => {
      cam.zoom = object.zoom;
      cam.updateProjectionMatrix();
    });
    tween.start();

    this._zoomTween = tween;
    return tween;
  }

  destroy() {
    this._removeEventListener();

    // Remove orbit control
    if (this.controls) {
      this.controls.dispose();
    }

    this._clearAnimations();
    this._animations = [];
  }

  _clearAnimations() {
    if (this._animations && this._animations.length > 0) {
      while (this._animations.length > 0) {
        TWEEN.remove(this._animations.pop());
      }
    }

    TWEEN.remove(this._zoomTween);
  }

  _createStartUpAnimation() {
    const { targetRotationY, targetRotationX } = this.controlsConfig;
    const self = this;

    const coords = {
      x: (targetRotationX / Math.PI) * 180,
      y: (targetRotationY / Math.PI) * 180
    };

    this._clearAnimations();

    const anim = sample(this._startUpAnimations);

    const tween1 = new TWEEN.Tween(coords)
      .easing(anim.easing)
      .to(anim.to, anim.time)
      .onUpdate(object => {
        self.controlsConfig.targetRotationX = (object.x * Math.PI) / 180;
      })
      .start();

    this._animations.push(tween1);

    const tween2 = new TWEEN.Tween(coords)
      .easing(TWEEN.Easing.Exponential.Out)
      .to({ y: 45 }, 1500)
      .onUpdate(object => {
        self.controlsConfig.targetRotationY = (object.y * Math.PI) / 180;
      })
      .start();

    this._animations.push(tween2);
  }

  _init() {
    // Clean registered event listener
    this._removeEventListener();
    // this.controlsConfig = merge({}, this.controlsConfigDefault);
    this._setupListener();

    // Delecate to orbit controls
    const controls = new OrbitControls(this.camera, this.container);

    controls.enableKeys = false;
    controls.enableRotate = false;
    controls.enablePan = false;
    controls.enableDamping = false;
    controls.enableZoom = true;

    const bb = new THREE.Box3();
    bb.setFromObject(this.group);
    bb.getCenter(controls.target);

    this.controls = controls;
  }

  _resizeListener: (this: Window, ev: UIEvent) => any;
  _mouseDownListener: (event: MouseEvent) => void;
  _mouseMoveListener: (event: MouseEvent) => void;
  _mouseUpListener: (event: MouseEvent) => void;
  _mouseOutListener: (event: MouseEvent) => void;
  _touchStartListener: (event: TouchEvent) => void;
  _touchEndListener: (event: TouchEvent) => void;
  _touchMoveListener: (event: TouchEvent) => void;

  _setupListener() {
    const container = this.container;

    // Add resize listener
    this._resizeListener = () => {
      this._onWindowResize();
    };
    window.addEventListener('resize', this._resizeListener, false);

    // Controls
    this._mouseDownListener = e => {
      this._onMouseDown(e);
    };
    this._mouseMoveListener = e => {
      this._onMouseMove(e);
    };
    this._mouseUpListener = () => {
      this._onMouseUp();
    };
    this._mouseOutListener = () => {
      this._onMouseOut();
    };
    this._touchStartListener = e => {
      this._onTouchStart(e);
    };
    this._touchEndListener = e => {
      this._onTouchEnd(e);
    };
    this._touchMoveListener = e => {
      this._onTouchMove(e);
    };

    // Mouse / Touch events
    container.addEventListener('mousedown', this._mouseDownListener, false);
    container.addEventListener('touchstart', this._touchStartListener, false);
    container.addEventListener('touchmove', this._touchMoveListener, false);
  }

  _removeEventListener() {
    const container = this.container;

    // Remove resize listener
    window.removeEventListener('resize', this._resizeListener, false);
    this._resizeListener = null;

    // Remove model spinning controls
    container.removeEventListener('mouseup', this._mouseUpListener, false);
    container.removeEventListener('mousemove', this._mouseMoveListener, false);
    container.removeEventListener('mousedown', this._mouseDownListener, false);
    container.removeEventListener('touchstart', this._touchStartListener, false);
    container.removeEventListener('touchmove', this._touchMoveListener, false);
  }

  _onWindowResize() {
    ['controlsConfig', 'controlsConfigDefault'].forEach(key => {
      if (this.hasOwnProperty(key)) {
        this[key].clientHalfX = this.container.clientWidth / 2;
        this[key].clientHalfY = this.container.clientHeight / 2;
      }
    });
  }

  _onMouseDown(evt: MouseEvent) {
    evt.preventDefault();

    const container = this.container;
    const cfg = this.controlsConfig;

    if (container) {
      const { clientX, clientY } = evt;

      this._clearAnimations();

      container.addEventListener('mousemove', this._mouseMoveListener, false);
      container.addEventListener('mouseup', this._mouseUpListener, false);
      container.addEventListener('mouseout', this._mouseOutListener, false);

      cfg.mouseXOnMouseDown = clientX - cfg.clientHalfX;
      cfg.targetRotationOnMouseDownX = cfg.targetRotationX;

      cfg.mouseYOnMouseDown = clientY - cfg.clientHalfY;
      cfg.targetRotationOnMouseDownY = cfg.targetRotationY;
    }
  }

  _onMouseMove(evt: MouseEvent) {
    if (evt) {
      const cfg = this.controlsConfig;

      cfg.mouseX = evt.clientX - cfg.clientHalfX;
      cfg.mouseY = evt.clientY - cfg.clientHalfY;

      cfg.targetRotationY =
        cfg.targetRotationOnMouseDownY + (cfg.mouseY - cfg.mouseYOnMouseDown) * 0.02;
      cfg.targetRotationX =
        cfg.targetRotationOnMouseDownX + (cfg.mouseX - cfg.mouseXOnMouseDown) * 0.02;
    }
  }

  _onMouseUp() {
    const { container } = this;

    if (container) {
      container.removeEventListener('mousemove', this._mouseMoveListener, false);
      container.removeEventListener('mouseup', this._mouseUpListener, false);
      container.removeEventListener('mouseout', this._mouseOutListener, false);
    }
  }

  _onMouseOut() {
    const { container } = this;

    if (container) {
      container.removeEventListener('mousemove', this._mouseMoveListener, false);
      container.removeEventListener('mouseup', this._mouseUpListener, false);
      container.removeEventListener('mouseout', this._mouseOutListener, false);
    }
  }

  _onTouchStart(evt: any = { touches: [] }) {
    const touches = evt.touches;
    const cfg = this.controlsConfig;

    if (touches.length === 1) {
      evt.preventDefault();
      const { pageX, pageY } = touches[0];

      cfg.mouseXOnMouseDown = pageX - cfg.clientHalfX;
      cfg.targetRotationOnMouseDownX = cfg.targetRotationX;

      cfg.mouseYOnMouseDown = pageY - cfg.clientHalfY;
      cfg.targetRotationOnMouseDownY = cfg.targetRotationY;
    }
  }

  _onTouchEnd(evt: any = { touches: [] }) {
    const touches = evt.touches;
    const cfg = this.controlsConfig;

    if (touches.length === 1) {
      evt.preventDefault();

      const { pageX, pageY } = touches[0];

      cfg.mouseX = pageX - cfg.clientHalfX;
      cfg.targetRotationX =
        cfg.targetRotationOnMouseDownX + (cfg.mouseX - cfg.mouseXOnMouseDown) * 0.05;

      cfg.mouseY = pageY - cfg.clientHalfY;
      cfg.targetRotationY =
        cfg.targetRotationOnMouseDownY + (cfg.mouseY - cfg.mouseYOnMouseDown) * 0.05;
    }
  }

  _onTouchMove(evt: any = { touches: [] }) {
    const touches = evt.touches;
    const cfg = this.controlsConfig;

    if (touches.length === 1) {
      evt.preventDefault();
      const { pageX, pageY } = touches[0];

      cfg.mouseX = pageX - cfg.clientHalfX;
      cfg.targetRotationX =
        cfg.targetRotationOnMouseDownX + (cfg.mouseX - cfg.mouseXOnMouseDown) * 0.05;

      cfg.mouseY = pageY - cfg.clientHalfY;
      cfg.targetRotationY =
        cfg.targetRotationOnMouseDownY + (cfg.mouseY - cfg.mouseYOnMouseDown) * 0.05;
    }
  }
}
