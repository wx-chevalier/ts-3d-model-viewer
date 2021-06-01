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
          wallThickness = await getWallThickness(mesh);
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

export function getWallThickness(mesh: THREE.Mesh) {
  let minDist = 0.6;

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

  for (let i = 0; i < faces; i++) {
    a.fromBufferAttribute(pos, i * 3 + 0);
    b.fromBufferAttribute(pos, i * 3 + 1);
    c.fromBufferAttribute(pos, i * 3 + 2);
    tri.set(a, b, c);
    tri.getMidpoint(ori);
    tri.getNormal(dir);
    raycaster.set(ori, dir.negate());
    intersects = raycaster.intersectObject(mesh);
    minDist = Math.min(
      minDist,
      get(
        intersects,
        intersects => intersects[intersects.length > 1 ? 1 : 0].distance,
        Number.MAX_VALUE
      )
    );
  }

  return minDist;
}
