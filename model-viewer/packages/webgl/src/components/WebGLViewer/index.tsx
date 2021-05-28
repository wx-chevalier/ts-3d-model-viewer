/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable @typescript-eslint/no-require-imports */
import { ellipsis, genId, toFixedNumber } from '@m-fe/utils';
import TextSprite from '@seregpie/three.text-sprite';
import each from 'lodash/each';
import max from 'lodash/max';
import Tooltip from 'rc-tooltip';
import 'rc-tooltip/assets/bootstrap.css';
import React from 'react';
import { SketchPicker } from 'react-color';
import Loader from 'react-loader-spinner';
import * as THREE from 'three';

import {
  IModelViewerProps,
  ModelAttr,
  ModelCompressType,
  ModelType,
  defaultModelViewerProps
} from '../../types';
import { deflate } from '../../utils/compressor';
import {
  getFileObjFromModelSrc,
  getModelCompressType,
  getModelType
} from '../../utils/file_loader';
import { getLocale, i18nFormat, setLocale } from '../../utils/i18n';
import { calcTopology } from '../../utils/mesh';
import { canTransformToGLTF, loadMesh } from '../../utils/mesh_loader';
import { ObjectSnapshotGenerator } from '../../types/ObjectSnapshotGenerator';
import { Holdable } from '../Holdable';
import { Switch } from '../Switch';

import './index.css';
import {
  adjustGeometry,
  getMaterial,
  getThreeJsWebGLRenderer,
  setupLights
} from '../../headless/stage';

const OrbitControls = require('three-orbit-controls')(THREE);

const fudge = 1.0;

declare global {
  const __DEV__: boolean;
}

interface IProps extends IModelViewerProps {}

interface IState {
  type: ModelType;
  compressType: ModelCompressType;
  topology?: ModelAttr;
  modelFile?: File;

  showColorPicker?: boolean;
  modelColor: string;
  backgroundColor: string | number;

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
  // 是否剖切
  withClipping?: boolean;
  // 是否英文
  withLanguageSelector?: boolean;
  // 是否简约视图
  isFreshViewEnabled?: boolean;
}

export class WebGLViewer extends React.Component<IProps, IState> {
  id = genId();
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
    withAttr: this.props.withAttr,
    withPlane: true,
    withAxis: true,
    modelColor: this.props.modelColor,
    backgroundColor: this.props.backgroundColor,
    withLanguageSelector: getLocale() === 'en',
    isFreshViewEnabled: false
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
  xSprite: any;
  ySprite: any;
  zSprite: any;
  plane: THREE.GridHelper;
  axisHelper: THREE.AxesHelper;

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

  componentWillUnmount() {
    // 卸载的时候强行回收资源
    this.destroy();
  }

  /** 这里根据传入的文件类型，进行不同的文件转化 */
  async loadModel(props: IProps) {
    try {
      const modelFile = await getFileObjFromModelSrc({
        ...props,
        compressType: this.state.compressType
      });

      await this.setState({ modelFile });

      // 判断是否有 onZip，有的话则进行压缩并且返回
      requestAnimationFrame(async () => {
        this.handleZip();
      });

      // 判断是否可以进行预览，不可以预览则仅设置
      if (!canTransformToGLTF(this.state.type) || !props.showModelViewer) {
        return;
      }

      // 进行模型实际加载，注意，不需要转化为
      const { mesh } = await loadMesh(
        modelFile || props.src,
        this.state.type,
        this.props.onError,
        false
      );

      this.initGeometry(mesh.geometry);
    } catch (e) {
      console.error('>>>WebGLViewer>>>loadModel', e);

      if (props.onError) {
        props.onError(e);
      }
    }
  }

  /** 初始化几何体 */
  initGeometry(geometry: THREE.BufferGeometry | THREE.Geometry) {
    this._setupScene();
    this._setupRenderer();

    const material = getMaterial(this.state.withClipping, this.state.modelColor);

    const { mesh, xDims, yDims, zDims } = adjustGeometry(geometry, material);

    this.xDims = xDims;
    this.yDims = yDims;
    this.zDims = zDims;
    this.model = mesh;

    if (this.state.withMaterial) {
      this.group.add(this.model);
    }

    this.scene.updateMatrixWorld();

    if (this.model) {
      setupLights(this.model, this.scene);
      this._setupControls();
      this._setupDecorators();
    }

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
    try {
      cancelAnimationFrame(this.animationId);

      if (this.scene !== null) {
        each(this.group.children, object => {
          if (this.group) {
            this.group.remove(object);
          }
        });

        each(this.scene.children, object => {
          if (this.scene) {
            this.scene.remove(object);
          }
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
    } catch (_) {
      console.error(_);
    }
  }

  /** 初始化场景 */
  _setupScene() {
    const scene = new THREE.Scene();
    const group = new THREE.Group();

    this.scene = scene;
    this.group = group;

    this.scene.add(this.group);
  }

  get $dom() {
    return this.$ref.current || document.getElementById('webgl-container');
  }

  /** 初始化渲染器 */
  _setupRenderer() {
    if (!this.$dom) {
      return;
    }

    const height = this.$dom.clientHeight;
    const width = this.$dom.clientWidth;

    const renderer = getThreeJsWebGLRenderer(
      { ...this.props, backgroundColor: this.state.backgroundColor },
      { height, width }
    );

    this.$dom.appendChild(renderer.domElement);

    this.renderer = renderer;
  }

  _setupAxisHelper() {
    if (this.model) {
      if (this.axisHelper && this.group) {
        this.group.remove(this.axisHelper);
      }

      // Get max dimention and add 50% overlap for plane
      // with a gutter of 10
      const geometry = this.model.geometry;

      if (geometry) {
        geometry.computeBoundingBox();
        geometry.computeBoundingSphere();

        let maxDimension: number = max([
          geometry.boundingBox.max.x,
          geometry.boundingBox.max.y,
          geometry.boundingBox.max.z
        ]);
        maxDimension = Math.ceil(~~(maxDimension * 1.5) / 10) * 10;

        const axisHelper = new THREE.AxesHelper(maxDimension);

        // reset center point
        axisHelper.position.x = 0;
        axisHelper.position.y = 0;
        axisHelper.position.z = 0;

        this.axisHelper = axisHelper;
        this.group.add(this.axisHelper);
      }
    }
  }

  /** 初始化控制器 */
  _setupControls() {
    this._setupCamera();

    if (this.camera && this.$dom) {
      this.orbitControls = new OrbitControls(this.camera, this.$dom);
      this.orbitControls.enableKeys = false;
      this.orbitControls.enableZoom = true;
      this.orbitControls.enablePan = true;
      this.orbitControls.addEventListener('change', this.renderScene);
    }
  }

  _setupCamera() {
    if (!this.$dom) {
      return;
    }

    const height = this.$dom.clientHeight;
    const width = this.$dom.clientWidth;
    const camera = new THREE.PerspectiveCamera(45, width / height, 1, 99999);

    const { model } = this;

    this.camera = camera;

    camera.add(new THREE.PointLight(0xcccccc, 2));

    if (model) {
      this._resetCamera();
    }
  }

  private _resetCamera() {
    if (this.model) {
      const geometry = this.model.geometry;

      if (geometry) {
        geometry.computeBoundingSphere();

        const g = this.model.geometry.boundingSphere.radius;
        const dist = g * 3;

        // fudge factor so you can see the boundaries
        this.camera.position.set(
          this.props.cameraX,
          this.props.cameraY,
          this.props.cameraZ || dist * fudge
        );
      }
    }
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

  renderScene = () => {
    // horizontal rotation
    if (!this.group) {
      return;
    }

    if (this.renderer) {
      this.renderer.render(this.scene, this.camera);
    }
  };

  _setupDecorators() {
    const { withWireframe, withBoundingBox } = this.state;

    this._setupPlane();

    if (withWireframe) {
      this._setupModelWireframe();
    }

    if (withBoundingBox) {
      this._setupBoundingBox();
    }

    if (typeof __DEV__ !== 'undefined') {
      this._setupAxisHelper();
    }
  }

  _setupModelWireframe() {
    const { model } = this;
    if (!model) {
      return;
    }

    if (this.modelWireframe && this.group) {
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

  /** 设置包裹体 */
  private _setupBoundingBox() {
    if (this.model) {
      if (this.boundingBox && this.group) {
        this.group.remove(this.boundingBox);
      }

      const wireframe = new THREE.WireframeGeometry(this.model.geometry);
      const line = new THREE.LineSegments(wireframe);

      (line.material as THREE.Material).depthTest = false;
      (line.material as THREE.Material).opacity = 0.75;
      (line.material as THREE.Material).transparent = true;

      // reset center point
      const box = new THREE.Box3().setFromObject(line);
      box.getCenter(line.position);
      line.position.multiplyScalar(-1);

      this.boundingBox = new THREE.BoxHelper(line);

      this.group.add(this.boundingBox);

      line.updateMatrix();
      const lineBox = line.geometry.boundingBox;
      const lineBoxMaxVertex = lineBox.max;

      const { topology } = this.state;

      const genSprite = (len: number) =>
        new TextSprite({
          fillStyle: 'rgb(255, 153, 0)',
          fontSize: 2.5,
          fontStyle: 'italic',
          text: `${toFixedNumber(len, 2)} mm`
        });

      this.xSprite = genSprite(topology.sizeX);
      this.ySprite = genSprite(topology.sizeY);
      this.zSprite = genSprite(topology.sizeZ);

      this.xSprite.position.set(0, lineBoxMaxVertex.y, lineBoxMaxVertex.z);
      this.ySprite.position.set(lineBoxMaxVertex.x, 0, lineBoxMaxVertex.z);
      this.zSprite.position.set(lineBoxMaxVertex.x, lineBoxMaxVertex.y, 0);

      this.group.add(this.xSprite);
      this.group.add(this.ySprite);
      this.group.add(this.zSprite);
    }
  }

  /** 设置平面 */
  _setupPlane() {
    if (this.model) {
      if (this.plane && this.group) {
        this.group.remove(this.plane);
      }

      // Getmax dimention and add 10% overlap for plane
      // with a gutter of 10
      const geometry = this.model.geometry;

      if (geometry) {
        geometry.computeBoundingBox();
        geometry.computeBoundingSphere();
      }

      let maxDimension = max([this.xDims, this.yDims, this.zDims]);
      maxDimension = Math.ceil(~~(maxDimension * 1.1) / 10) * 50;

      const plane = new THREE.GridHelper(maxDimension, 50);

      // reset center point
      const box = new THREE.Box3().setFromObject(plane);
      box.getCenter(plane.position);
      plane.position.multiplyScalar(-1);

      // plane.position.y = geometry.boundingSphere.center.y * -1;
      plane.position.y = this.yDims * -1;

      this.plane = plane;
      this.group.add(this.plane);
    }
  }

  onLoad = async () => {
    const { withAttr, onTopology, onLoad } = this.props;

    if (onLoad) {
      onLoad();
    }

    // 计算基础信息
    if ((onTopology || withAttr) && this.model) {
      const topology = await calcTopology(this.model);

      this.setState({ topology });

      if (onTopology) {
        onTopology(topology);
      }
    }
  };

  handleZip = async () => {
    const { src, onZip } = this.props;
    const { modelFile } = this.state;

    // 仅在传入了 Zipped 文件的情况下调用
    if (modelFile && onZip && src && this.state.compressType === 'none') {
      const zippedFile = await deflate(modelFile);

      onZip(zippedFile);
    }
  };

  /** 响应着色图变化 */
  onMaterialChange = (selected = true) => {
    if (this.state.withMaterial === selected) {
      return;
    }

    this.setState({
      withMaterial: selected
    });

    if (this.group) {
      if (selected) {
        this.group.add(this.model);
      } else {
        this.group.remove(this.model);
      }
    }
  };

  /** 响应底平面的变化 */
  onPlaneChange = (selected = true) => {
    const { withPlane } = this.state;

    if (withPlane !== selected) {
      if (this.plane && this.group) {
        this.group.remove(this.plane);
        this.plane = null;
      }

      if (selected) {
        this._setupPlane();
      }
    }

    this.setState({ withPlane: selected });
  };

  /** 响应线框图的变化 */
  onWireframeChange = (selected = true) => {
    const { withWireframe } = this.state;

    if (withWireframe !== selected) {
      if (this.modelWireframe && this.group) {
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
      if (this.group) {
        this.group.remove(this.boundingBox);
        this.group.remove(this.xSprite);
        this.group.remove(this.ySprite);
        this.group.remove(this.zSprite);
      }

      this.boundingBox = null;
      this.xSprite = null;
      this.ySprite = null;
      this.zSprite = null;
    }
  };

  onModelColorChange = (modelColor: string) => {
    this.setState({ modelColor }, () => {
      this.model.material = new THREE.MeshPhongMaterial({
        color: this.state.modelColor,
        specular: 0x111111,
        shininess: 20
      });
    });
  };

  enableFreshView() {
    this.onPlaneChange(false);
    this.renderer.setClearColor(new THREE.Color('rgba(255, 255, 255)'), 1);
    this.onModelColorChange('rgb(24,98,246)');
  }

  disableFreshView() {
    this.onPlaneChange(true);
    this.renderer.setClearColor(new THREE.Color(this.state.backgroundColor), 1);
    this.onModelColorChange(this.state.modelColor);
  }

  renderWebGL() {
    const { width, height, style } = this.props;

    const { loaded } = this.state;

    return (
      <div
        id="webgl-container"
        className="rmv-sv-webgl"
        ref={this.$ref}
        style={{ width, height, ...style }}
      >
        {!loaded && (
          <div
            style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center'
            }}
          >
            <Loader type="Puff" color="#00BFFF" height={100} width={100} />
          </div>
        )}
      </div>
    );
  }

  renderAttr() {
    const { fileName } = this.props;

    const { withAttr, topology } = this.state;

    return (
      withAttr &&
      topology && (
        <div className="rmv-gmv-attr-modal">
          <div className="rmv-gmv-attr-modal-row">
            {fileName && (
              <div className="item">
                {i18nFormat('名称')}：{ellipsis(fileName)}
              </div>
            )}
            <div className="item">
              {i18nFormat('尺寸')}：{toFixedNumber(topology.sizeX)}*{toFixedNumber(topology.sizeY)}*
              {toFixedNumber(topology.sizeZ)}
              {'mm'}
            </div>
            <div className="item">
              {i18nFormat('体积')}：{toFixedNumber(topology.volume)}
              {' mm³'}
            </div>
          </div>

          <div className="rmv-gmv-attr-modal-row">
            <div className="item">
              {i18nFormat('面积')}：{toFixedNumber(topology.area, 2)}
              {' mm²'}
            </div>
            <div className="item">
              {i18nFormat('面片')}：{topology.triangleCnt}
            </div>
            <div className="item">{i18nFormat('破损')}：-</div>
          </div>
        </div>
      )
    );
  }

  renderJoySticker() {
    const { topology } = this.state;

    return (
      <div className="rmv-sv-joystick">
        <div
          className="rmv-sv-joystick-center"
          onClick={() => {
            this._resetCamera();
          }}
        />
        <Holdable
          finite={false}
          onPress={() => {
            this.camera && this.camera.translateY(-topology.sizeY / 10);
          }}
        >
          <div
            className="rmv-gmv-attr-joystick-arrow rmv-gmv-attr-joystick-arrow-up"
            style={{ top: 0 }}
          >
            <i />
          </div>
        </Holdable>
        <Holdable
          finite={false}
          onPress={() => {
            this.camera && this.camera.translateY(topology.sizeY / 10);
          }}
        >
          <div
            className="rmv-gmv-attr-joystick-arrow rmv-gmv-attr-joystick-arrow-down"
            style={{ bottom: 0 }}
          >
            <i />
          </div>
        </Holdable>
        <Holdable
          finite={false}
          onPress={() => {
            this.camera && this.camera.translateX(-topology.sizeX / 10);
          }}
        >
          <div className="rmv-gmv-attr-joystick-arrow rmv-gmv-attr-joystick-arrow-left">
            <i />
          </div>
        </Holdable>
        <Holdable
          finite={false}
          onPress={() => {
            this.camera && this.camera.translateX(topology.sizeX / 10);
          }}
        >
          <div className="rmv-gmv-attr-joystick-arrow rmv-gmv-attr-joystick-arrow-right">
            <i />
          </div>
        </Holdable>
      </div>
    );
  }

  renderLoose() {
    const { width, withJoystick } = this.props;

    const {
      withMaterial,
      withWireframe,
      withBoundingBox,
      showColorPicker,
      withClipping,
      withLanguageSelector,
      isFreshViewEnabled
    } = this.state;

    return (
      <div className="rmv-sv-container rmv-sv-loose-container" style={{ width }}>
        {showColorPicker && (
          <div className="rmv-sv-color-picker">
            <SketchPicker
              color={this.state.modelColor}
              onChange={({ hex }) => {
                this.setState({ modelColor: hex }, () => {
                  if (this.model) {
                    this.model.material = getMaterial(
                      this.state.withClipping,
                      this.state.modelColor
                    );
                  }
                });
              }}
            />
          </div>
        )}
        <div className="rmv-sv-toolbar" style={{ width: withLanguageSelector ? 150 : 100 }}>
          <div className="rmv-sv-toolbar-item">
            <label htmlFor={`withMaterial-${this.id}`}>{i18nFormat('着色')}：</label>
            <Switch
              id={`withMaterial-${this.id}`}
              checked={withMaterial}
              onChange={e => {
                this.onMaterialChange(e.target.checked);
              }}
            />
          </div>
          <div className="rmv-sv-toolbar-item">
            <label htmlFor={`withWireframe-${this.id}`}>{i18nFormat('线框')}：</label>
            <Switch
              id={`withWireframe-${this.id}`}
              checked={withWireframe}
              onChange={e => {
                this.onWireframeChange(e.target.checked);
              }}
            />
          </div>
          <div className="rmv-sv-toolbar-item">
            <label htmlFor={`withBoundingBox-${this.id}`}>{i18nFormat('框体')}：</label>
            <Switch
              id={`withBoundingBox-${this.id}`}
              checked={withBoundingBox}
              onChange={e => {
                this.onBoundingBoxChange(e.target.checked);
              }}
            />
          </div>
          <div className="rmv-sv-toolbar-item">
            <label htmlFor={`showColorPicker-${this.id}`}>{i18nFormat('色盘')}：</label>
            <Switch
              id={`showColorPicker-${this.id}`}
              checked={showColorPicker}
              onChange={e => {
                this.setState({ showColorPicker: e.target.checked });
              }}
            />
          </div>
          <div className="rmv-sv-toolbar-item">
            <label htmlFor={`withClipping-${this.id}`}>{i18nFormat('剖切')}：</label>
            <Switch
              id={`withClipping-${this.id}`}
              checked={withClipping}
              onChange={e => {
                this.setState({ withClipping: e.target.checked }, () => {
                  this.model.material = getMaterial(this.state.withClipping, this.state.modelColor);
                });
              }}
            />
          </div>
          <div className="rmv-sv-toolbar-item">
            <label htmlFor={`withLanguageSelector-${this.id}`}>中/EN：</label>
            <Switch
              id={`withLanguageSelector-${this.id}`}
              checked={withLanguageSelector}
              onChange={e => {
                if (e.target.checked) {
                  setLocale('en');
                } else {
                  setLocale('zh');
                }

                this.setState({ withLanguageSelector: e.target.checked });
              }}
            />
          </div>
          {typeof __DEV__ !== 'undefined' && (
            <div className="rmv-sv-toolbar-item">
              <label htmlFor={`isFreshViewEnabled-${this.id}`}>简约：</label>
              <Switch
                id={`isFreshViewEnabled-${this.id}`}
                checked={isFreshViewEnabled}
                onChange={e => {
                  this.setState({ isFreshViewEnabled: e.target.checked });

                  if (e.target.checked) {
                    this.enableFreshView();
                  } else {
                    this.disableFreshView();
                  }
                }}
              />
            </div>
          )}
          {withJoystick && this.renderJoySticker()}
        </div>

        {this.renderAttr()}

        {this.renderWebGL()}
      </div>
    );
  }

  render() {
    const {
      width,
      height,
      style,
      layoutType,
      withJoystick,
      showCameraIcon,
      onSnapshot
    } = this.props;

    const {
      withMaterial,
      withWireframe,
      withBoundingBox,
      type,
      showColorPicker,
      withClipping,
      withLanguageSelector
    } = this.state;

    if (!canTransformToGLTF(type)) {
      return (
        <div
          className="rmv-sv-container"
          style={{ width, display: 'flex', justifyContent: 'center', alignItems: 'center' }}
        >
          <div
            className="rmv-sv-webgl"
            ref={this.$ref}
            style={{
              width,
              height,
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              ...style
            }}
          >
            该类型暂不支持预览！
          </div>
        </div>
      );
    }

    if (layoutType === 'loose') {
      // 宽松方式，即左右布局
      return this.renderLoose();
    }

    // 非宽松方式，即上下布局
    return (
      <div className="rmv-sv-container rmv-sv-compact-container" style={{ width }}>
        {showColorPicker && (
          <div
            className="rmv-sv-color-picker"
            style={{ bottom: -8, background: 'none', top: 'unset' }}
          >
            <SketchPicker
              color={this.state.modelColor}
              onChange={({ hex }) => {
                this.onModelColorChange(hex);
              }}
            />
          </div>
        )}
        <div className="rmv-sv-toolbar">
          <div className="rmv-sv-toolbar-left">
            <div className="rmv-sv-toolbar-item">
              <Switch
                id={`withMaterial-${this.id}`}
                checked={withMaterial}
                onChange={e => {
                  this.onMaterialChange(e.target.checked);
                }}
              />
              <label htmlFor={`withMaterial-${this.id}`}>{i18nFormat('着色')}</label>
            </div>
            <div className="rmv-sv-toolbar-item">
              <Switch
                id={`withWireframe-${this.id}`}
                checked={withWireframe}
                onChange={e => {
                  this.onWireframeChange(e.target.checked);
                }}
              />
              <label htmlFor={`withWireframe-${this.id}`}>{i18nFormat('线框')}</label>
            </div>
            <div className="rmv-sv-toolbar-item">
              <Switch
                id={`withBoundingBox-${this.id}`}
                checked={withBoundingBox}
                onChange={e => {
                  this.onBoundingBoxChange(e.target.checked);
                }}
              />
              <label htmlFor={`withBoundingBox-${this.id}`}>{i18nFormat('框体')}</label>
            </div>
            <div className="rmv-sv-toolbar-item">
              <Switch
                id={`showColorPicker-${this.id}`}
                checked={showColorPicker}
                onChange={e => {
                  this.setState({ showColorPicker: e.target.checked });
                }}
              />
              <label htmlFor={`showColorPicker-${this.id}`}>{i18nFormat('色盘')}</label>
            </div>
            <div className="rmv-sv-toolbar-item">
              <Switch
                id={`withClipping-${this.id}`}
                checked={withClipping}
                onChange={e => {
                  this.setState({ withClipping: e.target.checked }, () => {
                    this.model.material = getMaterial(
                      this.state.withClipping,
                      this.state.modelColor
                    );
                  });
                }}
              />
              <label htmlFor={`withClipping-${this.id}`}>{i18nFormat('剖切')}</label>
            </div>
            <div className="rmv-sv-toolbar-item">
              <Switch
                id={`withLanguageSelector-${this.id}`}
                checked={withLanguageSelector}
                onChange={e => {
                  if (e.target.checked) {
                    setLocale('en');
                  } else {
                    setLocale('zh');
                  }

                  this.setState({ withLanguageSelector: e.target.checked });
                }}
              />
              <label htmlFor={`withLanguageSelector-${this.id}`}>中/EN</label>
            </div>
          </div>
          <div className="rmv-sv-toolbar-right">
            {/** 是否显示截图 */}
            {onSnapshot && showCameraIcon && (
              <Tooltip placement="left" overlay="点击生成截图">
                <svg
                  viewBox="0 0 1024 1024"
                  version="1.1"
                  xmlns="http://www.w3.org/2000/svg"
                  p-id="671"
                  width="20px"
                  height="20px"
                  style={{ cursor: 'pointer' }}
                  onClick={() => {
                    try {
                      new ObjectSnapshotGenerator(
                        this.model,
                        this.camera,
                        this.renderer,
                        (dataUrl: string) => {
                          onSnapshot(dataUrl);
                        }
                      );
                    } catch (_) {
                      console.error(_);
                    }
                  }}
                >
                  <path
                    d="M970.88 803.2V375.04a98.56 98.56 0 0 0-97.92-97.92h-152.32L696.32 192a64 64 0 0 0-64-43.52H393.6a64 64 0 0 0-64 43.52l-26.24 84.48H151.04A97.92 97.92 0 0 0 53.12 375.04v428.8a97.92 97.92 0 0 0 97.92 97.92h721.92a98.56 98.56 0 0 0 97.92-98.56z m-64 0a33.92 33.92 0 0 1-33.92 33.92H151.04a33.92 33.92 0 0 1-33.92-33.92V375.04a33.92 33.92 0 0 1 33.92-33.92h176.64A32 32 0 0 0 359.04 320L384 211.2a14.08 14.08 0 0 1 7.04 0h243.84L665.6 320a32 32 0 0 0 30.72 23.68h176.64a33.92 33.92 0 0 1 33.92 33.92z"
                    fill="#ffffff"
                    p-id="672"
                  />
                  <path
                    d="M284.16 423.04H209.28a16 16 0 0 0 0 32h74.88a16 16 0 0 0 0-32zM512 384a188.16 188.16 0 1 0 188.16 192A188.8 188.8 0 0 0 512 384z m0 345.6A156.16 156.16 0 1 1 668.16 576 156.8 156.8 0 0 1 512 729.6z"
                    fill="#ffffff"
                    p-id="673"
                  />
                </svg>
              </Tooltip>
            )}
          </div>
        </div>
        {withJoystick && this.renderJoySticker()}
        {this.renderAttr()}
        {this.renderWebGL()}
      </div>
    );
  }
}
