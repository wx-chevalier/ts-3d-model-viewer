/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable @typescript-eslint/no-require-imports */
import { sleep } from '@m-fe/utils';
import { isNumber, max } from 'lodash';
import * as THREE from 'three';

import { defaultModelViewerProps, IModelViewerProps } from '../types';
import { ScreenshotObject } from '../types/ScreenshotObject';
import { getFileObjFromModelSrc, getModelCompressType, getModelType } from '../utils/file_loader';
import { loadMesh } from '../utils/mesh_loader';
import { adjustGeometry, getMaterial, getThreeJsWebGLRenderer, setupLights } from './renderer';

const fudge = 1.0;

/** 生成模型截图 */
export async function generateScreenshot(_props: Partial<IModelViewerProps>) {
  const props = { ...defaultModelViewerProps, ..._props };

  return new Promise(async (resolve, reject) => {
    try {
      const type = props.type || getModelType(props.fileName, props.src);
      const compressType = props.compressType || getModelCompressType(props.fileName, props.src);

      const modelFile = await getFileObjFromModelSrc({
        ...props,
        compressType
      });

      // 进行模型实际加载，注意，不需要转化为
      const {
        mesh: { geometry }
      } = await loadMesh(modelFile || props.src, type, props.onError, false);

      // 执行回收操作
      const scene = new THREE.Scene();
      const group = new THREE.Group();
      scene.add(group);

      const height = isNumber(props.height) ? props.height : 600;
      const width = isNumber(props.width) ? props.width : 600;

      const renderer = getThreeJsWebGLRenderer(props, { height, width });
      renderer.domElement.style.opacity = '0';
      document.body.appendChild(renderer.domElement);

      const material = getMaterial(false, props.modelColor);
      const { mesh, xDims, yDims, zDims } = adjustGeometry(geometry, material);

      group.add(mesh);
      scene.updateMatrixWorld();
      setupLights(mesh, scene);

      const camera = new THREE.PerspectiveCamera(45, width / height, 1, 99999);
      camera.add(new THREE.PointLight(0xcccccc, 2));
      geometry.computeBoundingSphere();
      const g = mesh.geometry.boundingSphere.radius;
      const dist = g * 3;
      // fudge factor so you can see the boundaries
      camera.position.set(props.cameraX, props.cameraY, props.cameraZ || dist * fudge);

      let maxDimension = max([xDims, yDims, zDims]);
      maxDimension = Math.ceil(~~(maxDimension * 1.1) / 10) * 50;

      const plane = new THREE.GridHelper(maxDimension, 50);

      // reset center point
      const box = new THREE.Box3().setFromObject(plane);
      box.getCenter(plane.position);
      plane.position.multiplyScalar(-1);

      // plane.position.y = geometry.boundingSphere.center.y * -1;
      plane.position.y = yDims * -1;
      group.add(plane);

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

      // 等待 1 秒
      await sleep(1 * 1000);

      // 执行截图
      new ScreenshotObject(mesh, camera, renderer, (dataUrl: string) => {
        // 执行清除操作
        resolve(dataUrl);

        cancelAnimationFrame(animationId);
        renderer.dispose();
        renderer.forceContextLoss();

        document.body.removeChild(renderer.domElement);
      });
    } catch (_) {
      console.error(_);
    }
  });
}
