import React from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three-orbitcontrols-ts';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader';

import {
  IModelViewerProps,
  ModelAttr,
  ModelCompressType,
  defaultModelViewerProps
} from '../../types';
import { getFileObjFromModelSrc, getModelCompressType } from '../../utils/file';

import './index.css';
import { ViewerControl, ViewerControlConfig } from './ViewerControl';

const fudge = 1.0;

interface IProps extends IModelViewerProps {
  // 仅支持 stl 类型
  type: 'stl';
}

interface IState {
  compressType: ModelCompressType;
  topology?: ModelAttr;
  modelFile?: File;

  cameraX?: number;
  cameraY?: number;
  cameraZ?: number;

  loaded: boolean;

  // 是否展示线框图
  withWireframe?: boolean;
  // 是否展示底平面
  withPlane?: boolean;
  // 是否展示标尺线
  withBoundingBox?: boolean;
  // 是否展示球体
  withSphere?: boolean;
  // 是否展示坐标系
  withAxis?: boolean;
  // 是否渲染
  withMaterial?: boolean;
}

export class WebGLViewer extends React.Component<IProps, IState> {
  static defaultProps = { ...defaultModelViewerProps };

  $ref = React.createRef<HTMLDivElement>();

  state: IState = {
    compressType:
      this.props.compressType || getModelCompressType(this.props.fileName, this.props.src),
    loaded: false,
    cameraX: 0,
    cameraY: 0,
    cameraZ: 0,
    withMaterial: true
  };

  model?: THREE.Mesh;
  modelWireframe?: THREE.Mesh;

  animationId: number;
  scene: THREE.Scene;
  group: THREE.Group;
  renderer: THREE.WebGLRenderer;
  camera: THREE.PerspectiveCamera;
  controls: ViewerControl;
  orbitControls: OrbitControls;

  componentDidMount() {
    this._setInnerSrc(this.props);
  }

  componentWillReceiveProps(nextProps: IProps) {
    if (nextProps.src !== this.props.src) {
      this._setInnerSrc(nextProps);
    }
  }

  /** 这里根据传入的文件类型，进行不同的文件转化 */
  private async _setInnerSrc(props: IProps) {
    const modelFile = await getFileObjFromModelSrc({
      ...props,
      type: 'stl',
      compressType: this.state.compressType
    });

    try {
      const loader = new STLLoader();
      const src = modelFile || props.src;
      const srcUrl = src instanceof File ? URL.createObjectURL(src) : src;

      // 这里执行加载与渲染
      loader.load(srcUrl, geometry => {
        this._initializeGeometry(geometry);
        this.setState({ modelFile });
      });
    } catch (e) {
      console.error(e);
    }
  }

  /** 初始化几何体 */
  _initializeGeometry(geometry: THREE.BufferGeometry) {
    this._setupScene();
    this._setupRenderer();
    this._setupLights();

    geometry.computeBoundingSphere();
    geometry.center();

    geometry.applyMatrix4(new THREE.Matrix4().makeRotationX(-Math.PI / 2));

    const material = new THREE.MeshPhongMaterial({
      color: this.props.modelColor,
      specular: 0x111111,
      shininess: 20
    });
    const mesh = new THREE.Mesh(geometry, material);

    geometry.computeBoundingBox();

    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.material = material;

    // reset center point
    const box = new THREE.Box3().setFromObject(mesh);
    box.getCenter(mesh.position);
    mesh.position.multiplyScalar(-1);

    this.model = mesh;

    if (this.state.withMaterial) {
      this.group.add(this.model);
    }

    this.scene.updateMatrixWorld();

    this._setupControls();
    this._setupDecorators();

    requestAnimationFrame(time => {
      this.animate(time);
      // 已加载完毕
      this.setState({ loaded: true });
    });
  }

  /** 初始化场景 */
  _setupScene() {
    const scene = new THREE.Scene();
    const group = new THREE.Group();

    this.scene = scene;
    this.group = group;

    this.scene.add(this.group);
  }

  /** 初始化渲染器 */
  _setupRenderer() {
    const { backgroundColor } = this.props;

    const height = this.$ref.current.clientHeight;
    const width = this.$ref.current.clientWidth;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    const devicePixelRatio = window.devicePixelRatio || 1;

    renderer.setClearColor(new THREE.Color(backgroundColor), 1);
    renderer.setPixelRatio(devicePixelRatio);
    renderer.setSize(width, height);

    // renderer.gammaInput = true;
    // renderer.gammaOutput = true;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.cullFace = THREE.CullFaceBack;

    this.$ref.current.appendChild(renderer.domElement);

    this.renderer = renderer;
  }

  /** 初始化灯光 */
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

  /** 初始化控制器 */
  _setupControls() {
    this._setupCamera();

    // if (this.model) {
    //   if (this.controls) {
    //     this.controls.destroy();
    //     this.controls = null;
    //   }

    //   const config = (this.props as unknown) as ViewerControlConfig;

    //   this.controls = new ViewerControl(this.$ref.current, this.camera, this.group, config);
    // }
  }

  _setupCamera() {
    const height = this.$ref.current.clientHeight;
    const width = this.$ref.current.clientWidth;
    const camera = new THREE.PerspectiveCamera(45, width / height, 1, 4000);

    const { model } = this;
    if (model) {
      const geometry = model.geometry;
      geometry.computeBoundingSphere();

      const g = model.geometry.boundingSphere.radius;
      const dist = g * 3;

      // fudge factor so you can see the boundaries
      camera.position.set(0, 0, dist * fudge);
    }

    this.camera = camera;
  }

  animate(time: number) {
    this.animationId = requestAnimationFrame(time => {
      this.animate(time);
    });

    // if (this.controls) {
    //   this.controls.update(time);
    // }

    this.renderScene();
  }

  renderScene() {
    // horizontal rotation
    if (!this.group) {
      return;
    }

    this.renderer.render(this.scene, this.camera);
  }

  _setupDecorators() {
    const { withWireframe } = this.state;

    if (withWireframe) {
      this._setupModelWireframe();
    }
  }

  _setupModelWireframe() {
    const { model } = this;
    if (!model) {
      return;
    }

    if (this.modelWireframe) {
      this.group.remove(this.modelWireframe);
    }

    const material = new THREE.MeshPhongMaterial({
      color: 0xffffff,
      specular: 0x111111,
      shininess: 20,
      wireframe: true
    });

    const mesh = this.model.clone();
    mesh.material = material;

    this.modelWireframe = mesh;
    this.group.add(mesh);
  }

  /** 响应着色图变化 */
  onMaterialChange = (selected = true) => {
    if (this.state.withMaterial === selected) {
      return;
    }

    this.setState({
      withMaterial: selected
    });

    if (selected) {
      this.group.add(this.model);
    } else {
      this.group.remove(this.model);
    }
  };

  /** 响应线框图的变化 */
  onWireframeChange = (selected = true) => {
    const { withWireframe } = this.state;

    if (withWireframe !== selected) {
      if (this.modelWireframe) {
        this.group.remove(this.modelWireframe);
        this.modelWireframe = null;
      }

      if (selected) {
        this._setupModelWireframe();
      }
    }

    this.setState({ withWireframe: selected });
  };

  render() {
    const { width, height, style } = this.props;

    const { withMaterial, withWireframe } = this.state;

    return (
      <div className="rmv-sv-container">
        <div className="rmv-sv-toolbar-item">
          <div className="rmv-sv-toolbar">
            <label htmlFor="withMaterial">着色：</label>
            <input
              type="checkbox"
              name="withMaterial"
              checked={withMaterial}
              onChange={e => {
                this.onMaterialChange(e.target.checked);
              }}
            />
          </div>
          <div className="rmv-sv-toolbar-item">
            <label htmlFor="withWireframe">线框：</label>
            <input
              type="checkbox"
              name="withWireframe"
              checked={withWireframe}
              onChange={e => {
                this.onWireframeChange(e.target.checked);
              }}
            />
          </div>
        </div>
        <div className="rmv-sv-webgl" ref={this.$ref} style={{ width, height, ...style }} />
      </div>
    );
  }
}
