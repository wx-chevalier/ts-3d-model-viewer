import * as THREE from 'three';

import { ModelAttr } from '../types/ModelAttr';
import { Vector3 } from '../types/Vector3';

/** 计算某个 Mesh 的拓扑信息 */
export async function calcTopology(mesh: THREE.Mesh): Promise<ModelAttr> {
  return new Promise(resolve => {
    const attr = new ModelAttr();

    const box = new THREE.Box3().setFromObject(mesh);

    attr.sizeZ = box.max.z - box.min.z;
    attr.sizeX = box.max.x - box.min.x;
    attr.sizeY = box.max.y - box.min.y;

    let vol = 0;
    let area = 0;
    let triCnt = 0;

    mesh.traverse(child => {
      if (child instanceof THREE.Mesh) {
        const positions = (child.geometry as any).getAttribute('position').array;
        for (let i = 0; i < positions.length; i += 9) {
          const t1: any = {};
          t1.x = positions[i + 0];
          t1.y = positions[i + 1];
          t1.z = positions[i + 2];
          const v1 = new Vector3(t1.x, t1.y, t1.z);

          const t2: any = {};
          t2.x = positions[i + 3];
          t2.y = positions[i + 4];
          t2.z = positions[i + 5];
          const v2 = new Vector3(t2.x, t2.y, t2.z);

          const t3: any = {};
          t3.x = positions[i + 6];
          t3.y = positions[i + 7];
          t3.z = positions[i + 8];
          const v3 = new Vector3(t3.x, t3.y, t3.z);

          triCnt += 1;

          // 计算表面积
          const ab = v2.clone().sub(v1);
          const ac = v3.clone().sub(v1);
          area +=
            ab
              .clone()
              .cross(ac)
              .length() / 2;

          const mVol = signedVolumeOfTriangle(t1, t2, t3);

          vol += mVol;
        }
      }
    });

    attr.volume = Math.abs(vol);
    attr.triangleCnt = triCnt;
    attr.area = Math.abs(area);

    resolve(attr);
  });
}

/** 计算某个面片的信息 */
function signedVolumeOfTriangle(p1: any, p2: any, p3: any) {
  const v321 = p3.x * p2.y * p1.z;
  const v231 = p2.x * p3.y * p1.z;
  const v312 = p3.x * p1.y * p2.z;
  const v132 = p1.x * p3.y * p2.z;
  const v213 = p2.x * p1.y * p3.z;
  const v123 = p1.x * p2.y * p3.z;

  return (-v321 + v231 + v312 - v132 - v213 + v123) / 6;
}
