/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable @typescript-eslint/no-require-imports */
import { sleep, get } from '@m-fe/utils';
import * as THREE from 'three';

import { IModelViewerProps, ModelAttr } from '../types';
import { ObjectSnapshotGenerator } from '../types/ObjectSnapshotGenerator';
import { calcTopology } from '../utils/mesh';
import { render } from './render';

/** 生成模型截图 */
export async function parseD3Model(
  _props: Partial<IModelViewerProps>,
  {
    withSnapshot = false,
    withWallThickness = false
  }: { withSnapshot: boolean; withWallThickness?: boolean }
): Promise<{
  topology: ModelAttr;
  wallThickness: number;
  snapshot?: string;
}> {
  let wallThickness = 0;
  return new Promise(async (resolve, reject) => {
    try {
      const { mesh, camera, renderer, onDestroy } = await render({
        ..._props,
        withPlane: false,
        modelColor: 'rgb(34, 98, 246)'
      });

      // 等待 1 秒
      await sleep(1 * 1000);

      const topology = await calcTopology(mesh);

      if (withWallThickness) {
        try {
          wallThickness = await calcWallThicknessByViolence(mesh);
        } catch (_) {
          console.error('>>>parseD3Model>>>getWallThickness>>>', _);
        }
      }

      if (withSnapshot) {
        // 执行截图
        new ObjectSnapshotGenerator(mesh, camera, renderer, (dataUrl: string) => {
          // 执行清除操作
          resolve({ snapshot: dataUrl, topology, wallThickness });
          onDestroy();
        });
      } else {
        resolve({ topology, wallThickness });
        onDestroy();
      }
    } catch (_) {
      console.error(_);
      reject(_);
    }
  });
}

/** 暴力搜索计算壁厚 */
export function calcWallThicknessByViolence(mesh: THREE.Mesh) {
  let minDist = Number.MAX_VALUE;

  const raycaster = new THREE.Raycaster();
  let intersects = [];

  const pos: THREE.BufferAttribute = (mesh.geometry as THREE.BufferGeometry).attributes
    .position as THREE.BufferAttribute;

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
      Number.MAX_VALUE
    );

    if (thisWallThickness === 0) {
      continue;
    }

    minDist = Math.min(minDist, thisWallThickness);
  }

  return minDist;
}
