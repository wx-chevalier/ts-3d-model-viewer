/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable @typescript-eslint/no-require-imports */
import isNumber from 'lodash/isNumber';
import max from 'lodash/max';
import * as THREE from 'three';

import { defaultModelViewerProps, IModelViewerProps } from '../types';
import {
  getFileObjFromModelSrc,
  getModelCompressType,
  getModelType,
} from '../utils/io/importer/file-loader';
import { loadMesh } from '../utils/io/importer/mesh-loader';
import {
  adjustGeometry,
  getMaterial,
  getThreeJsWebGLRenderer,
  setupLights,
} from './stage';

const fudge = 1.0;

/** 生成模型截图 */
export async function render(_props: Partial<IModelViewerProps>) {
  try {
    const props = { ...defaultModelViewerProps, ..._props };
    const type = props.type || getModelType(props.fileName, props.src);
    const compressType =
      props.compressType || getModelCompressType(props.fileName, props.src);
    const modelFile = await getFileObjFromModelSrc({
      ...props,
      compressType,
    });

    // 进行模型实际加载，注意，不需要转化为
    const {
      mesh: { geometry },
    } = await loadMesh(modelFile || props.src, type, {
      toGltf: false,
    });
    // 执行回收操作
    const scene = new THREE.Scene();
    const group = new THREE.Group();
    scene.add(group);

    const height = isNumber(props.height) ? props.height : 600;
    const width = isNumber(props.width) ? props.width : 600;

    const renderer = getThreeJsWebGLRenderer(
      { ...props, backgroundColor: 'rgb(255,255,255)' },
      { height, width },
    );
    renderer.domElement.style.opacity = '0';
    document.body.appendChild(renderer.domElement);

    const material = getMaterial(false, props.modelColor);
    const { mesh, xDims, yDims, zDims } = adjustGeometry(
      geometry as THREE.BufferGeometry,
      material,
    );

    group.add(mesh);
    scene.updateMatrixWorld();
    setupLights(mesh, scene);

    const camera = new THREE.PerspectiveCamera(45, width / height, 1, 99999);
    camera.add(new THREE.PointLight(0xcccccc, 2));
    geometry.computeBoundingSphere();
    const g = mesh.geometry.boundingSphere.radius;
    const dist = g * 3;
    // fudge factor so you can see the boundaries
    camera.position.set(
      props.cameraX,
      props.cameraY,
      props.cameraZ || dist * fudge,
    );

    let maxDimension = max([xDims, yDims, zDims]);
    maxDimension = Math.ceil(~~(maxDimension * 1.1) / 10) * 50;

    if (props.withPlane) {
      const plane = new THREE.GridHelper(maxDimension, 50);
      // reset center point
      const box = new THREE.Box3().setFromObject(plane);
      box.getCenter(plane.position);
      plane.position.multiplyScalar(-1);
      // plane.position.y = geometry.boundingSphere.center.y * -1;
      plane.position.y = yDims * -1;
      group.add(plane);
    }

    let animationId: number;

    const animate = (_time: number) => {
      animationId = requestAnimationFrame(time => {
        animate(time);
      });
      renderer.render(scene, camera);
    };

    requestAnimationFrame(t => {
      animate(t);
    });

    return {
      modelFile,
      mesh,
      camera,
      renderer,
      onDestroy: () => {
        try {
          cancelAnimationFrame(animationId);
          renderer.dispose();
          renderer.forceContextLoss();

          const parent =
            renderer.domElement.parentElement || renderer.domElement.parentNode;

          if (parent) {
            parent.removeChild(renderer.domElement);
          } else {
            renderer.domElement.remove();
          }
        } catch (_) {
          console.error(
            '>>>webgl-viewer>>>headless>>>render>>>onDestroy>>>error:',
            _,
          );
        }
      },
    };
  } catch (error) {
    console.error('>>>webgl-viewer>>>headless>>>render>>>error: ', error);
    if (_props.onError) {
      _props.onError(error as Error);
    }
  }
}
