/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable @typescript-eslint/no-require-imports */
import * as S from '@m-fe/utils';
import each from 'lodash/each';
import UZIP from 'pako';
import React from 'react';
import * as THREE from 'three';

import {
  IModelViewerProps,
  ModelAttr,
  ModelCompressType,
  ModelType,
  defaultModelViewerProps
} from '../../types';
import { getFileObjFromModelSrc, getModelCompressType, getModelType } from '../../utils/file';
import { calcTopology } from '../../utils/mesh';
import { transformToGLTF } from '../../utils/GLTF';
import { Holdable } from '../Holdable';

import './index.css';
// import { OrbitControls } from 'three-orbitcontrols-ts';
const OrbitControls = require('three-orbit-controls')(THREE);
// import { ViewerControl, ViewerControlConfig } from './ViewerControl';

const fudge = 1.0;

interface IProps extends IModelViewerProps {}

interface IState {
  type: ModelType;
  compressType: ModelCompressType;
  topology?: ModelAttr;
  modelFile?: File;

  cameraX?: number;
  cameraY?: number;
  cameraZ?: number;

  loaded: boolean;

  // 是否展示信息
  withAttr: boolean;
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
    type: this.props.type || getModelType(this.props.fileName, this.props.src),
    compressType:
      this.props.compressType || getModelCompressType(this.props.fileName, this.props.src),
    loaded: false,
    cameraX: 0,
    cameraY: 0,
    cameraZ: 0,
    withMaterial: true,
    withAttr: this.props.withAttr
  };

  model?: THREE.Mesh;
  modelWireframe?: THREE.Mesh;

  animationId: number;
  scene: THREE.Scene;
  group: THREE.Group;
  renderer: THREE.WebGLRenderer;
  camera: THREE.PerspectiveCamera;
  // controls: ViewerControl;
  orbitControls: any;
  boundingBox: THREE.BoxHelper;

  xDims: number;
  yDims: number;
  zDims: number;

  componentDidMount() {
    this.loadModel(this.props);
  }

  componentWillReceiveProps(nextProps: IProps) {
    if (nextProps.src !== this.props.src) {
      this.loadModel(nextProps);
    }
  }

  /** 这里根据传入的文件类型，进行不同的文件转化 */
  async loadModel(props: IProps) {
    const modelFile = await getFileObjFromModelSrc({
      ...props,
      type: 'stl',
      compressType: this.state.compressType
    });

    try {
      const { mesh } = await transformToGLTF(modelFile || props.src, this.state.type);

      this.initGeometry(mesh.geometry);
      this.setState({ modelFile });
    } catch (e) {
      console.error(e);
    }
  }

  /** 初始化几何体 */
  initGeometry(geometry: THREE.BufferGeometry | THREE.Geometry) {
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
    this.xDims = geometry.boundingBox.max.x - geometry.boundingBox.min.x;
    this.yDims = geometry.boundingBox.max.y - geometry.boundingBox.min.y;
    this.zDims = geometry.boundingBox.max.z - geometry.boundingBox.min.z;

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
      this.setState({ loaded: true }, () => {
        this.onLoad();
      });
    });
  }

  /** 清除实体 */
  destroy() {
    cancelAnimationFrame(this.animationId);

    if (this.scene !== null) {
      each(this.group.children, object => {
        this.group.remove(object);
      });

      each(this.scene.children, object => {
        this.scene.remove(object);
      });
    }

    this.scene = null;
    this.group = null;
    this.model = null;
    this.modelWireframe = null;
    this.boundingBox = null;

    this.renderer.dispose();
    this.renderer.forceContextLoss();
    this.$ref.current.remove();
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

    this.orbitControls = new OrbitControls(this.camera, this.$ref.current);
    this.orbitControls.enableKeys = false;
    this.orbitControls.enableZoom = true;
    this.orbitControls.enablePan = true;
    this.orbitControls.addEventListener('change', this.renderScene.bind(this));

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
      camera.position.set(
        this.props.cameraX,
        this.props.cameraY,
        this.props.cameraZ || dist * fudge
      );
    }

    this.camera = camera;
  }

  animate(_time: number) {
    this.animationId = requestAnimationFrame(time => {
      this.animate(time);
    });

    // if (this.controls) {
    //   this.controls.update(_time);
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
    const { withWireframe, withBoundingBox } = this.state;

    if (withWireframe) {
      this._setupModelWireframe();
    }

    if (withBoundingBox) {
      this._setupBoundingBox();
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

  _setupBoundingBox() {
    if (this.model) {
      if (this.boundingBox) {
        this.group.remove(this.boundingBox);
      }

      const wireframe = new THREE.WireframeGeometry(this.model.geometry);
      const line = new THREE.LineSegments(wireframe);

      (line.material as THREE.Material).depthTest = false;
      (line.material as THREE.Material).opacity = 0.25;
      (line.material as THREE.Material).transparent = true;

      // reset center point
      const box = new THREE.Box3().setFromObject(line);
      box.getCenter(line.position);
      line.position.multiplyScalar(-1);

      this.boundingBox = new THREE.BoxHelper(line);

      this.group.add(this.boundingBox);
    }
  }

  onLoad = async () => {
    const { src, withAttr, onTopology, onZip } = this.props;
    const { modelFile } = this.state;

    // 计算基础信息
    if ((onTopology || withAttr) && this.model) {
      const topology = await calcTopology(this.model);

      this.setState({ topology });

      if (onTopology) {
        onTopology(topology);
      }
    }

    // 判断是否有 onZip，有的话则进行压缩并且返回
    requestAnimationFrame(async () => {
      // 仅在传入了 Zipped 文件的情况下调用
      if (modelFile && onZip && src && this.state.compressType === 'none') {
        const buffer = await S.readFileAsArrayBufferAsync(modelFile);
        const intArray: Uint8Array = new Uint8Array(buffer);

        const zippedFile = UZIP.deflate(intArray);

        onZip(zippedFile);
      }
    });
  };

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

  /** 响应框体变化 */
  onBoundingBoxChange = (selected = true) => {
    if (this.state.withBoundingBox === selected) {
      return;
    }

    this.setState({
      withBoundingBox: selected
    });

    if (selected) {
      this._setupBoundingBox();
    } else {
      this.group.remove(this.boundingBox);
      this.boundingBox = null;
    }
  };

  render() {
    const { width, height, style, externalAttr, withJoystick } = this.props;

    const { withMaterial, withWireframe, withBoundingBox, withAttr, topology } = this.state;

    return (
      <div className="rmv-sv-container" style={{ width }}>
        <div className="rmv-sv-toolbar">
          <div className="rmv-sv-toolbar-item">
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
          <div className="rmv-sv-toolbar-item">
            <label htmlFor="withBoundingBox">框体：</label>
            <input
              type="checkbox"
              name="withBoundingBox"
              checked={withBoundingBox}
              onChange={e => {
                this.onBoundingBoxChange(e.target.checked);
              }}
            />
          </div>
          <div className="rmv-sv-toolbar-item">
            <label htmlFor="withAttr">信息板：</label>
            <input
              type="checkbox"
              name="withAttr"
              checked={withAttr}
              onChange={e => {
                this.setState({ withAttr: e.target.checked });
              }}
            />
          </div>
        </div>
        {withAttr && topology && (
          <div className="rmv-gmv-attr-modal">
            <div className="item">
              尺寸：{S.toFixedNumber(topology.sizeX)} * {S.toFixedNumber(topology.sizeY)} *{' '}
              {S.toFixedNumber(topology.sizeZ)} {' mm'}
            </div>
            <div className="item">
              体积：{S.toFixedNumber(topology.volume)}
              {' mm³'}
            </div>
            <div className="item">
              面积：{S.toFixedNumber(topology.area, 2)}
              {' mm²'}
            </div>
            <div className="item">面片：{topology.triangleCnt} 个</div>
            {Object.keys(externalAttr).map(k => (
              <div className="item" key={k}>
                {k}：{externalAttr[k]}
              </div>
            ))}
          </div>
        )}
        {withJoystick && (
          <>
            <Holdable
              finite={false}
              onPress={() => {
                this.camera.translateY(-topology.sizeY / 10);
              }}
            >
              <div
                className="rmv-gmv-attr-joystick-arrow rmv-gmv-attr-joystick-arrow-up"
                style={{ top: 40 }}
              >
                <i />
              </div>
            </Holdable>
            <Holdable
              finite={false}
              onPress={() => {
                this.camera.translateY(topology.sizeY / 10);
              }}
            >
              <div className="rmv-gmv-attr-joystick-arrow rmv-gmv-attr-joystick-arrow-down">
                <i />
              </div>
            </Holdable>
            <Holdable
              finite={false}
              onPress={() => {
                this.camera.translateX(-topology.sizeX / 10);
              }}
            >
              <div className="rmv-gmv-attr-joystick-arrow rmv-gmv-attr-joystick-arrow-left">
                <i />
              </div>
            </Holdable>
            <Holdable
              finite={false}
              onPress={() => {
                this.camera.translateX(topology.sizeX / 10);
              }}
            >
              <div className="rmv-gmv-attr-joystick-arrow rmv-gmv-attr-joystick-arrow-right">
                <i />
              </div>
            </Holdable>
          </>
        )}
        <div className="rmv-sv-webgl" ref={this.$ref} style={{ width, height, ...style }} />
      </div>
    );
  }
}
