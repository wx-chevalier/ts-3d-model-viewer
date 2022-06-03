import { genId, sleep, toFixedNumber } from '@m-fe/utils';
import TextSprite from '@seregpie/three.text-sprite';
import each from 'lodash/each';
import max from 'lodash/max';
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
  cookMeshMaterial,
  getThreeJsWebGLRenderer,
  setupLights,
} from '../stages';
import { ThreeRendererContext } from './ThreeRendererContext';

const fudge = 1.0;

export class ThreeRenderer {
  id = genId();

  animationId: number;
  context: ThreeRendererContext;

  onContextChange: (partialViewerState: Partial<D3ModelViewerState>) => void;
  getViewerState: () => D3ModelViewerState;
  getDom: () => HTMLElement;

  constructor(
    // viewerProps 相对是常量
    public viewerProps: D3ModelViewerProps,
    {
      getDom,
      getViewerState,
      onContextChange,
    }: {
      getDom: () => HTMLElement;
      getViewerState: () => D3ModelViewerState;
      onContextChange: (
        partialViewerState: Partial<D3ModelViewerState>,
      ) => void;
    },
  ) {
    this.getDom = getDom;
    this.getViewerState = getViewerState;
    this.onContextChange = onContextChange;
  }

  async init() {
    this.context = new ThreeRendererContext(this.viewerProps);

    this.onContextChange({ hasModelFileLoaded: false });

    await this.loadModel();
  }

  /** 清除实体 */
  destroy() {
    try {
      cancelAnimationFrame(this.animationId);

      const context = this.context;

      if (context.group !== null) {
        each(context.group.children, object => {
          if (context.group) {
            context.group.remove(object);
          }
        });
      }

      if (context.scene !== null) {
        each(context.scene.children, object => {
          if (context.scene) {
            context.scene.remove(object);
          }
        });
      }

      context.scene = null;
      context.group = null;
      context.model = null;
      context.modelWireframe = null;
      context.boundingBox = null;

      context.renderer.dispose();
      context.renderer.forceContextLoss();

      if (this.getDom()) {
        this.getDom().remove();
      }
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
        requestAnimationFrame(() => {
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

      await this.initGeometry(mesh.geometry as THREE.BufferGeometry);

      // 根据 props 配置当前显示的主题
      this.changeTheme(props.renderOptions.theme);
    } catch (e) {
      console.error('>>>WebGLViewer>>>loadModel', e);

      if (props.onError) {
        props.onError(e as Error);
      }
    }
  }

  changeMaterial = (material: THREE.Material) => {
    const context = this.context;

    if (context.model) {
      context.model.material = material;
    }
  };

  changeModelColor = (modelColor: string) => {
    this.context.model.material = new THREE.MeshPhongMaterial({
      color: modelColor,
      specular: 0x111111,
      shininess: 20,
    });

    this.onContextChange({ modelColor });
  };

  changeTheme(theme: D3ModelViewerTheme) {
    if (theme === this.context.theme) {
      return;
    }

    this.context.theme = theme;

    // 否则进行主题切换
    if (theme === 'fresh') {
      this.removePlane();
      this.context.renderer.setClearColor(
        new THREE.Color('rgba(255, 255, 255)'),
        1,
      );
      this.changeModelColor('rgb(24,98,246)');
    } else {
      this.setupPlane();
      const state = this.getViewerState();
      this.context.renderer.setClearColor(
        new THREE.Color(state.backgroundColor),
        1,
      );
      this.changeModelColor(state.modelColor);
    }

    this.onContextChange({ theme });
  }

  /** 移除着色图 */
  removeMaterialedMesh() {
    const context = this.context;

    if (context.group) {
      context.group.remove(this.context.model);
    }

    this.onContextChange({ withMaterialedMesh: false });
  }

  /** 添加着色图 */
  setupMaterialedMesh() {
    const context = this.context;

    if (context.group) {
      context.group.add(this.context.model);

      this.onContextChange({ withMaterialedMesh: true });
    }
  }

  /** 移除包围盒 */
  removeBoundingBox() {
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

    this.onContextChange({ withBoundingBox: false });
  }

  setupBoundingBox() {
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

      const genSprite = (len: number) => {
        const s = new TextSprite({
          fillStyle: 'rgb(255, 153, 0)',
          fontSize: 2.5,
          fontStyle: 'italic',
          text: `${toFixedNumber(len, 2)} mm`,
        });

        return s;
      };

      try {
        context.xSprite = genSprite(topology.sizeX);
        context.ySprite = genSprite(topology.sizeY);
        context.zSprite = genSprite(topology.sizeZ);

        context.xSprite.position.set(0, lineBoxMaxVertex.y, lineBoxMaxVertex.z);
        context.ySprite.position.set(lineBoxMaxVertex.x, 0, lineBoxMaxVertex.z);
        context.zSprite.position.set(lineBoxMaxVertex.x, lineBoxMaxVertex.y, 0);

        context.group.add(context.xSprite);
        context.group.add(context.ySprite);
        context.group.add(context.zSprite);
      } catch (_) {
        console.error('>>>ThreeRenderer>>>genSprite>>>error: ', _);
      }

      this.onContextChange({ withBoundingBox: true });
    }
  }

  removeWireFrame() {
    const context = this.context;
    if (context.modelWireframe && context.group) {
      context.group.remove(context.modelWireframe);
      context.modelWireframe = null;

      this.onContextChange({ withWireframe: false });
    }
  }

  setupWireframe() {
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

      this.onContextChange({ withWireframe: true });
    }
  }

  removeAxisHelper() {
    const { context } = this;

    if (context.axisHelper && context.group) {
      context.group.remove(context.axisHelper);

      this.onContextChange({ withAxisHelper: false });
    }
  }

  setupAxisHelper() {
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

        this.onContextChange({ withAxisHelper: true });
      }
    }
  }

  removePlane() {
    if (this.context.plane && this.context.group) {
      this.context.group.remove(this.context.plane);
      this.context.plane = null;
      this.onContextChange({ withPlane: false });
    }
  }

  setupPlane() {
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

      this.onContextChange({ withPlane: true });
    }
  }

  moveUp() {
    const { camera, topology } = this.context;
    camera.translateY(-topology.sizeY / 10);
  }

  moveDown() {
    const { camera, topology } = this.context;
    camera.translateY(topology.sizeY / 10);
  }

  moveLeft() {
    const { camera, topology } = this.context;
    camera.translateX(-topology.sizeX / 10);
  }

  moveRight() {
    const { camera, topology } = this.context;
    camera.translateX(topology.sizeX / 10);
  }

  /** 重置相机 */
  resetCamera() {
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

  /** 初始化几何体 */
  private async initGeometry(geometry: THREE.BufferGeometry) {
    this.setupScene();
    await this.setupRenderer();

    const context = this.context;
    const viewerState = this.getViewerState();

    const material = cookMeshMaterial(
      context.withClipping,
      this.getViewerState().modelColor,
    );

    const { mesh, xDims, yDims, zDims } = adjustGeometry(geometry, material);

    context.xDims = xDims;
    context.yDims = yDims;
    context.zDims = zDims;
    context.model = mesh;

    if (viewerState.withMaterialedMesh) {
      context.group.add(context.model);
    }

    context.scene.updateMatrixWorld();

    if (context.model) {
      setupLights(context.model, context.scene);
      this.setupControls();
      this.setupDecorators();
    }

    console.log('>>>ThreeRenderer>>>initGeometry>>>load successfully');

    requestAnimationFrame(async time => {
      this.animate(time);

      await this.onLoad();

      this.onContextChange({ hasModelFileLoaded: true });
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
  private async setupRenderer() {
    // 等待 $dom 有效，如果超时则抛出异常，最大等待 30s
    for (let i = 0; i < 30; i++) {
      await sleep(1000);
      if (this.$dom) {
        break;
      }
    }

    if (!this.$dom) {
      throw new Error('Invalid dom');
    }

    const height = this.$dom.clientHeight;
    const width = this.$dom.clientWidth;

    const renderer = getThreeJsWebGLRenderer(
      mergeD3ModelViewerProps({
        currentProps: {
          renderOptions: {
            backgroundColor: this.getViewerState().backgroundColor,
          },
        },
        originProps: this.viewerProps,
      }),

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
    if (context.model) {
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
