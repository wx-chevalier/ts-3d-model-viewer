/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable @typescript-eslint/no-require-imports */
import { get, sleep } from '@m-fe/utils';
import * as THREE from 'three';

import { D3ModelCompressType, IModelViewerProps, ModelAttr } from '../types';
import { ObjectSnapshotGenerator } from '../types/ObjectSnapshotGenerator';
import { deflate } from '../utils/compressor';
import {
  getFileObjFromModelSrc,
  getModelCompressType,
} from '../utils/file_loader';
import { calcTopology } from '../utils/mesh';
import { render } from './render';

export async function compressD3Model(
  props: Partial<IModelViewerProps>,
  _targetCompressType: D3ModelCompressType, // TODO: 后续支持不同的压缩类型
): Promise<ArrayBuffer> {
  const compressType =
    props.compressType || getModelCompressType(props.fileName, props.src);
  const modelFile = await getFileObjFromModelSrc({
    ...props,
    compressType,
  });

  // 异步进行压缩操作
  const ab = await deflate(modelFile);

  return ab;
}

/** 解析模型并且进行一系列计算 */
export async function parseD3Model(
  _props: Partial<IModelViewerProps>,
  {
    withSnapshot = false,
    withWallThickness = false,
    withCompress = false,
  }: {
    withSnapshot: boolean;
    withWallThickness?: boolean;
    withCompress?: boolean;
  },
): Promise<{
  topology: ModelAttr;
  wallThickness: number;
  snapshot?: string;
  compressedArrayBuffer?: ArrayBuffer;
}> {
  let wallThickness = 0;
  let topology: ModelAttr;
  let snapshot: string;
  let compressedArrayBuffer: ArrayBuffer;

  return new Promise(async (resolve, reject) => {
    try {
      const { mesh, camera, renderer, modelFile, onDestroy } = await render({
        ..._props,
        withPlane: false,
        modelColor: 'rgb(34, 98, 246)',
      });

      /** 回调归结函数 */
      const onFinish = () => {
        if (!topology) {
          return;
        }

        if (withSnapshot && !snapshot) {
          return;
        }

        if (withCompress && !compressedArrayBuffer) {
          return;
        }

        resolve({ wallThickness, topology, snapshot, compressedArrayBuffer });

        onDestroy();
      };

      // 异步进行压缩操作
      deflate(modelFile).then(ab => {
        compressedArrayBuffer = ab;
        onFinish();
      });

      // 等待 1 秒
      await sleep(1 * 1000);

      topology = await calcTopology(mesh);

      if (withWallThickness) {
        try {
          wallThickness = calcWallThicknessByViolence(mesh);
        } catch (_) {
          console.error('>>>parseD3Model>>>getWallThickness>>>', _);
        }
      }

      if (withSnapshot) {
        // 执行截图
        await new ObjectSnapshotGenerator(
          mesh,
          camera,
          renderer,
          (dataUrl: string) => {
            // 执行清除操作
            snapshot = dataUrl;
            onFinish();
          },
        );
      }

      onFinish();
    } catch (_) {
      console.error('>>>facade>>>parseD3Model>>>error:', _);
      reject(_);
    }
  });
}

/** 暴力搜索计算壁厚 */
export function calcWallThicknessByViolence(mesh: THREE.Mesh) {
  let minDist = Number.MAX_VALUE;

  const raycaster = new THREE.Raycaster();
  let intersects = [];

  const pos: THREE.BufferAttribute = (mesh.geometry as THREE.BufferGeometry)
    .attributes.position as THREE.BufferAttribute;

  const ori = new THREE.Vector3();
  const dir = new THREE.Vector3();
  const a = new THREE.Vector3(),
    b = new THREE.Vector3(),
    c = new THREE.Vector3(),
    tri = new THREE.Triangle();

  const faces = pos.count / 3;

  const faceIndexList = Array.from({ length: faces }).map((_, i) => i);

  for (const i of faceIndexList) {
    a.fromBufferAttribute(pos, i * 3 + 0);
    b.fromBufferAttribute(pos, i * 3 + 1);
    c.fromBufferAttribute(pos, i * 3 + 2);
    tri.set(a, b, c);
    tri.getMidpoint(ori);
    tri.getNormal(dir);
    raycaster.set(ori, dir.negate());
    intersects = raycaster.intersectObject(mesh);
    const thisWallThickness = get(
      intersects,
      intersects => intersects[intersects.length > 1 ? 1 : 0].distance,
      Number.MAX_VALUE,
    );

    if (thisWallThickness === 0) {
      continue;
    }

    minDist = Math.min(minDist, thisWallThickness);
  }

  return minDist;
}
