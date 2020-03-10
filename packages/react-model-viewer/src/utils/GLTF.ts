import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader';
import { PLYLoader } from 'three/examples/jsm/loaders/PLYLoader';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader';

import { ModelSrc, ModelType } from '../types/IModelViewerProps';

/** 将其他类型的文件，转化为 GLTF 类型 */
export function transformToGLTF(
  src: ModelSrc,
  type: ModelType
): Promise<{ gltf: string; mesh?: THREE.Mesh }> {
  const material = new THREE.MeshStandardMaterial();

  return new Promise(resolve => {
    const srcUrl = src instanceof File ? URL.createObjectURL(src) : src;

    if (type === 'glb' || type === 'gltf') {
      resolve({ gltf: srcUrl });
    } else if (type === 'obj') {
      const loader = new OBJLoader();
      loader.load(srcUrl, obj => {
        const exporter = new GLTFExporter();
        exporter.parse(
          obj,
          gltf => {
            resolve({ gltf: createURL(gltf) });
          },
          {}
        );
      });
    } else if (type === 'ply') {
      const loader = new PLYLoader();
      loader.load(srcUrl, geometry => {
        const mesh = new THREE.Mesh(geometry, material);
        const exporter = new GLTFExporter();
        exporter.parse(
          mesh,
          gltf => {
            resolve({ gltf: createURL(gltf), mesh });
          },
          {}
        );
      });
    } else if (type === 'stl') {
      const loader = new STLLoader();

      loader.load(srcUrl, geometry => {
        const mesh = new THREE.Mesh(geometry, material);
        const exporter = new GLTFExporter();
        exporter.parse(
          mesh,
          gltf => {
            console.log(gltf);
            resolve({ gltf: createURL(gltf), mesh });
          },
          {}
        );
      });
    }
  });
}

function createURL(json: any) {
  const str = JSON.stringify(json);
  const blob = new Blob([str], { type: 'text/plain' });
  return URL.createObjectURL(blob);
}
