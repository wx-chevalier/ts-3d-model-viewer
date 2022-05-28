import { toFixedNumber } from '@m-fe/utils/dist/types';
import TextSprite from '@seregpie/three.text-sprite';
import { max } from 'lodash';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

import {
  D3ModelViewerProps,
  D3ModelViewerState,
  D3ModelViewerTheme,
  mergeD3ModelViewerProps,
} from '../../../types';
import {
  deflate,
  getFileObjFromModelSrc,
  isSupportThreejsLoader,
  loadMeshWithRetry,
} from '../../io';
import { calcTopology, ObjectSnapshotGenerator } from '../derivation';
import {
  adjustGeometry,
  getMaterial,
  getThreeJsWebGLRenderer,
  setupLights,
} from '../stages';
import { ThreeRendererContext } from './ThreeRendererContext';

const fudge = 1.0;

export class ThreeRenderer {
  animationId: number;
  context: ThreeRendererContext;

  onContextChange: () => void;
  getViewerState: () => D3ModelViewerState;
  getDom: () => HTMLDivElement;

  constructor(
    // viewerProps 相对是常量
    public viewerProps: D3ModelViewerProps,
    {
      getDom,
      getViewerState,
      onContextChange,
    }: {
      getDom: () => HTMLDivElement;
      getViewerState: () => D3ModelViewerState;
      onContextChange: () => void;
    },
  ) {
    this.getDom = getDom;
    this.getViewerState = getViewerState;
    this.onContextChange = onContextChange;
  }

  init() {
    this.context = new ThreeRendererContext(this.viewerProps);
    this.loadModel();
  }

  /** 清除实体 */
  destroy() {
    try {
      cancelAnimationFrame(this.animationId);

      if (this.group !== null) {
        each(this.group.children, object => {
          if (this.group) {
            this.group.remove(object);
          }
        });
      }

      if (this.scene !== null) {
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

  /** 这里根据传入的文件类型，进行不同的文件转化 */
  async loadModel() {
    const props = this.viewerProps;

    try {
      let mesh: THREE.Mesh;

      if (props.mesh) {
        mesh = props.mesh;
      } else {
        const modelFile = await getFileObjFromModelSrc({
          ...props,
          compressType: this.viewerProps.compressType,
        });

        this.context.modelFile = modelFile;

        // 判断是否有 onZip，有的话则进行压缩并且返回
        requestAnimationFrame(async () => {
          this.handleCompress();
        });

        // 判断是否可以进行预览，不可以预览则仅设置
        if (
          !isSupportThreejsLoader(props.type) ||
          !props.renderOptions.withMesh
        ) {
          return;
        }

        // 进行模型实际加载，注意，不需要转化为
        ({ mesh } = await loadMeshWithRetry(
          modelFile || props.src,
          props.type,
          {
            toGltf: false,
            originSrc: props.src as string,
          },
        ));
      }

      this.initGeometry(mesh.geometry as THREE.BufferGeometry);

      // 根据 props 配置当前显示的主题
      this.changeTheme(props.renderOptions.theme);
    } catch (e) {
      console.error('>>>WebGLViewer>>>loadModel', e);

      if (props.onError) {
        props.onError(e as Error);
      }
    }
  }

  changeModelColor = (modelColor: string) => {
    this.context.model.material = new THREE.MeshPhongMaterial({
      color: modelColor,
      specular: 0x111111,
      shininess: 20,
    });
  };

  async changeTheme(theme: D3ModelViewerTheme) {
    if (theme === this.context.theme) {
      return;
    }

    this.context.theme = theme;

    // 否则进行主题切换
    if (theme === 'fresh') {
    } else {
    }

    this.onContextChange();
  }

  async removeBoundingBox() {
    const context = this.context;

    if (context.group) {
      context.group.remove(context.boundingBox);
      context.group.remove(context.xSprite);
      context.group.remove(context.ySprite);
      context.group.remove(context.zSprite);
    }

    context.boundingBox = null;
    context.xSprite = null;
    context.ySprite = null;
    context.zSprite = null;

    this.onContextChange();
  }

  async setupBoundingBox() {
    const context = this.context;

    if (context.model) {
      if (context.boundingBox && context.group) {
        context.group.remove(context.boundingBox);
      }

      const wireframe = new THREE.WireframeGeometry(context.model.geometry);
      const line = new THREE.LineSegments(wireframe);

      (line.material as THREE.Material).depthTest = false;
      (line.material as THREE.Material).opacity = 0.75;
      (line.material as THREE.Material).transparent = true;

      // reset center point
      const box = new THREE.Box3().setFromObject(line);
      box.getCenter(line.position);
      line.position.multiplyScalar(-1);

      context.boundingBox = new THREE.BoxHelper(line);

      context.group.add(context.boundingBox);

      line.updateMatrix();
      const lineBox = line.geometry.boundingBox;
      const lineBoxMaxVertex = lineBox.max;

      const { topology } = context;

      const genSprite = (len: number) =>
        new TextSprite({
          fillStyle: 'rgb(255, 153, 0)',
          fontSize: 2.5,
          fontStyle: 'italic',
          text: `${toFixedNumber(len, 2)} mm`,
        });

      context.xSprite = genSprite(topology.sizeX);
      context.ySprite = genSprite(topology.sizeY);
      context.zSprite = genSprite(topology.sizeZ);

      context.xSprite.position.set(0, lineBoxMaxVertex.y, lineBoxMaxVertex.z);
      context.ySprite.position.set(lineBoxMaxVertex.x, 0, lineBoxMaxVertex.z);
      context.zSprite.position.set(lineBoxMaxVertex.x, lineBoxMaxVertex.y, 0);

      context.group.add(context.xSprite);
      context.group.add(context.ySprite);
      context.group.add(context.zSprite);

      this.onContextChange();
    }
  }

  async removeWireFrame() {
    const context = this.context;
    if (context.modelWireframe && context.group) {
      context.group.remove(context.modelWireframe);
      context.modelWireframe = null;

      this.onContextChange();
    }
  }

  async setupWireframe() {
    const context = this.context;

    if (context.model) {
      if (context.modelWireframe && context.group) {
        context.group.remove(context.modelWireframe);
      }

      const material = new THREE.MeshPhongMaterial({
        color: 0xffffff,
        specular: 0x111111,
        shininess: 20,
        wireframe: true,
      });

      const mesh = context.model.clone();
      mesh.material = material;

      context.modelWireframe = mesh;
      context.group.add(mesh);

      this.onContextChange();
    }
  }

  async removeAxisHelper() {
    const { context } = this;

    if (context.axisHelper && context.group) {
      context.group.remove(context.axisHelper);
    }
  }

  async setupAxisHelper() {
    const { context } = this;

    this.removeAxisHelper();

    if (context.model) {
      // Get max dimention and add 50% overlap for plane
      // with a gutter of 10
      const geometry = context.model.geometry;

      if (geometry) {
        geometry.computeBoundingBox();
        geometry.computeBoundingSphere();

        let maxDimension: number = max([
          geometry.boundingBox.max.x,
          geometry.boundingBox.max.y,
          geometry.boundingBox.max.z,
        ]);
        maxDimension = Math.ceil(~~(maxDimension * 1.5) / 10) * 10;

        const axisHelper = new THREE.AxesHelper(maxDimension);

        // reset center point
        axisHelper.position.x = 0;
        axisHelper.position.y = 0;
        axisHelper.position.z = 0;

        context.axisHelper = axisHelper;
        context.group.add(context.axisHelper);
      }
    }
  }

  async removePlane() {
    if (this.context.plane && this.context.group) {
      this.context.group.remove(this.context.plane);
      this.context.plane = null;
    }
    this.onContextChange();
  }

  async setupPlane() {
    if (this.context.model) {
      if (this.context.plane && this.context.group) {
        this.context.group.remove(this.context.plane);
      }

      // Getmax dimention and add 10% overlap for plane
      // with a gutter of 10
      const geometry = this.context.model.geometry;

      if (geometry) {
        geometry.computeBoundingBox();
        geometry.computeBoundingSphere();
      }

      let maxDimension = max([
        this.context.xDims,
        this.context.yDims,
        this.context.zDims,
      ]);
      maxDimension = Math.ceil(~~(maxDimension * 1.1) / 10) * 50;

      const plane = new THREE.GridHelper(maxDimension, 50);

      // reset center point
      const box = new THREE.Box3().setFromObject(plane);
      box.getCenter(plane.position);
      plane.position.multiplyScalar(-1);

      // plane.position.y = geometry.boundingSphere.center.y * -1;
      plane.position.y = this.context.yDims * -1;

      this.context.plane = plane;
      this.context.group.add(this.context.plane);
    }

    this.onContextChange();
  }

  /** 初始化几何体 */
  private initGeometry(geometry: THREE.BufferGeometry) {
    this.setupScene();
    this.setupRenderer();

    const context = this.context;
    const viewerState = this.getViewerState();

    const material = getMaterial(
      context.withClipping,
      this.getViewerState().modelColor,
    );

    const { mesh, xDims, yDims, zDims } = adjustGeometry(geometry, material);

    context.xDims = xDims;
    context.yDims = yDims;
    context.zDims = zDims;
    context.model = mesh;

    if (viewerState.withMaterial) {
      context.group.add(context.model);
    }

    context.scene.updateMatrixWorld();

    if (context.model) {
      setupLights(context.model, context.scene);
      this.setupControls();
      this.setupDecorators();
    }

    requestAnimationFrame(time => {
      this.animate(time);

      context.hasModelFileLoaded = true;

      // 已加载完毕
      context.hasModelFileLoaded = true;
      this.onLoad();
    });
  }

  /** 初始化场景 */
  private setupScene() {
    const scene = new THREE.Scene();
    const group = new THREE.Group();

    const { context } = this;

    context.scene = scene;
    context.group = group;

    context.scene.add(context.group);
  }

  get $dom() {
    return this.getDom();
  }

  /** 初始化渲染器 */
  private setupRenderer() {
    if (!this.$dom) {
      return;
    }

    const height = this.$dom.clientHeight;
    const width = this.$dom.clientWidth;

    const renderer = getThreeJsWebGLRenderer(
      mergeD3ModelViewerProps(
        {
          renderOptions: {
            backgroundColor: this.getViewerState().backgroundColor,
          },
        },
        this.viewerProps,
      ),

      { height, width },
    );

    this.$dom.appendChild(renderer.domElement);

    this.context.renderer = renderer;
  }

  /** 初始化控制器 */
  private setupControls() {
    this.setupCamera();

    if (this.context.camera && this.$dom) {
      this.context.orbitControls = new OrbitControls(
        this.context.camera,
        this.$dom,
      );
      this.context.orbitControls.enableKeys = false;
      this.context.orbitControls.enableZoom = true;
      this.context.orbitControls.enablePan = true;
      this.context.orbitControls.addEventListener('change', this.renderScene);
    }
  }

  private setupCamera() {
    if (!this.$dom) {
      return;
    }

    const height = this.$dom.clientHeight;
    const width = this.$dom.clientWidth;
    const camera = new THREE.PerspectiveCamera(45, width / height, 1, 99999);

    const { model } = this.context;

    this.context.camera = camera;

    camera.add(new THREE.PointLight(0xcccccc, 2));

    if (model) {
      this.resetCamera();
    }
  }

  private resetCamera() {
    const context = this.context;

    if (context.model) {
      const geometry = context.model.geometry;

      if (geometry) {
        geometry.computeBoundingSphere();

        const g = context.model.geometry.boundingSphere.radius;
        const dist = g * 3;

        // fudge factor so you can see the boundaries
        context.camera.position.set(
          this.viewerProps.renderOptions.cameraX,
          this.viewerProps.renderOptions.cameraY,
          this.viewerProps.renderOptions.cameraZ || dist * fudge,
        );
      }
    }
  }

  private renderScene = () => {
    const context = this.context;
    // horizontal rotation
    if (!context.group) {
      return;
    }

    if (context.renderer) {
      context.renderer.render(context.scene, context.camera);
    }
  };

  private setupDecorators() {
    const { withWireframe, withBoundingBox } = this.getViewerState();

    this.setupPlane();

    if (withWireframe) {
      this.setupWireframe();
    }

    if (withBoundingBox) {
      this.setupBoundingBox();
    }

    if (this.viewerProps.renderOptions.withAxisHelper) {
      this.setupAxisHelper();
    }
  }

  /** 动画 */
  private animate(time: number) {
    this.animationId = requestAnimationFrame(time => {
      this.animate(time);
    });

    // if (this.controls) {
    //   this.controls.update(time);
    // }

    this.renderScene();
  }

  /** 加载完成事件 */

  onLoad = async () => {
    const {
      layoutOptions: { withAttrIcon, autoCapture },
      onTopology,
      onLoad,
      onSnapshot,
    } = this.viewerProps;

    if (onLoad) {
      // 调用外部事件
      onLoad();
    }

    const { context } = this;

    // 计算基础信息
    if ((onTopology || withAttrIcon) && context.model) {
      const topology = await calcTopology(context.model);

      context.topology = topology;

      if (onTopology) {
        onTopology(topology);
      }
    }

    // 自动截图
    if (autoCapture && onSnapshot) {
      new ObjectSnapshotGenerator(
        context.model,
        context.camera,
        context.renderer,
        (dataUrl: string) => {
          onSnapshot(dataUrl);
        },
      );
    }
  };

  /** 处理压缩 */
  private handleCompress = async () => {
    const { src, compressType, onCompress } = this.viewerProps;
    const { modelFile } = this.context;

    // 仅在传入了 Zipped 文件的情况下调用
    if (modelFile && onCompress && src && compressType === 'none') {
      const compressedFile = await deflate(modelFile);

      onCompress(compressedFile);
    }
  };
}
